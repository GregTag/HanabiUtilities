# Hanabi Utilities Chrome Extension

This Chrome extension tracks your friends' activity on hanab.live and sends desktop notifications when they join new tables.

## Features

- 🎴 **Real-time Monitoring**: Tracks table updates in real-time
- 👥 **Friend Detection**: Automatically detects when friends join tables
- 🔔 **Desktop Notifications**: Sends notifications when friends join new tables
- 🔇 **Friend Muting**: Selectively mute notifications from specific friends
- 🌐 **All Tables Mode**: Optional notifications for all open tables without passwords
- ⚙️ **Configurable Settings**: Toggle notifications on/off with instant updates
- 🎯 **Smart Filtering**: Only notifies for tables you haven't joined and that haven't started yet
- 🔄 **Dynamic Updates**: Notifications update in-place when table status changes
- 📊 **Status Dashboard**: Shows extension status and current friends list
- 🤫 **Smart Suppression**: Automatically suppresses notifications when you're actively viewing the lobby

## Installation

1. **Download the Extension Files**

   - Save all the provided files in a folder on your computer

2. **Load the Extension in Chrome**

   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode" (toggle in the top right)
   - Click "Load unpacked"
   - Select the folder containing your extension files
   - The extension should now appear in your extensions list

3. **Grant Permissions**
   - The extension will request permission to access hanab.live and send notifications
   - Accept these permissions for the extension to work properly

## How It Works

### Technical Implementation

The extension hooks into hanab.live's internal callback system:

1. **Callback Interception**: Wraps `window.globals2.conn.callbacks.table` to monitor table updates
2. **Friend List Access**: Reads your friends list from `window.globals2.friends`
3. **Event Processing**: Sends all table events to background script for processing
4. **Settings-Based Filtering**: Background script checks current settings before sending notifications
5. **Smart Suppression**: Automatically suppresses notifications when you're actively viewing the lobby
6. **Condition Checking**: Triggers notifications when:
   - `joined: false` (you haven't joined the table)
   - `running: false` (the game hasn't started yet)
   - Tab is not active and focused on the lobby page
   - Settings allow the notification type

### Notification Settings

- **Friend Notifications**: Get notified when friends join tables (enabled by default)
- **All Open Tables**: Get notified for any open table without password (disabled by default)
- **Friend Muting**: Click on any friend's name to toggle notifications from them
- **Instant Updates**: Settings changes take effect immediately without page reload

### Smart Notification Suppression

The extension intelligently suppresses notifications when you're already actively using hanab.live:

- **Active Tab Detection**: Checks if hanab.live is the currently active browser tab
- **Window Focus**: Verifies the browser window is focused (not minimized or in background)
- **Lobby Page Detection**: Only suppresses when you're specifically on the lobby page
- **Automatic Resume**: Notifications resume when you navigate away or switch tabs

This prevents spam notifications while you're already browsing tables in the lobby.

### Friend Management

- **Mute Individual Friends**: Click on any friend's name in the popup to mute/unmute their notifications
- **Visual Indicators**: Muted friends show with red styling, unmuted friends show with green styling
- **Reset Filters**: Use "Reset" button to unmute all friends at once
- **Persistent Settings**: Muted friends list is saved and persists across browser sessions

### Notification Logic

- **Smart Detection**: Checks if any players in a table match your friends list
- **Unified Tracking**: Each table has at most one active notification that updates dynamically
- **Rich Notifications**: Shows friend names and table information
- **Click to Focus**: Clicking notifications brings hanab.live tab to front
- **Priority Levels**: Friend notifications have higher priority than general table notifications
- **Automatic Cleanup**: Notifications are automatically cleared when conditions no longer apply

## Usage

1. **Navigate to hanab.live** and log in to your account
2. **The extension automatically starts** monitoring when the page loads
3. **Configure notifications** by clicking the extension icon and using the toggle switches
4. **Notifications appear** based on your settings when:
   - Friends join new tables (if Friend Notifications enabled)
   - Any open table becomes available (if All Open Tables enabled)
   - You're not actively viewing the lobby page
5. **Click notifications** to return to hanab.live

## Popup Interface

The extension popup shows:

- **Extension Status**: Whether the tracker is active
- **Site Status**: Connection to hanab.live
- **Friends Count**: Number of friends in your list
- **Notification Settings**: Toggle switches for different notification types
- **Friends List**: All your current friends with mute/unmute functionality
- **Reset Button**: Quick way to unmute all friends (only visible when friends are muted)

## Privacy & Security

- **Local Only**: All data stays in your browser, nothing is sent to external servers
- **Read Only**: The extension only reads data from hanab.live, it doesn't modify anything
- **Minimal Permissions**: Only requests access to hanab.live, notifications, and settings storage

## Development

### File Structure

```
HanabiUtilities/
├── manifest.json        # Extension configuration
├── inject.js            # Table monitoring and event detection
├── content.js           # Message passing between inject and background
├── background.js        # Notification logic and settings management
├── popup.html           # Extension popup interface
├── popup.js             # Popup functionality
├── README.md            # This file
└── PRIVACY.md           # Privacy policy
```

### Key Components

- **Inject Script**: Monitors table callbacks and sends all events to background
- **Content Script**: Passes messages from inject script to background script
- **Background Script**: Handles all notification logic based on current settings with smart suppression
- **Popup**: Provides settings management and status information

### Architecture Benefits

- **Responsive Settings**: Changes take effect immediately without page reload
- **Centralized Logic**: All notification decisions happen in background script
- **Clean Separation**: Inject script focuses only on data collection
- **Dynamic Updates**: Notifications update in-place rather than creating duplicates
- **Smart Suppression**: Prevents notification spam when actively using the site
- **Better Performance**: Efficient tab state detection and automatic cleanup

### Customization

You can modify the notification behavior by editing:

- Notification text format in the notification functions
- Default settings in `defaultSettings` object
- Suppression logic in `isTabActiveAndFocused()` and `isOnLobbyPage()` functions

## Version History

- **v1.4**: Added smart notification suppression when actively viewing lobby
- **v1.3**: Added friend muting functionality with individual toggles and reset option
- **v1.2**: Unified notification system with dynamic updates
- **v1.1**: Added configurable notification settings with instant updates
- **v1.0**: Initial release with basic friend tracking and notifications
