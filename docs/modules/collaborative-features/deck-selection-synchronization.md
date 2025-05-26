# Deck Selection Modal Synchronization

## Overview

The deck selection modal and its tabs (My Collection vs Marketplace) are now fully synchronized across all participants in a reading session. This ensures that when one participant changes tabs or selects a marketplace deck for details, all other participants see the same view in real-time.

## Features

### Synchronized States

1. **Active Tab Selection**
   - Collection tab vs Marketplace tab
   - Real-time synchronization across all participants
   - Visual feedback showing which participant triggered the change

2. **Marketplace Deck Details**
   - Selected marketplace deck for detailed view
   - Synchronized deck details modal
   - Participant attribution for who opened the details

3. **Modal State Management**
   - Open/closed state of deck selection modal
   - Triggering participant tracking
   - Automatic cleanup when participants leave

## Technical Implementation

### Session State Structure

```typescript
deckSelectionState?: {
  isOpen: boolean;
  activeTab: 'collection' | 'marketplace';
  selectedMarketplaceDeck: string | null; // deck ID
  triggeredBy: string | null; // participant ID who triggered the action
} | null;
```

### Database Schema

```sql
-- reading_sessions table
ALTER TABLE reading_sessions 
ADD COLUMN deck_selection_state JSONB DEFAULT NULL;
```

### Key Components

#### State Management
- **Session State**: Persistent storage in database
- **Real-time Sync**: Database change subscriptions
- **Local State**: Immediate UI updates for better UX
- **Participant Attribution**: Track who triggered each action

#### Synchronization Functions

```typescript
// Update deck selection tab
const setDeckSelectionTab = (tab: 'collection' | 'marketplace') => {
  updateDeckSelectionState({
    isOpen: isDeckSelectionOpen,
    activeTab: tab,
    selectedMarketplaceDeck: selectedMarketplaceDeckId || null,
    triggeredBy: participantId || null
  });
};

// Select marketplace deck for details
const selectMarketplaceDeck = (deckId: string | null) => {
  updateDeckSelectionState({
    isOpen: isDeckSelectionOpen,
    activeTab: deckSelectionTab,
    selectedMarketplaceDeck: deckId,
    triggeredBy: participantId || null
  });
};
```

## User Experience

### Collaborative Deck Selection

1. **Tab Synchronization**
   - When one participant switches between "My Collection" and "Marketplace" tabs
   - All participants see the same tab selection immediately
   - Smooth transitions with visual feedback

2. **Marketplace Deck Details**
   - When one participant clicks on a marketplace deck to view details
   - All participants see the same deck details view
   - Back navigation is synchronized across all participants

3. **Visual Feedback**
   - Clear indication of which participant triggered each action
   - Smooth animations and transitions
   - Consistent UI state across all devices

### Participant Attribution

The system tracks which participant triggered each deck selection action:

- **Tab Changes**: Shows who switched tabs
- **Deck Selection**: Shows who opened deck details
- **Modal Actions**: Shows who opened/closed modals

## Benefits

### Enhanced Collaboration

1. **Shared Context**
   - All participants see the same deck selection interface
   - No confusion about which deck is being discussed
   - Synchronized browsing experience

2. **Real-time Coordination**
   - Instant synchronization of all deck selection actions
   - Participants can collaborate on deck selection
   - Shared decision-making process

3. **Improved Communication**
   - Visual cues about participant actions
   - Clear indication of who is driving the selection
   - Better coordination during deck changes

### Technical Benefits

1. **Consistent State**
   - Single source of truth for deck selection state
   - Automatic conflict resolution
   - Reliable synchronization

2. **Performance**
   - Efficient real-time updates
   - Minimal database operations
   - Optimized for multiple participants

## Usage Examples

### Basic Tab Synchronization

```typescript
// Participant A switches to marketplace tab
setDeckSelectionTab('marketplace');

// All participants immediately see:
// - Marketplace tab becomes active
// - Marketplace content loads
// - Visual indication of who switched tabs
```

### Marketplace Deck Details

```typescript
// Participant B selects a deck for details
selectMarketplaceDeck('cosmic-tarot-deck-id');

// All participants immediately see:
// - Deck details view opens
// - Same deck information displayed
// - Attribution showing Participant B triggered the action
```

### Collaborative Deck Selection

```typescript
// Participant A opens marketplace tab
setDeckSelectionTab('marketplace');

// Participant B selects a deck for details
selectMarketplaceDeck('nature-spirits-deck-id');

// Participant C can see the deck details and decide to add it
handleAddToCollection(selectedDeck);

// All participants see the same progression
```

## Error Handling

### Connection Issues
- Graceful fallback to local state during network issues
- Automatic resynchronization when connection is restored
- Visual indicators for sync status

### Participant Management
- Automatic cleanup when participants leave
- Proper state management for new participants joining
- Conflict resolution for simultaneous actions

## Future Enhancements

### Planned Features

1. **Deck Comparison Mode**
   - Side-by-side deck comparison
   - Synchronized comparison selections
   - Collaborative deck evaluation

2. **Deck Voting System**
   - Participants can vote on deck preferences
   - Real-time vote tallying
   - Democratic deck selection process

3. **Enhanced Attribution**
   - Participant avatars in deck selection
   - Action history tracking
   - Detailed collaboration analytics

### Performance Optimizations

1. **Caching Improvements**
   - Local caching of marketplace decks
   - Optimized image loading
   - Reduced database queries

2. **Real-time Enhancements**
   - WebSocket optimization
   - Batch updates for multiple actions
   - Improved conflict resolution

## Troubleshooting

### Common Issues

1. **Tab Not Syncing**
   - Check network connection
   - Verify participant permissions
   - Refresh browser if needed

2. **Marketplace Deck Details Not Showing**
   - Ensure marketplace decks are loaded
   - Check for JavaScript errors
   - Verify session state synchronization

3. **Attribution Not Showing**
   - Confirm participant ID is set
   - Check session participant list
   - Verify real-time connection

### Debug Information

Enable debug logging to troubleshoot synchronization issues:

```typescript
// Check deck selection state
console.log('Deck Selection State:', sessionState?.deckSelectionState);

// Check participant information
console.log('Current Participant:', participantId);

// Check synchronization status
console.log('Session State:', sessionState);
```

## Related Documentation

- [Session State Management](../session-management/session-state.md)
- [Real-time Synchronization](../real-time/synchronization.md)
- [Participant Management](../participants/participant-management.md)
- [Database Schema](../../database/schema.md) 