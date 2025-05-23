/*
  # Reading Sessions for Real-time Collaboration

  1. New Tables
    - `reading_sessions`: Stores reading room sessions
      - `id` (uuid, primary key) - Session/Room ID
      - `host_user_id` (uuid) - Creator of the reading
      - `deck_id` (text) - The deck being used
      - `selected_layout` (jsonb) - The selected layout configuration
      - `question` (text) - Reading question
      - `reading_step` ('setup' | 'drawing' | 'interpretation')
      - `selected_cards` (jsonb) - Array of placed cards with positions
      - `interpretation` (text) - Generated interpretation
      - `zoom_level` (decimal) - Current zoom level
      - `active_card_index` (integer) - Currently selected card
      - `is_active` (boolean) - Whether session is active
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

    - `session_participants`: Tracks who's in each session
      - `id` (uuid, primary key)
      - `session_id` (uuid) - References reading_sessions
      - `user_id` (uuid) - User in session (null for anonymous)
      - `anonymous_id` (uuid) - For anonymous users
      - `joined_at` (timestamp)
      - `last_seen_at` (timestamp)
      - `is_active` (boolean)

  2. Security
    - Enable RLS on both tables
    - Policies for session access and updates
    - Enable realtime for both tables

  3. Functions
    - Clean up inactive sessions
    - Handle participant presence
*/

-- Create enum for reading steps
CREATE TYPE reading_step_type AS ENUM ('setup', 'drawing', 'interpretation');

-- Create reading_sessions table
CREATE TABLE IF NOT EXISTS reading_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  host_user_id uuid REFERENCES auth.users(id),
  deck_id text NOT NULL,
  selected_layout jsonb,
  question text,
  reading_step reading_step_type DEFAULT 'setup',
  selected_cards jsonb DEFAULT '[]'::jsonb,
  interpretation text,
  zoom_level decimal DEFAULT 1.0,
  active_card_index integer,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create session_participants table
CREATE TABLE IF NOT EXISTS session_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES reading_sessions(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id),
  anonymous_id text,
  name text,
  is_active boolean DEFAULT true,
  joined_at timestamp with time zone DEFAULT now(),
  last_seen_at timestamp with time zone DEFAULT now(),
  CONSTRAINT participant_identity CHECK (
    (user_id IS NOT NULL AND anonymous_id IS NULL) OR
    (user_id IS NULL AND anonymous_id IS NOT NULL)
  )
);

-- Enable Row Level Security
ALTER TABLE reading_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_participants ENABLE ROW LEVEL SECURITY;

-- Policies for reading_sessions
-- Anyone can read sessions (for joining via link)
CREATE POLICY "Anyone can read active sessions"
  ON reading_sessions
  FOR SELECT
  USING (is_active = true);

-- Authenticated users can create sessions
CREATE POLICY "Authenticated users can create sessions"
  ON reading_sessions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = host_user_id);

-- Session participants can update sessions
CREATE POLICY "Session participants can update sessions"
  ON reading_sessions
  FOR UPDATE
  USING (
    is_active = true AND (
      auth.uid() = host_user_id OR
      EXISTS (
        SELECT 1 FROM session_participants
        WHERE session_id = reading_sessions.id
        AND user_id = auth.uid()
        AND is_active = true
      )
    )
  );

-- Policies for session_participants
-- Anyone can read participants (for showing who's in room)
CREATE POLICY "Anyone can read session participants"
  ON session_participants
  FOR SELECT
  USING (true);

-- Anyone can join sessions (including anonymous)
CREATE POLICY "Anyone can join sessions"
  ON session_participants
  FOR INSERT
  WITH CHECK (true);

-- Users can update their own participation
CREATE POLICY "Users can update own participation"
  ON session_participants
  FOR UPDATE
  USING (
    (user_id IS NOT NULL AND auth.uid() = user_id) OR
    (anonymous_id IS NOT NULL)
  );

-- Function to update session timestamp on changes
CREATE OR REPLACE FUNCTION update_session_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update session timestamp
CREATE TRIGGER update_reading_sessions_timestamp
  BEFORE UPDATE ON reading_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_session_timestamp();

-- Function to update participant last_seen
CREATE OR REPLACE FUNCTION update_participant_presence()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_seen_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update participant presence
CREATE TRIGGER update_session_participants_presence
  BEFORE UPDATE ON session_participants
  FOR EACH ROW
  EXECUTE FUNCTION update_participant_presence();

-- Function to clean up inactive sessions (can be called periodically)
CREATE OR REPLACE FUNCTION cleanup_inactive_sessions()
RETURNS void AS $$
BEGIN
  -- Mark sessions as inactive if no participants have been active in the last hour
  UPDATE reading_sessions
  SET is_active = false, updated_at = now()
  WHERE is_active = true
  AND id NOT IN (
    SELECT DISTINCT session_id
    FROM session_participants
    WHERE is_active = true
    AND last_seen_at > now() - interval '1 hour'
  );
  
  -- Mark participants as inactive if they haven't been seen in 5 minutes
  UPDATE session_participants
  SET is_active = false
  WHERE is_active = true
  AND last_seen_at < now() - interval '5 minutes';
END;
$$ LANGUAGE plpgsql;

-- Enable realtime for both tables
ALTER PUBLICATION supabase_realtime ADD TABLE reading_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE session_participants;

-- Create indexes for better performance
CREATE INDEX idx_reading_sessions_active ON reading_sessions(is_active) WHERE is_active = true;
CREATE INDEX idx_reading_sessions_host ON reading_sessions(host_user_id);
CREATE INDEX idx_session_participants_session ON session_participants(session_id);
CREATE INDEX idx_session_participants_active ON session_participants(is_active) WHERE is_active = true; 