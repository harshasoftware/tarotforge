# Invite System Implementation Guide

## Quick Start

### 1. Database Setup

Run the migration to create required tables:

```bash
npx supabase db push
```

This creates:
- `session_invites` table for invite link management
- Indexes for performance optimization
- RLS policies for security
- Helper functions for cleanup

### 2. Environment Setup

Ensure your Supabase configuration supports:
- Real-time subscriptions
- Row Level Security (RLS)
- Anonymous access for invite processing

## Implementation Details

### Creating Invite Links

```typescript
import { generateSessionInviteLink } from '../utils/inviteLinks';

// In your component
const handleShare = async () => {
  const inviteUrl = await generateSessionInviteLink(
    sessionId,
    user?.id || null,
    anonymousId
  );
  
  if (inviteUrl) {
    // Share via native API or clipboard
    await navigator.share({ url: inviteUrl });
  }
};
```

### Processing Invite Links

The `InvitePage` component automatically handles:
- Invite validation and expiration checking
- Click count incrementing
- Session availability verification
- Redirect to reading room with proper flags

### Role Determination

```typescript
import { determineUserRole } from '../utils/inviteLinks';

// Determine user role based on access method
const userRole = determineUserRole(
  accessMethod,     // 'create' | 'invite' | 'direct'
  sessionHostUserId, // From database
  currentUserId     // Current user ID or null
);

// Set host status
setIsHost(userRole === 'host');
```

### Navigation Patterns

#### For New Session Creation (Host)

```typescript
// Always include ?create=true for internal navigation
navigate(`/reading-room/${deckId}?create=true`);
```

#### For Invite Links (Participant)

```typescript
// Invite links automatically redirect with proper flags
// /invite/{uuid} → /reading/deck?join={sessionId}&invite=true
```

#### For Direct Access

```typescript
// Direct session URLs without flags
// /reading/deck?join={sessionId}
// Role determined by session ownership
```

## Component Integration

### DeckPreview Component

```typescript
<DeckPreview 
  deck={deck}
  linkTo="reading"        // Direct to reading room
  // OR
  linkTo="marketplace"    // View details first
/>
```

### Reading Room Integration

```typescript
// URL parameter detection
const urlParams = new URLSearchParams(location.search);
const joinSessionId = urlParams.get('join');
const shouldCreateSession = urlParams.get('create') === 'true';
const isInviteAccess = urlParams.get('invite') === 'true';

// Access method determination
const accessMethod = isInviteAccess ? 'invite' : 'direct';
```

### Session Store Usage

```typescript
// Enhanced joinSession method
const joinedSessionId = await joinSession(sessionId, accessMethod);

// Role is automatically determined within joinSession
// No need to manually set isHost
```

## Database Queries

### Creating Invites

```sql
INSERT INTO session_invites (
  session_id,
  created_by,
  expires_at,
  max_clicks,
  is_active,
  click_count
) VALUES (
  $1, $2, $3, $4, true, 0
) RETURNING id;
```

### Processing Invites

```sql
-- Validate and increment
UPDATE session_invites 
SET click_count = click_count + 1 
WHERE id = $1 
  AND is_active = true 
  AND (expires_at IS NULL OR expires_at > now())
  AND (max_clicks IS NULL OR click_count < max_clicks)
RETURNING session_id;
```

### Session Ownership Check

```sql
SELECT host_user_id, is_active 
FROM reading_sessions 
WHERE id = $1 AND is_active = true;
```

## Error Handling

### Invite Validation Errors

```typescript
const result = await processInviteLink(inviteId);

if (!result.success) {
  // Handle specific error cases
  switch (result.error) {
    case 'Invite link not found':
      // Show 404-style error
      break;
    case 'This invite link has expired':
      // Show expiration message with alternatives
      break;
    case 'This invite link has reached its usage limit':
      // Show usage limit exceeded
      break;
    case 'The reading session is no longer available':
      // Show session unavailable
      break;
    default:
      // Generic error handling
      break;
  }
}
```

### Network Failures

```typescript
try {
  const inviteUrl = await generateSessionInviteLink(sessionId, userId, anonymousId);
  return inviteUrl;
} catch (error) {
  // Fallback to direct link
  console.warn('Invite system failed, using direct link:', error);
  return `${window.location.origin}/reading/${deckId}?join=${sessionId}`;
}
```

## Testing

### Unit Tests

```typescript
describe('determineUserRole', () => {
  it('should return host for create access method', () => {
    const role = determineUserRole('create', null, 'user123');
    expect(role).toBe('host');
  });

  it('should return participant for invite access method', () => {
    const role = determineUserRole('invite', 'host123', 'user456');
    expect(role).toBe('participant');
  });

  it('should return host for direct access when user matches session host', () => {
    const role = determineUserRole('direct', 'user123', 'user123');
    expect(role).toBe('host');
  });
});
```

### Integration Tests

