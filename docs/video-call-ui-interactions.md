# Video Call UI Interactions Documentation

## Overview

This document describes the user interface interactions for the enhanced video calling system in TarotForge, which features automatic video call initiation on sharing and mobile-optimized bubble display.

## Key Changes Summary

- **Removed**: Dedicated video call button from top navigation
- **Added**: Automatic video call start when sharing
- **Enhanced**: Mobile-optimized bubble display (max 2 bubbles)
- **Improved**: Smart participant management and positioning

---

## User Interface Flow

### 1. Starting a Video Call (Auto-Start on Share)

#### Desktop Experience
1. **User clicks Share button** in top navigation bar
2. **System automatically starts video call** (if not already active)
3. **Loading indicator appears** briefly (500ms)
4. **Video chat bubbles appear** with local video
5. **Share modal opens** with updated messaging

#### Mobile Experience
1. **User taps Share button** in top navigation
2. **Video call auto-starts** with mobile-optimized layout
3. **Two video bubbles appear** (local + space for remote)
4. **Native share dialog opens** (if supported) or fallback modal

### 2. Video Bubble Display System

#### Desktop Layout (Unlimited Participants)
```
┌─────────────────────────────────────┐
│  Reading Room Interface             │
│                                     │
│  [Local]  [P1]  [P2]  [P3]         │ ← Horizontal for 1-3 participants
│                                     │
│  [P4]  [P5]  [P6]  [P7]            │ ← Grid layout for 4+ participants
│                                     │
│  Controls: [Mute] [Video] [End]     │
└─────────────────────────────────────┘
```

#### Mobile Layout (Max 2 Bubbles)
```
┌─────────────────────┐
│  Reading Room       │
│                     │
│  [Local] [Remote]   │ ← Only 2 bubbles max
│                     │
│  Counter: 5+ users  │ ← Shows actual count
│                     │
│  [Mute] [Video]     │ ← Simplified controls
└─────────────────────┘
```

### 3. Participant Counter Behavior

#### When 2 or fewer participants:
- **Desktop**: Shows exact count (e.g., "2 participants")
- **Mobile**: Shows exact count (e.g., "2")

#### When 3+ participants:
- **Desktop**: Shows exact count (e.g., "5 participants")
- **Mobile**: Shows count with plus (e.g., "5+")

---

## Detailed UI Interactions

### Share Button Interaction

#### Before Clicking Share:
```
[Share] ← Standard share icon, no video indication
```

#### After Clicking Share:
1. **Loading State** (500ms):
   ```
   [🔄] ← Loading spinner
   ```

2. **Video Active State**:
   ```
   [Share] + Video bubbles appear
   ```

3. **Share Modal Content**:
   ```
   ┌─────────────────────────────────────┐
   │ Share Reading Room                  │
   ├─────────────────────────────────────┤
   │ Share this link with others to      │
   │ invite them to your reading room    │
   │ with video chat.                    │
   │                                     │
   │ ✓ Video chat is now active!         │ ← New indicator
   │                                     │
   │ [Copy Link] [Done]                  │
   └─────────────────────────────────────┘
   ```

### Video Bubble Interactions

#### Local Video Bubble:
- **Label**: "You" or "You (Camera Off)"
- **Draggable**: Yes, anywhere on screen
- **Controls**: Integrated mute/video toggle
- **Size**: 64px (mobile) / 128px (desktop)

#### Remote Video Bubbles:
- **Label**: "Participant 1", "Participant 2", etc.
- **Draggable**: Yes, anywhere on screen
- **Fallback**: User icon when no video stream
- **Mobile Limit**: Only first participant shown

#### Bubble Positioning:
- **Initial Position**: Auto-calculated based on screen size
- **Mobile**: Side-by-side layout (local + first remote)
- **Desktop**: Grid layout for optimal space usage
- **Constraints**: Bubbles stay within screen bounds

### Video Controls Interface

#### Mobile Controls (Simplified):
```
┌─────────────────────┐
│ [🎤] [📹] [📞] [5+] │ ← Mute, Video, End, Count
└─────────────────────┘
```

