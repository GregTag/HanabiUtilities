# Hanabi Utilities Chrome Extension

This Chrome extension tracks your friends' activity on hanab.live and sends desktop notifications when they join new tables.

## Features

- 🎴 **Real-time Monitoring**: Tracks table updates in real-time
- 👥 **Friend Detection**: Automatically detects when friends join tables
- 🔔 **Desktop Notifications**: Sends notifications when friends join new tables
- 🌐 **All Tables Mode**: Optional notifications for all open tables without passwords
- ⚙️ **Configurable Settings**: Toggle notifications on/off with instant updates
- 🎯 **Smart Filtering**: Only notifies for tables you haven't joined and that haven't started yet
- 🔄 **Dynamic Updates**: Notifications update in-place when table status changes
- 📊 **Status Dashboard**: Shows extension status and current friends list

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
5. **Condition Checking**: Triggers notifications when:
   - `joined: false` (you haven't joined the table)
   - `running: false` (the game hasn't started yet)
   - Settings allow the notification type

### Notification Settings

- **Friend Notifications**: Get notified when friends join tables (enabled by default)
- **All Open Tables**: Get notified for any open table without password (disabled by default)
- **Instant Updates**: Settings changes take effect immediately without page reload

### Notification Logic

- **Smart Detection**: Checks if any players in a table match your friends list
- **Unified Tracking**: Each table has at most one active notification that updates dynamically
- **Rich Notifications**: Shows friend names and table information
- **Click to Focus**: Clicking notifications brings hanab.live tab to front
- **Priority Levels**: Friend notifications have higher priority than general table notifications

## Usage

1. **Navigate to hanab.live** and log in to your account
2. **The extension automatically starts** monitoring when the page loads
3. **Configure notifications** by clicking the extension icon and using the toggle switches
4. **Notifications appear** based on your settings when:
   - Friends join new tables (if Friend Notifications enabled)
   - Any open table becomes available (if All Open Tables enabled)
5. **Click notifications** to return to hanab.live

## Popup Interface

The extension popup shows:
- **Extension Status**: Whether the tracker is active
- **Site Status**: Connection to hanab.live
- **Friends Count**: Number of friends in your list
- **Notification Settings**: Toggle switches for different notification types
- **Friends List**: All your current friends

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
└── README.md            # This file
```

### Key Components

- **Inject Script**: Monitors table callbacks and sends all events to background
- **Content Script**: Passes messages from inject script to background script
- **Background Script**: Handles all notification logic based on current settings
- **Popup**: Provides settings management and status information

### Architecture Benefits

- **Responsive Settings**: Changes take effect immediately without page reload
- **Centralized Logic**: All notification decisions happen in background script
- **Clean Separation**: Inject script focuses only on data collection
- **Dynamic Updates**: Notifications update in-place rather than creating duplicates
- **Better Performance**: No cooldown management or periodic cleanup needed

### Customization

You can modify the notification behavior by editing:
- Notification text format in the notification functions
- Default settings in `defaultSettings` object

## Version History

- **v1.2**: Unified notification system with dynamic updates
- **v1.1**: Added configurable notification settings with instant updates
- **v1.0**: Initial release with basic friend tracking and notifications
