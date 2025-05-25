# UI Synchronization Module

## Overview

The UI Synchronization module handles real-time synchronization of user interface states across multiple participants in collaborative tarot reading sessions. This ensures all participants see consistent views and interactions.

## Key Features

- **Modal State Synchronization**: Shared modal states across participants
- **Pan & Focus Synchronization**: Coordinated view positioning and focus
- **Participant Notifications**: Real-time notifications for user actions
- **Real-time Updates**: Live UI state sharing via Supabase subscriptions
- **Conflict Resolution**: Smart handling of simultaneous user interactions

## Module Documentation

### 🔄 [Modal Synchronization Testing](./modal-synchronization-testing.md)
**Testing strategies for shared modal states**
- Modal state sharing patterns
- Cross-participant modal testing
- Synchronization validation
- Edge case handling

### 🎯 [Pan & Focus Synchronization](./pan-focus-synchronization.md)
**Coordinated view positioning and focus management**
- Pan offset synchronization
- Zoom focus coordination
- View state sharing
- Performance optimization

### 🔔 [Participant Notifications](./participant-notifications.md)
**Real-time notification system for participant actions**
- Join/leave notifications
- Action-based notifications
- Notification filtering
- User experience optimization

## Quick Start

### 1. Modal State Synchronization
```typescript
// Shared modal state structure
sharedModalState: {
  showCardGallery: boolean;
  cardIndex: number | null;
  showVideoChat: boolean;
}
```

### 2. Pan/Focus Synchronization
```typescript
// Pan and zoom state sharing
panOffset: { x: number; y: number };
zoomFocus: { x: number; y: number; scale: number };
```

### 3. Notification System
```typescript
// Participant notification handling
const handleParticipantJoin = (participant) => {
  if (!isCurrentUser(participant)) {
    showNotification(`${participant.name} joined the session`);
  }
};
```

## Related Code Files

### Core Implementation
- `src/stores/readingSessionStore.ts` - Main session state management
- `src/hooks/useReadingSession.ts` - Session synchronization hooks
- Modal synchronization utilities
- Notification management systems

### UI Components
- Shared modal components
- Notification display components
- Pan/zoom control interfaces
- Synchronization indicators

## Testing

### Synchronization Testing
- [ ] Modal states sync across participants
- [ ] Pan/zoom coordinates synchronize properly
- [ ] Notifications appear for relevant actions
- [ ] No duplicate notifications for same user
- [ ] Conflict resolution works correctly

### Performance Testing
- Real-time update latency
- Synchronization efficiency
- Memory usage optimization
- Network bandwidth usage

## Troubleshooting

### Common Issues
1. **Modal not syncing** → Check shared state subscription
2. **Pan/zoom desync** → Verify coordinate mapping
3. **Duplicate notifications** → Check user identification logic
4. **Sync delays** → Monitor real-time subscription performance

### Debug Tools
- Real-time state monitoring
- Synchronization event logging
- Performance profiling
- Network request tracking

---

This module ensures seamless collaborative experiences through synchronized UI states and real-time participant awareness. 