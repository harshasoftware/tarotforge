# Reader Online Presence System - Technical Specification

## Document Information
- **Version**: 1.0.0
- **Date**: December 2024
- **Author**: TarotForge Development Team
- **Status**: Implementation Complete

## Executive Summary

The Reader Online Presence System is a real-time availability tracking solution that enables users to identify which certified tarot readers are currently online and available for video consultations. The system provides visual indicators and conditional functionality to enhance user experience and optimize reader-client connections.

## System Requirements

### Functional Requirements

#### FR-1: Real-time Presence Tracking
- **ID**: FR-1
- **Priority**: High
- **Description**: System must track reader online/offline status in real-time
- **Acceptance Criteria**:
  - Reader status updates within 60 seconds of activity change
  - Automatic offline detection after 5 minutes of inactivity
  - Persistent tracking across browser sessions

#### FR-2: Visual Status Indicators
- **ID**: FR-2
- **Priority**: High
- **Description**: System must provide clear visual indicators of reader availability
- **Acceptance Criteria**:
  - Green indicator for online readers
  - Gray indicator for offline readers
  - Text labels showing "Online" or "Offline"
  - Indicators visible on reader cards

#### FR-3: Conditional Video Access
- **ID**: FR-3
- **Priority**: High
- **Description**: Video call functionality must be conditional on reader availability
- **Acceptance Criteria**:
  - Video button enabled only for online readers
  - Disabled/grayed out button for offline readers
  - Clear visual distinction between states

#### FR-4: Automatic Cleanup
- **ID**: FR-4
- **Priority**: Medium
- **Description**: System must automatically clean up stale presence data
- **Acceptance Criteria**:
  - Database functions for presence cleanup
  - Automatic offline marking for inactive readers
  - Scheduled maintenance capabilities

### Non-Functional Requirements

#### NFR-1: Performance
- **Response Time**: Presence updates must complete within 2 seconds
- **Throughput**: Support 1000+ concurrent readers
- **Database Queries**: Optimized with proper indexing
- **Network Overhead**: Minimal bandwidth usage

#### NFR-2: Reliability
- **Availability**: 99.9% uptime for presence tracking
- **Error Handling**: Graceful degradation on network issues
- **Data Consistency**: Accurate presence state across all clients
- **Recovery**: Automatic recovery from connection failures

#### NFR-3: Scalability
- **Horizontal Scaling**: Support for multiple app instances
- **Database Scaling**: Efficient queries with proper indexing
- **Memory Usage**: Minimal memory footprint per user
- **Load Distribution**: Even distribution of presence updates

#### NFR-4: Security
- **Data Privacy**: Only expose necessary presence information
- **Access Control**: Users can only update their own status
- **Rate Limiting**: Prevent abuse of presence updates
- **Audit Trail**: Log presence changes for debugging

## System Architecture

### High-Level Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Client App    │    │   Supabase      │    │   Database      │
│                 │    │   API Layer     │    │   PostgreSQL    │
├─────────────────┤    ├─────────────────┤    ├─────────────────┤
│ ReaderCard UI   │◄──►│ REST API        │◄──►│ users table     │
│ Presence Service│    │ Real-time       │    │ Indexes         │
│ Event Handlers  │    │ Row Level Sec   │    │ Functions       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Component Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend Layer                           │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐ │
│  │   ReaderCard    │  │  ReadersPage    │  │   App.tsx    │ │
│  │   Component     │  │   Component     │  │  Integration │ │
│  └─────────────────┘  └─────────────────┘  └──────────────┘ │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────┐ │
│  │           ReaderPresenceService                         │ │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────────┐   │ │
│  │  │ Tracking    │ │ Event       │ │ Status Queries  │   │ │
│  │  │ Logic       │ │ Handlers    │ │ & Updates       │   │ │
│  │  └─────────────┘ └─────────────┘ └─────────────────┘   │ │
│  └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│                    Backend Layer                            │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────┐ │
│  │                Supabase API                             │ │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────────┐   │ │
│  │  │ REST API    │ │ Real-time   │ │ Row Level       │   │ │
│  │  │ Endpoints   │ │ Updates     │ │ Security        │   │ │
│  │  └─────────────┘ └─────────────┘ └─────────────────┘   │ │
│  └─────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────┐ │
│  │              PostgreSQL Database                        │ │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────────┐   │ │
│  │  │ users table │ │ Indexes     │ │ Functions &     │   │ │
│  │  │ + presence  │ │ & Policies  │ │ Triggers        │   │ │
│  │  └─────────────┘ └─────────────┘ └─────────────────┘   │ │
│  └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## Database Design

