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

    // Function to send notification
    function sendNotification(tableName, friendNames, tableId) {
        window.postMessage({
            source: 'hanabi-utilities',
            type: 'FRIEND_JOINED_TABLE',
            data: {
                tableName: tableName,
                friends: friendNames,
                tableId: tableId,
                timestamp: Date.now()
            }
        }, window.location.origin);
    }

    // Main initialization function
    async function init() {
        console.log('Hanabi Utilities: Waiting for globals...');
        await waitForGlobals();
        console.log('Hanabi Utilities: Globals available, setting up tracker');

        // Store original callback if it exists
        const originalTableCallback = window.globals2.conn.callbacks.table;

        // Our custom callback wrapper
        window.globals2.conn.callbacks.table = function (data) {
            // Call original callback first if it exists
            originalTableCallback(data);

            console.log(data);
            // Our tracking logic
            try {
                // Check conditions: not joined, not running, has players
                if (!data.joined && !data.running && data.players && data.players.length > 0) {
                    const friends = window.globals2.friends;
                    const friendsInTable = hasFriends(data.players, friends);
                    console.log(`Hanabi Utilities: Friends found in table ${data.name}:`, friendsInTable);
                    if (friendsInTable.length > 0) {
                        sendNotification(data.name, friendsInTable, data.id);
                    }
                }
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
