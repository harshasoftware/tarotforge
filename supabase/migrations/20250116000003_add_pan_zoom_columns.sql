-- Add pan_offset and zoom_focus columns to reading_sessions table for pan and zoom synchronization
ALTER TABLE reading_sessions 
ADD COLUMN pan_offset JSONB DEFAULT '{"x": 0, "y": 0}'::jsonb;

ALTER TABLE reading_sessions 
ADD COLUMN zoom_focus JSONB DEFAULT NULL;

-- Add comments to explain the columns
COMMENT ON COLUMN reading_sessions.pan_offset IS 'Pan offset for synchronized view positioning across participants';
COMMENT ON COLUMN reading_sessions.zoom_focus IS 'Zoom focus point for synchronized zooming across participants'; 