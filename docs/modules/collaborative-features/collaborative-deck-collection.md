# Collaborative Deck Collection

## Overview

The deck collection feature now intelligently combines decks from all logged-in participants in a reading session. Instead of showing individual collections, participants see a unified "Our Collection" that includes decks owned by any authenticated user in the session.

## Features

### Dynamic Collection Aggregation

1. **Smart Collection Merging**
   - Automatically combines decks from all logged-in participants
   - Deduplicates identical decks across participants
   - Sorts combined collection alphabetically for easy browsing

2. **Dynamic Tab Labeling**
   - Shows "My Collection" when only one participant is logged in
   - Shows "Our Collection" when multiple participants are logged in
   - Real-time updates as participants join/leave the session

3. **Participant Attribution**
   - Displays which participants contributed to the collection
   - Clear visual indication of collaborative nature
   - Transparent deck ownership tracking

## Technical Implementation

### Collection Fetching Logic

```typescript
const fetchCombinedCollection = useCallback(async () => {
  try {
    const allDecks = new Map<string, Deck>();
    
    // Get all logged-in participants (those with user_id)
    const loggedInParticipants = participants.filter(p => p.userId);
    
    // Include current user if logged in and not already in participants list
    if (user?.id && !loggedInParticipants.find(p => p.userId === user.id)) {
      loggedInParticipants.push({
        id: 'current-user',
        sessionId: sessionState?.id || '',
        userId: user.id,
        anonymousId: null,
        name: user.email?.split('@')[0] || 'You',
        isActive: true,
        joinedAt: new Date().toISOString()
      });
    }
    
    // Fetch decks for each logged-in participant
    for (const participant of loggedInParticipants) {
      if (participant.userId) {
        const participantDecks = await fetchUserOwnedDecks(participant.userId);
        participantDecks.forEach(deck => {
          // Use Map to automatically deduplicate by deck ID
          allDecks.set(deck.id, deck);
        });
      }
    }
    
    // Convert Map back to array and sort by title
    const combinedDecks = Array.from(allDecks.values()).sort((a, b) => a.title.localeCompare(b.title));
    setUserOwnedDecks(combinedDecks);
    
  } catch (error) {
    console.error('Error fetching combined collection:', error);
    // Fallback to current user's decks only
    if (user?.id) {
      const userDecks = await fetchUserOwnedDecks(user.id);
      setUserOwnedDecks(userDecks);
    }
  }
}, [participants, user?.id, sessionState?.id]);
```

### Dynamic Label Generation

```typescript
const collectionTabLabel = useMemo(() => {
  const loggedInParticipants = participants.filter(p => p.userId);
  // Include current user if logged in and not already in participants list
  const totalLoggedIn = user?.id && !loggedInParticipants.find(p => p.userId === user.id) 
    ? loggedInParticipants.length + 1 
    : loggedInParticipants.length;
  
  return totalLoggedIn > 1 ? 'Our Collection' : 'My Collection';
}, [participants, user?.id]);
```

### Participant Attribution

```typescript
const collectionContributors = useMemo(() => {
  const loggedInParticipants = participants.filter(p => p.userId);
  const names = loggedInParticipants.map(p => p.name || 'Anonymous');
  
  // Include current user if logged in and not already in participants list
  if (user?.id && !loggedInParticipants.find(p => p.userId === user.id)) {
    names.unshift('You');
  }
  
  return names;
}, [participants, user?.id]);
```

## User Experience

### Single Participant Sessions

When only one logged-in participant is present:

- **Tab Label**: "My Collection"
- **Content**: Shows only the current user's decks
- **Behavior**: Standard individual collection experience

### Multi-Participant Sessions

When multiple logged-in participants are present:

- **Tab Label**: "Our Collection"
- **Content**: Combined decks from all logged-in participants
- **Attribution**: Shows "Combined collection from: Alice, Bob, You"
- **Deduplication**: Identical decks appear only once

### Mixed Sessions (Logged-in + Guests)

- **Inclusion**: Only logged-in participants contribute to the collection
- **Guest Experience**: Guests see the combined collection but cannot contribute their own decks
- **Dynamic Updates**: Collection updates as participants join/leave

## Benefits

### Enhanced Collaboration

