# Hanabi Utilities Chrome Extension

This Chrome extension tracks your friends' activity on hanab.live and sends desktop notifications when they join new tables.

## Features

- 🎴 **Real-time Monitoring**: Tracks table updates in real-time
- 👥 **Friend Detection**: Automatically detects when friends join tables
- 🔔 **Desktop Notifications**: Sends notifications when friends join new tables
- 🎯 **Smart Filtering**: Only notifies for tables you haven't joined and that haven't started yet
- ⏰ **Duplicate Prevention**: Prevents spam notifications with cooldown system
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
3. **Condition Checking**: Triggers notifications when:
   - `joined: false` (you haven't joined the table)
   - `running: false` (the game hasn't started yet)
   - At least one friend is in the `players` array

### Notification Logic

- **Smart Detection**: Checks if any players in a table match your friends list
- **Duplicate Prevention**: Uses a 30-second cooldown to prevent spam notifications
- **Rich Notifications**: Shows friend names and table information
- **Click to Focus**: Clicking notifications brings hanab.live tab to front

## Usage

1. **Navigate to hanab.live** and log in to your account
2. **The extension automatically starts** monitoring when the page loads
3. **Notifications appear** when friends join new tables
4. **Click the extension icon** to see status and friends list
5. **Click notifications** to return to hanab.live

## Popup Interface

The extension popup shows:
- **Extension Status**: Whether the tracker is active
- **Site Status**: Connection to hanab.live
- **Friends Count**: Number of friends in your list
- **Friends List**: All your current friends

## Privacy & Security

- **Local Only**: All data stays in your browser, nothing is sent to external servers
- **Read Only**: The extension only reads data from hanab.live, it doesn't modify anything
- **Minimal Permissions**: Only requests access to hanab.live and notification permissions

## Development

### File Structure
```
hanabi-friends-tracker/
├── manifest.json        # Extension configuration
├── inject.js            # Main tracking logic
├── content.js           # Passing messages
├── background.js        # Notification handling
├── popup.html           # Extension popup interface
├── popup.js             # Popup functionality
└── README.md            # This file
```

### Key Components

- **Inject Script**: Monitors table callbacks and detects friend activity
- **Content Script**: Passes messages from _Inject Script_ to _Background Script_
- **Background Script**: Handles notifications and prevents duplicates  
- **Popup**: Provides status information and friends list display

### Customization

You can modify the notification behavior by editing:
- `NOTIFICATION_COOLDOWN` in `background.js` (default: 30 seconds)
- Notification text format in the `handleFriendJoinedTable` function
- Table filtering conditions in the `content.js` callback wrapper

## Version History

- **v1.0**: Initial release with basic friend tracking and notifications
