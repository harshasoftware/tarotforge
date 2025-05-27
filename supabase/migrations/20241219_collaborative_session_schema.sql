-- Add new columns to reading_sessions table for host transfer
ALTER TABLE reading_sessions 
ADD COLUMN IF NOT EXISTS original_host_user_id UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS host_transfer_history JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS pending_host_transfer JSONB;

-- Create session_viewports table for high-frequency view updates
CREATE TABLE IF NOT EXISTS session_viewports (
  session_id UUID REFERENCES reading_sessions(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  pan_offset JSONB DEFAULT '{"x": 0, "y": 0}'::jsonb,
  zoom_level REAL DEFAULT 1.0,
  zoom_focus JSONB,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (session_id, user_id)
);

-- Create session_invites table for role-based invites
CREATE TABLE IF NOT EXISTS session_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES reading_sessions(id) ON DELETE CASCADE,
  created_by TEXT,
  intended_role TEXT DEFAULT 'participant',
  transfer_host_on_join BOOLEAN DEFAULT false,
  expires_at TIMESTAMPTZ,
  max_clicks INTEGER,
  click_count INTEGER DEFAULT 0,
  metadata JSONB,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add role column to session_participants
ALTER TABLE session_participants
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'participant';

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_viewports_session_updated 
  ON session_viewports(session_id, updated_at DESC);
  
CREATE INDEX IF NOT EXISTS idx_sessions_host 
  ON reading_sessions(host_user_id) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_invites_session_active
  ON session_invites(session_id) WHERE is_active = true;

-- Enable RLS for new tables
ALTER TABLE session_viewports ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_invites ENABLE ROW LEVEL SECURITY;

-- RLS policies for session_viewports
CREATE POLICY "viewports_select_policy" ON session_viewports
  FOR SELECT TO authenticated, anon
  USING (
    EXISTS (
      SELECT 1 FROM session_participants sp
      WHERE sp.session_id = session_viewports.session_id
      AND sp.is_active = true
      AND (
        (sp.user_id IS NOT NULL AND sp.user_id = auth.uid()) OR
        (sp.anonymous_id IS NOT NULL)
      )
    )
  );

CREATE POLICY "viewports_insert_policy" ON session_viewports
  FOR INSERT TO authenticated, anon
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM session_participants sp
      WHERE sp.session_id = session_viewports.session_id
      AND sp.is_active = true
      AND (
        (sp.user_id IS NOT NULL AND sp.user_id = auth.uid()) OR
        (sp.anonymous_id IS NOT NULL)
      )
    )
  );

CREATE POLICY "viewports_update_policy" ON session_viewports
  FOR UPDATE TO authenticated, anon
  USING (
    user_id = COALESCE(auth.uid()::text, 'anonymous')
  );

-- RLS policies for session_invites
CREATE POLICY "invites_select_policy" ON session_invites
  FOR SELECT TO authenticated, anon
  USING (is_active = true);

CREATE POLICY "invites_insert_policy" ON session_invites
  FOR INSERT TO authenticated, anon
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM reading_sessions rs
      WHERE rs.id = session_invites.session_id
      AND rs.is_active = true
      AND (
        rs.host_user_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM session_participants sp
          WHERE sp.session_id = rs.id
          AND sp.is_active = true
          AND sp.role = 'host'
          AND sp.user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "invites_update_policy" ON session_invites
  FOR UPDATE TO authenticated, anon
  USING (
    created_by = COALESCE(auth.uid()::text, 'anonymous')
  );

-- Function to clean up expired invites
CREATE OR REPLACE FUNCTION cleanup_expired_invites()
RETURNS void AS $$
BEGIN
  UPDATE session_invites
  SET is_active = false
  WHERE is_active = true
  AND (
    (expires_at IS NOT NULL AND expires_at < NOW()) OR
    (max_clicks IS NOT NULL AND click_count >= max_clicks)
  );
END;
$$ LANGUAGE plpgsql;

-- Function to increment invite click count
CREATE OR REPLACE FUNCTION increment_invite_clicks(invite_id UUID)
RETURNS TABLE (
  valid BOOLEAN,
  session_id UUID,
  intended_role TEXT,
  transfer_host_on_join BOOLEAN
) AS $$
DECLARE
  invite_record RECORD;
BEGIN
  -- Get and lock the invite record
  SELECT * INTO invite_record
  FROM session_invites
  WHERE id = invite_id
  AND is_active = true
  FOR UPDATE;
  
  -- Check if invite exists and is valid
  IF NOT FOUND THEN
    RETURN QUERY SELECT false::BOOLEAN, NULL::UUID, NULL::TEXT, false::BOOLEAN;
    RETURN;
  END IF;
  
  -- Check expiration
  IF invite_record.expires_at IS NOT NULL AND invite_record.expires_at < NOW() THEN
    UPDATE session_invites SET is_active = false WHERE id = invite_id;
    RETURN QUERY SELECT false::BOOLEAN, NULL::UUID, NULL::TEXT, false::BOOLEAN;
    RETURN;
  END IF;
  
  -- Check click limit
  IF invite_record.max_clicks IS NOT NULL AND invite_record.click_count >= invite_record.max_clicks THEN
    UPDATE session_invites SET is_active = false WHERE id = invite_id;
    RETURN QUERY SELECT false::BOOLEAN, NULL::UUID, NULL::TEXT, false::BOOLEAN;
    RETURN;
  END IF;
  
  -- Increment click count
  UPDATE session_invites
  SET click_count = click_count + 1
  WHERE id = invite_id;
  
  -- Deactivate if reached max clicks
  IF invite_record.max_clicks IS NOT NULL AND invite_record.click_count + 1 >= invite_record.max_clicks THEN
    UPDATE session_invites SET is_active = false WHERE id = invite_id;
  END IF;
  
  -- Return invite details
  RETURN QUERY SELECT 
    true::BOOLEAN,
    invite_record.session_id,
    invite_record.intended_role,
    invite_record.transfer_host_on_join;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create scheduled job to clean up expired invites (if using pg_cron)
-- SELECT cron.schedule('cleanup-expired-invites', '*/15 * * * *', 'SELECT cleanup_expired_invites();'); 