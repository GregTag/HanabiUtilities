// Hanabi Utilities - Inject Script
(function () {
    'use strict';

    console.log('Hanabi Utilities: Inject script loaded');

    // Wait for the globals to be available
    function waitForGlobals() {
        return new Promise((resolve) => {
            const checkGlobals = () => {
                if (window.globals2 && window.globals2.conn && window.globals2.conn.callbacks && window.globals2.friends) {
                    resolve();
                } else {
                    setTimeout(checkGlobals, 1000);
                }
            };
            checkGlobals();
        });
    }

    // Function to check if any player in the table is a friend
    function hasFriends(players, friends) {
        if (!players || !friends || friends.length === 0) {
            return [];
        }

        const foundFriends = [];
        for (const player of players) {
            if (friends.includes(player)) {
                foundFriends.push(player);
            }
        }
        return foundFriends;
    }

    // Function to send table event to background for processing
    function sendTableEvent(data) {
        const friends = window.globals2.friends;
        const friendsInTable = hasFriends(data.players, friends);

        window.postMessage({
            source: 'hanabi-utilities',
            type: 'TABLE_EVENT',
            data: {
                tableName: data.name,
                tableId: data.id,
                playerCount: data.players.length,
                friends: friendsInTable,
                hasPassword: data.passwordProtected,
                joined: data.joined,
                running: data.running,
                timestamp: Date.now()
            }
        }, window.location.origin);
    }

    // Main initialization function
    async function init() {
        console.log('Hanabi Utilities: Waiting for globals...');
        await waitForGlobals();
        console.log('Hanabi Utilities: Globals available, setting up tracker');

        // Send initialization message to register this tab
        window.postMessage({
            source: 'hanabi-utilities',
            type: 'INIT_TAB'
        }, window.location.origin);

        // Store original callback if it exists
        const originalTableCallback = window.globals2.conn.callbacks.table;

        // Our custom callback wrapper
        window.globals2.conn.callbacks.table = function (data) {
            // Call original callback first
            originalTableCallback(data);

            console.log(data);
            // Our tracking logic
            try {
                // Send all table events - let background script decide what to do
                sendTableEvent(data);
            } catch (error) {
                console.error('Hanabi Utilities: Error in table callback:', error);
            }
        };

        console.log('Hanabi Utilities: Successfully hooked into table callback');
    }

    // Start the extension
    init().catch(error => {
        console.error('Hanabi Utilities: Initialization failed:', error);
    });

})();
