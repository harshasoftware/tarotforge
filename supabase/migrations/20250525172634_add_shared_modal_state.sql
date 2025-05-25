-- Add shared_modal_state column to reading_sessions table for modal synchronization
ALTER TABLE reading_sessions 
ADD COLUMN shared_modal_state JSONB DEFAULT NULL;

-- Add comment to explain the column
COMMENT ON COLUMN reading_sessions.shared_modal_state IS 'Synchronized modal state for card gallery and descriptions across all participants';
