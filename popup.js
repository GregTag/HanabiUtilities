// Hanabi Utilities - Popup Script
document.addEventListener('DOMContentLoaded', function () {
    const extensionStatus = document.getElementById('extension-status');
    const siteStatus = document.getElementById('site-status');
    const friendsCount = document.getElementById('friends-count');
    const friendsContainer = document.getElementById('friends-container');

    // Update extension status
    extensionStatus.textContent = 'Active';
    extensionStatus.style.background = 'rgba(87, 255, 87, 0.3)';

    // Check if we're on the correct site and get friends list
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        const currentTab = tabs[0];

        if (currentTab.url && currentTab.url.includes('hanab.live')) {
            siteStatus.textContent = 'Connected';
            siteStatus.style.background = 'rgba(87, 255, 87, 0.3)';

            // Execute script to get friends list
            chrome.scripting.executeScript({
                target: { tabId: currentTab.id },
                function: getFriendsFromPage,
                world: "MAIN"
            }, (results) => {
                if (chrome.runtime.lastError) {
                    showError('Could not access page data');
                    return;
                }

                if (results && results[0] && results[0].result) {
                    const data = results[0].result;
                    if (data.success) {
                        updateFriendsDisplay(data.friends);
                    } else {
                        showError(data.error);
                    }
                } else {
                    showError('No response from page');
                }
            });
        } else {
            siteStatus.textContent = 'Not on hanab.live';
            siteStatus.style.background = 'rgba(255, 87, 87, 0.3)';
            showError('Please navigate to hanab.live to use this extension');
        }
    });

    function getFriendsFromPage() {
        try {
            if (window.globals2 && window.globals2.friends) {
                return {
                    success: true,
                    friends: window.globals2.friends
                };
            } else {
                return {
                    success: false,
                    error: 'Hanabi data not available. Make sure you are logged in.'
                };
            }
        } catch (error) {
            return {
                success: false,
                error: 'Error accessing page data: ' + error.message
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
