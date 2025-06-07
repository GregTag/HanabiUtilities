// Hanabi Utilities - Popup Script
document.addEventListener('DOMContentLoaded', async function () {
    const extensionStatus = document.getElementById('extension-status');
    const siteStatus = document.getElementById('site-status');
    const friendsCount = document.getElementById('friends-count');
    const friendsContainer = document.getElementById('friends-container');
    const friendNotificationsToggle = document.getElementById('friend-notifications-toggle');
    const allTablesToggle = document.getElementById('all-tables-toggle');

    // Update extension status
    extensionStatus.textContent = 'Active';
    extensionStatus.style.background = 'rgba(87, 255, 87, 0.3)';

    // Load settings
    await loadSettings();

    // Set up toggle event listeners
    friendNotificationsToggle.addEventListener('click', () => {
        toggleSetting('friendNotifications', friendNotificationsToggle);
    });

    allTablesToggle.addEventListener('click', () => {
        toggleSetting('allTablesNotifications', allTablesToggle);
    });

    // Check if we're on the correct site and get friends list
    try {
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        const currentTab = tabs[0];

        if (currentTab.url && currentTab.url.includes('hanab.live')) {
            try {
                // Execute script to check WebSocket connection and get friends list
                const results = await chrome.scripting.executeScript({
                    target: { tabId: currentTab.id },
                    function: getConnectionStatusAndFriends,
                    world: "MAIN"
                });

                if (results && results[0] && results[0].result) {
                    const data = results[0].result;

                    // Update site status based on WebSocket connection
                    if (data.connected) {
                        siteStatus.textContent = 'Connected';
                        siteStatus.style.background = 'rgba(87, 255, 87, 0.3)';
                    } else {
                        siteStatus.textContent = 'Disconnected';
                        siteStatus.style.background = 'rgba(255, 87, 87, 0.3)';
                    }

                    if (data.success) {
                        updateFriendsDisplay(data.friends);
                    } else {
                        showError(data.error);
                    }
                } else {
                    siteStatus.textContent = 'No response';
                    siteStatus.style.background = 'rgba(255, 87, 87, 0.3)';
                    showError('No response from page');
                }
            } catch (error) {
                siteStatus.textContent = 'Error';
                siteStatus.style.background = 'rgba(255, 87, 87, 0.3)';
                showError('Could not access page data');
            }
        } else {
            siteStatus.textContent = 'Not on hanab.live';
            siteStatus.style.background = 'rgba(255, 87, 87, 0.3)';
            showError('Please navigate to hanab.live to use this extension');
        }
    } catch (error) {
        console.error('Error querying tabs:', error);
        showError('Could not access current tab');
    }

    async function loadSettings() {
        try {
            const response = await chrome.runtime.sendMessage({ type: 'GET_SETTINGS' });
            if (response) {
                updateToggle(friendNotificationsToggle, response.friendNotifications);
                updateToggle(allTablesToggle, response.allTablesNotifications);
            }
        } catch (error) {
            console.error('Error loading settings:', error);
        }
    }

    async function toggleSetting(settingName, toggleElement) {
        const isActive = toggleElement.classList.contains('active');
        const newValue = !isActive;

        updateToggle(toggleElement, newValue);

        // Save the setting
        const settings = {};
        settings[settingName] = newValue;
        try {
            await chrome.runtime.sendMessage({
                type: 'SAVE_SETTINGS',
                data: settings
            });
        } catch (error) {
            console.error('Error saving settings:', error);
        }
    }

    function updateToggle(toggleElement, isActive) {
        if (isActive) {
            toggleElement.classList.add('active');
        } else {
            toggleElement.classList.remove('active');
        }
    }

    function getConnectionStatusAndFriends() {
        try {
            let connected = false;
            let error = 'Hanabi data not available. Make sure you are logged in.';
            let friends = [];

            // Check WebSocket connection
            if (window.globals2 && window.globals2.conn && window.globals2.conn.ws) {
                const ws = window.globals2.conn.ws;
                connected = ws.readyState === WebSocket.OPEN;

                if (!connected) {
                    if (ws.readyState === WebSocket.CONNECTING) {
                        error = 'WebSocket is connecting...';
                    } else if (ws.readyState === WebSocket.CLOSING) {
                        error = 'WebSocket is closing...';
                    } else if (ws.readyState === WebSocket.CLOSED) {
                        error = 'WebSocket is closed. Try refreshing the page.';
                    }
                }
            }

            // Get friends list if available
            if (window.globals2 && window.globals2.friends) {
                friends = window.globals2.friends;
                if (connected || friends.length > 0) {
                    return {
                        success: true,
                        connected: connected,
                        friends: friends
                    };
                }
            }

            return {
                success: false,
                connected: connected,
                error: error,
                friends: []
            };
        } catch (error) {
            return {
                success: false,
                connected: false,
                error: 'Error accessing page data: ' + error.message,
                friends: []
            };
        }
    }

    function updateFriendsDisplay(friends) {
        friendsCount.textContent = friends.length;

        if (friends.length === 0) {
            friendsContainer.innerHTML = '<div class="no-friends">You have no friends added yet</div>';
        } else {
            friendsContainer.innerHTML = friends.map(friend =>
                `<div class="friend-item">${escapeHtml(friend)}</div>`
            ).join('');
        }
    }

    function showError(message) {
        friendsCount.textContent = '!';
        friendsCount.style.background = 'rgba(255, 87, 87, 0.3)';
        friendsContainer.innerHTML = `<div class="error">${escapeHtml(message)}</div>`;
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
});
