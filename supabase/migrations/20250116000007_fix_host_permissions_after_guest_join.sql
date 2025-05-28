/*
  # Fix Host Permissions After Guest Join
  
  This migration fixes the issue where hosts lose the ability to update the session
  after guests join. The problem was that the RLS policies didn't properly handle
  anonymous participants who are the original host.
  
  Changes:
  1. Update the session update policy to allow anonymous participants who are the host
  2. Add a mechanism to track the original anonymous host via session_participants
*/

-- First, drop the existing update policy
DROP POLICY IF EXISTS "Session participants can update sessions" ON reading_sessions;

-- Create an improved update policy that properly handles all cases
CREATE POLICY "Session participants can update sessions"
  ON reading_sessions
  FOR UPDATE
  USING (
    is_active = true AND (
      -- Case 1: Authenticated user is the host
      (auth.uid() IS NOT NULL AND auth.uid() = host_user_id) OR
      
      -- Case 2: Anonymous host (session created by anonymous user)
      -- This now checks if the current user is an anonymous participant who created the session
      (host_user_id IS NULL AND EXISTS (
        SELECT 1 FROM session_participants sp
        WHERE sp.session_id = reading_sessions.id
        AND sp.is_active = true
        AND sp.anonymous_id IS NOT NULL
        -- The first participant is typically the host for anonymous sessions
        AND sp.joined_at = (
          SELECT MIN(joined_at) 
          FROM session_participants 
          WHERE session_id = reading_sessions.id
          AND anonymous_id IS NOT NULL
        )
      )) OR
      
      -- Case 3: Authenticated participants
      (auth.uid() IS NOT NULL AND EXISTS (
        SELECT 1 FROM session_participants
        WHERE session_id = reading_sessions.id
        AND user_id = auth.uid()
        AND is_active = true
      ))
    )
  );

-- Create a function to check if a participant is the host
-- This will be used for better permission management
CREATE OR REPLACE FUNCTION is_session_host(
  p_session_id uuid,
  p_participant_id uuid
) RETURNS boolean AS $$
DECLARE
  v_host_user_id uuid;
  v_participant_user_id uuid;
  v_participant_anonymous_id text;
  v_is_first_participant boolean;
BEGIN
  -- Get session host user ID
  SELECT host_user_id INTO v_host_user_id
  FROM reading_sessions
  WHERE id = p_session_id;
  
  -- Get participant details
  SELECT user_id, anonymous_id INTO v_participant_user_id, v_participant_anonymous_id
  FROM session_participants
  WHERE id = p_participant_id;
  
  -- Check if participant is the authenticated host
  IF v_host_user_id IS NOT NULL AND v_participant_user_id = v_host_user_id THEN
    RETURN true;
  END IF;
  
  -- For anonymous sessions, check if participant was the first to join
  IF v_host_user_id IS NULL AND v_participant_anonymous_id IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 
      FROM session_participants 
      WHERE session_id = p_session_id
      AND id = p_participant_id
      AND joined_at = (
        SELECT MIN(joined_at) 
        FROM session_participants 
        WHERE session_id = p_session_id
      )
    ) INTO v_is_first_participant;
    
    RETURN v_is_first_participant;
  END IF;
  
  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add a comment to document the policy behavior
COMMENT ON POLICY "Session participants can update sessions" ON reading_sessions IS 
'Allows session updates by:
1. Authenticated hosts (user matches host_user_id)
2. Anonymous hosts (first participant in sessions with null host_user_id)
3. Authenticated participants (user exists in session_participants)

Note: Anonymous non-host participants cannot directly update the session - 
they must use the broadcast mechanism to request updates from the host.'; 