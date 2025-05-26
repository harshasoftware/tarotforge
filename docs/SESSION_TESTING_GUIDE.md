# Session Monitoring - Quick Testing Guide

## 🚀 Quick Start for Testers

### Prerequisites
- App running on `http://localhost:5175/`
- Browser developer tools open (Console tab)
- Database access (optional, for advanced testing)

## ✅ Verification Test (30 seconds)

**Run this first to verify everything is working:**

### Database Function Test:
```bash
# Run the simple verification test
npx supabase db reset
# Then run: supabase/migrations/simple_cleanup_test.sql

# Expected output:
✅ "Checking if cleanup functions exist..."
✅ "Checking if last_seen_at column exists..."  
✅ "Checking if indexes exist..."
✅ "Testing cleanup function..."
✅ "Testing session expiry check..."
✅ "All tests completed successfully!"
```

### What This Verifies:
- ✅ All cleanup functions are installed
- ✅ Database schema is correct (`last_seen_at` column exists)
- ✅ Performance indexes are in place
- ✅ Cleanup function runs without errors
- ✅ Session expiry checking works
- ✅ Triggers are properly configured

**If this test fails, check your database migrations. If it passes, proceed with the scenarios below.**

## 🧪 Test Scenarios

### 1. Link Expiration Test (5 minutes)

#### Setup:
```bash
1. Open reading room: http://localhost:5175/reading/rider-waite-classic
2. Click "Share" button
3. Copy the invite link
4. Close the session
```

#### For Quick Testing (Modify timeout temporarily):
```typescript
// In src/stores/readingSessionStore.ts, line ~340
// Change from 1 hour to 1 minute for testing:
if (hoursSinceActivity > 0.0167) { // 1 minute instead of 1 hour
```

#### Test Steps:
```bash
1. Wait 1+ minutes (or 1+ hour if not modified)
2. Open invite link in new browser/incognito
3. ✅ Should see: "This invitation link has expired..."
4. ✅ Should see navigation buttons: "Home" and "Browse Marketplace"
5. ✅ Click "Home" - should redirect to homepage
```

### 2. Session Cleanup Test (2 minutes)

#### Console Commands:
```javascript
// Open browser console and run:

// Check cleanup service status
const service = window.sessionCleanupService || 
  (await import('/src/utils/sessionCleanup.js')).SessionCleanupService.getInstance();

// Get current stats
const stats = await service.getCleanupStats();
console.log('Before cleanup:', stats);

// Run manual cleanup
await service.runCleanup();

// Check stats after cleanup
const newStats = await service.getCleanupStats();
console.log('After cleanup:', newStats);
```

#### Expected Console Output:
```
SessionCleanupService started with interval: 15 minutes
Before cleanup: {totalSessions: 5, activeSessions: 2, inactiveSessions: 3}
Cleanup completed. Removed 3 sessions
After cleanup: {totalSessions: 2, activeSessions: 2, inactiveSessions: 0}
```

### 3. Real-time Session Expiry Test (10 minutes)

#### Setup:
```bash
1. Join active session
2. Keep session open
3. Simulate inactivity (don't interact with page)
```

#### Monitor Console:
```
✅ Every 30s: "Updating participant presence for session: abc123"
✅ Every 5min: "Session expiry check: false"
✅ After expiry: "Session expired, redirecting to home"
```

### 4. Presence Update Test (1 minute)

#### Steps:
```bash
1. Join session with multiple participants
2. Watch console for presence updates
3. ✅ Should see updates every 30 seconds
4. ✅ Database should show updated last_seen_at timestamps
```

## 🔍 Debugging Commands

### Browser Console:
```javascript
// Check current session state
const store = useReadingSessionStore.getState();
console.log('Session:', store.sessionState);
console.log('Participants:', store.participants);

// Force presence update
await store.updatePresence();

// Check session expiry
const expired = await store.checkSessionExpiry();
console.log('Session expired:', expired);

// Manual cleanup
await store.cleanupInactiveSessions();
```

### Database Queries (if you have access):
```sql
-- Check active sessions
SELECT id, created_at, updated_at, is_active 
FROM reading_sessions 
WHERE is_active = true;

-- Check participant activity
SELECT sp.session_id, sp.last_seen_at, sp.is_active,
       rs.updated_at as session_updated
FROM session_participants sp
JOIN reading_sessions rs ON sp.session_id = rs.id
WHERE sp.is_active = true;

-- Manual cleanup test
SELECT cleanup_inactive_sessions();
```

