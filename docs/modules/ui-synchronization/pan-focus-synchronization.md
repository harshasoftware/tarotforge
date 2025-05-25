# Pan & Focus Synchronization System

## Overview

The TarotForge reading room implements a sophisticated pan and focus synchronization system that enables real-time collaborative viewing experiences. Participants can follow the host's view or choose to navigate independently, creating a seamless shared tarot reading experience.

## Core Features

### Real-Time Pan Synchronization
- **Host Broadcasting**: Host's pan movements are automatically synchronized to all participants
- **Participant Following**: Non-host participants can choose to follow the host's view
- **Independent Navigation**: Participants can opt out of following to navigate independently
- **Smooth Transitions**: All pan movements use hardware-accelerated transforms for 60fps performance

### Zoom Focus Synchronization
- **Coordinated Zooming**: Zoom level and focus points are synchronized across all participants
- **Contextual Focus**: Double-tap zoom focuses are shared, allowing everyone to see the same card details
- **Reset Synchronization**: Zoom resets affect all following participants simultaneously

### Follow Mode Controls
- **Toggle Following**: Simple button to enable/disable following host's view
- **Visual Feedback**: Clear indicators when following mode is active
- **Smart Notifications**: Temporary notifications inform users when following begins
- **Automatic Disabling**: Following automatically disables when user manually pans/zooms

## Technical Implementation

### Session State Integration

The pan and focus data is stored in the synchronized session state:

```typescript
interface ReadingSessionState {
  // ... other properties
  panOffset: { x: number; y: number };
  zoomFocus: { x: number; y: number } | null;
  zoomLevel: number;
}
```

### Wrapper Functions

Pan and zoom updates use wrapper functions that respect following mode:

```typescript
const setPanOffsetWrapped = useCallback((newPanOffset: { x: number; y: number }) => {
  if (!isFollowing) { // Only update if not following someone else
    updateSession({ panOffset: newPanOffset });
  }
}, [updateSession, isFollowing]);

const setZoomFocusWrapped = useCallback((newZoomFocus: { x: number; y: number } | null) => {
  if (!isFollowing) { // Only update if not following someone else
    updateSession({ zoomFocus: newZoomFocus });
  }
}, [updateSession, isFollowing]);
```

### Real-Time Synchronization

Updates are synchronized through Supabase real-time subscriptions:

```typescript
// Database schema includes pan/focus fields
pan_offset: { x: number; y: number }
zoom_focus: { x: number; y: number } | null
zoom_level: number

// Real-time updates automatically propagate to all participants
```

## User Experience

### Host Experience
- **Natural Control**: Host can pan and zoom normally without any special considerations
- **Automatic Broadcasting**: All movements are automatically shared with following participants
- **Visual Indicators**: Can see which participants are following their view
- **No Performance Impact**: Synchronization happens seamlessly in the background

### Participant Experience
- **Follow Button**: Easily accessible toggle in zoom controls panel
- **Clear Feedback**: Visual indicators and notifications when following is active
- **Smooth Following**: View updates smoothly match host's movements
- **Easy Override**: Can break following by manually panning/zooming
- **Independent Choice**: Can choose to follow or navigate independently at any time

### Mobile Optimization
- **Touch-Friendly**: Follow button is appropriately sized for mobile interaction
- **Gesture Respect**: Following mode respects mobile pan/zoom gestures
- **Performance Optimized**: Uses hardware acceleration for smooth mobile performance
- **Battery Conscious**: Efficient updates minimize battery drain

## UI Components

### Follow Button
- **Location**: Integrated into zoom controls panel
- **Visibility**: Only shown to non-host participants when multiple users present
- **States**: 
  - Inactive: `UserX` icon, neutral styling
  - Active: `UserCheck` icon, primary color highlighting
- **Tooltip**: Context-aware tooltip text based on current state

### Notifications
- **Follow Activation**: Temporary notification when following begins
- **Duration**: 3-second auto-dismiss
- **Positioning**: Centered on screen, non-intrusive
- **Styling**: Primary theme colors with clear iconography

### Visual Indicators
- **Button Highlighting**: Active follow button uses primary color scheme
- **Smooth Transitions**: All state changes use CSS transitions
- **Accessibility**: High contrast and clear visual hierarchy

## Performance Considerations

