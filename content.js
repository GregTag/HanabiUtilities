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
            if (event.data.type === 'TABLE_EVENT') {
                // Forward the table event to background script
                chrome.runtime.sendMessage({
                    type: 'TABLE_EVENT',
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
