# User Identification & Differentiation System

## Overview

The TarotForge reading room implements a sophisticated user identification system that enables real-time collaborative tarot readings while maintaining proper user differentiation, permissions, and state synchronization. This system supports both authenticated users and anonymous guests in the same session.

## Core Architecture

### Dual-Identifier System

The system uses a **dual-identifier approach** where each participant has either an authenticated user ID or an anonymous guest ID, but never both:

```typescript
interface SessionParticipant {
  id: string;              // Unique participant record ID
  sessionId: string;       // Which session they're in
  userId: string | null;   // For authenticated users (Supabase auth ID)
  anonymousId: string | null; // For guest users (generated UUID)
  name: string | null;     // Display name
  isActive: boolean;       // Currently active in session
  joinedAt: string;        // Join timestamp
}
```

### Session State Structure

```typescript
interface ReadingSessionState {
  id: string;              // Session identifier
  hostUserId: string | null; // Host's authenticated user ID (null if guest host)
  deckId: string;          // Selected tarot deck
  selectedLayout: ReadingLayout | null;
  question: string;
  readingStep: 'setup' | 'ask-question' | 'drawing' | 'interpretation';
  selectedCards: Card[];   // Drawn cards with positions
  interpretation: string;
  zoomLevel: number;
  activeCardIndex: number | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
```

## User Types & Identification

### Authenticated Users

**Characteristics:**
- Have a Supabase authentication account
- Persistent identity across sessions
- Full feature access
- Can be session hosts with full permissions

**Identification:**
- `userId`: Supabase auth UUID (e.g., `"auth-uuid-1234-5678"`)
- `anonymousId`: `null`
- `name`: From user profile or manually set
- `isHost`: Determined by comparing `userId` with `sessionState.hostUserId`

**Database Record Example:**
```json
{
  "id": "participant-123",
  "session_id": "session-456",
  "user_id": "auth-uuid-1234-5678",
  "anonymous_id": null,
  "name": "Alice Johnson",
  "is_active": true,
  "joined_at": "2024-01-15T10:30:00Z"
}
```

### Guest Users

**Characteristics:**
- No authentication account required
- Temporary identity for session duration
- Limited feature access
- Can upgrade to authenticated account
- Can be session hosts (with limitations)

**Identification:**
- `userId`: `null`
- `anonymousId`: Generated UUID (e.g., `"guest-uuid-9876-5432"`)
- `name`: Either manually set or defaults to "Anonymous"
- `isHost`: Can be true if they created the session as a guest

**Database Record Example:**
```json
{
  "id": "participant-789",
  "session_id": "session-456",
  "user_id": null,
  "anonymous_id": "guest-uuid-9876-5432",
  "name": "Anonymous",
  "is_active": true,
  "joined_at": "2024-01-15T10:35:00Z"
}
```

## Session Participation Flow

### 1. Session Creation

**Authenticated User Creates Session:**
```typescript
// Host becomes authenticated user
sessionState.hostUserId = user.id; // Supabase auth ID
participant.userId = user.id;
participant.anonymousId = null;
```

**Guest Creates Session:**
```typescript
// Host remains guest (can upgrade later)
sessionState.hostUserId = null;
participant.userId = null;
participant.anonymousId = generatedGuestId;
```

### 2. Joining Existing Session

**Join Process (from `joinSession` function):**
```typescript
const { data: participant } = await supabase
  .from('session_participants')
  .insert({
    session_id: sessionId,
    user_id: user?.id || null,        // Auth user ID or null
    anonymous_id: user ? null : state.anonymousId,  // Guest ID or null
    is_active: true
  });
```

**State Synchronization on Join:**
- Complete session state loaded immediately
- Participant added to active participants list
- Real-time subscriptions established
- UI permissions calculated based on user type

### 3. User Differentiation in UI

