-- Add loading_states column to reading_sessions table
ALTER TABLE reading_sessions 
ADD COLUMN loading_states JSONB DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN reading_sessions.loading_states IS 'Stores loading states for shuffling and interpretation generation with participant attribution'; 