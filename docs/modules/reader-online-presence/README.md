# Reader Online Presence System

## Overview

The Reader Online Presence System provides real-time tracking of certified tarot readers' availability status, enabling users to see which readers are currently online and available for video consultations. This system enhances user experience by providing clear visual indicators and conditional functionality based on reader availability.

## Features

### 🟢 Real-time Presence Tracking
- Automatic online/offline status detection
- 5-minute activity threshold for accurate presence
- Browser visibility and page unload handling
- Periodic presence updates every minute

### 🎨 Visual Indicators
- **Green dot**: Reader is online and available
- **Gray dot**: Reader is offline or unavailable
- **Status text**: Clear "Online" or "Offline" labels
- **Conditional buttons**: Video calls only available when online

### ⚡ Performance Optimized
- Efficient database queries with proper indexing
- Automatic cleanup of stale presence data
- Minimal network overhead with smart update intervals
- Background processing for seamless user experience

## Architecture

### Database Schema

```sql
-- Added to users table
ALTER TABLE users 
ADD COLUMN is_online boolean DEFAULT false,
ADD COLUMN last_seen_at timestamptz;

-- Optimized indexes
CREATE INDEX users_last_seen_at_idx ON users(last_seen_at) WHERE is_reader = true;
CREATE INDEX users_online_readers_idx ON users(is_online, last_seen_at) WHERE is_reader = true;
```

### Core Components

```
src/lib/reader-presence.ts     # Presence tracking service
src/components/readers/        # UI components with presence indicators
src/types/index.ts            # Extended User interface
supabase/migrations/          # Database schema updates
```

## Implementation Details

### 1. Presence Service (`src/lib/reader-presence.ts`)

The `ReaderPresenceService` class manages all presence tracking functionality:

```typescript
class ReaderPresenceService {
  // Core Methods
  startTracking()    // Begin presence tracking for current reader
  stopTracking()     // Stop tracking and mark offline
  updatePresence()   // Update last_seen_at timestamp
  
  // Static Utilities
  getReadersOnlineStatus(readerIds: string[])  // Bulk status check
  isReaderOnline(readerId: string)             // Single reader check
}
```

**Key Features:**
- **Automatic initialization**: Starts when a reader logs in
- **Event handling**: Responds to page visibility and browser close
- **Error resilience**: Graceful handling of network issues
- **Memory management**: Proper cleanup of intervals and listeners

### 2. Database Functions

#### `mark_inactive_readers_offline()`
Automatically marks readers as offline if inactive for 5+ minutes:

```sql
UPDATE users 
SET is_online = false 
WHERE is_reader = true 
  AND is_online = true 
  AND last_seen_at < NOW() - INTERVAL '5 minutes';
```

#### `cleanup_reader_presence()`
Comprehensive cleanup function for maintenance:

```sql
UPDATE users 
SET is_online = false 
WHERE is_reader = true 
  AND is_online = true 
  AND last_seen_at < NOW() - INTERVAL '10 minutes';
```

#### `update_last_seen_on_online()` (Trigger)
Automatically updates `last_seen_at` when `is_online` is set to true.

### 3. UI Integration

#### Reader Card Component
Enhanced `ReaderCard` component with presence indicators:

```tsx
// Online Status Indicator (Profile Image)
<div className="absolute -top-1 -right-1">
  <Circle className={`h-4 w-4 ${reader.is_online ? 'text-green-500 fill-green-500' : 'text-gray-400 fill-gray-400'}`} />
</div>

// Status Text
<div className="flex items-center mt-1">
  <Circle className={`h-2 w-2 mr-1 ${reader.is_online ? 'text-green-500 fill-green-500' : 'text-gray-400 fill-gray-400'}`} />
  <span className={`text-xs ${reader.is_online ? 'text-green-600' : 'text-muted-foreground'}`}>
    {reader.is_online ? 'Online' : 'Offline'}
  </span>
</div>

// Conditional Video Button
{reader.is_online ? (
  <Link to="#" className="flex-1 btn btn-secondary p-2 text-xs flex items-center justify-center hover:bg-secondary/80">
    <Video className="h-3 w-3 mr-1" />
    Video
  </Link>
) : (
  <button disabled className="flex-1 p-2 text-xs flex items-center justify-center rounded-md bg-muted/50 text-muted-foreground cursor-not-allowed opacity-60">
    <Video className="h-3 w-3 mr-1" />
    Video
  </button>
)}
```