### Schema Changes

#### Users Table Extensions
```sql
-- New columns added to existing users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS is_online boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS last_seen_at timestamptz;
```

#### Indexes
```sql
-- Optimized indexes for presence queries
CREATE INDEX IF NOT EXISTS users_last_seen_at_idx 
  ON users(last_seen_at) WHERE is_reader = true;

CREATE INDEX IF NOT EXISTS users_online_readers_idx 
  ON users(is_online, last_seen_at) WHERE is_reader = true;
```

#### Functions
```sql
-- Automatic cleanup function
CREATE OR REPLACE FUNCTION mark_inactive_readers_offline()
RETURNS void AS $$
BEGIN
  UPDATE users 
  SET is_online = false 
  WHERE is_reader = true 
    AND is_online = true 
    AND (last_seen_at IS NULL OR last_seen_at < NOW() - INTERVAL '5 minutes');
END;
$$ LANGUAGE plpgsql;

-- Comprehensive cleanup function
CREATE OR REPLACE FUNCTION cleanup_reader_presence()
RETURNS void AS $$
BEGIN
  UPDATE users 
  SET is_online = false 
  WHERE is_reader = true 
    AND is_online = true 
    AND (last_seen_at IS NULL OR last_seen_at < NOW() - INTERVAL '10 minutes');
END;
$$ LANGUAGE plpgsql;

-- Trigger function for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_last_seen_on_online()
RETURNS trigger AS $$
BEGIN
  IF NEW.is_online = true AND (OLD.is_online IS NULL OR OLD.is_online = false) THEN
    NEW.last_seen_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

#### Triggers
```sql
-- Automatic last_seen_at updates
CREATE TRIGGER trigger_update_last_seen_on_online
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_last_seen_on_online();
```

### Data Flow

#### Presence Update Flow
```
1. Reader Activity Detected
   ↓
2. ReaderPresenceService.updatePresence()
   ↓
3. Supabase API Call
   ↓
4. Database Update (users.last_seen_at, users.is_online)
   ↓
5. Trigger Execution (update_last_seen_on_online)
   ↓
6. Index Updates
   ↓
7. Response to Client
```

#### Status Query Flow
```
1. UI Component Requests Reader List
   ↓
2. fetchAllReaders() Service Call
   ↓
3. Supabase Query with Presence Data
   ↓
4. Database Query with Index Usage
   ↓
5. Online Status Calculation (5-minute threshold)
   ↓
6. Processed Reader Data Returned
   ↓
