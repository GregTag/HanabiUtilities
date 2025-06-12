// Hanabi Utilities - Background Script
console.log('Hanabi Utilities: Background script loaded');

// Store active notifications by table ID
const activeNotifications = new Map(); // tableId -> data

// Store the hanab.live tab ID and current URL
let hanabiTabId = null;
let currentHanabiUrl = null;

// Default settings
const defaultSettings = {
    friendNotifications: true,
    allTablesNotifications: false,
    mutedFriends: []
};

// Listen for messages from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('Hanabi Utilities: Received message:', message);

    // Store the tab ID when we receive any message from hanab.live
    if (sender.tab && sender.tab.url && sender.tab.url.includes('hanab.live')) {
        hanabiTabId = sender.tab.id;
        currentHanabiUrl = sender.tab.url;
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
        console.log('Hanabi Utilities: Stored hanab.live tab ID:', hanabiTabId);
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

// Helper function to compare notification data
function hasNotificationDataChanged(oldData, newData) {
    if (!oldData || !newData) return true;
    
    // Compare relevant fields that affect notification content
    return (
        oldData.tableName !== newData.tableName ||
        oldData.playerCount !== newData.playerCount ||
        JSON.stringify(oldData.friends) !== JSON.stringify(newData.friends)
    );
}

// Check if hanab.live tab is currently active and focused
async function isTabActiveAndFocused() {
    if (!hanabiTabId) return false;
    
    try {
        const tab = await chrome.tabs.get(hanabiTabId);
        if (!tab.active) return false;
        
        const window = await chrome.windows.get(tab.windowId);
        return window.focused;
    } catch (error) {
        // Tab may have been closed
        hanabiTabId = null;
        currentHanabiUrl = null;
        return false;
    }
}

// Check if current URL is the lobby page
function isOnLobbyPage() {
    return currentHanabiUrl && currentHanabiUrl.includes('hanab.live/lobby');
}

// Unified table event handler
async function handleTableEvent(data) {
    const { tableName, tableId, playerCount, friends, hasPassword, timestamp, joined, running } = data;
    const settings = await getSettings();
    const notificationId = String(tableId);

    // Check if conditions are met for showing notifications
    const conditionsMet = !joined && !running && playerCount > 0;

    // Check if we should suppress notifications due to tab state
    const tabActiveAndFocused = await isTabActiveAndFocused();
    const onLobbyPage = isOnLobbyPage();
    const shouldSuppressNotification = tabActiveAndFocused && onLobbyPage;

    // Filter out muted friends
    const mutedFriends = settings.mutedFriends || [];
    let friendsToMention = friends.filter(friend => !mutedFriends.includes(friend));

    // Determine if we should notify for this table
    let shouldNotify = false;

    if (conditionsMet && !shouldSuppressNotification) {
        if (settings.friendNotifications && friendsToMention.length > 0) {
            shouldNotify = true;
        } else if (settings.allTablesNotifications && !hasPassword) {
            shouldNotify = true;
            friendsToMention = [];
        }
    }

    console.log(`Hanabi Utilities: Processing table ${tableId} - shouldNotify: ${shouldNotify}, friendsToMention: ${friendsToMention.join(', ')}`);

    if (!shouldNotify) {
        // If we shouldn't notify, clear any existing notification for this table
        if (activeNotifications.has(notificationId)) {
            try {
                await chrome.notifications.clear(notificationId);
                activeNotifications.delete(notificationId);
                console.log(`Hanabi Utilities: Cleared notification for table ${tableId}`);
            } catch (error) {
                console.error('Error clearing notification:', error);
            }
        }
        return;
    }

    // Update data to use only unmuted friends for notifications
    const filteredData = { ...data, friends: friendsToMention };

    // Check if we already have a notification for this table
    if (activeNotifications.has(notificationId)) {
        // Update existing notification
        await updateTableNotification(tableId, filteredData);
    } else {
        // Create new notification
        await createTableNotification(tableId, filteredData);
    }
}

async function createTableNotification(tableId, data) {
    const { tableName, friends, playerCount } = data;
    const notificationId = String(tableId);

    const notificationData = buildNotificationContent(tableName, friends, playerCount);

    try {
        await chrome.notifications.create(notificationId, {
            ...notificationData,
            type: 'basic',
            iconUrl: 'icon48.png'        
        });

        console.log(`Hanabi Utilities: Created notification for table ${tableId}: ${notificationData.message}`);

        // Store the notification with string key
        activeNotifications.set(notificationId, data);
    } catch (error) {
        console.error('Hanabi Utilities: Notification error:', error);
    }
}

async function updateTableNotification(tableId, newData) {
    const notificationId = String(tableId);
    
    // Only update if data has changed
    const oldData = activeNotifications.get(notificationId);
    if (!hasNotificationDataChanged(oldData, newData)) {
        return;
    }

    const { tableName, friends, playerCount } = newData;
    const notificationData = buildNotificationContent(tableName, friends, playerCount);

    try {
        const wasUpdated = await chrome.notifications.update(notificationId, notificationData);

        if (wasUpdated) {
            console.log(`Hanabi Utilities: Updated notification for table ${tableId}: ${notificationData.message}`);

            // Update stored data with string key
            activeNotifications.set(notificationId, newData);
        } else {
            // Notification doesn't exist anymore, create a new one
            console.log(`Hanabi Utilities: Notification not found, creating new one for table ${tableId}`);
            activeNotifications.delete(notificationId);
            await createTableNotification(tableId, newData);
        }
    } catch (error) {
        console.error('Hanabi Utilities: Notification update error:', error);
    }
}

function buildNotificationContent(tableName, friends, playerCount) {
    const tableText = `${tableName} (${playerCount} player${playerCount !== 1 ? 's' : ''})`;
    if (friends.length > 0) {
        const friendsText = friends.length === 1
            ? friends[0]
            : friends.length === 2
                ? friends.join(' and ')
                : friends.slice(0, -1).join(', ') + ', and ' + friends[friends.length - 1];

        return {
            title: 'Friend Activity on hanab.live',
            message: `${friendsText} joined table\n${tableText}`,
            priority: 1
        };
    } else {
        return {
            title: 'Open Table on hanab.live',
            message: tableText,
            priority: 0
        };
    }
}

// Handle notification clicks
chrome.notifications.onClicked.addListener(async (notificationId) => {
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
    activeNotifications.delete(notificationId);
});

// Handle notification clearing
chrome.notifications.onClosed.addListener((notificationId, byUser) => {
    // Remove from our tracking when notification is closed
    activeNotifications.delete(notificationId);
});