## Configuration

### Environment Variables
No additional environment variables required - uses existing Supabase configuration.

### Timing Constants
```typescript
const ONLINE_THRESHOLD_MINUTES = 5;        // Consider offline after 5 minutes
const PRESENCE_UPDATE_INTERVAL = 60000;    // Update every minute
const REFRESH_INTERVAL = 120000;           // Refresh UI every 2 minutes
```

### Database Policies
```sql
-- Users can update their own online status
CREATE POLICY "Users can update their own online status"
  ON users FOR UPDATE TO authenticated
  USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
```

## Usage Examples

### Starting Presence Tracking
```typescript
import { readerPresenceService } from './lib/reader-presence';

// Automatically starts when user is a reader
useEffect(() => {
  if (user?.is_reader) {
    readerPresenceService.startTracking();
  }
  return () => readerPresenceService.stopTracking();
}, [user?.is_reader]);
```

### Checking Reader Status
```typescript
import { getReadersOnlineStatus, isReaderOnline } from './lib/reader-presence';

// Check multiple readers
const statuses = await getReadersOnlineStatus(['reader1', 'reader2']);
console.log(statuses); // { reader1: true, reader2: false }

// Check single reader
const isOnline = await isReaderOnline('reader1');
console.log(isOnline); // true
```

### Fetching Readers with Status
```typescript
import { fetchAllReaders } from './lib/reader-services';

const readers = await fetchAllReaders();
// Each reader object includes is_online and last_seen_at fields
```

## Performance Considerations

### Database Optimization
- **Partial indexes**: Only index readers (`WHERE is_reader = true`)
- **Composite indexes**: Efficient queries on `(is_online, last_seen_at)`
- **Automatic cleanup**: Prevents accumulation of stale data

### Network Efficiency
- **Batched updates**: Single query updates multiple readers
- **Smart intervals**: Balance between accuracy and performance
- **Beacon API**: Reliable offline status on page unload

### Memory Management
- **Proper cleanup**: All intervals and listeners are cleared
- **Event delegation**: Minimal memory footprint
- **Singleton pattern**: Single service instance per app

## Testing

### Manual Testing Scenarios

1. **Reader Login/Logout**
   - ✅ Reader shows online when logged in
   - ✅ Reader shows offline when logged out

2. **Page Visibility**
   - ✅ Presence updates when page becomes visible
   - ✅ No updates when page is hidden

3. **Network Interruption**
   - ✅ Graceful handling of connection issues
   - ✅ Automatic recovery when connection restored

4. **Browser Close**
   - ✅ Reader marked offline when browser closed
   - ✅ Beacon API ensures reliable status update

### Database Testing
```sql
-- Test presence cleanup
SELECT cleanup_reader_presence();

-- Check online readers
SELECT id, username, is_online, last_seen_at 
FROM users 
WHERE is_reader = true AND is_online = true;

-- Test automatic offline marking
SELECT mark_inactive_readers_offline();
```

## Troubleshooting

### Common Issues

#### Readers Not Showing Online
**Symptoms**: Reader is active but shows as offline
**Solutions**:
1. Check browser console for JavaScript errors
2. Verify database connection
3. Confirm user has `is_reader = true`
4. Check `last_seen_at` timestamp

