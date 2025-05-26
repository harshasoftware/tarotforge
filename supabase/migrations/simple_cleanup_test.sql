-- Simple Session Cleanup Test
-- This file tests basic functionality without complex operators

-- 1. Check if functions exist
SELECT 'Checking if cleanup functions exist...' as status;

SELECT 
    routine_name,
    routine_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN ('cleanup_inactive_sessions', 'check_session_expiry', 'update_participant_last_seen');

-- 2. Check if last_seen_at column exists
SELECT 'Checking if last_seen_at column exists...' as status;

SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'session_participants' 
AND column_name = 'last_seen_at';

-- 3. Check if indexes exist
SELECT 'Checking if indexes exist...' as status;

SELECT 
    indexname,
    tablename
FROM pg_indexes 
WHERE tablename IN ('session_participants', 'reading_sessions')
AND indexname LIKE '%last_seen%' OR indexname LIKE '%updated_at%';

-- 4. Test basic cleanup function (should run without errors)
SELECT 'Testing cleanup function...' as status;
SELECT cleanup_inactive_sessions();

-- 5. Test session expiry check with a dummy UUID
SELECT 'Testing session expiry check...' as status;
SELECT check_session_expiry('00000000-0000-0000-0000-000000000000') as dummy_check;

SELECT 'All tests completed successfully!' as status; 