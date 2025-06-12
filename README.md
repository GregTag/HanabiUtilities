# Hanabi Utilities Chrome Extension

This Chrome extension tracks your friends' activity on hanab.live and sends desktop notifications when they join new tables.

## Features

- 🎴 **Real-time Monitoring**: Tracks table updates in real-time using hanab.live's internal callback system
- 👥 **Friend Detection**: Automatically detects when friends join tables using your friends list
- 🔔 **Desktop Notifications**: Sends rich desktop notifications with friend names and table details
- 🔇 **Friend Muting**: Selectively mute notifications from specific friends with visual indicators
- 🌐 **All Tables Mode**: Optional notifications for all open tables without passwords
- ⚙️ **Configurable Settings**: Toggle notifications on/off with instant updates (no page reload required)
- 🎯 **Smart Filtering**: Only notifies for tables you haven't joined and that haven't started yet
- 🔄 **Dynamic Updates**: Notifications update in-place when table status changes (no duplicates)
- 📊 **Status Dashboard**: Shows extension status, connection status, and current friends list
- 🤫 **Smart Suppression**: Automatically suppresses notifications when you're actively viewing the relevant page
- 🎮 **Pre-Game Activity**: Track player join/leave activity in tables you've joined

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

The extension uses a multi-layered architecture for reliable table monitoring:

1. **Callback Interception**: Wraps `window.globals2.conn.callbacks.table` to monitor all table updates
2. **Friend List Access**: Reads your friends list from `window.globals2.friends`
3. **Event Processing**: Inject script sends all table events to background script via content script
4. **Settings-Based Filtering**: Background script applies current user settings before creating notifications
5. **Smart Suppression**: Automatically detects when you're actively viewing hanab.live to prevent spam
6. **Dynamic Updates**: Existing notifications are updated in-place rather than creating duplicates

### Notification Logic Flow

The extension processes table events through a sophisticated decision tree:

#### Lobby Table Notifications

- **Condition Checking**: Triggers when `joined: false` and `running: false`
- **Friend Detection**: Matches table players against your friends list
- **Muting Filter**: Removes muted friends from notification content
- **Settings Check**: Respects "Friend Notifications" and "All Open Tables" settings
- **Suppression Check**: Prevents notifications when actively viewing lobby page

#### Pre-Game Table Notifications

- **Player Change Detection**: Compares current vs previous player lists
- **Activity Analysis**: Identifies who joined or left the table
- **Smart Timing**: Only notifies after establishing baseline (first event is silent)
- **Page Detection**: Suppresses when viewing the specific table's pre-game page

### Smart Notification Suppression

The extension intelligently prevents notification spam using multi-layer detection:

- **Tab Activity**: Checks if hanab.live is the currently active browser tab
- **Window Focus**: Verifies the browser window is focused (not minimized or background)
- **Page-Specific Logic**:
  - Lobby page: Suppresses all lobby table notifications
  - Pre-game page: Suppresses notifications for that specific table only
- **Automatic Resume**: Notifications resume when you navigate away or switch contexts

This ensures you only get notified when the information would actually be useful.

### Notification Settings

- **Friend Notifications**: Get notified when friends join lobby tables (enabled by default)
- **All Open Tables**: Get notified for any open table without password (disabled by default)
- **Pre-Game Activity**: Get notified when players join/leave your tables (enabled by default)
- **Friend Muting**: Click on any friend's name to toggle notifications from them
- **Instant Updates**: All settings changes take effect immediately without page reload

### Friend Management

- **Individual Control**: Click on any friend's name in the popup to mute/unmute their notifications
- **Visual Feedback**: Muted friends display with red styling, unmuted friends with green styling
- **Batch Reset**: Use "Reset" button to unmute all friends at once (only visible when needed)
- **Persistent Storage**: Muted friends list syncs across browser sessions and devices

### Notification Behavior

- **Rich Content**: Shows friend names, table names, and player counts with proper grammar
- **Priority System**: Friend notifications have higher priority than general table notifications
- **Click Actions**: Clicking notifications brings hanab.live tab to front and focuses the window
- **Smart Updates**: Existing notifications update content rather than creating duplicates
- **Automatic Cleanup**: Notifications are cleared when conditions no longer apply
- **State Tracking**: Each table maintains at most one active notification

