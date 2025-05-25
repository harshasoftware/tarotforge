-- Add unique constraint to prevent duplicate anonymous participants in the same session
-- This will help prevent the counter from going up on page refresh

-- First, clean up any existing duplicate anonymous participants
-- Keep only the most recent participant for each anonymous_id per session
DO $$
DECLARE
    duplicate_record RECORD;
BEGIN
    -- Find and deactivate duplicate participants
    FOR duplicate_record IN
        WITH ranked_participants AS (
            SELECT 
                id,
                session_id,
                anonymous_id,
                ROW_NUMBER() OVER (
                    PARTITION BY session_id, anonymous_id 
                    ORDER BY joined_at DESC
                ) as rn
            FROM session_participants 
            WHERE anonymous_id IS NOT NULL
        )
        SELECT id 
        FROM ranked_participants 
        WHERE rn > 1
    LOOP
        UPDATE session_participants 
        SET is_active = false 
        WHERE id = duplicate_record.id;
    END LOOP;
    
    -- Now add the unique constraint
    ALTER TABLE session_participants 
    ADD CONSTRAINT unique_anonymous_per_session 
    UNIQUE (session_id, anonymous_id);
    
EXCEPTION
    WHEN unique_violation THEN
        -- If constraint already exists, that's fine
        RAISE NOTICE 'Unique constraint already exists, skipping...';
    WHEN OTHERS THEN
        -- Log any other errors but don't fail the migration
        RAISE NOTICE 'Error adding unique constraint: %', SQLERRM;
END $$;

-- Add comment to explain the constraint
COMMENT ON CONSTRAINT unique_anonymous_per_session ON session_participants 
IS 'Ensures one anonymous participant per browser per session to prevent duplicate counters on refresh';

-- Create function to handle participant upsert for anonymous users
CREATE OR REPLACE FUNCTION upsert_anonymous_participant(
  p_session_id uuid,
  p_anonymous_id text,
  p_name text DEFAULT NULL
) RETURNS uuid AS $$
DECLARE
  participant_id uuid;
BEGIN
  -- Try to reactivate existing participant first
  UPDATE session_participants 
  SET is_active = true, 
      last_seen_at = now(),
      name = COALESCE(p_name, name)
  WHERE session_id = p_session_id 
    AND anonymous_id = p_anonymous_id
  RETURNING id INTO participant_id;
  
  -- If no existing participant, create new one
  IF participant_id IS NULL THEN
    INSERT INTO session_participants (
      session_id, 
      anonymous_id, 
      name, 
      is_active
    ) VALUES (
      p_session_id, 
      p_anonymous_id, 
      p_name, 
      true
    ) RETURNING id INTO participant_id;
  END IF;
  
  RETURN participant_id;
END;
$$ LANGUAGE plpgsql; 