## 🎯 Expected Behaviors

### ✅ Success Indicators:

1. **Link Expiration:**
   - Clear error message displayed
   - Navigation buttons work
   - No console errors

2. **Session Cleanup:**
   - Console shows cleanup activity
   - Database sessions removed
   - No performance impact

3. **Real-time Monitoring:**
   - Regular presence updates
   - Automatic expiry detection
   - Smooth redirects

4. **Error Handling:**
   - Graceful failure recovery
   - User-friendly messages
   - No app crashes

### ❌ Failure Indicators:

1. **Broken Link Expiration:**
   - Users can join expired sessions
   - No error message shown
   - Console errors about database

2. **Failed Cleanup:**
   - Sessions accumulate in database
   - Console shows cleanup errors
   - Performance degradation

3. **Missing Presence Updates:**
   - No console activity logs
   - Stale last_seen_at timestamps
   - Sessions don't expire when they should

## 🛠️ Common Issues & Fixes

### Issue: "Link expiration not working"
```bash
# Check:
1. Is accessMethod === 'invite'? (Check URL has &invite=true)
2. Are participants being created with last_seen_at?
3. Is the time calculation correct?

# Fix: Verify invite link format:
# ✅ Correct: /reading/deck?join=abc123&invite=true
# ❌ Wrong: /reading/deck?join=abc123
```

### Issue: "Cleanup service not running"
```bash
# Check:
1. Is service started in App.tsx?
2. Are there console errors?
3. Is the interval too long for testing?

# Fix: Check App.tsx has:
useEffect(() => {
  sessionCleanupService.start(15);
}, []);
```

### Issue: "Database permissions error"
```bash
# Check:
1. Are RLS policies correct?
2. Is user authenticated?
3. Are database functions accessible?

# Fix: Verify Supabase policies allow cleanup operations
```

## 📊 Performance Monitoring

### Key Metrics to Watch:

1. **Database Performance:**
   - Cleanup query execution time < 100ms
   - Index usage in EXPLAIN ANALYZE
   - No table locks during cleanup

2. **Memory Usage:**
   - Service memory footprint < 1MB
   - No memory leaks in intervals
   - Cleanup frees resources

3. **User Experience:**
   - Link validation < 500ms
   - Error display < 200ms
   - No UI blocking during cleanup

### Monitoring Commands:
```javascript
// Performance timing
console.time('cleanup');
await service.runCleanup();
console.timeEnd('cleanup');

// Memory usage
console.log('Memory:', performance.memory);
```

## 🔄 Test Automation Ideas

### Unit Tests:
```typescript
// Test link expiration logic
test('should reject expired invite links', async () => {
  // Mock old session
  // Call joinSession with invite access
  // Expect expiration error
});

// Test cleanup service
test('should remove inactive sessions', async () => {
  // Create old sessions
  // Run cleanup
  // Verify removal
});
```

### Integration Tests:
```typescript
// Test full user flow
test('expired link shows error and redirects', async () => {
  // Create session
  // Wait for expiry
  // Visit invite link
  // Verify error screen
  // Click home button
  // Verify redirect
});
```

## 📁 Test Files Reference

### Available Files:

1. **`supabase/migrations/simple_cleanup_test.sql`** ⭐ **RECOMMENDED**
   - **Purpose**: Quick verification that all functions work
   - **Runtime**: ~30 seconds
   - **Use**: First test to run, verifies basic functionality
   - **Output**: "All tests completed successfully!" if working

2. **`supabase/migrations/20241201000001_session_cleanup_system.sql`** 
   - **Purpose**: Main migration file with all session cleanup functionality
   - **Use**: Production migration (already applied if tests pass)
   - **Contains**: Column, functions, triggers, indexes - everything in one file

### File Usage:

```bash
# Quick verification (run this first):
npx supabase db reset
# Then execute: simple_cleanup_test.sql

# If you need to reinstall the system:
# Execute: 20241201000001_session_cleanup_system.sql
# (This is the main migration that sets up everything)
```

### Test Results Interpretation:

✅ **"All tests completed successfully!"** = System is working perfectly
❌ **SQL errors** = Check database migrations and function installation
⚠️ **Partial success** = Some functions may be missing or misconfigured

This guide provides everything needed to quickly test and verify the session monitoring system is working correctly! 