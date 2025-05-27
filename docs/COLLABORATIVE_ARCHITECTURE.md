# Collaborative Session Architecture

## Overview

The new collaborative session architecture provides a scalable, performant, and feature-rich system for real-time tarot reading sessions with dynamic host transfer, progressive data loading, and optimized performance.

## Key Features

### 1. **Dynamic Host Transfer**
- **Automatic Transfer**: When inviting a professional reader, host role automatically transfers
- **Manual Transfer**: Current host can transfer control to any authenticated participant
- **Host Reclaim**: Original host can reclaim control at any time
- **Transfer History**: Complete audit trail of all host transfers

### 2. **Progressive Data Loading**
- **Stage 1 - Critical Data** (25ms): Session state, layout, and participants
- **Stage 2 - View State** (500ms): Pan/zoom positions and viewport data
- **Stage 3 - Presence** (1s): Cursor positions and user activity
- **Stage 4 - Full Data** (2s): Shuffled deck, interpretation, and history

### 3. **Performance Optimizations**
- **Debounced View Updates**: Pan/zoom updates batched at 100ms intervals
- **Throttled Presence**: Cursor updates limited to 20fps
- **Separate Viewport Table**: High-frequency updates isolated from main session
- **Metrics Tracking**: Real-time monitoring of DB and presence update rates

### 4. **Enhanced Invite System**
- **Role-Based Invites**: Different permissions for readers vs participants
- **Smart Links**: Expiring, single-use, or multi-use invites
- **Auto Host Transfer**: Reader invites include automatic host transfer
- **Invite Analytics**: Track usage and click-through rates

## Architecture Components

### Store Structure

```typescript
// Enhanced Session State
interface CollaborativeSessionState {
  // Core data (immediate sync)
  id: string;
  hostUserId: string | null;
  originalHostUserId: string | null;
  hostTransferHistory: HostTransfer[];
  pendingHostTransfer: PendingTransfer | null;
  // ... other session data
  
  // View state (debounced sync)
  viewState: ViewState;
  
  // Ephemeral state (presence only)
  presence: { [userId: string]: PresenceData };
}
```

### Database Schema

#### New Tables

1. **session_viewports**
   - Handles high-frequency pan/zoom updates
   - Separate from main session table for performance
   - Primary key: (session_id, user_id)

2. **session_invites**
   - Tracks invite links with metadata
   - Supports expiration and usage limits
   - Role-based permissions

#### Updated Tables

1. **reading_sessions**
   - Added: original_host_user_id, host_transfer_history, pending_host_transfer
   - Enhanced RLS policies for host management

2. **session_participants**
   - Added: role field ('host' | 'participant' | 'reader')
   - Enhanced tracking for role-based permissions

### Real-time Channels

1. **Main Session Channel** (`session:{id}`)
   - Session state updates
   - Host transfer notifications
   - Critical data sync

2. **Presence Channel** (`presence:{id}`)
   - User activity tracking
   - Cursor positions
   - Follow state

3. **Viewport Channel** (`viewport:{id}`)
   - Pan/zoom synchronization
   - View following functionality

## Implementation Guide

### 1. Migrating from Old Store

```typescript
// In ReadingRoom component
import { useCollaborativeStore } from '../stores/collaborativeSessionStore';
import { useProgressiveSync } from '../hooks/useProgressiveSync';

// Replace old store usage
const {
  sessionState,
  updateImmediate,      // For critical updates
  queueViewUpdate,      // For pan/zoom (debounced)
  updatePresence,       // For cursor tracking
  transferHost,         // For host management
  // ... other methods
} = useCollaborativeStore();

// Use progressive sync hook
const { stage, progress, error } = useProgressiveSync({
  sessionId,
  onStageComplete: (stage) => {
    console.log(`Loaded ${stage} data`);
  }
});
```

### 2. Implementing Host Transfer

```typescript
// Invite a professional reader
const inviteLink = await inviteHelpers.inviteReader(sessionId);

// Transfer host manually
await transferHost(targetUserId);

// Accept pending transfer (reader side)
await acceptHostTransfer();

// Reclaim host (original host only)
await reclaimHost();
```

### 3. Optimizing Updates

```typescript
// Critical updates (immediate)
await updateImmediate({
  selectedCards,
  selectedLayout,
  readingStep
});

// View updates (debounced)
queueViewUpdate({
  panOffset: { x, y },
  zoomLevel: 1.5
});

// Presence updates (throttled)
updatePresence({
  cursor: { x, y },
  isTyping: true
});
```

### 4. Performance Monitoring

```typescript
// Add performance monitor to your app
import PerformanceMonitor from './components/collaboration/PerformanceMonitor';

// In your component
<PerformanceMonitor 
  show={isDevelopment} 
  position="bottom-right" 
/>
```

## Migration Checklist

- [ ] Run database migrations for new tables and columns
- [ ] Update ReadingRoom to use useCollaborativeStore
- [ ] Implement progressive sync with loading indicators
- [ ] Add invite handler routes
- [ ] Update share functionality to use smart invites
- [ ] Add performance monitoring in development
- [ ] Test host transfer flows
- [ ] Verify presence indicators work correctly
- [ ] Test offline mode fallbacks
- [ ] Update documentation and user guides

## Performance Targets

- **Initial Load**: < 500ms for critical data
- **Full Sync**: < 3s for complete session state
- **View Updates**: < 16ms latency (60fps)
- **Presence Updates**: < 50ms latency (20fps)
- **DB Updates**: < 30/minute under normal usage
- **Network Overhead**: < 5KB/s per participant

## Security Considerations

1. **Host Transfer Validation**
   - Only authenticated users can become hosts
   - Cooldown period between transfers
   - Original host can always reclaim

2. **Invite Security**
   - Cryptographically secure invite IDs
   - Server-side validation and increment
   - Automatic expiration and usage limits

3. **RLS Policies**
   - Participants can only update their own viewport
   - Only hosts can update critical session data
   - Presence data visible to all participants

## Troubleshooting

### Common Issues

1. **Slow Initial Load**
   - Check network latency
   - Verify progressive sync stages
   - Monitor metrics for bottlenecks

2. **Lost Updates**
   - Check for RLS policy violations
   - Verify debounce/throttle settings
   - Monitor broadcast channel health

3. **Host Transfer Failed**
   - Verify user authentication
   - Check cooldown period
   - Review transfer history

### Debug Tools

```typescript
// Enable debug logging
localStorage.setItem('COLLABORATIVE_DEBUG', 'true');

// Monitor performance
const { metrics } = useCollaborativeStore();
console.log('Performance metrics:', metrics);

// Track sync stages
const { stage, progress } = useProgressiveSync({ sessionId });
console.log(`Sync progress: ${stage} (${progress}%)`);
```

## Future Enhancements

1. **Conflict Resolution**
   - Operational Transform for card movements
   - CRDT for text editing
   - Automatic merge strategies

2. **Advanced Presence**
   - Voice indicators
   - Screen sharing status
   - Detailed activity tracking

3. **Performance Improvements**
   - WebRTC data channels for presence
   - Edge computing for regional optimization
   - Predictive prefetching

4. **Analytics Dashboard**
   - Session performance metrics
   - User engagement tracking
   - Host transfer patterns 