# Card Synchronization Troubleshooting Guide

This guide covers common issues with card state synchronization between participants in collaborative tarot reading sessions.

## Common Issue: Shuffled Deck Not Synchronized

### Problem Description

**Symptoms:**
- Guests join sessions but see different card counts than the host
- Card pile appears empty or shows incorrect number of cards for guests
- Host can see and interact with cards, but guests cannot
- Card selections by guests don't reflect the correct remaining deck state

**Console Logs:**
```
Joining existing session: d7ed0090-b53a-46d5-8113-c0beadc5f23e
Successfully joined session with complete state: Object
Found existing participant record: ad2a5a5b-3a78-4c4a-97df-f5c33d3da950
participantId set in store: ad2a5a5b-3a78-4c4a-97df-f5c33d3da950
```

### Root Cause

The `shuffledDeck` state was being managed locally in the `ReadingRoom` component instead of being properly synchronized through the session state. This caused:

1. **Local State Management**: Each participant maintained their own `shuffledDeck` state
2. **Missing Session Sync**: The `shuffledDeck` wasn't being loaded from or saved to the session state
3. **Broadcast-Only Updates**: Changes were only broadcast but not persisted in the database
4. **Initialization Issues**: New participants didn't receive the current shuffled deck state

### Solution Implemented

#### 1. Session State Integration

**Added shuffled deck synchronization logic:**
```typescript
// Use shuffledDeck from session state, fallback to local state for initialization
const sessionShuffledDeck = sessionState?.shuffledDeck || [];
const shouldUseSessionDeck = sessionShuffledDeck.length > 0;

// Sync shuffledDeck with session state when session state changes
useEffect(() => {
  if (shouldUseSessionDeck) {
    console.log('Syncing shuffled deck from session state:', sessionShuffledDeck.length, 'cards');
    setShuffledDeck(sessionShuffledDeck);
  }
}, [sessionShuffledDeck, shouldUseSessionDeck]);
```

#### 2. Database Persistence

**Updated all shuffled deck modifications to persist to session state:**

- **Shuffle Deck**: Now updates session state with new shuffled deck
- **Reset Reading**: Includes shuffled deck in session state update
- **Reset Cards**: Persists new shuffled deck to session state
- **Card Drop**: Updates session state when cards are removed from deck
- **Deck Change**: Saves new shuffled deck to session state

#### 3. Consistent Deck Source

**Updated all deck rendering to use the correct source:**
```typescript
// Use session deck when available, fallback to local deck
const currentDeck = shouldUseSessionDeck ? sessionShuffledDeck : shuffledDeck;

// Updated all deck.map() calls to use currentDeck
{currentDeck.map((card: Card, index: number) => {
  // ... rendering logic
})}
```

#### 4. Card Count Synchronization

**Fixed card count displays to show synchronized state:**
```typescript
// Card count indicators now use the correct deck source
{(shouldUseSessionDeck ? sessionShuffledDeck : shuffledDeck).length}
```

### Technical Details

#### Database Schema
The `shuffled_deck` field was already present in the `reading_sessions` table and properly mapped in the store:

```typescript
// Store mapping
if (updates.shuffledDeck !== undefined) {
  updateData.shuffled_deck = updates.shuffledDeck;
}

// Database loading
shuffledDeck: session.shuffled_deck ?? [],
```

#### State Flow
1. **Host creates session**: Shuffled deck is generated and saved to session state
2. **Guest joins session**: Shuffled deck is loaded from session state
3. **Any deck modification**: Updates both local state and session state
4. **Real-time sync**: Changes propagate via database subscriptions
5. **Broadcast fallback**: Guests use broadcasts for immediate updates

### Verification Steps

To verify the fix is working:

1. **Host creates a session** and selects a deck
2. **Check card count** is visible and correct
3. **Guest joins via shared link**
4. **Verify guest sees same card count** as host
5. **Host draws a card** and check count decreases
6. **Verify guest sees updated count** immediately
7. **Guest draws a card** and check count decreases for both
8. **Shuffle deck** and verify both see the same shuffled state

### Prevention

To prevent similar issues in the future:

1. **Always use session state** for shared data
2. **Implement proper synchronization** for all collaborative features
3. **Test with multiple participants** during development
4. **Monitor console logs** for synchronization messages
5. **Verify database persistence** for all state changes

### Related Issues

- [Video Call UI Auto-Show](./video-call-ui-issues.md)
- [Guest Permission System](../modules/host-guest-system/README.md)
- [Real-time Synchronization](../modules/real-time-sync/README.md)

## Other Card Synchronization Issues

### Card Selection Not Syncing

**Problem**: Selected cards don't appear for other participants
**Solution**: Ensure `selectedCards` updates go through `updateSession()`

### Card Positions Not Syncing

**Problem**: Card positions in free layout don't sync
**Solution**: Include `x` and `y` coordinates in `selectedCards` updates

### Card Reveal State Not Syncing

**Problem**: Card reveals don't show for other participants  
**Solution**: Update `revealed` property through session state

### Performance Issues with Large Decks

**Problem**: Slow synchronization with 78+ card decks
**Solution**: Implement debounced updates and optimize rendering

## Visual Feedback Synchronization

### Loading States Synchronization

**Added in Latest Update**: Visual feedback for shuffling and interpretation generation is now synchronized across all participants.

#### Features
- **Shuffling Animation**: When one participant shuffles the deck, all participants see the shuffling modal
- **Interpretation Generation**: When generating interpretations, all participants see the loading state
- **Participant Attribution**: Loading messages indicate who triggered the action
- **Real-time Updates**: Loading states sync immediately via session state

#### Implementation Details

**Session State Integration:**
```typescript
loadingStates?: {
  isShuffling: boolean;
  isGeneratingInterpretation: boolean;
  triggeredBy: string | null; // participant ID who triggered the action
} | null;
```

**Synchronized Loading Messages:**
- "Shuffling cards..." (when you trigger it)
- "Another participant is shuffling cards..." (when someone else triggers it)
- "Generating interpretation..." (when you trigger it)
- "Another participant is generating interpretation..." (when someone else triggers it)

#### Benefits
1. **Better Collaboration**: All participants know when actions are in progress
2. **Prevents Conflicts**: Users won't try to perform actions while others are in progress
3. **Enhanced UX**: Clear feedback about who is performing what action
4. **Real-time Awareness**: Immediate visual feedback across all connected participants 