## Usage

1. **Navigate to hanab.live** and log in to your account
2. **The extension automatically starts** monitoring when the page loads
3. **Configure notifications** by clicking the extension icon and adjusting settings
4. **Notifications appear** based on your settings when:
   - Friends join new lobby tables (if Friend Notifications enabled)
   - Any open table becomes available (if All Open Tables enabled)
   - Players join/leave tables you're in (if Pre-Game Activity enabled)
   - You're not actively viewing the relevant page
5. **Click notifications** to return to hanab.live

## Popup Interface

The extension popup provides comprehensive status and control:

- **Extension Status**: Whether the tracker is active and functioning
- **Site Status**: WebSocket connection status to hanab.live
- **Friends Count**: Number of friends in your current friends list
- **Notification Settings**: Toggle switches for all notification types
- **Friends Management**: Interactive list showing all friends with mute/unmute controls
- **Reset Controls**: Quick reset button for clearing all friend mutes (appears when needed)

## Privacy & Security

- **Local Only**: All data processing happens in your browser, nothing sent to external servers
- **Read Only**: The extension only reads data from hanab.live, never modifies game state
- **Minimal Permissions**: Only requests access to hanab.live domains, notifications, and settings storage
- **No Data Collection**: Extension doesn't collect, store, or transmit any personal data
- **Open Source**: All code is provided for review and modification

## Development

### File Structure

```
HanabiUtilities/
├── manifest.json        # Extension configuration and permissions
├── inject.js            # Table monitoring and event detection (MAIN world)
├── content.js           # Message passing bridge (ISOLATED world)
├── background.js        # Notification logic and settings management
├── popup.html           # Extension popup interface
├── popup.js             # Popup functionality and user interactions
├── README.md            # This documentation
└── PRIVACY.md           # Privacy policy
```

### Architecture Design

The extension uses a clean separation of concerns:

- **Inject Script (MAIN world)**: Direct access to hanab.live's globals for data collection
- **Content Script (ISOLATED world)**: Secure message passing between inject and background
- **Background Script**: Centralized notification logic with smart suppression and settings management
- **Popup Interface**: User-friendly settings management with real-time status display

### Key Benefits

- **Responsive Settings**: All changes take effect immediately without requiring page reload
- **Centralized Logic**: All notification decisions happen in background script for consistency
- **Efficient Monitoring**: Inject script focuses only on data collection, not business logic
- **Smart Updates**: Notifications update in-place rather than creating spam
- **Robust Suppression**: Multi-layer detection prevents unnecessary notifications
- **Performance Optimized**: Efficient tab state detection and automatic cleanup

### Customization

You can modify the extension behavior by editing:

- **Notification Content**: Update the `buildContent()` methods in notification classes
- **Default Settings**: Modify the `defaultSettings` object in background script
- **Suppression Logic**: Adjust `isTabActiveAndFocused()` and page detection methods
- **Friend Detection**: Customize the friend matching logic in inject script

## Troubleshooting

### Common Issues

- **No Notifications**: Check that you're logged into hanab.live and have friends in your list
- **Extension Not Working**: Refresh the hanab.live page after installing the extension
- **Settings Not Saving**: Ensure Chrome has storage permissions for the extension
- **Wrong Tab Focus**: Extension tracks the most recent hanab.live tab that sent events

### Debug Information

Enable Chrome's developer console to see detailed logging from the extension, including:

- Table event processing
- Notification decisions
- Settings changes
- Tab state transitions

## Version History

- **v1.5**: Added pre-game activity tracking and improved notification logic
- **v1.4**: Added smart notification suppression when actively viewing lobby
- **v1.3**: Added friend muting functionality with individual toggles and reset option
- **v1.2**: Unified notification system with dynamic updates
- **v1.1**: Added configurable notification settings with instant updates
- **v1.0**: Initial release with basic friend tracking and notifications