**Participant Display:**
```typescript
// From ReadingRoom.tsx
const participantNames = useMemo(() => 
  participants.map(p => p.name || 'Anonymous').join(', ')
, [participants]);
```

**Permission-Based UI Rendering:**
```typescript
// Host-only controls
{isHost && (
  <button onClick={handleShare}>Share Session</button>
)}

// Guest upgrade prompt
{!isHost && isGuest && (
  <button onClick={() => setShowGuestUpgrade(true)}>
    Upgrade Account
  </button>
)}
```

## Permission System

### Host Permissions

**Full Session Control:**
- Update session state (cards, layout, interpretation)
- Generate and share session links
- Manage participant access
- Control reading progression
- Access all UI controls

**Host Identification:**
```typescript
const isHost = sessionState?.hostUserId === user?.id || 
               (sessionState?.hostUserId === null && isSessionCreator);
```

### Participant Permissions

**Limited Session Access:**
- View synchronized session state
- Limited interaction capabilities
- Cannot modify core session settings
- Cannot generate share links
- Reduced UI control set

**Guest-Specific Features:**
- Upgrade account prompt
- Name setting capability
- Session continuation without account

## Guest Upgrade System

### Upgrade Process

**Account Creation & Linking:**
```typescript
const upgradeGuestAccount = async (newUserId: string) => {
  // Update participant record
  await supabase
    .from('session_participants')
    .update({ 
      user_id: newUserId,      // Set authenticated user ID
      anonymous_id: null       // Clear anonymous ID
    })
    .eq('id', participantId);

  // If guest was host, update session
  if (isHost && sessionState?.hostUserId === null) {
    await supabase
      .from('reading_sessions')
      .update({ host_user_id: newUserId })
      .eq('id', sessionState.id);
  }
};
```

**Benefits of Upgrading:**
- Persistent identity across sessions
- Full feature access
- Session hosting capabilities
- Account-based preferences
- Historical session access

### Guest Name Setting

**Anonymous Identity Enhancement:**
```typescript
const setGuestName = async (name: string) => {
  await supabase
    .from('session_participants')
    .update({ name: name })
    .eq('id', participantId);
};
```

## Real-Time Synchronization

### State Sync vs User Identity

**What Synchronizes:**
- Session state (cards, layout, zoom, interpretation)
- Participant list and activity status
- Reading progression and card reveals
- Shared UI state (active card, zoom level)

**What Remains User-Specific:**
- Individual permissions and access levels
- UI preferences and local state
- Participant identification data
- Authentication status

### Sync Implementation

**Complete State Synchronization:**
```typescript
const syncCompleteSessionState = async (sessionId: string) => {
  // Fetch complete session state
  const { data: session } = await supabase
    .from('reading_sessions')
    .select('*')
    .eq('id', sessionId)
    .single();

  // Update local state immediately
  setSessionState(transformedSessionState);
  
  // Fetch updated participants list
  const { data: participants } = await supabase
    .from('session_participants')
    .select('*')
    .eq('session_id', sessionId)
    .eq('is_active', true);
};
```

**Real-Time Subscriptions:**
```typescript
const setupRealtimeSubscriptions = () => {
  // Session state changes
  channel.on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'reading_sessions'
  }, handleSessionUpdate);

  // Participant changes
  channel.on('postgres_changes', {
    event: '*',
    schema: 'public', 
    table: 'session_participants'
  }, handleParticipantUpdate);
};
```

## Example Multi-User Scenario

### Session with Mixed User Types

**Participants:**

1. **Alice (Authenticated Host)**
   - `userId`: `"auth-alice-123"`
   - `anonymousId`: `null`
   - `isHost`: `true`
   - **Capabilities**: Full session control, sharing, management

2. **Bob (Authenticated Participant)**
   - `userId`: `"auth-bob-456"`
   - `anonymousId`: `null`
   - `isHost`: `false`
   - **Capabilities**: View session, limited interactions