### Optimization Strategies
- **Debounced Updates**: Pan movements are debounced to ~120fps for optimal performance
- **Hardware Acceleration**: CSS transforms use `transform3d` for GPU acceleration
- **Selective Updates**: Only following participants receive pan/focus updates
- **Efficient Rendering**: Uses `contain: layout style paint` for rendering optimization

### Network Efficiency
- **Batched Updates**: Multiple rapid movements are batched into single database updates
- **Delta Compression**: Only changed values are transmitted
- **Connection Resilience**: Graceful handling of network interruptions
- **Offline Fallback**: Local state maintained when connection is lost

### Memory Management
- **Event Cleanup**: Proper cleanup of event listeners and subscriptions
- **State Optimization**: Minimal state footprint for pan/focus data
- **Garbage Collection**: No memory leaks from animation frames or timers

## Accessibility Features

### Keyboard Navigation
- **Arrow Key Support**: Arrow keys work for both host and following participants
- **Focus Management**: Proper focus handling when following mode changes
- **Screen Reader Support**: Appropriate ARIA labels and announcements

### Visual Accessibility
- **High Contrast**: Follow button maintains contrast ratios in all states
- **Clear Iconography**: Universally recognizable icons for follow states
- **Size Compliance**: Touch targets meet minimum size requirements

### Motor Accessibility
- **Large Touch Targets**: Follow button sized appropriately for various motor abilities
- **Reduced Motion**: Respects user's reduced motion preferences
- **Alternative Controls**: Keyboard alternatives to touch/mouse interactions

## Error Handling

### Network Issues
- **Connection Loss**: Graceful degradation when real-time connection is lost
- **Reconnection**: Automatic state synchronization when connection is restored
- **Timeout Handling**: Appropriate timeouts for synchronization operations

### State Conflicts
- **Race Conditions**: Proper handling of simultaneous updates from multiple users
- **State Validation**: Server-side validation of pan/focus values
- **Conflict Resolution**: Last-writer-wins strategy for conflicting updates

### User Experience Errors
- **Invalid States**: Prevention of invalid pan/focus combinations
- **Boundary Checking**: Enforcement of pan limits and zoom ranges
- **Graceful Fallbacks**: Sensible defaults when synchronization fails

## Security Considerations

### Data Validation
- **Input Sanitization**: All pan/focus values validated before storage
- **Range Checking**: Pan and zoom values constrained to safe ranges
- **Type Safety**: TypeScript ensures type safety throughout the system

### Access Control
- **Session Permissions**: Only session participants can update pan/focus
- **Host Privileges**: Host updates take precedence in conflict situations
- **Guest Limitations**: Appropriate restrictions for guest users

## Testing Scenarios

### Multi-User Testing
- **Host-Participant Sync**: Verify host movements sync to following participants
- **Independent Navigation**: Confirm participants can navigate independently
- **Follow Toggle**: Test follow mode activation/deactivation
- **Multiple Participants**: Test with various numbers of participants

### Performance Testing
- **Rapid Movements**: Test with fast, continuous pan/zoom operations
- **Network Latency**: Test under various network conditions
- **Device Performance**: Test on low-end mobile devices
- **Battery Impact**: Monitor battery usage during extended sessions

### Edge Case Testing
- **Connection Interruption**: Test behavior during network disconnections
- **Rapid State Changes**: Test rapid follow mode toggling
- **Boundary Conditions**: Test extreme pan/zoom values
- **Concurrent Updates**: Test simultaneous updates from multiple users

## Future Enhancements

### Advanced Following
- **Follow Specific Participants**: Allow following any participant, not just host
- **Selective Following**: Follow only pan or only zoom, not both
- **Follow History**: Replay of host's navigation path
- **Smart Following**: Automatic following based on user behavior

### Enhanced Collaboration
- **Attention Indicators**: Show where each participant is looking
- **Guided Tours**: Host can create guided navigation sequences
- **Annotation Sync**: Synchronized pointing/annotation tools
- **Voice Integration**: Voice commands for navigation control

### Performance Improvements
- **Predictive Sync**: Anticipate and pre-load likely navigation targets
- **Adaptive Quality**: Adjust sync frequency based on device capabilities
- **Compression**: Advanced compression for pan/focus data
- **Edge Caching**: Cache frequently accessed view states

This pan and focus synchronization system creates a truly collaborative tarot reading experience, allowing participants to share not just the cards and interpretation, but also the visual journey through the reading itself. 