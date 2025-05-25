-- Add shuffled_deck column to reading_sessions table
ALTER TABLE reading_sessions 
ADD COLUMN shuffled_deck jsonb DEFAULT '[]'::jsonb;

-- Add comment for documentation
COMMENT ON COLUMN reading_sessions.shuffled_deck IS 'Array of shuffled cards for the current session'; 