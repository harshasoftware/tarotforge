-- Add shared_modal_state column to reading_sessions table for modal synchronization
ALTER TABLE reading_sessions 
ADD COLUMN shared_modal_state JSONB DEFAULT NULL;

-- Add video_call_state column to reading_sessions table for video call synchronization
ALTER TABLE reading_sessions 
ADD COLUMN video_call_state JSONB DEFAULT NULL;

-- Add comments to explain the columns
COMMENT ON COLUMN reading_sessions.shared_modal_state IS 'Synchronized modal state for card gallery and descriptions across all participants';
COMMENT ON COLUMN reading_sessions.video_call_state IS 'Video call state tracking active calls and participants for automatic joining';
