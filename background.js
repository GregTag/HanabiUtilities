// Hanabi Utilities - Background Script
console.log('Hanabi Utilities: Background script loaded');

// Store active notifications by table ID
const activeNotifications = new Map(); // tableId -> { notificationId, timestamp, data }

// Store the hanab.live tab ID
let hanabiTabId = null;

// Default settings
const defaultSettings = {
    friendNotifications: true,
    allTablesNotifications: false
};

// Listen for messages from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('Hanabi Utilities: Received message:', message);

    // Store the tab ID when we receive any message from hanab.live
    if (sender.tab && sender.tab.url && sender.tab.url.includes('hanab.live')) {
        hanabiTabId = sender.tab.id;
        console.log('Hanabi Utilities: Stored hanab.live tab ID:', hanabiTabId);
    }

    if (message.type === 'TABLE_EVENT') {
        handleTableEvent(message.data)
            .then(() => sendResponse({ success: true }))
            .catch(error => {
                console.error('Error handling table event:', error);
                sendResponse({ success: false, error: error.message });
            });
        return true; // Async response
    } else if (message.type === 'INIT_TAB') {
        // Tab initialization - just acknowledge
        sendResponse({ success: true });
        return true;
    } else if (message.type === 'GET_SETTINGS') {
        getSettings().then(sendResponse);
        return true; // Async response
    } else if (message.type === 'SAVE_SETTINGS') {
        saveSettings(message.data).then(() => sendResponse({ success: true }));
        return true; // Async response
    }

    return true; // Keep message channel open for async response
});

// Settings management
async function getSettings() {
    try {
        const result = await chrome.storage.sync.get(defaultSettings);
        return result;
    } catch (error) {
        console.error('Error loading settings:', error);
        return defaultSettings;
    }
}

async function saveSettings(settings) {
    try {
        await chrome.storage.sync.set(settings);
        console.log('Settings saved:', settings);
    } catch (error) {
        console.error('Error saving settings:', error);
    }
}

// Unified table event handler
async function handleTableEvent(data) {
    const { tableName, tableId, playerCount, friends, hasPassword, timestamp, joined, running } = data;
    const settings = await getSettings();

    // Check if conditions are met for showing notifications
    const conditionsMet = !joined && !running && playerCount > 0;

    // Determine if we should notify for this table
    let shouldNotify = false;
    let notificationType = null;

    if (conditionsMet) {
        if (settings.friendNotifications && friends.length > 0) {
            shouldNotify = true;
            notificationType = 'friend';
        } else if (settings.allTablesNotifications && !hasPassword) {
            shouldNotify = true;
            notificationType = 'open';
        }
    }

    if (!shouldNotify) {
        // If we shouldn't notify, clear any existing notification for this table
        if (activeNotifications.has(tableId)) {
            const existingNotification = activeNotifications.get(tableId);
            try {
                await chrome.notifications.clear(existingNotification.notificationId);
                activeNotifications.delete(tableId);
                console.log(`Hanabi Utilities: Cleared notification for table ${tableId}`);
            } catch (error) {
                console.error('Error clearing notification:', error);
            }
        }
        return;
    }

    // Check if we already have a notification for this table
    if (activeNotifications.has(tableId)) {
        // Update existing notification
        await updateTableNotification(tableId, data, notificationType);
    } else {
        // Create new notification
        await createTableNotification(tableId, data, notificationType);
    }
}

async function createTableNotification(tableId, data, notificationType) {
    const { tableName, friends, playerCount } = data;

    const notificationData = buildNotificationContent(tableName, friends, playerCount, notificationType);

    try {
        const notificationId = await chrome.notifications.create({
            type: 'basic',
            iconUrl: 'icon48.png',
            title: notificationData.title,
            message: notificationData.message,
            priority: notificationType === 'friend' ? 1 : 0
        });

        console.log(`Hanabi Utilities: Created notification for table ${tableId}: ${notificationData.message}`);

        // Store the notification
        activeNotifications.set(tableId, {
            notificationId: notificationId,
            timestamp: data.timestamp,
            data: data,
            type: notificationType
        });
    } catch (error) {
        console.error('Hanabi Utilities: Notification error:', error);
    }
}

async function updateTableNotification(tableId, newData, notificationType) {
    const existingNotification = activeNotifications.get(tableId);
    const { tableName, friends, playerCount } = newData;

    const notificationData = buildNotificationContent(tableName, friends, playerCount, notificationType);

    try {
        const wasUpdated = await chrome.notifications.update(existingNotification.notificationId, {
            title: notificationData.title,
            message: notificationData.message,
            priority: notificationType === 'friend' ? 1 : 0
        });

        if (wasUpdated) {
            console.log(`Hanabi Utilities: Updated notification for table ${tableId}: ${notificationData.message}`);

            // Update stored data
            activeNotifications.set(tableId, {
                ...existingNotification,
                timestamp: newData.timestamp,
                data: newData,
                type: notificationType
            });
        } else {
            // Notification doesn't exist anymore, create a new one
            console.log(`Hanabi Utilities: Notification not found, creating new one for table ${tableId}`);
            activeNotifications.delete(tableId);
            await createTableNotification(tableId, newData, notificationType);
        }
    } catch (error) {
        console.error('Hanabi Utilities: Notification update error:', error);
    }
}

function buildNotificationContent(tableName, friends, playerCount, notificationType) {
    const tableText = `${tableName} (${playerCount} player${playerCount !== 1 ? 's' : ''})`;
    if (notificationType === 'friend' && friends.length > 0) {
        const friendsText = friends.length === 1
            ? friends[0]
            : friends.length === 2
                ? friends.join(' and ')
                : friends.slice(0, -1).join(', ') + ', and ' + friends[friends.length - 1];

        return {
            title: 'Friend Activity on hanab.live',
            message: `${friendsText} joined table\n${tableText}`
        };
    } else {
        return {
            title: 'Open Table on hanab.live',
            message: tableText
        };
    }
}

// Handle notification clicks
chrome.notifications.onClicked.addListener(async (notificationId) => {
    try {
        // Focus the stored hanab.live tab if it exists
        if (hanabiTabId) {
            try {
                await chrome.tabs.update(hanabiTabId, { active: true });
                const tab = await chrome.tabs.get(hanabiTabId);
                await chrome.windows.update(tab.windowId, { focused: true });
            } catch (error) {
                console.error('Error focusing stored tab, it may have been closed:', error);
                hanabiTabId = null; // Clear invalid tab ID
            }
        }

        // Clear the notification and remove from tracking
        await chrome.notifications.clear(notificationId);

        // Remove from our tracking
        for (const [tableId, notification] of activeNotifications.entries()) {
            if (notification.notificationId === notificationId) {
                activeNotifications.delete(tableId);
                break;
            }
        }
    } catch (error) {
        console.error('Error handling notification click:', error);
    }
});

// Handle notification clearing
chrome.notifications.onClosed.addListener((notificationId, byUser) => {
    // Remove from our tracking when notification is closed
    for (const [tableId, notification] of activeNotifications.entries()) {
        if (notification.notificationId === notificationId) {
            activeNotifications.delete(tableId);
            break;
        }
    }
});
