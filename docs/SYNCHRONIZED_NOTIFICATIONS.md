# Synchronized Notifications & Loading States

## Overview
This document details the implementation of synchronized deck clearing notifications and loading states across all participants in a tarot reading session.

## Architecture

### Database Schema
```sql
-- Migration: 20250526030000_add_loading_states.sql
ALTER TABLE reading_sessions 
ADD COLUMN loading_states JSONB DEFAULT NULL;

COMMENT ON COLUMN reading_sessions.loading_states IS 'Stores loading states for shuffling and interpretation generation with participant attribution';
```

### Data Structure
```typescript
interface LoadingStates {
  isShuffling: boolean;
  isGeneratingInterpretation: boolean;
  triggeredBy: string | null; // participant ID who triggered the action
}

interface NotificationData {
  id: string;
  type: 'join' | 'leave' | 'deck-cleared';
  participantName: string;
  isAnonymous: boolean;
  timestamp: number;
}
```

## Implementation Details

### 1. Notification System Extension

#### ParticipantNotification.tsx
```typescript
// Extended notification types
interface ParticipantNotificationProps {
  type: 'join' | 'leave' | 'deck-cleared';
  participantName: string;
  isAnonymous: boolean;
  onClose: () => void;
  autoCloseDelay?: number;
}

// Icon mapping
const getIcon = () => {
  switch (type) {
    case 'join': return <UserPlus className="h-5 w-5 text-green-500" />;
    case 'leave': return <UserMinus className="h-5 w-5 text-orange-500" />;
    case 'deck-cleared': return <RotateCcw className="h-5 w-5 text-blue-500" />;
  }
};

// Color scheme mapping
const getBorderColor = () => {
  switch (type) {
    case 'join': return 'border-green-500/30';
    case 'leave': return 'border-orange-500/30';
    case 'deck-cleared': return 'border-blue-500/30';
  }
};
```

### 2. Deck Clearing Synchronization

#### ReadingRoom.tsx - resetCards Function
```typescript
const resetCards = useCallback(() => {
  // ... existing logic ...
  
  // Broadcast reset cards action with participant info
  broadcastGuestAction('resetCards', { 
    shuffledDeck: freshlyShuffled,
    resetType: 'cards',
    participantName: user?.email?.split('@')[0] || 
                    participants.find(p => p.id === participantId)?.name || 
                    'Anonymous',
    isAnonymous: !user
  });
}, [updateSession, cards, fisherYatesShuffle, broadcastGuestAction, user, participants, participantId]);
```

#### Broadcast Handler
```typescript
const handleBroadcast = (payload: any) => {
  const { action, data, participant_id: senderParticipantId } = payload;
  
  switch (action) {
    case 'resetCards':
      if (data.shuffledDeck) {
        // Update deck state
        setShuffledDeck(data.shuffledDeck);
        setShowMobileInterpretation(false);
        setInterpretationCards([]);
        setDeckRefreshKey(prev => prev + 1);
        
        // Show deck cleared notification
        if (data.participantName) {
          const notification = {
            id: `deck-cleared-${senderParticipantId}-${Date.now()}`,
            type: 'deck-cleared' as const,
            participantName: data.participantName,
            isAnonymous: data.isAnonymous || false,
            timestamp: Date.now()
          };
          
          setNotifications(prev => [...prev, notification]);
        }
      }
      break;
  }
};
```

### 3. Loading States Restoration

#### Store Integration
```typescript
// readingSessionStore.ts
const updateSession = async (updates: Partial<ReadingSessionState>) => {
  // ... existing logic ...
  
  // Re-enabled loading states mapping
  if (updates.loadingStates !== undefined) {
    updateData.loading_states = updates.loadingStates;
  }
  
  // ... rest of function ...
};
```

