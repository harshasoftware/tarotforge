# Reader Online Presence - Implementation Guide

## Quick Start

### 1. Database Setup

Run the migration to add presence fields:

```bash
npx supabase db push
```

This adds:
- `is_online` boolean column to users table
- `last_seen_at` timestamp column to users table
- Optimized indexes for presence queries
- Database functions for cleanup and maintenance

### 2. Frontend Integration

#### Import the Presence Service
```typescript
import { readerPresenceService } from './lib/reader-presence';
```

#### Initialize in App Component
```typescript
// In App.tsx
useEffect(() => {
  if (user?.is_reader) {
    readerPresenceService.startTracking();
  } else {
    readerPresenceService.stopTracking();
  }

  return () => {
    readerPresenceService.stopTracking();
  };
}, [user?.is_reader]);
```

#### Update Reader Components
The `ReaderCard` component automatically shows:
- 🟢 Green dot for online readers
- ⚫ Gray dot for offline readers
- "Online" / "Offline" text status
- Enabled/disabled video button

### 3. Testing

#### Manual Testing
1. Log in as a reader → Should show online
2. Close browser → Should show offline after 5 minutes
3. Switch tabs → Presence updates when tab becomes visible
4. Check reader list → Online status updates every 2 minutes

#### Database Testing
```sql
-- Check online readers
SELECT id, username, is_online, last_seen_at 
FROM users 
WHERE is_reader = true AND is_online = true;

-- Test cleanup function
SELECT cleanup_reader_presence();
```

## File Structure

```
src/
├── lib/
│   ├── reader-presence.ts          # Main presence service
│   └── reader-services.ts          # Enhanced with online status
├── components/readers/
│   └── ReaderCard.tsx              # Updated with indicators
├── pages/readers/
│   └── ReadersPage.tsx             # Auto-refresh functionality
├── types/
│   └── index.ts                    # Extended User interface
└── App.tsx                         # Presence initialization

supabase/migrations/
└── 20241201000002_reader_online_presence.sql
```

## Key Features

### ✅ Automatic Tracking
- Starts when reader logs in
- Updates every minute while active
- Stops when reader logs out

### ✅ Visual Indicators
- Green/gray dots on profile images
- Online/offline text labels
- Conditional video buttons

### ✅ Performance Optimized
- Efficient database queries
- Minimal network overhead
- Automatic cleanup of stale data

### ✅ Error Resilient
- Graceful handling of network issues
- Automatic recovery on reconnection
- Safe to call multiple times

## Configuration

### Timing Constants
```typescript
// In reader-presence.ts
const ONLINE_THRESHOLD_MINUTES = 5;        // Consider offline after 5 minutes
const PRESENCE_UPDATE_INTERVAL = 60000;    // Update every minute

// In ReadersPage.tsx
const REFRESH_INTERVAL = 120000;           // Refresh UI every 2 minutes
```

### Database Thresholds
```sql
-- mark_inactive_readers_offline: 5-minute threshold
-- cleanup_reader_presence: 10-minute threshold
```

## Troubleshooting

### Common Issues

#### Readers Not Showing Online
1. Check browser console for errors
2. Verify user has `is_reader = true`
3. Check database connection
4. Confirm presence service is running

#### Stale Online Status
1. Run cleanup function: `SELECT cleanup_reader_presence();`
2. Check presence update intervals
3. Verify event handlers are working

#### Performance Issues
1. Check database indexes are created
2. Monitor query performance with `EXPLAIN ANALYZE`
3. Adjust refresh intervals if needed

### Debug Commands

```sql
-- Check presence system status
SELECT 
  COUNT(*) as total_readers,
  COUNT(*) FILTER (WHERE is_online = true) as online_readers,
  COUNT(*) FILTER (WHERE last_seen_at > NOW() - INTERVAL '5 minutes') as recently_active
FROM users WHERE is_reader = true;

-- Find stale presence records
SELECT id, username, is_online, last_seen_at,
  EXTRACT(EPOCH FROM (NOW() - last_seen_at))/60 as minutes_since_seen
FROM users 
WHERE is_reader = true 
  AND is_online = true 
  AND last_seen_at < NOW() - INTERVAL '5 minutes';
```

## Maintenance

### Regular Tasks
```sql
-- Weekly cleanup (can be automated)
SELECT cleanup_reader_presence();

-- Monthly index maintenance
REINDEX INDEX users_online_readers_idx;
```

### Monitoring
- Track presence update frequency
- Monitor query performance
- Watch for error patterns
- Check reader availability patterns

## Security Notes

- Users can only update their own presence
- Only online/offline status is exposed
- No sensitive information in presence data
- Automatic data expiration prevents accumulation

## Next Steps

After implementation:
1. Monitor system performance
2. Gather user feedback
3. Consider future enhancements:
   - Rich presence (busy, away, in session)
   - Scheduled availability
   - Push notifications for favorite readers
   - WebSocket integration for real-time updates 