#### Desktop Controls (Full):
```
┌─────────────────────────────────────┐
│ [🎤] [📹] [📞] [📋] [⚙️] [5 participants] │
└─────────────────────────────────────┘
```

---

## User Experience Scenarios

### Scenario 1: Host Starts Session
1. **Host clicks Share** → Video auto-starts
2. **Local bubble appears** with "You" label
3. **Share modal shows** with video chat messaging
4. **Host shares link** via native share or copy

### Scenario 2: Participant Joins (Mobile)
1. **Participant clicks shared link**
2. **Auto-joins video call** (if enabled)
3. **Sees host bubble + own bubble** (2 total)
4. **Counter shows actual participant count** (e.g., "3+")

### Scenario 3: Multiple Participants (Desktop)
1. **All participants visible** in grid layout
2. **Smart positioning** based on participant count
3. **Full controls available** for each participant
4. **Real-time updates** as participants join/leave

### Scenario 4: Participant Joins (Mobile with 3+ existing)
1. **New participant joins** existing session
2. **Mobile users see** host + first participant only
3. **Counter updates** to show "4+" participants
4. **Desktop users see** all participants in grid

---

## Visual States and Feedback

### Loading States
- **Share button**: Spinner during video initialization
- **Video bubbles**: Placeholder while connecting
- **Participant counter**: Updates in real-time

### Success States
- **Green indicator**: Video chat active in share modal
- **Video streams**: Live video feeds in bubbles
- **Participant count**: Accurate real-time count

### Error States
- **Permission denied**: Fallback to audio-only or text
- **Connection failed**: Retry mechanism with user feedback
- **Network issues**: Graceful degradation

### Empty States
- **No participants**: Only local bubble visible
- **Waiting for connection**: Loading placeholder in remote bubbles

---

## Accessibility Features

### Keyboard Navigation
- **Tab order**: Share → Video controls → Bubbles
- **Enter/Space**: Activate buttons and controls
- **Escape**: Close modals and overlays

### Screen Reader Support
- **Button labels**: Clear descriptions for all controls
- **Status announcements**: Video call state changes
- **Participant updates**: Announce joins/leaves

### Visual Indicators
- **High contrast**: Clear button states and borders
- **Focus indicators**: Visible focus rings on interactive elements
- **Status icons**: Clear visual feedback for mute/video states

---

## Performance Considerations

### Mobile Optimizations
- **Limited bubbles**: Reduces rendering overhead
- **Smaller sizes**: 64px vs 128px for better performance
- **Touch-optimized**: Larger touch targets for mobile

### Desktop Optimizations
- **Hardware acceleration**: CSS transforms for smooth dragging
- **Efficient layouts**: Grid calculations minimize reflows
- **Debounced updates**: Smooth position updates during drag

### Network Efficiency
- **Auto-join logic**: Intelligent connection management
- **Graceful degradation**: Fallback for poor connections
- **Resource cleanup**: Proper disposal of video streams

---

## Technical Implementation Notes

### State Management
- **Video call state**: Synchronized across all participants
- **Bubble positions**: Local state with drag persistence
- **Participant tracking**: Real-time updates via Supabase

### Event Handling
- **Share click**: Triggers video auto-start sequence
- **Drag interactions**: Smooth bubble repositioning
- **Resize events**: Responsive layout adjustments

### Error Handling
- **Permission failures**: Graceful fallback options
- **Network errors**: Retry mechanisms and user feedback
- **Browser compatibility**: Feature detection and polyfills

---

## Future Enhancements

### Planned Features
- **Picture-in-picture**: Minimize video to corner
- **Screen sharing**: Share tarot reading screen
- **Recording**: Save video sessions for later review

### Mobile Improvements
- **Swipe gestures**: Navigate between hidden participants
- **Expandable view**: Temporary full participant view
- **Voice indicators**: Visual feedback for speaking participants

### Desktop Enhancements
- **Custom layouts**: User-defined bubble arrangements
- **Participant management**: Host controls for muting/removal
- **Advanced settings**: Video quality and bandwidth controls 