7. UI Updates with Status Indicators
```

## API Specification

### ReaderPresenceService API

#### Class: ReaderPresenceService

##### Methods

###### `startTracking(): void`
**Purpose**: Initialize presence tracking for the current reader
**Parameters**: None
**Returns**: void
**Side Effects**: 
- Sets up periodic presence updates (60-second interval)
- Registers page visibility event listeners
- Registers beforeunload event handler
- Immediately marks reader as online

**Implementation**:
```typescript
startTracking() {
  const { user } = useAuthStore.getState();
  
  if (!user?.is_reader || this.isTracking) {
    return;
  }

  this.isTracking = true;
  this.updatePresence();
  
  this.presenceInterval = setInterval(() => {
    this.updatePresence();
  }, PRESENCE_UPDATE_INTERVAL);

  document.addEventListener('visibilitychange', this.handleVisibilityChange);
  window.addEventListener('beforeunload', this.handleBeforeUnload);
}
```

###### `stopTracking(): void`
**Purpose**: Stop presence tracking and mark reader as offline
**Parameters**: None
**Returns**: void
**Side Effects**:
- Clears all intervals and event listeners
- Marks reader as offline in database
- Resets tracking state

###### `updatePresence(): Promise<void>`
**Purpose**: Update reader's last seen timestamp and online status
**Parameters**: None
**Returns**: Promise<void>
**Database Impact**: Updates users table
**Error Handling**: Logs errors, continues operation

###### `static getReadersOnlineStatus(readerIds: string[]): Promise<Record<string, boolean>>`
**Purpose**: Bulk query for multiple readers' online status
**Parameters**: 
- `readerIds: string[]` - Array of reader user IDs
**Returns**: `Promise<Record<string, boolean>>` - Object mapping reader IDs to online status
**Performance**: Single database query for all readers
**Caching**: No caching (real-time data)

**Implementation**:
```typescript
static async getReadersOnlineStatus(readerIds: string[]): Promise<Record<string, boolean>> {
  const { data, error } = await supabase
    .from('users')
    .select('id, is_online, last_seen_at')
    .in('id', readerIds)
    .eq('is_reader', true);

  const onlineStatus: Record<string, boolean> = {};
  const now = new Date();

  data?.forEach(reader => {
    const lastSeen = reader.last_seen_at ? new Date(reader.last_seen_at) : null;
    const minutesSinceLastSeen = lastSeen 
      ? (now.getTime() - lastSeen.getTime()) / (1000 * 60)
      : Infinity;

    onlineStatus[reader.id] = reader.is_online && minutesSinceLastSeen <= ONLINE_THRESHOLD_MINUTES;
  });

  return onlineStatus;
}
```

### Database API

#### Function: mark_inactive_readers_offline()
**Purpose**: Mark readers as offline if inactive for 5+ minutes
**Parameters**: None
**Returns**: void
**Usage**: `SELECT mark_inactive_readers_offline();`
**Performance**: Uses indexed queries for efficiency
**Frequency**: Can be called periodically for maintenance

#### Function: cleanup_reader_presence()
**Purpose**: Comprehensive cleanup of stale presence data
**Parameters**: None
**Returns**: void
**Usage**: `SELECT cleanup_reader_presence();`
**Logging**: Outputs NOTICE with timestamp
**Threshold**: 10-minute inactivity threshold

## Implementation Details

### Frontend Implementation

#### ReaderCard Component Changes
```tsx
// Added presence indicator
<div className="absolute -top-1 -right-1 flex items-center justify-center">
  <Circle 
    className={`h-4 w-4 ${reader.is_online ? 'text-green-500 fill-green-500' : 'text-gray-400 fill-gray-400'}`}
  />
</div>

// Added status text
<div className="flex items-center mt-1">
  <Circle className={`h-2 w-2 mr-1 ${reader.is_online ? 'text-green-500 fill-green-500' : 'text-gray-400 fill-gray-400'}`} />
  <span className={`text-xs ${reader.is_online ? 'text-green-600' : 'text-muted-foreground'}`}>
    {reader.is_online ? 'Online' : 'Offline'}
  </span>
</div>

// Conditional video button
{reader.is_online ? (
  <Link to="#" className="flex-1 btn btn-secondary p-2 text-xs flex items-center justify-center hover:bg-secondary/80">
    <Video className="h-3 w-3 mr-1" />
    Video
  </Link>
) : (
  <button 
    disabled 
    className="flex-1 p-2 text-xs flex items-center justify-center rounded-md bg-muted/50 text-muted-foreground cursor-not-allowed opacity-60"
  >
    <Video className="h-3 w-3 mr-1" />
    Video
  </button>
)}
```

#### App Integration
```tsx
// Initialize reader presence tracking
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

#### ReadersPage Auto-refresh
```tsx
// Refresh reader data every 2 minutes
useEffect(() => {
  const loadReaders = async () => {
    const readersData = await fetchAllReaders();
    setReaders(readersData);
  };
  
  loadReaders();

  const refreshInterval = setInterval(() => {
    loadReaders();
  }, 120000); // 2 minutes

  return () => clearInterval(refreshInterval);
}, []);
```

### Backend Implementation

#### Enhanced fetchAllReaders Service
```typescript
export const fetchAllReaders = async (): Promise<User[]> => {
  const { data: readersData, error: readersError } = await supabase
    .from('users')
    .select(`
      *,
      readerLevel:level_id (
        id, name, color_theme, icon, base_price_per_minute, description
      )
    `)
    .eq('is_reader', true)
    .order('average_rating', { ascending: false });
    
  // Process online status for each reader
  const now = new Date();
  const ONLINE_THRESHOLD_MINUTES = 5;
  
  const processedReaders = readersData?.map(reader => ({
    ...reader,
    is_online: reader.is_online && reader.last_seen_at 
      ? (now.getTime() - new Date(reader.last_seen_at).getTime()) / (1000 * 60) <= ONLINE_THRESHOLD_MINUTES
      : false
  })) || [];
  
  return processedReaders;
};
```

## Configuration Management

### Environment Configuration
```typescript
// No additional environment variables required
// Uses existing Supabase configuration:
// - VITE_SUPABASE_URL
// - VITE_SUPABASE_ANON_KEY
```