1. **Shared Resources**
   - Access to all participants' deck collections
   - Larger variety of decks for readings
   - Collaborative deck selection process

2. **Simplified Experience**
   - Single unified collection view
   - No need to ask "what decks do you have?"
   - Streamlined deck selection workflow

3. **Real-time Updates**
   - Collection automatically updates as participants join/leave
   - Immediate access to new participants' decks
   - Dynamic labeling reflects current session state

### Technical Benefits

1. **Efficient Deduplication**
   - Automatic removal of duplicate decks
   - Optimized storage and display
   - Clean, organized collection view

2. **Scalable Architecture**
   - Handles any number of participants
   - Efficient fetching and caching
   - Graceful error handling and fallbacks

3. **Performance Optimization**
   - Memoized computations for labels and contributors
   - Efficient re-fetching only when participants change
   - Minimal database queries

## Usage Examples

### Two-Person Reading Session

```typescript
// Participants: Alice (logged in), Bob (logged in)
// Alice has: Rider-Waite, Celtic Tarot
// Bob has: Thoth Tarot, Celtic Tarot

// Combined collection shows:
// - Celtic Tarot (deduplicated)
// - Rider-Waite (from Alice)
// - Thoth Tarot (from Bob)

// Tab label: "Our Collection"
// Attribution: "Combined collection from: Alice, Bob"
```

### Mixed Session

```typescript
// Participants: Alice (logged in), Guest User (anonymous)
// Alice has: Rider-Waite, Celtic Tarot
// Guest has: No contribution (not logged in)

// Collection shows:
// - Celtic Tarot (from Alice)
// - Rider-Waite (from Alice)

// Tab label: "My Collection" (only Alice is logged in)
// No attribution shown (single contributor)
```

### Dynamic Updates

```typescript
// Initial: Alice (logged in) - "My Collection"
// Charlie joins (logged in) - becomes "Our Collection"
// Bob joins (guest) - remains "Our Collection" (Bob doesn't contribute)
// Charlie leaves - becomes "My Collection" again
```

## Error Handling

### Network Issues
- Graceful fallback to current user's collection
- Error logging for debugging
- Retry mechanisms for failed fetches

### Participant Management
- Handles participants joining/leaving gracefully
- Proper cleanup of collection data
- Fallback to individual collections on errors

### Data Consistency
- Deduplication prevents duplicate entries
- Sorting ensures consistent ordering
- Validation of participant data

## Future Enhancements

### Planned Features

1. **Deck Ownership Indicators**
   - Show which participant owns each deck
   - Visual badges or indicators
   - Hover tooltips with owner information

2. **Collection Permissions**
   - Allow participants to share/hide specific decks
   - Privacy controls for sensitive collections
   - Temporary sharing for session duration

3. **Deck Recommendations**
   - Suggest decks based on combined preferences
   - Collaborative filtering algorithms
   - Popular deck recommendations

### Performance Improvements

1. **Caching Enhancements**
   - Cache participant collections locally
   - Intelligent cache invalidation
   - Reduced API calls for repeated sessions

2. **Lazy Loading**
   - Load deck details on demand
   - Progressive collection building
   - Optimized for large collections

3. **Real-time Sync**
   - WebSocket-based collection updates
   - Instant reflection of collection changes
   - Optimistic UI updates

## Troubleshooting

### Common Issues

1. **Collection Not Updating**
   - Check participant list synchronization
   - Verify user authentication status
   - Refresh browser if needed

2. **Missing Decks**
   - Ensure participants are properly logged in
   - Check deck ownership and permissions
   - Verify network connectivity

3. **Duplicate Decks Showing**
   - Check deduplication logic
   - Verify deck ID consistency
   - Report as potential bug

### Debug Information

Enable debug logging to troubleshoot collection issues:

```typescript
// Check participant information
console.log('Participants:', participants);
console.log('Logged-in participants:', participants.filter(p => p.userId));

// Check collection state
console.log('Collection contributors:', collectionContributors);
console.log('Collection label:', collectionTabLabel);
console.log('Combined decks:', userOwnedDecks);
```

## Related Documentation

- [Participant Management](../participants/participant-management.md)
- [Deck Management](../deck-management/deck-operations.md)
- [Session State Management](../session-management/session-state.md)
- [Real-time Synchronization](../real-time/synchronization.md) 