3. **Charlie (Guest Participant)**
   - `userId`: `null`
   - `anonymousId`: `"guest-charlie-789"`
   - `isHost`: `false`
   - **Capabilities**: View session, upgrade prompts shown

### Synchronized Experience

**All users see:**
- Same card layout and positions
- Synchronized zoom and pan state
- Real-time card reveals and interpretations
- Live participant list with names

**User-specific differences:**
- Alice sees host controls (share, manage)
- Bob sees standard participant UI
- Charlie sees guest upgrade options
- Each maintains their own UI preferences

## Security Considerations

### Database-Level Security

**Row-Level Security (RLS) Policies:**
- Participants can only access sessions they've joined
- Session updates restricted to hosts
- Participant records protected by user/anonymous ID matching

**Permission Enforcement:**
```sql
-- Example RLS policy for session updates
CREATE POLICY "Users can update sessions they host" ON reading_sessions
  FOR UPDATE USING (
    host_user_id = auth.uid() OR 
    (host_user_id IS NULL AND EXISTS (
      SELECT 1 FROM session_participants 
      WHERE session_id = id AND anonymous_id = current_setting('app.anonymous_id')
    ))
  );
```

### Client-Side Validation

**Permission Checks:**
```typescript
// Validate host permissions before UI actions
const canUpdateSession = isHost && (
  user?.id === sessionState?.hostUserId || 
  (sessionState?.hostUserId === null && isSessionCreator)
);
```

## Testing Scenarios

### User Identification Tests

1. **Authenticated User Session Creation**
   - Verify host status assignment
   - Check participant record creation
   - Validate permission UI rendering

2. **Guest User Session Creation**
   - Verify anonymous ID generation
   - Check guest host capabilities
   - Validate upgrade prompts

3. **Mixed User Session Joining**
   - Test authenticated user joining guest session
   - Test guest joining authenticated session
   - Verify participant list accuracy

4. **Guest Upgrade Process**
   - Test account creation and linking
   - Verify permission elevation
   - Check session continuity

5. **Real-Time Sync with Multiple Users**
   - Verify state synchronization across user types
   - Test permission-based UI updates
   - Validate participant list real-time updates

### Edge Cases

1. **Host Disconnection**
   - Guest host disconnects and reconnects
   - Authenticated host transfers session

2. **Concurrent Guest Upgrades**
   - Multiple guests upgrading simultaneously
   - Session state consistency during upgrades

3. **Session Persistence**
   - Guest-created sessions with authenticated joiners
   - Long-running sessions with user type changes

## Performance Considerations

### Efficient User Tracking

**Optimized Queries:**
- Indexed participant lookups by session_id
- Efficient user/anonymous ID matching
- Minimal real-time subscription overhead

**State Management:**
- Memoized participant name calculations
- Debounced permission checks
- Optimized re-render patterns

### Scalability

**Database Design:**
- Composite indexes on (session_id, user_id, anonymous_id)
- Efficient participant cleanup for inactive users
- Optimized real-time subscription filtering

**Client Performance:**
- Lazy loading of participant details
- Efficient permission calculation caching
- Minimal state synchronization overhead

## Future Enhancements

### Advanced User Features

1. **Persistent Guest Sessions**
   - Allow guests to save sessions locally
   - Provide session recovery mechanisms

2. **Enhanced Permissions**
   - Granular permission levels
   - Moderator roles between host and participant

3. **User Presence Indicators**
   - Real-time activity status
   - Typing indicators for interpretations
   - Mouse cursor sharing

### Analytics & Insights

1. **Session Analytics**
   - User engagement tracking by type
   - Conversion rates from guest to authenticated
   - Session duration and interaction patterns

2. **User Journey Mapping**
   - Guest upgrade funnel analysis
   - Feature usage by user type
   - Collaborative interaction patterns

This user identification system provides a robust foundation for collaborative tarot reading sessions while maintaining security, performance, and user experience across different authentication states. 