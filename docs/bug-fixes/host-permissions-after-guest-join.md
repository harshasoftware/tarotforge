# Host Permissions Fix After Guest Join

## Issue
When guests join a collaborative reading session, the host loses the ability to perform any actions (update cards, change layouts, etc.). However, guest changes are still transmitted to the host.

## Root Cause
The Row Level Security (RLS) policies in Supabase were not properly configured to handle anonymous hosts after guests join. The policies only allowed:
1. Authenticated users who are hosts
2. Anonymous users when `auth.uid()` is NULL (but this doesn't work with Supabase's auth context)
3. Authenticated participants

But they didn't handle **anonymous hosts** who need to update the session after other participants join.

## Solution

### 1. Database Migration
Created `20250116000007_fix_host_permissions_after_guest_join.sql` with:

```sql
-- Improved update policy that handles all cases
CREATE POLICY "Session participants can update sessions"
  ON reading_sessions
  FOR UPDATE
  USING (
    is_active = true AND (
      -- Case 1: Authenticated user is the host
      (auth.uid() IS NOT NULL AND auth.uid() = host_user_id) OR
      
      -- Case 2: Anonymous host (first participant in anonymous sessions)
      (host_user_id IS NULL AND EXISTS (
        SELECT 1 FROM session_participants sp
        WHERE sp.session_id = reading_sessions.id
        AND sp.is_active = true
        AND sp.anonymous_id IS NOT NULL
        AND sp.joined_at = (
          SELECT MIN(joined_at) 
          FROM session_participants 
          WHERE session_id = reading_sessions.id
          AND anonymous_id IS NOT NULL
        )
      )) OR
      
      -- Case 3: Authenticated participants
      (auth.uid() IS NOT NULL AND EXISTS (...))
    )
  );
```

### 2. Client-Side Fallback
Updated `readingSessionStore.ts` to handle cases where anonymous hosts can't update the database directly:

```typescript
// If anonymous host can't update due to RLS, fall back to broadcast
if (!user && isHost && (error.includes('permission'))) {
  console.warn('Anonymous host cannot update directly, falling back to broadcast mechanism');
  
  // Broadcast the update for other participants to apply
  await get().broadcastGuestAction('hostUpdate', updates);
  
  // Update local state
  set({ sessionState: { ...sessionState, ...updates } });
}
```

### 3. Broadcast Handler Updates
Enhanced the broadcast handler to distinguish between regular guest updates and host updates:

```typescript
switch (action) {
  case 'updateSession':
    // Guest update - only process if we're the host
    if (currentState.isHost) {
      get().updateSession(data);
    }
    break;
    
  case 'hostUpdate':
    // Host update - all participants should apply this
    const sessionState = currentState.sessionState;
    if (sessionState) {
      set({
        sessionState: { ...sessionState, ...data }
      });
    }
    break;
}
```

## How It Works

1. **Authenticated Host**: Can update the database directly (no change)
2. **Anonymous Host**: 
   - First tries to update the database directly
   - If that fails due to permissions, broadcasts a `hostUpdate` action
   - All participants apply the host update to their local state
3. **Guests**: Continue to broadcast their actions, which the host processes

## To Apply This Fix

Run the database migration:
```bash
npx supabase db push
```

The client-side code is already updated and will work once the migration is applied.

## Testing
1. Create a session as an anonymous user (guest host)
2. Share the session link
3. Have another user join as a guest
4. The host should still be able to:
   - Place cards
   - Change layouts
   - Update the session
5. Guest actions should still be transmitted to the host

## Related Files
- `supabase/migrations/20250116000007_fix_host_permissions_after_guest_join.sql` - Database migration
- `src/stores/readingSessionStore.ts` - Updated session store with fallback logic 