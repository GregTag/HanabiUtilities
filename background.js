// Hanabi Utilities - Background Script
console.log('Hanabi Utilities: Background script loaded');

// Store recent notifications to avoid duplicates
const recentNotifications = new Map();
const NOTIFICATION_COOLDOWN = 30000; // 30 seconds

// Default settings
const defaultSettings = {
    friendNotifications: true,
    allTablesNotifications: false
};

// Clean up old notifications periodically
setInterval(() => {
    const now = Date.now();
    for (const [key, timestamp] of recentNotifications.entries()) {
        if (now - timestamp > NOTIFICATION_COOLDOWN) {
            recentNotifications.delete(key);
        }
    }
}, 60000); // Clean up every minute

// Listen for messages from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('Hanabi Utilities: Received message:', message);

    if (message.type === 'TABLE_EVENT') {
        handleTableEvent(message.data);
        sendResponse({ success: true });
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

// Handle table events and decide which notifications to send based on current settings
async function handleTableEvent(data) {
    const { tableName, tableId, playerCount, friends, hasPassword, timestamp } = data;
    const settings = await getSettings();

    // Check for friend notifications
    if (settings.friendNotifications && friends.length > 0) {
        console.log(`Hanabi Utilities: Friends found in table ${tableName}:`, friends);
        sendFriendNotification(tableName, friends, tableId, timestamp);
    } else if (settings.allTablesNotifications && !hasPassword) {
        // Check for all other tables with no password notifications
        console.log(`Hanabi Utilities: Open table available: ${tableName}`);
        sendOpenTableNotification(tableName, tableId, playerCount, timestamp);
    }
}

function sendFriendNotification(tableName, friends, tableId, timestamp) {
    // Create a unique key for this notification
    const notificationKey = `friend-${tableId}-${friends.join(',')}`;

    // Check if we recently sent a notification for this combination
    if (recentNotifications.has(notificationKey)) {
        console.log('Hanabi Utilities: Skipping duplicate friend notification');
        return;
    }

    // Store this notification to prevent duplicates
    recentNotifications.set(notificationKey, timestamp);

    // Create the notification
    const friendsText = friends.length === 1
        ? friends[0]
        : friends.length === 2
            ? friends.join(' and ')
            : friends.slice(0, -1).join(', ') + ', and ' + friends[friends.length - 1];

    const notificationTitle = 'Friend Activity on hanab.live';
    const notificationMessage = `${friendsText} joined: ${tableName}`;

    chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icon48.png',
        title: notificationTitle,
        message: notificationMessage,
        priority: 1
    }, (notificationId) => {
        if (chrome.runtime.lastError) {
            console.error('Hanabi Utilities: Notification error:', chrome.runtime.lastError);
        } else {
            console.log(`Hanabi Utilities: Friend notification sent - ${notificationMessage}`);
        }
    });
}

function sendOpenTableNotification(tableName, tableId, playerCount, timestamp) {
    // Create a unique key for this notification
    const notificationKey = `table-${tableId}`;

    // Check if we recently sent a notification for this table
    if (recentNotifications.has(notificationKey)) {
        console.log('Hanabi Utilities: Skipping duplicate table notification');
        return;
    }

    // Store this notification to prevent duplicates
    recentNotifications.set(notificationKey, timestamp);

    const notificationTitle = 'Open Table on hanab.live';
    const notificationMessage = `${tableName} (${playerCount} player${playerCount !== 1 ? 's' : ''})`;

    chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icon48.png',
        title: notificationTitle,
        message: notificationMessage,
        priority: 0
    }, (notificationId) => {
        if (chrome.runtime.lastError) {
            console.error('Hanabi Utilities: Notification error:', chrome.runtime.lastError);
        } else {
            console.log(`Hanabi Utilities: Table notification sent - ${notificationMessage}`);
        }
    });
}

// Handle notification clicks (optional enhancement)
chrome.notifications.onClicked.addListener((notificationId) => {
    // Focus the hanab.live tab if it exists
    chrome.tabs.query({ url: "https://hanab.live/*" }, (tabs) => {
        if (tabs.length > 0) {
            chrome.tabs.update(tabs[0].id, { active: true });
            chrome.windows.update(tabs[0].windowId, { focused: true });
        }
    });

    // Clear the notification
    chrome.notifications.clear(notificationId);
});
