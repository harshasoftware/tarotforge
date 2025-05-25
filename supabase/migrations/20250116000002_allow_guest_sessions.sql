/*
  # Allow Guest Users to Create Sessions
  
  This migration updates the reading_sessions policies to allow anonymous/guest users
  to create sessions, enabling session persistence across authentication flows.
*/

-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Authenticated users can create sessions" ON reading_sessions;

-- Create a new policy that allows both authenticated and anonymous users to create sessions
CREATE POLICY "Anyone can create sessions"
  ON reading_sessions
  FOR INSERT
  WITH CHECK (
    -- Authenticated users must match the host_user_id
    (auth.uid() IS NOT NULL AND auth.uid() = host_user_id) OR
    -- Anonymous users can create sessions with null host_user_id
    (auth.uid() IS NULL AND host_user_id IS NULL)
  );

-- Update the update policy to also allow anonymous session hosts to update their sessions
DROP POLICY IF EXISTS "Session participants can update sessions" ON reading_sessions;

CREATE POLICY "Session participants can update sessions"
  ON reading_sessions
  FOR UPDATE
  USING (
    is_active = true AND (
      -- Authenticated host can update
      (auth.uid() IS NOT NULL AND auth.uid() = host_user_id) OR
      -- Anonymous host can update (we'll rely on session_id matching for security)
      (auth.uid() IS NULL AND host_user_id IS NULL) OR
      -- Authenticated participants can update
      (auth.uid() IS NOT NULL AND EXISTS (
        SELECT 1 FROM session_participants
        WHERE session_id = reading_sessions.id
        AND user_id = auth.uid()
        AND is_active = true
      ))
    )
  ); 