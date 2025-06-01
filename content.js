// Hanabi Utilities - Content Script
(function () {
    'use strict';

    console.log('Hanabi Utilities: Content script loaded');

    // Listen for messages from the injected script
    window.addEventListener('message', (event) => {
        // Only accept messages from same origin
        if (event.origin !== window.location.origin) {
            return;
        }

        // Check if it's our extension message
        if (event.data && event.data.source === 'hanabi-utilities') {
            if (event.data.type === 'FRIEND_JOINED_TABLE') {
                // Forward the message to background script
                chrome.runtime.sendMessage({
                    type: 'FRIEND_JOINED_TABLE',
                    data: event.data.data
                }, (response) => {
                    if (chrome.runtime.lastError) {
                        console.log('Hanabi Utilities: Could not send message to background script');
                    }
                });
            }
        }
    });

})();
