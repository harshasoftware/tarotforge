-- Create session invites table for proper invite link management
-- This enables wrapper invite links that distinguish hosts from guests

CREATE TABLE IF NOT EXISTS session_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES reading_sessions(id) ON DELETE CASCADE,
  created_by text, -- Can be user ID or anonymous ID
  expires_at timestamp with time zone,
  max_clicks integer,
  is_active boolean DEFAULT true,
  click_count integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE session_invites ENABLE ROW LEVEL SECURITY;

-- Anyone can read active invites (needed for processing invite links)
CREATE POLICY "Anyone can read active invites"
  ON session_invites
  FOR SELECT
  USING (is_active = true);

-- Anyone can create invites (both authenticated and anonymous users)
CREATE POLICY "Anyone can create invites"
  ON session_invites
  FOR INSERT
  WITH CHECK (true);

-- Only the creator can update their invites
CREATE POLICY "Creators can update their invites"
  ON session_invites
  FOR UPDATE
  USING (
    (auth.uid() IS NOT NULL AND auth.uid()::text = created_by) OR
    (auth.uid() IS NULL AND created_by IS NOT NULL)
  );

-- Add indexes for performance
CREATE INDEX idx_session_invites_session_id ON session_invites(session_id);
CREATE INDEX idx_session_invites_created_by ON session_invites(created_by);
CREATE INDEX idx_session_invites_active ON session_invites(is_active) WHERE is_active = true;

-- Function to update invite timestamp
CREATE OR REPLACE FUNCTION update_invite_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update invite timestamp
CREATE TRIGGER update_session_invites_timestamp
  BEFORE UPDATE ON session_invites
  FOR EACH ROW
  EXECUTE FUNCTION update_invite_timestamp();

-- Function to clean up expired invites (can be called periodically)
CREATE OR REPLACE FUNCTION cleanup_expired_invites()
RETURNS void AS $$
BEGIN
  UPDATE session_invites 
  SET is_active = false 
  WHERE is_active = true 
    AND expires_at IS NOT NULL 
    AND expires_at < now();
END;
$$ LANGUAGE plpgsql;

-- Add comment to explain the table
COMMENT ON TABLE session_invites IS 'Manages invite links for reading sessions, enabling proper host/guest distinction through wrapper URLs'; 