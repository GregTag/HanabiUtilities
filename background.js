// Hanabi Utilities - Background Script
console.log('Hanabi Utilities: Background script loaded');

// Store recent notifications to avoid duplicates
const recentNotifications = new Map();
const NOTIFICATION_COOLDOWN = 30000; // 30 seconds

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

    if (message.type === 'FRIEND_JOINED_TABLE') {
        handleFriendJoinedTable(message.data);
        sendResponse({ success: true });
    }

    return true; // Keep message channel open for async response
});

function handleFriendJoinedTable(data) {
    const { tableName, friends, tableId, timestamp } = data;

    // Create a unique key for this notification
    const notificationKey = `${tableId}-${friends.join(',')}`;

    // Check if we recently sent a notification for this combination
    if (recentNotifications.has(notificationKey)) {
        console.log('Hanabi Utilities: Skipping duplicate notification');
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
            console.log(`Hanabi Utilities: Notification sent - ${notificationMessage}`);
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
