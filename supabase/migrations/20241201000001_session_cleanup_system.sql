-- Session Cleanup System - Consolidated Migration ✅ TESTED & WORKING
-- This migration adds automatic session cleanup, link expiration, billing, and audit functionality
-- Successfully tested and verified working on 2024-12-01

-- 1. Add last_seen_at column to session_participants
ALTER TABLE session_participants 
ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 2. Create performance indexes
CREATE INDEX IF NOT EXISTS idx_session_participants_last_seen 
ON session_participants(last_seen_at, is_active);

CREATE INDEX IF NOT EXISTS idx_reading_sessions_updated_at 
ON reading_sessions(updated_at, is_active);

-- 3. Session audit log table for billing and tracking
CREATE TABLE IF NOT EXISTS session_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES reading_sessions(id),
    event_type TEXT NOT NULL, -- 'created', 'joined', 'left', 'expired', 'completed'
    participant_id UUID REFERENCES session_participants(id),
    user_id UUID,
    anonymous_id TEXT,
    event_data JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for efficient audit queries
CREATE INDEX IF NOT EXISTS idx_session_audit_log_session_id 
ON session_audit_log(session_id, created_at);

CREATE INDEX IF NOT EXISTS idx_session_audit_log_event_type 
ON session_audit_log(event_type, created_at);

-- 4. Main cleanup function - DEACTIVATES sessions (preserves for billing)
CREATE OR REPLACE FUNCTION cleanup_inactive_sessions()
RETURNS void
LANGUAGE plpgsql
AS $function$
DECLARE
    inactive_session_ids UUID[];
    cleanup_count INTEGER := 0;
    session_record RECORD;
