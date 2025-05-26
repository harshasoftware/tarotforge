/*
  # Reader Online Presence System

  1. Schema Changes
    - Add `is_online` boolean field to users table
    - Add `last_seen_at` timestamp field to users table
    - Create index on last_seen_at for efficient queries

  2. Functions
    - Create function to automatically mark users offline after inactivity
    - Create function to clean up stale online status

  3. Purpose
    - Track reader online/offline status for video call availability
    - Show real-time presence indicators on reader cards
    - Enable conditional video call buttons based on availability
*/

-- Add online presence fields to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS is_online boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS last_seen_at timestamptz;

-- Create index for efficient online status queries
CREATE INDEX IF NOT EXISTS users_last_seen_at_idx ON users(last_seen_at) WHERE is_reader = true;
CREATE INDEX IF NOT EXISTS users_online_readers_idx ON users(is_online, last_seen_at) WHERE is_reader = true;

-- Function to mark users offline if they haven't been seen recently
CREATE OR REPLACE FUNCTION mark_inactive_readers_offline()
RETURNS void AS $$
BEGIN
  -- Mark readers as offline if they haven't been seen in the last 5 minutes
  UPDATE users 
  SET is_online = false 
  WHERE is_reader = true 
    AND is_online = true 
    AND (last_seen_at IS NULL OR last_seen_at < NOW() - INTERVAL '5 minutes');
END;
$$ LANGUAGE plpgsql;

-- Function to clean up online status (can be called periodically)
CREATE OR REPLACE FUNCTION cleanup_reader_presence()
RETURNS void AS $$
BEGIN
  -- Mark all readers as offline if they haven't been seen in the last 10 minutes
  UPDATE users 
  SET is_online = false 
  WHERE is_reader = true 
    AND is_online = true 
    AND (last_seen_at IS NULL OR last_seen_at < NOW() - INTERVAL '10 minutes');
    
  -- Log the cleanup
  RAISE NOTICE 'Reader presence cleanup completed at %', NOW();
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to automatically update last_seen_at when is_online is set to true
CREATE OR REPLACE FUNCTION update_last_seen_on_online()
RETURNS trigger AS $$
BEGIN
  -- If is_online is being set to true, update last_seen_at
  IF NEW.is_online = true AND (OLD.is_online IS NULL OR OLD.is_online = false) THEN
    NEW.last_seen_at = NOW();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic last_seen_at updates
DROP TRIGGER IF EXISTS trigger_update_last_seen_on_online ON users;
CREATE TRIGGER trigger_update_last_seen_on_online
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_last_seen_on_online();

-- Add RLS policies for online status (if not already covered by existing policies)
-- Users should be able to update their own online status
CREATE POLICY IF NOT EXISTS "Users can update their own online status"
  ON users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Comment explaining the system
COMMENT ON COLUMN users.is_online IS 'Tracks whether a reader is currently online and available for video calls';
COMMENT ON COLUMN users.last_seen_at IS 'Timestamp of when the reader was last seen active (updated every minute while online)';
COMMENT ON FUNCTION mark_inactive_readers_offline() IS 'Marks readers as offline if they have not been seen in the last 5 minutes';
COMMENT ON FUNCTION cleanup_reader_presence() IS 'Cleanup function to mark stale readers as offline (run periodically)'; 