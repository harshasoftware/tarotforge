-- Fix reading sessions policies to allow anonymous/guest users

-- Drop the existing restrictive policies
DROP POLICY IF EXISTS "Authenticated users can create sessions" ON reading_sessions;
DROP POLICY IF EXISTS "Session participants can update sessions" ON reading_sessions;

-- Allow anyone (including anonymous) to create sessions
CREATE POLICY "Anyone can create sessions"
  ON reading_sessions
  FOR INSERT
  WITH CHECK (true);

-- Allow session participants (authenticated or anonymous) to update sessions
CREATE POLICY "Session participants can update sessions"
  ON reading_sessions
  FOR UPDATE
  USING (
    is_active = true AND (
      -- Host can always update
      auth.uid() = host_user_id OR
      -- Authenticated participants can update
      EXISTS (
        SELECT 1 FROM session_participants
        WHERE session_id = reading_sessions.id
        AND user_id = auth.uid()
        AND is_active = true
      ) OR
      -- Anonymous participants can update (host_user_id is null means it's a guest session)
      (host_user_id IS NULL AND EXISTS (
        SELECT 1 FROM session_participants
        WHERE session_id = reading_sessions.id
        AND anonymous_id IS NOT NULL
        AND is_active = true
      ))
    )
  ); 