# Participant Notifications System

## Overview

The participant notification system displays real-time alerts in the top-right corner when users join or leave a tarot reading session. This includes both authenticated users and anonymous participants.

## Features

### ✅ **Real-Time Notifications**
- Instant alerts when participants join or leave
- Supports both authenticated and anonymous users
- Automatic dismissal after 4 seconds
- Manual close option available

### ✅ **Smart Positioning**
- Notifications appear in top-right corner
- Multiple notifications stack vertically
- Smooth slide-in/out animations
- Mobile-responsive design

### ✅ **User Differentiation**
- **Authenticated Users**: Labeled as "User [Name]"
- **Anonymous Users**: Labeled as "Guest [Name]" with subtitle
- Clear visual distinction between join/leave events

## UI Components

### ParticipantNotification
Individual notification component with:
- **Join Events**: Green accent with UserPlus icon
- **Leave Events**: Orange accent with UserMinus icon
- **Auto-close**: 4-second timer with smooth fade-out
- **Manual close**: X button for immediate dismissal

### ParticipantNotificationManager
Manages multiple notifications:
- **Stacking**: Vertical arrangement with 80px spacing
- **Cleanup**: Automatic removal of expired notifications
- **Performance**: Efficient rendering with React keys

## Visual Design

### Join Notification
```
┌─────────────────────────────────────┐
│ [+] User "John Doe" joined the      │
│     session                         │ [X]
└─────────────────────────────────────┘
```

### Leave Notification
```
┌─────────────────────────────────────┐
│ [-] Guest "Anonymous User" left     │
│     the session                     │ [X]
│     Anonymous participant           │
└─────────────────────────────────────┘
```

### Multiple Notifications
```
┌─────────────────────────────────────┐
│ [+] User "Alice" joined the session │ [X]
└─────────────────────────────────────┘
┌─────────────────────────────────────┐
│ [-] Guest "Bob" left the session    │ [X]
│     Anonymous participant           │
└─────────────────────────────────────┘
```

## Technical Implementation

### State Management
```typescript
interface NotificationData {
  id: string;
  type: 'join' | 'leave';
  participantName: string;
  isAnonymous: boolean;
  timestamp: number;
}
```

### Participant Tracking
- Monitors `participants` array changes via useEffect
- Compares current vs previous participant lists
- Generates notifications for differences
- Excludes current user from notifications

### Animation System
- **Entry**: Slide in from right with scale effect
- **Exit**: Slide out to right with fade
- **Duration**: 300ms with easeOut timing
- **Stacking**: Smooth vertical repositioning

## User Experience

### Notification Lifecycle
1. **Participant Change Detected** → Notification created
2. **Slide-in Animation** → Notification appears (300ms)
3. **Display Period** → Visible for 4 seconds
4. **Auto-dismiss** → Fade out and remove (300ms)

### Manual Interaction
- **Close Button**: Immediate dismissal
- **Hover Effects**: Visual feedback on interactive elements
- **Touch-friendly**: 44px minimum touch targets

### Accessibility
- **Screen Reader**: Proper ARIA labels and announcements
- **Keyboard**: Tab navigation and Enter/Space activation
- **High Contrast**: Clear visual indicators
- **Focus Management**: Visible focus rings

## Integration Points

### Reading Room Integration
- Positioned outside main content flow
- High z-index (200) to appear above all content
- No interference with video bubbles or modals
- Responsive to mobile/desktop layouts

### Session Management
- Syncs with Supabase realtime participant updates
- Handles both authenticated and guest users
- Respects session loading states
- Cleanup on component unmount

## Configuration Options

### Timing
- **Auto-close Delay**: 4000ms (configurable)
- **Animation Duration**: 300ms
- **Stack Spacing**: 80px vertical offset

### Styling
- **Join Color**: Green (success theme)
- **Leave Color**: Orange (warning theme)
- **Background**: Card with backdrop blur
- **Border**: Themed accent colors

## Testing Scenarios

### Basic Functionality
1. **User Joins**: Authenticated user joins session
2. **Guest Joins**: Anonymous user joins session
3. **User Leaves**: Authenticated user leaves session
4. **Guest Leaves**: Anonymous user leaves session

### Edge Cases
1. **Multiple Rapid Changes**: Several users join/leave quickly
2. **Session Loading**: Notifications during session initialization
3. **Current User**: No notification for self join/leave
4. **Network Issues**: Handling connection drops

### Mobile Testing
1. **Portrait Mode**: Notifications in top-right corner
2. **Landscape Mode**: Proper positioning maintained
3. **Touch Interaction**: Close button accessibility
4. **Screen Sizes**: Responsive design across devices

## Performance Considerations

### Optimization
- **React.memo**: Prevent unnecessary re-renders
- **useCallback**: Stable function references
- **Efficient Filtering**: Minimal array operations
- **Cleanup**: Proper timer and state cleanup

### Memory Management
- **Auto-removal**: Expired notifications cleaned up
- **State Limits**: Prevent notification accumulation
- **Event Listeners**: Proper cleanup on unmount

## Future Enhancements

### Planned Features
- **Sound Notifications**: Audio alerts for join/leave
- **Notification History**: View past participant activity
- **Custom Messages**: Personalized join/leave messages
- **Notification Settings**: User preferences for alerts

### Advanced Features
- **Participant Avatars**: Profile pictures in notifications
- **Role Indicators**: Host/participant badges
- **Activity Summary**: Bulk notifications for multiple changes
- **Notification Center**: Persistent notification panel

## Troubleshooting

### Common Issues
1. **Notifications Not Appearing**: Check participant tracking logic
2. **Multiple Notifications**: Verify participant comparison logic
3. **Positioning Issues**: Check z-index and CSS positioning
4. **Animation Problems**: Verify Framer Motion setup

### Debug Steps
1. **Console Logging**: Track participant changes
2. **State Inspection**: Monitor notification array
3. **Network Tab**: Verify realtime updates
4. **Component Tree**: Check React DevTools

## API Reference

### ParticipantNotification Props
```typescript
interface ParticipantNotificationProps {
  type: 'join' | 'leave';
  participantName: string;
  isAnonymous: boolean;
  onClose: () => void;
  autoCloseDelay?: number; // Default: 4000ms
}
```

### ParticipantNotificationManager Props
```typescript
interface ParticipantNotificationManagerProps {
  notifications: NotificationData[];
  onRemoveNotification: (id: string) => void;
}
``` 