#### Stale Online Status
**Symptoms**: Readers show online when they're not
**Solutions**:
1. Run `cleanup_reader_presence()` function
2. Check presence update intervals
3. Verify browser event handlers

#### Performance Issues
**Symptoms**: Slow reader list loading
**Solutions**:
1. Check database indexes are created
2. Monitor query performance
3. Adjust refresh intervals

### Debug Commands

```sql
-- Check presence system status
SELECT 
  COUNT(*) as total_readers,
  COUNT(*) FILTER (WHERE is_online = true) as online_readers,
  COUNT(*) FILTER (WHERE last_seen_at > NOW() - INTERVAL '5 minutes') as recently_active
FROM users WHERE is_reader = true;

-- Find readers with stale presence
SELECT id, username, is_online, last_seen_at,
  EXTRACT(EPOCH FROM (NOW() - last_seen_at))/60 as minutes_since_seen
FROM users 
WHERE is_reader = true 
  AND is_online = true 
  AND last_seen_at < NOW() - INTERVAL '5 minutes';
```

## Security Considerations

### Data Privacy
- Only online status is exposed, not detailed activity
- Presence data automatically expires
- No sensitive information in presence updates

### Access Control
- Users can only update their own presence
- Read access follows existing user policies
- No elevation of privileges required

### Rate Limiting
- Built-in intervals prevent excessive updates
- Database-level constraints prevent abuse
- Graceful degradation under load

## Future Enhancements

### Planned Features
- **Rich presence**: Show current activity (e.g., "In reading session")
- **Availability scheduling**: Set specific online hours
- **Push notifications**: Alert when favorite readers come online
- **Analytics**: Track reader availability patterns

### Technical Improvements
- **WebSocket integration**: Real-time presence updates
- **Offline detection**: More sophisticated connectivity checking
- **Presence history**: Track availability patterns
- **Load balancing**: Distribute presence updates

## Migration Guide

### Database Migration
```bash
# Apply the presence system migration
npx supabase db push
```

### Code Integration
1. Import presence service in your app
2. Add presence tracking to reader authentication flow
3. Update reader components to show status indicators
4. Test presence functionality across different scenarios

## API Reference

### ReaderPresenceService

#### Methods

##### `startTracking(): void`
Begins presence tracking for the current authenticated reader.
- Starts periodic presence updates
- Sets up event listeners for page visibility
- Marks reader as online immediately

##### `stopTracking(): void`
Stops presence tracking and marks reader as offline.
- Clears all intervals and event listeners
- Sends offline status to database
- Safe to call multiple times

##### `static getReadersOnlineStatus(readerIds: string[]): Promise<Record<string, boolean>>`
Retrieves online status for multiple readers efficiently.
- **Parameters**: Array of reader IDs
- **Returns**: Object mapping reader IDs to boolean online status
- **Example**: `{ "reader1": true, "reader2": false }`

##### `static isReaderOnline(readerId: string): Promise<boolean>`
Checks if a specific reader is currently online.
- **Parameters**: Single reader ID
- **Returns**: Boolean indicating online status
- **Note**: Uses the same 5-minute threshold as bulk queries

### Database Functions

##### `mark_inactive_readers_offline()`
Marks readers as offline if inactive for 5+ minutes.
- **Usage**: `SELECT mark_inactive_readers_offline();`
- **Returns**: void
- **Side effects**: Updates `is_online` status in users table

##### `cleanup_reader_presence()`
Comprehensive cleanup of stale presence data.
- **Usage**: `SELECT cleanup_reader_presence();`
- **Returns**: void
- **Logging**: Outputs notice message with timestamp

## Conclusion

The Reader Online Presence System provides a robust, scalable solution for tracking reader availability in real-time. With its efficient database design, comprehensive error handling, and intuitive user interface, it significantly enhances the user experience by providing clear visibility into reader availability for video consultations.

The system is designed to be maintainable, performant, and extensible, providing a solid foundation for future enhancements to the reader-client interaction experience. 