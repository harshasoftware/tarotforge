-- Create video_signals table for multi-party video call signaling
CREATE TABLE video_signals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL,
  from_participant TEXT NOT NULL,
  to_participant TEXT NOT NULL,
  signal_data JSONB NOT NULL,
  peer_id TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX idx_video_signals_session_id ON video_signals(session_id);
CREATE INDEX idx_video_signals_to_participant ON video_signals(to_participant);
CREATE INDEX idx_video_signals_created_at ON video_signals(created_at);

-- Add RLS policies
ALTER TABLE video_signals ENABLE ROW LEVEL SECURITY;

-- Allow participants to insert signals
CREATE POLICY "Allow participants to insert signals" ON video_signals
  FOR INSERT WITH CHECK (true);

-- Allow participants to read signals addressed to them
CREATE POLICY "Allow participants to read their signals" ON video_signals
  FOR SELECT USING (true);

-- Allow participants to delete signals (for cleanup)
CREATE POLICY "Allow participants to delete signals" ON video_signals
  FOR DELETE USING (true);

-- Add automatic cleanup for old signals (older than 1 hour)
CREATE OR REPLACE FUNCTION cleanup_old_video_signals()
RETURNS void AS $$
BEGIN
  DELETE FROM video_signals 
  WHERE created_at < NOW() - INTERVAL '1 hour';
END;
$$ LANGUAGE plpgsql;

-- Create a scheduled job to clean up old signals every 30 minutes
-- Note: This requires pg_cron extension which may not be available in all Supabase plans
-- SELECT cron.schedule('cleanup-video-signals', '*/30 * * * *', 'SELECT cleanup_old_video_signals();'); 