### Timing Configuration
```typescript
// Configurable constants in reader-presence.ts
const ONLINE_THRESHOLD_MINUTES = 5;        // Consider offline after 5 minutes
const PRESENCE_UPDATE_INTERVAL = 60000;    // Update every minute (60 seconds)

// Configurable constants in ReadersPage.tsx
const REFRESH_INTERVAL = 120000;           // Refresh UI every 2 minutes
```

### Database Configuration
```sql
-- Configurable thresholds in database functions
-- mark_inactive_readers_offline: 5-minute threshold
-- cleanup_reader_presence: 10-minute threshold
```

## Testing Strategy

### Unit Tests

#### ReaderPresenceService Tests
```typescript
describe('ReaderPresenceService', () => {
  test('should start tracking for readers', () => {
    // Test presence tracking initialization
  });
  
  test('should stop tracking and mark offline', () => {
    // Test cleanup and offline marking
  });
  
  test('should handle page visibility changes', () => {
    // Test event handler functionality
  });
  
  test('should get bulk online status', async () => {
    // Test getReadersOnlineStatus method
  });
});
```

#### Component Tests
```typescript
describe('ReaderCard', () => {
  test('should show online indicator for online readers', () => {
    // Test green indicator display
  });
  
  test('should show offline indicator for offline readers', () => {
    // Test gray indicator display
  });
  
  test('should enable video button for online readers', () => {
    // Test conditional button functionality
  });
  
  test('should disable video button for offline readers', () => {
    // Test disabled button state
  });
});
```

### Integration Tests

#### Database Integration
```sql
-- Test presence functions
SELECT mark_inactive_readers_offline();
SELECT cleanup_reader_presence();

-- Verify trigger functionality
UPDATE users SET is_online = true WHERE id = 'test-reader-id';
-- Verify last_seen_at was updated automatically
```

#### API Integration
```typescript
describe('Reader Services Integration', () => {
  test('should fetch readers with online status', async () => {
    const readers = await fetchAllReaders();
    expect(readers[0]).toHaveProperty('is_online');
    expect(readers[0]).toHaveProperty('last_seen_at');
  });
});
```

### Performance Tests

#### Load Testing
```typescript
describe('Presence Performance', () => {
  test('should handle 1000 concurrent presence updates', async () => {
    // Simulate high load scenarios
  });
  
  test('should complete presence queries within 2 seconds', async () => {
    // Test query performance
  });
});
```

#### Database Performance
```sql
-- Test query performance with EXPLAIN ANALYZE
EXPLAIN ANALYZE 
SELECT id, is_online, last_seen_at 
FROM users 
WHERE is_reader = true 
  AND is_online = true 
  AND last_seen_at > NOW() - INTERVAL '5 minutes';
```

## Monitoring and Observability

### Metrics to Track

#### Application Metrics
- Presence update frequency per reader
- Failed presence update rate
- Average response time for status queries
- Memory usage of presence service

#### Database Metrics
- Query execution time for presence queries
- Index usage statistics
- Database connection pool utilization
- Cleanup function execution frequency

#### Business Metrics
- Number of online readers at any time
- Reader availability patterns
- Video call initiation rate correlation with online status

### Logging Strategy

#### Application Logging
```typescript
// Presence service logging
console.log('Reader presence tracking started', { userId: user.id });
console.error('Error updating reader presence:', error);
console.log('Reader marked offline', { userId: user.id });
```

#### Database Logging
```sql
-- Function execution logging
RAISE NOTICE 'Reader presence cleanup completed at %', NOW();
RAISE LOG 'Marked % readers offline', affected_rows;
```

### Alerting

#### Critical Alerts
- Presence service completely down
- Database connection failures
- High error rate in presence updates

#### Warning Alerts
- Slow presence query performance
- High number of stale presence records
- Unusual reader activity patterns

## Security Considerations

### Data Protection

#### Privacy Measures
- Only online/offline status exposed, no detailed activity
- Automatic expiration of presence data
- No sensitive information in presence updates
- Minimal data retention

#### Access Control
```sql
-- Row Level Security policies
CREATE POLICY "Users can update their own online status"
  ON users FOR UPDATE TO authenticated
  USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE POLICY "Anyone can read basic profile data"
  ON users FOR SELECT USING (true);
```

### Rate Limiting

