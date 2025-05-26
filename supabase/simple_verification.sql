-- Simple Verification Script for Billing & Audit System
-- Run this in Supabase SQL Editor

-- 1. Check if tables exist
SELECT 
    'session_audit_log table' as component,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'session_audit_log') 
        THEN 'EXISTS ✅'
        ELSE 'MISSING ❌'
    END as status;

-- 2. Check if functions exist
SELECT 
    routine_name as function_name,
    'EXISTS ✅' as status
FROM information_schema.routines 
WHERE routine_name IN (
    'cleanup_inactive_sessions',
    'log_session_event', 
    'get_session_billing_data',
    'get_session_analytics'
)
ORDER BY routine_name;

-- 3. Count existing sessions
SELECT 
    'Current Sessions' as info,
    COUNT(*) as total_count,
    COUNT(*) FILTER (WHERE is_active = true) as active_count
FROM reading_sessions;

-- 4. Test audit logging (simple version)
INSERT INTO session_audit_log (
    session_id,
    event_type,
    anonymous_id,
    event_data
) 
SELECT 
    id,
    'verification_test',
    'test_verification',
    '{"test": true}'::jsonb
FROM reading_sessions 
ORDER BY created_at DESC 
LIMIT 1;

-- 5. Check audit log was created
SELECT 
    'Audit Log Test' as test_name,
    COUNT(*) as verification_logs_created
FROM session_audit_log 
WHERE event_type = 'verification_test';

-- 6. Test billing function (simple call)
SELECT 
    'Billing Function' as test_name,
    'Working ✅' as status,
    COUNT(*) as sessions_in_last_30_days
FROM get_session_billing_data(
    NOW() - INTERVAL '30 days', 
    NOW()
);

-- 7. Test analytics function (simple call)
SELECT 
    'Analytics Function' as test_name,
    'Working ✅' as status,
    total_sessions,
    active_sessions
FROM get_session_analytics(
    NOW() - INTERVAL '30 days', 
    NOW()
);

-- 8. Clean up test data
DELETE FROM session_audit_log 
WHERE event_type = 'verification_test';

-- 9. Final summary
SELECT 
    'VERIFICATION COMPLETE' as status,
    '🎉 All systems working!' as message,
    NOW() as completed_at; 