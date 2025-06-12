// Hanabi Utilities - Background Script
console.log('Hanabi Utilities: Background script loaded');

class HanabiUtilities {
    constructor() {
        // Store active notifications by table ID to prevent duplicates and enable updates
        this.activeNotifications = new Map(); // tableId -> notification data
        // Store joined table data for detecting player changes in pre-game notifications
        this.joinedTableData = null;
        
        // Track the active hanab.live tab for smart notification suppression
        this.hanabiTabId = null;
        this.currentHanabiUrl = null;

        this.initializeEventListeners();
    }

    get defaultSettings() {
        return {
            friendNotifications: true,      // Notify when friends join lobby tables
            allTablesNotifications: false,  // Notify for all open tables without passwords
            preGameNotifications: true,     // Notify for player changes in joined tables
            mutedFriends: []               // List of friends to exclude from notifications
        };
    }

    initializeEventListeners() {
        // Listen for messages from content script (table events, settings requests)
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            console.log('Hanabi Utilities: Received message:', message);

            // Track the hanab.live tab ID and URL for smart notification suppression
            if (sender.tab && sender.tab.url && sender.tab.url.includes('hanab.live')) {
                this.hanabiTabId = sender.tab.id;

                // Update URL tracking when it changes (lobby -> pre-game -> game transitions)
                if (this.currentHanabiUrl !== sender.tab.url) {
                    console.log(`Hanabi Utilities: Updated current hanab.live URL: ${this.currentHanabiUrl} -> ${sender.tab.url}`);
                    this.currentHanabiUrl = sender.tab.url;
                }
            }

            this.handleMessage(message, sender, sendResponse);
            return true; // Keep message channel open for async response
        });

        // Handle notification clicks - focus the hanab.live tab
        chrome.notifications.onClicked.addListener(async (notificationId) => {
            await this.handleNotificationClick(notificationId);
        });

        // Clean up tracking when notifications are dismissed
        chrome.notifications.onClosed.addListener((notificationId, byUser) => {
            this.activeNotifications.delete(notificationId);
        });

        // Clear notifications when user switches to hanab.live tab
        chrome.tabs.onActivated.addListener(async (activeInfo) => {
            if (activeInfo.tabId === this.hanabiTabId) {
                await this.clearNotificationsIfNeeded();
            }
        });

        // Clear notifications when user focuses window containing hanab.live
        chrome.windows.onFocusChanged.addListener(async (windowId) => {
            if (windowId !== chrome.windows.WINDOW_ID_NONE && this.hanabiTabId) {
                try {
                    const tab = await chrome.tabs.get(this.hanabiTabId);
                    if (tab.windowId === windowId && tab.active) {
                        await this.clearNotificationsIfNeeded();
                    }
                } catch (error) {
                    // Tab may have been closed, reset tracking
                    this.hanabiTabId = null;
                    this.currentHanabiUrl = null;
                }
            }
        });

        // Track URL changes within the hanab.live tab
        chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
            if (tabId === this.hanabiTabId && changeInfo.url) {
                this.currentHanabiUrl = changeInfo.url;
                await this.clearNotificationsIfNeeded();
            }
        });
    }

    async handleMessage(message, sender, sendResponse) {
        try {
            if (message.type === 'TABLE_EVENT') {
                // Process table updates from inject script
                await this.handleTableEvent(message.data);
                sendResponse({ success: true });
            } else if (message.type === 'INIT_TAB') {
                // Register the hanab.live tab for tracking
                console.log('Hanabi Utilities: Stored hanab.live tab ID:', this.hanabiTabId);
                sendResponse({ success: true });
            } else if (message.type === 'GET_SETTINGS') {
                // Popup requesting current settings
                const settings = await this.getSettings();
                sendResponse(settings);
            } else if (message.type === 'SAVE_SETTINGS') {
                // Popup saving updated settings
                await this.saveSettings(message.data);
                sendResponse({ success: true });
            }
        } catch (error) {
            console.error('Error handling message:', error);
            sendResponse({ success: false, error: error.message });
        }
    }

    // Settings management with Chrome storage sync
    async getSettings() {
        try {
            const result = await chrome.storage.sync.get(this.defaultSettings);
            return result;
        } catch (error) {
            console.error('Error loading settings:', error);
            return this.defaultSettings;
        }
    }

    async saveSettings(settings) {
        try {
            await chrome.storage.sync.set(settings);
            console.log('Settings saved:', settings);
        } catch (error) {
            console.error('Error saving settings:', error);
        }
    }

    // Smart notification suppression - check if user is actively viewing hanab.live
    async isTabActiveAndFocused() {
        if (!this.hanabiTabId) return false;
        
        try {
            // Check if hanab.live tab is the active tab
            const tab = await chrome.tabs.get(this.hanabiTabId);
            if (!tab.active) return false;
            
            // Check if the browser window is focused (not minimized or background)
            const window = await chrome.windows.get(tab.windowId);
            return window.focused;
        } catch (error) {
            // Tab may have been closed, reset tracking
            this.hanabiTabId = null;
            this.currentHanabiUrl = null;
            return false;
        }
    }

    // Check if user is viewing a specific pre-game page
    isOnPreGamePage(tableId) {
        return this.currentHanabiUrl && this.currentHanabiUrl.includes(`hanab.live/pre-game/${tableId}`);
    }

    // Check if user is viewing the main lobby page
    isOnLobbyPage() {
        return this.currentHanabiUrl && this.currentHanabiUrl.includes('hanab.live/lobby');
    }

    // Compare table data to determine if notification content needs updating
    hasTableDataChanged(oldData, newData) {
        if (!oldData || !newData) return true;
        
        // Compare relevant fields that affect notification content
        return (
            oldData.tableName !== newData.tableName ||
            oldData.players.length !== newData.players.length ||
            JSON.stringify(oldData.friends) !== JSON.stringify(newData.friends)
        );
    }

    // Execute notification with smart update/create logic
    async executeNotification(notificationId, notification) {
        const notificationData = notification.build();

        // Check if notification already exists
        if (this.activeNotifications.has(notificationId)) {
            const oldData = this.activeNotifications.get(notificationId);
            // Skip if notification content hasn't changed
            if (!notification.hasDataChanged(oldData)) {
                return;
            }

            // Try to update existing notification
            const wasUpdated = await this.updateNotification(notificationId, notificationData);
        
            if (wasUpdated) {
                // Update stored data for future comparisons
                this.activeNotifications.set(notificationId, notification.data);
                return;
            }
        } 

        // Create new notification if update failed or doesn't exist
        await this.createNotification(notificationId, notificationData);
        // Store the notification data for tracking
        this.activeNotifications.set(notificationId, notification.data);
    }

    // Create a new Chrome notification
    async createNotification(notificationId, notificationData) {
        await chrome.notifications.create(notificationId, {
            ...notificationData,
            type: 'basic',
            iconUrl: 'icon48.png'
        });

        console.log(`Hanabi Utilities: Created notification ${notificationId}: ${notificationData.message}`);
    }

    // Update an existing Chrome notification
    async updateNotification(notificationId, notificationData) {
        const wasUpdated = await chrome.notifications.update(notificationId, notificationData);

        if (wasUpdated) {
            console.log(`Hanabi Utilities: Updated notification ${notificationId}: ${notificationData.message}`);
        } else {
            console.log(`Hanabi Utilities: Notification not found for update: ${notificationId}`);
        }
        return wasUpdated;
    }

    // Clear a specific notification and remove from tracking
    async clearNotification(notificationId) {
        try {
            await chrome.notifications.clear(notificationId);
            this.activeNotifications.delete(notificationId);
            console.log(`Hanabi Utilities: Cleared notification ${notificationId}`);
        } catch (error) {
            console.error('Error clearing notification:', error);
        }
    }

    // Smart notification clearing based on user's current page
    async clearNotificationsIfNeeded() {
        const tabActiveAndFocused = await this.isTabActiveAndFocused();
        if (!tabActiveAndFocused) return;

        const onLobbyPage = this.isOnLobbyPage();
        
        // Collect all notifications to clear concurrently
        const notificationsToClear = [];
        
        for (const [notificationId, data] of this.activeNotifications) {
            if (onLobbyPage || this.isOnPreGamePage(data.tableId)) { 
                notificationsToClear.push(notificationId);
            }
        }

        // Clear all notifications concurrently
        if (notificationsToClear.length > 0) {
            await Promise.all(notificationsToClear.map(id => this.clearNotification(id)));
        }
    }

    // Process table events from inject script and determine notification actions
    async handleTableEvent(data) {
        const { tableId, joined } = data;
        const notificationId = String(tableId);

        // Create appropriate notification type based on whether user joined the table
        let notification = null;
        if (joined) {
            // User is in this table - track pre-game player changes
            notification = new PreGameNotification(data);
        } else {
            // Lobby table - track friend/open table activity
            notification = new TableNotification(data);
        }
        
        // Check if notification should be sent based on settings and conditions
        const shouldNotify = await notification.shouldNotify(this);

        console.log(`Hanabi Utilities: Processing table ${tableId} - shouldNotify: ${shouldNotify}`);

        if (!shouldNotify) {
            // Clear existing notification if conditions no longer met
            if (this.activeNotifications.has(notificationId)) {
                await this.clearNotification(notificationId);
            }
            return;
        }

        // Send or update the notification
        await this.executeNotification(notificationId, notification);
    }

    // Handle notification clicks - focus hanab.live tab
    async handleNotificationClick(notificationId) {
        // Focus the stored hanab.live tab if it exists
        if (this.hanabiTabId) {
            try {
                await chrome.tabs.update(this.hanabiTabId, { active: true });
                const tab = await chrome.tabs.get(this.hanabiTabId);
                await chrome.windows.update(tab.windowId, { focused: true });
            } catch (error) {
                console.error('Error focusing stored tab, it may have been closed:', error);
                this.hanabiTabId = null; // Clear invalid tab ID
            }
        }

        // Clear the notification and remove from tracking
        this.activeNotifications.delete(notificationId);
    }
}