#### Shuffle Function with Loading States
```typescript
const shuffleDeck = useCallback(() => {
  setIsShuffling(true);
  
  // Update session state to show shuffling for all participants
  updateSession({ 
    loadingStates: { 
      isShuffling: true, 
      isGeneratingInterpretation: false,
      triggeredBy: participantId 
    } 
  });
  
  setTimeout(() => {
    const currentDeck = shouldUseSessionDeck ? sessionShuffledDeck : shuffledDeck;
    const newShuffledDeck = fisherYatesShuffle(currentDeck);
    setShuffledDeck(newShuffledDeck);
    setIsShuffling(false);
    setDeckRefreshKey(prev => prev + 1);
    
    // Update session state with new shuffled deck and clear loading state
    updateSession({ 
      shuffledDeck: newShuffledDeck,
      loadingStates: null
    });
    
    // Broadcast shuffle action
    broadcastGuestAction('shuffleDeck', { 
      shuffledDeck: newShuffledDeck 
    });
  }, 1000);
}, [/* dependencies */]);
```

## User Experience

### Notification Messages
- **Deck Cleared**: `"User 'Alice' cleared the deck"` / `"Guest 'Bob' cleared the deck"`
- **Join**: `"User 'Alice' joined the session"` / `"Guest 'Bob' joined the session"`
- **Leave**: `"User 'Alice' left the session"` / `"Guest 'Bob' left the session"`

### Loading State Messages
- **Self-triggered**: `"Shuffling cards..."` / `"Generating interpretation..."`
- **Other-triggered**: `"Another participant is shuffling cards..."` / `"Another participant is generating interpretation..."`

### Visual Design
- **Deck Cleared**: Blue color scheme with rotate icon
- **Join**: Green color scheme with plus icon
- **Leave**: Orange color scheme with minus icon
- **Auto-dismiss**: All notifications close after 4 seconds

## Real-time Synchronization

### Flow Diagram
```
Participant A                    Database                    Participant B
     |                              |                              |
     | 1. Clear deck                |                              |
     |----------------------------->|                              |
     |                              | 2. Update session state     |
     |                              |----------------------------->|
     |                              |                              | 3. Show notification
     |                              |                              | 4. Update deck state
```

### Broadcast System
- Uses Supabase realtime channels
- Participant attribution via `participant_id`
- Action-specific data payloads
- Automatic cleanup and error handling

## Error Handling

### Database Migration
- Graceful fallback if migration not applied
- Temporary disabling of loading states
- Console warnings for debugging

### Network Issues
- Local state preservation
- Retry mechanisms for failed broadcasts
- Offline mode compatibility

## Performance Considerations

### Database Impact
- JSONB field: ~100 bytes per session
- Indexed for efficient queries
- Automatic cleanup on session end

### Memory Usage
- Notification auto-cleanup prevents leaks
- Efficient state management
- Minimal re-renders

### Network Traffic
- Compressed JSON payloads
- Debounced updates
- Only essential data transmitted

## Testing

### Unit Tests
```typescript
// Test notification creation
expect(notification.type).toBe('deck-cleared');
expect(notification.participantName).toBe('Alice');
expect(notification.isAnonymous).toBe(false);

// Test loading state synchronization
expect(sessionState.loadingStates?.isShuffling).toBe(true);
expect(sessionState.loadingStates?.triggeredBy).toBe(participantId);
```

### Integration Tests
- Multi-participant session simulation
- Network failure scenarios
- Database migration testing
- Mobile device compatibility

## Deployment

### Prerequisites
- Supabase database access
- Migration execution permissions
- Real-time subscriptions enabled

### Migration Steps
1. Apply database migration: `npx supabase db push`
2. Verify column creation in `reading_sessions` table
3. Test with existing sessions
4. Monitor for errors in production

### Rollback Plan
- Disable loading states mapping
- Remove notification handling
- Revert database schema if needed

## Future Enhancements

### Potential Additions
- Card selection notifications
- Interpretation sharing alerts
- Video call status updates
- Custom notification preferences

### Performance Optimizations
- Notification batching
- Selective participant updates
- Caching strategies
- Compression improvements 