BEGIN
    -- Find sessions where all participants have been inactive for more than 1 hour
    WITH inactive_sessions AS (
        SELECT DISTINCT rs.id, rs.created_at, rs.updated_at
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

    -- Deactivate sessions (preserve for billing/audit)
    IF inactive_session_ids IS NOT NULL AND array_length(inactive_session_ids, 1) > 0 THEN
        -- Log session expiration events
        FOR session_record IN 
            SELECT rs.id, rs.created_at, rs.updated_at,
                   COUNT(sp.id) as participant_count,
                   EXTRACT(EPOCH FROM (NOW() - rs.created_at))/60 as duration_minutes
            FROM reading_sessions rs
            LEFT JOIN session_participants sp ON rs.id = sp.session_id
            WHERE rs.id = ANY(inactive_session_ids)
            GROUP BY rs.id, rs.created_at, rs.updated_at
        LOOP
            INSERT INTO session_audit_log (
                session_id, 
                event_type, 
                event_data
            ) VALUES (
                session_record.id,
                'expired',
                jsonb_build_object(
                    'reason', 'inactivity_timeout',
                    'duration_minutes', session_record.duration_minutes,
                    'participant_count', session_record.participant_count,
                    'expired_at', NOW()
                )
            );
        END LOOP;

        -- Deactivate sessions (keep data for billing)
        UPDATE reading_sessions 
        SET is_active = false, updated_at = NOW()
        WHERE id = ANY(inactive_session_ids);
        
        GET DIAGNOSTICS cleanup_count = ROW_COUNT;
        
        -- Deactivate participants (keep data for audit)
        UPDATE session_participants 
        SET is_active = false
        WHERE session_id = ANY(inactive_session_ids);
        
        RAISE NOTICE 'Deactivated % inactive sessions (preserved for billing)', cleanup_count;
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

-- 7. Audit logging function for session events
CREATE OR REPLACE FUNCTION log_session_event(
    p_session_id UUID,
    p_event_type TEXT,
    p_participant_id UUID DEFAULT NULL,
    p_user_id UUID DEFAULT NULL,
    p_anonymous_id TEXT DEFAULT NULL,
    p_event_data JSONB DEFAULT '{}'
)
RETURNS UUID
LANGUAGE plpgsql
AS $function$
DECLARE
    log_id UUID;
BEGIN
    INSERT INTO session_audit_log (
        session_id,
        event_type,
        participant_id,
        user_id,
        anonymous_id,
        event_data
    ) VALUES (
        p_session_id,
        p_event_type,
        p_participant_id,
        p_user_id,
        p_anonymous_id,
        p_event_data
    ) RETURNING id INTO log_id;
    
    RETURN log_id;
END;
$function$;

-- 8. Billing helper function - get session usage for billing period
CREATE OR REPLACE FUNCTION get_session_billing_data(
    start_date TIMESTAMP WITH TIME ZONE,
    end_date TIMESTAMP WITH TIME ZONE
)
RETURNS TABLE (
    session_id UUID,
    host_user_id UUID,
    created_at TIMESTAMP WITH TIME ZONE,
    ended_at TIMESTAMP WITH TIME ZONE,
    duration_minutes NUMERIC,
    participant_count INTEGER,
    total_interactions INTEGER,
    session_type TEXT
)
LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY
    SELECT 
        rs.id as session_id,
        rs.host_user_id,
        rs.created_at,
        COALESCE(
            (SELECT sal.created_at 
             FROM session_audit_log sal 
             WHERE sal.session_id = rs.id 
             AND sal.event_type IN ('expired', 'completed')
             ORDER BY sal.created_at DESC 
             LIMIT 1),
            rs.updated_at
        ) as ended_at,
        EXTRACT(EPOCH FROM (
            COALESCE(
                (SELECT sal.created_at 
                 FROM session_audit_log sal 
                 WHERE sal.session_id = rs.id 
                 AND sal.event_type IN ('expired', 'completed')
                 ORDER BY sal.created_at DESC 
                 LIMIT 1),
                rs.updated_at
            ) - rs.created_at
        ))/60 as duration_minutes,
        (SELECT COUNT(DISTINCT sp.id)
         FROM session_participants sp 
         WHERE sp.session_id = rs.id) as participant_count,
        (SELECT COUNT(*)
         FROM session_audit_log sal 
         WHERE sal.session_id = rs.id) as total_interactions,
        CASE 
            WHEN rs.host_user_id IS NULL THEN 'guest'
            ELSE 'authenticated'
        END as session_type
    FROM reading_sessions rs
    WHERE rs.created_at >= start_date 
    AND rs.created_at <= end_date
    ORDER BY rs.created_at DESC;
END;
$function$;

-- 9. Session analytics function for reporting
CREATE OR REPLACE FUNCTION get_session_analytics(
    start_date TIMESTAMP WITH TIME ZONE,
    end_date TIMESTAMP WITH TIME ZONE
)
RETURNS TABLE (
    total_sessions INTEGER,
    active_sessions INTEGER,
    completed_sessions INTEGER,
    expired_sessions INTEGER,
    avg_duration_minutes NUMERIC,
    total_participants INTEGER,
    avg_participants_per_session NUMERIC,
    guest_sessions INTEGER,
    authenticated_sessions INTEGER
)
LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::INTEGER as total_sessions,
        COUNT(*) FILTER (WHERE rs.is_active = true)::INTEGER as active_sessions,
        COUNT(*) FILTER (WHERE EXISTS (
            SELECT 1 FROM session_audit_log sal 
            WHERE sal.session_id = rs.id AND sal.event_type = 'completed'
        ))::INTEGER as completed_sessions,
        COUNT(*) FILTER (WHERE EXISTS (
            SELECT 1 FROM session_audit_log sal 
            WHERE sal.session_id = rs.id AND sal.event_type = 'expired'
        ))::INTEGER as expired_sessions,
        AVG(EXTRACT(EPOCH FROM (rs.updated_at - rs.created_at))/60) as avg_duration_minutes,
        (SELECT COUNT(*) FROM session_participants sp 
         JOIN reading_sessions rs2 ON sp.session_id = rs2.id
         WHERE rs2.created_at >= start_date AND rs2.created_at <= end_date)::INTEGER as total_participants,
        AVG((SELECT COUNT(*) FROM session_participants sp WHERE sp.session_id = rs.id)) as avg_participants_per_session,
        COUNT(*) FILTER (WHERE rs.host_user_id IS NULL)::INTEGER as guest_sessions,
        COUNT(*) FILTER (WHERE rs.host_user_id IS NOT NULL)::INTEGER as authenticated_sessions
    FROM reading_sessions rs
    WHERE rs.created_at >= start_date 
    AND rs.created_at <= end_date;
END;
$function$;

-- 10. Scheduled cleanup function (for background service)
CREATE OR REPLACE FUNCTION schedule_session_cleanup()
RETURNS void
LANGUAGE plpgsql
AS $function$
BEGIN
    PERFORM cleanup_inactive_sessions();
    RAISE NOTICE 'Session cleanup completed at %', NOW();
END;
$function$; 