// Notification class for lobby tables (friend activity and open tables)
class TableNotification {
    constructor(data) {
        this.data = data;
    }

    // Build notification content based on friends and table info
    static buildContent(tableName, friends, playerCount) {
        const tableText = `${tableName} (${playerCount} player${playerCount !== 1 ? 's' : ''})`;
        if (friends.length > 0) {
            // Format friend names grammatically
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

    // Determine if this table notification should be sent
    async shouldNotify(utilities) {
        const { running, players, hasPassword } = this.data;
        // Don't notify for running games or empty tables
        if (running || players.length === 0) {
            return false;
        }
        
        // Suppress notifications if user is actively viewing lobby
        const tabActiveAndFocused = await utilities.isTabActiveAndFocused();
        const onLobbyPage = utilities.isOnLobbyPage();
        if (tabActiveAndFocused && onLobbyPage) {
            return false;
        }

        const settings = await utilities.getSettings();

        // Filter out muted friends from notification
        const mutedFriends = settings.mutedFriends || [];
        this.data.friends = this.data.friends.filter(friend => !mutedFriends.includes(friend));

        // Check if notification should be sent based on settings
        let shouldNotify = false;
        if (settings.friendNotifications && this.data.friends.length > 0) {
            // Friend joined a table
            shouldNotify = true;
        } else if (settings.allTablesNotifications && !hasPassword) {
            // Open table without password (clear friends for "all tables" notification)
            this.data.friends = [];
            shouldNotify = true;
        }
        return shouldNotify;
    }

    // Build the notification data structure
    build() {
        return TableNotification.buildContent(
            this.data.tableName,
            this.data.friends,
            this.data.players.length
        );
    }

    // Check if notification content has changed since last update
    hasDataChanged(oldData) {
        if (!oldData) return true;

        // Compare relevant fields that affect notification content
        return (
            oldData.tableName !== this.data.tableName ||
            oldData.players.length !== this.data.players.length ||
            JSON.stringify(oldData.friends) !== JSON.stringify(this.data.friends)
        );
    }
}

// Notification class for pre-game tables (player join/leave activity)
class PreGameNotification {
    constructor(data) {
        this.data = data;
        this.playersChanges = { joined: [], left: [] }; // Initialize to prevent undefined access
    }

    // Detect which players joined or left since last update
    static detectPlayerChanges(currentPlayers, previousData) {
        if (!previousData) {
            return { joined: [], left: [] };
        }

        const previousPlayers = previousData.players;
        const joined = currentPlayers.filter(player => !previousPlayers.includes(player));
        const left = previousPlayers.filter(player => !currentPlayers.includes(player));

        return { joined, left };
    }

    // Build notification content for player changes
    static buildContent(tableName, playersJoined, playersLeft, playerCount) {
        const tableText = `${tableName} (${playerCount} player${playerCount !== 1 ? 's' : ''})`;
        const parts = [];

        // Format joined players
        if (playersJoined.length > 0) {
            const joinedText = playersJoined.length === 1
                ? `${playersJoined[0]} joined`
                : `${playersJoined.slice(0, -1).join(', ')} and ${playersJoined[playersJoined.length - 1]} joined`;
            parts.push(joinedText);
        }

        // Format left players
        if (playersLeft.length > 0) {
            const leftText = playersLeft.length === 1
                ? `${playersLeft[0]} left`
                : `${playersLeft.slice(0, -1).join(', ')} and ${playersLeft[playersLeft.length - 1]} left`;
            parts.push(leftText);
        }

        const message = parts.join(', ') + '\n' + tableText;

        return {
            title: 'Table Activity',
            message,
            priority: 1
        };
    }

    // Determine if this pre-game notification should be sent
    async shouldNotify(utilities) {
        const { tableId, running, players } = this.data;
        // Don't notify for running games or empty tables
        if (running || players.length === 0) {
            utilities.joinedTableData = null; // Reset joined table data
            return false;
        }

        // Suppress notifications if user is actively viewing this table's pre-game page
        const tabActiveAndFocused = await utilities.isTabActiveAndFocused();
        const onPreGamePage = utilities.isOnPreGamePage(tableId);
        if (tabActiveAndFocused && onPreGamePage) {
            return false;
        }

        const settings = await utilities.getSettings();
        if (!settings.preGameNotifications) {
            return false;
        }
        
        // Compare with previous table state to detect changes
        const previousData = utilities.joinedTableData;
        utilities.joinedTableData = this.data; // Update stored state
        this.playersChanges = PreGameNotification.detectPlayerChanges(players, previousData);
        
        // Only notify if we have previous data to compare against
        return previousData !== null;
    }

    // Check if notification content has changed since last update
    hasDataChanged(oldData) {
        // If no previous data, do not notify (handled by shouldNotify)
        if (!oldData) return false;

        // Compare relevant fields that affect notification content
        return (
            oldData.tableName !== this.data.tableName ||
            JSON.stringify(oldData.players) !== JSON.stringify(this.data.players)
        );
    }

    // Build the notification data structure
    build() {
        return PreGameNotification.buildContent(
            this.data.tableName,
            this.playersChanges.joined,
            this.playersChanges.left,
            this.data.players.length
        );
    }
}

// Initialize the extension
const hanabiUtilities = new HanabiUtilities();