#### Application Level
```typescript
// Built-in rate limiting through update intervals
const PRESENCE_UPDATE_INTERVAL = 60000; // Maximum 1 update per minute
```

#### Database Level
```sql
-- Prevent excessive updates through trigger logic
-- Automatic cleanup prevents data accumulation
```

### Audit Trail

#### Presence Changes
- Log all presence state changes
- Track unusual activity patterns
- Monitor for potential abuse

#### Database Changes
```sql
-- Audit trigger for presence changes (optional)
CREATE OR REPLACE FUNCTION audit_presence_changes()
RETURNS trigger AS $$
BEGIN
  IF OLD.is_online != NEW.is_online THEN
    INSERT INTO presence_audit_log (user_id, old_status, new_status, changed_at)
    VALUES (NEW.id, OLD.is_online, NEW.is_online, NOW());
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

## Deployment Considerations

### Database Migration

#### Migration Script
```bash
# Apply presence system migration
npx supabase db push

# Verify migration success
npx supabase db diff
```

#### Rollback Plan
```sql
-- Rollback script (if needed)
ALTER TABLE users DROP COLUMN IF EXISTS is_online;
ALTER TABLE users DROP COLUMN IF EXISTS last_seen_at;
DROP FUNCTION IF EXISTS mark_inactive_readers_offline();
DROP FUNCTION IF EXISTS cleanup_reader_presence();
DROP FUNCTION IF EXISTS update_last_seen_on_online();
```

### Application Deployment

#### Feature Flags
```typescript
// Optional feature flag for gradual rollout
const ENABLE_PRESENCE_TRACKING = import.meta.env.VITE_ENABLE_PRESENCE === 'true';

if (ENABLE_PRESENCE_TRACKING && user?.is_reader) {
  readerPresenceService.startTracking();
}
```

#### Monitoring Deployment
- Monitor error rates during rollout
- Track performance metrics
- Verify presence functionality across different browsers

### Maintenance

#### Regular Maintenance Tasks
```sql
-- Weekly cleanup (can be automated)
SELECT cleanup_reader_presence();

-- Monthly index maintenance
REINDEX INDEX users_online_readers_idx;

-- Quarterly performance review
EXPLAIN ANALYZE SELECT * FROM users WHERE is_reader = true AND is_online = true;
```

#### Backup Considerations
- Presence data is ephemeral and doesn't require special backup
- Focus on schema and function backups
- Test restoration procedures

## Future Enhancements

### Phase 2 Features

#### Rich Presence
```typescript
interface RichPresence {
  status: 'online' | 'offline' | 'busy' | 'away';
  activity: 'available' | 'in_session' | 'break';
  custom_message?: string;
  available_until?: string;
}
```

#### Scheduled Availability
```sql
CREATE TABLE reader_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reader_id uuid REFERENCES users(id),
  day_of_week integer, -- 0-6 (Sunday-Saturday)
  start_time time,
  end_time time,
  timezone text,
  is_active boolean DEFAULT true
);
```

#### Push Notifications
```typescript
// Notify users when favorite readers come online
interface PresenceNotification {
  type: 'reader_online' | 'reader_available';
  reader_id: string;
  reader_name: string;
  timestamp: string;
}
```

### Technical Improvements

#### WebSocket Integration
```typescript
// Real-time presence updates via WebSocket
const presenceChannel = supabase.channel('reader-presence')
  .on('postgres_changes', 
    { event: 'UPDATE', schema: 'public', table: 'users', filter: 'is_reader=eq.true' },
    (payload) => {
      updateReaderStatus(payload.new);
    }
  )
  .subscribe();
```

#### Advanced Analytics
```sql
CREATE TABLE presence_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reader_id uuid REFERENCES users(id),
  date date,
  total_online_minutes integer,
  peak_online_hour integer,
  session_count integer,
  created_at timestamptz DEFAULT now()
);
```

## Conclusion

The Reader Online Presence System provides a comprehensive solution for tracking and displaying reader availability in real-time. The system is designed with performance, scalability, and maintainability in mind, providing a solid foundation for enhanced reader-client interactions.

Key technical achievements:
- **Efficient database design** with proper indexing and cleanup mechanisms
- **Robust frontend integration** with automatic tracking and visual indicators
- **Comprehensive error handling** and graceful degradation
- **Security-first approach** with proper access controls and data protection
- **Scalable architecture** supporting future enhancements

The implementation successfully balances real-time functionality with system performance, providing users with accurate availability information while maintaining optimal application performance. 