```typescript
describe('Invite Link Flow', () => {
  it('should create invite and redirect properly', async () => {
    // 1. Create session as host
    const sessionId = await createSession();
    
    // 2. Generate invite link
    const inviteUrl = await generateSessionInviteLink(sessionId, userId, null);
    
    // 3. Process invite link
    const inviteId = inviteUrl.split('/invite/')[1];
    const result = await processInviteLink(inviteId);
    
    expect(result.success).toBe(true);
    expect(result.sessionId).toBe(sessionId);
  });
});
```

## Performance Optimization

### Database Indexes

```sql
-- Already created by migration
CREATE INDEX idx_session_invites_session_id ON session_invites(session_id);
CREATE INDEX idx_session_invites_created_by ON session_invites(created_by);
CREATE INDEX idx_session_invites_active ON session_invites(is_active) WHERE is_active = true;
```

### Caching Strategies

```typescript
// Cache invite validation results briefly
const inviteCache = new Map<string, { result: any; timestamp: number }>();

const getCachedInviteResult = (inviteId: string) => {
  const cached = inviteCache.get(inviteId);
  if (cached && Date.now() - cached.timestamp < 30000) { // 30 second cache
    return cached.result;
  }
  return null;
};
```

### Cleanup Operations

```sql
-- Periodic cleanup of expired invites
SELECT cleanup_expired_invites();

-- Manual cleanup
UPDATE session_invites 
SET is_active = false 
WHERE expires_at < now() AND is_active = true;
```

## Security Considerations

### Rate Limiting

```typescript
// Implement rate limiting for invite generation
const INVITE_RATE_LIMIT = 10; // per hour
const INVITE_RATE_WINDOW = 3600000; // 1 hour in ms

const checkRateLimit = (userId: string) => {
  // Implementation depends on your rate limiting strategy
  // Could use Redis, database, or in-memory store
};
```

### Input Validation

```typescript
// Validate invite ID format
const isValidInviteId = (inviteId: string): boolean => {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(inviteId);
};

// Validate session ID format
const isValidSessionId = (sessionId: string): boolean => {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(sessionId);
};
```

### XSS Prevention

```typescript
// Sanitize user inputs in invite processing
import DOMPurify from 'dompurify';

const sanitizeInviteData = (data: any) => {
  if (typeof data === 'string') {
    return DOMPurify.sanitize(data);
  }
  return data;
};
```

## Monitoring & Analytics

### Key Metrics to Track

```typescript
// Invite generation events
analytics.track('invite_generated', {
  sessionId,
  userId: user?.id || 'anonymous',
  expiresInHours,
  maxClicks
});

// Invite usage events
analytics.track('invite_used', {
  inviteId,
  sessionId,
  clickCount,
  timeToUse: Date.now() - inviteCreatedAt
});

// Role assignment events
analytics.track('user_role_assigned', {
  sessionId,
  userId: user?.id || 'anonymous',
  role: userRole,
  accessMethod
});
```

### Error Monitoring

```typescript
// Track invite processing errors
Sentry.captureException(error, {
  tags: {
    component: 'invite_processing',
    inviteId,
    sessionId
  },
  extra: {
    accessMethod,
    userAgent: navigator.userAgent
  }
});
```

## Troubleshooting

### Common Issues

1. **Invite links not working**
   - Check database migration applied
   - Verify RLS policies are correct
   - Ensure invite table has proper indexes

2. **Users not becoming hosts**
   - Verify `?create=true` parameter in navigation
   - Check `determineUserRole` logic
   - Ensure `shouldCreateSession` detection works

3. **Participants not syncing**
   - Check real-time subscription setup
   - Verify session state updates
   - Ensure proper role assignment

### Debug Logging

```typescript
// Enable detailed logging for invite system
const DEBUG_INVITES = process.env.NODE_ENV === 'development';

const debugLog = (message: string, data?: any) => {
  if (DEBUG_INVITES) {
    console.log(`[INVITE_DEBUG] ${message}`, data);
  }
};

// Use throughout invite processing
debugLog('Processing invite link', { inviteId, sessionId });
debugLog('User role determined', { role, accessMethod, sessionHostUserId });
```

## Migration Guide

### From Direct Links to Invite System

1. **Update existing share functionality**:
   ```typescript
   // Old
   const shareUrl = `${origin}/reading/${deckId}?join=${sessionId}`;
   
   // New
   const shareUrl = await generateSessionInviteLink(sessionId, userId, anonymousId);
   ```

2. **Add invite route to router**:
   ```typescript
   <Route path="invite/:inviteId" element={<InvitePage />} />
   ```

3. **Update navigation components**:
   ```typescript
   // Add create=true to all internal navigation
   <DeckPreview linkTo="reading" />
   ```

4. **Test role assignment**:
   - Verify hosts are created correctly
   - Test invite link sharing and joining
   - Confirm participant role assignment

This implementation provides a robust, scalable invite system that properly distinguishes between hosts and participants while maintaining excellent user experience. 