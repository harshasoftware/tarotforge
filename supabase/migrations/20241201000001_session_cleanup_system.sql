-- Session Cleanup System - Consolidated Migration
-- This migration adds automatic session cleanup and link expiration functionality

-- 1. Add last_seen_at column to session_participants
ALTER TABLE session_participants 
ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 2. Create performance indexes
CREATE INDEX IF NOT EXISTS idx_session_participants_last_seen 
ON session_participants(last_seen_at, is_active);

CREATE INDEX IF NOT EXISTS idx_reading_sessions_updated_at 
ON reading_sessions(updated_at, is_active);

-- 3. Main cleanup function - removes sessions where ALL participants inactive 1+ hour
CREATE OR REPLACE FUNCTION cleanup_inactive_sessions()
RETURNS void
LANGUAGE plpgsql
AS $function$
DECLARE
    inactive_session_ids UUID[];
    cleanup_count INTEGER := 0;
BEGIN
    -- Find sessions where all participants have been inactive for more than 1 hour
    WITH inactive_sessions AS (
        SELECT DISTINCT rs.id
        FROM reading_sessions rs
        WHERE rs.is_active = true
        AND NOT EXISTS (
            SELECT 1 
            FROM session_participants sp 
            WHERE sp.session_id = rs.id 
            AND sp.is_active = true 
            AND sp.last_seen_at > NOW() - INTERVAL '1 hour'
        )
        AND EXISTS (
            SELECT 1 
            FROM session_participants sp 
            WHERE sp.session_id = rs.id
        )
    )
    SELECT array_agg(id) INTO inactive_session_ids
    FROM inactive_sessions;

    -- Clean up inactive sessions
    IF inactive_session_ids IS NOT NULL AND array_length(inactive_session_ids, 1) > 0 THEN
        UPDATE reading_sessions 
        SET is_active = false, updated_at = NOW()
        WHERE id = ANY(inactive_session_ids);
        
        GET DIAGNOSTICS cleanup_count = ROW_COUNT;
        
        UPDATE session_participants 
        SET is_active = false
        WHERE session_id = ANY(inactive_session_ids);
        
        RAISE NOTICE 'Cleaned up % inactive sessions', cleanup_count;
    ELSE
        RAISE NOTICE 'No inactive sessions found for cleanup';
    END IF;
END;
$function$;

-- 4. Session expiry check function - checks if specific session should be expired
CREATE OR REPLACE FUNCTION check_session_expiry(session_id_param UUID)
RETURNS boolean
LANGUAGE plpgsql
AS $function$
DECLARE
    active_recent_participants INTEGER;
BEGIN
    SELECT COUNT(*)
    INTO active_recent_participants
    FROM session_participants sp
    WHERE sp.session_id = session_id_param
    AND sp.is_active = true
    AND sp.last_seen_at > NOW() - INTERVAL '1 hour';
    
    RETURN active_recent_participants = 0;
END;
$function$;

-- 5. Auto-update trigger function for last_seen_at
CREATE OR REPLACE FUNCTION update_participant_last_seen()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $function$
BEGIN
    IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND NEW.is_active = true) THEN
        NEW.last_seen_at = NOW();
    END IF;
    
    RETURN NEW;
END;
$function$;

-- 6. Create trigger to auto-update last_seen_at
DROP TRIGGER IF EXISTS trigger_update_participant_last_seen ON session_participants;
CREATE TRIGGER trigger_update_participant_last_seen
    BEFORE INSERT OR UPDATE ON session_participants
    FOR EACH ROW
    EXECUTE FUNCTION update_participant_last_seen();

-- 7. Scheduled cleanup function (for background service)
CREATE OR REPLACE FUNCTION schedule_session_cleanup()
RETURNS void
LANGUAGE plpgsql
AS $function$
BEGIN
    PERFORM cleanup_inactive_sessions();
    RAISE NOTICE 'Session cleanup completed at %', NOW();
END;
$function$; 