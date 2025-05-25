# Host/Guest System Module

## Overview

The Host/Guest System is a core module of TarotForge that enables collaborative tarot reading sessions with proper role management, invite link sharing, and real-time synchronization. This module ensures clear distinction between session creators (hosts) and participants (guests) while providing seamless sharing capabilities.

## Key Features

- **Role-based Access Control**: Clear distinction between hosts and participants
- **Invite Link System**: Wrapper URLs for proper role assignment
- **Real-time Synchronization**: Live session state sharing across participants
- **Anonymous Guest Support**: Browser fingerprinting for persistent guest identification
- **Offline Mode**: Local session creation with automatic sync when online
- **Progress Preservation**: Conflict resolution favoring session creators

## Module Documentation

### 📋 [Architecture Overview](./host-guest-architecture.md)
**Complete system architecture and design patterns**
- Core concepts and role definitions
- Architecture flow diagrams
- User experience flows
- Security and privacy considerations
- Sync and conflict resolution
- Future enhancements

### 🛠️ [Implementation Guide](./invite-system-implementation.md)
**Technical implementation details for developers**
- Quick start setup instructions
- Code examples and integration patterns
- Component integration guidelines
- Error handling strategies
- Testing approaches
- Performance optimization
- Troubleshooting guide

### 🗄️ [Database Schema Reference](./database-schema-reference.md)
**Comprehensive database schema documentation**
- Table structures and relationships
- Field descriptions and constraints
- JSONB field formats
- Indexes and performance optimization
- Row Level Security (RLS) policies
- Triggers and functions
- Common queries and monitoring

## Quick Start

### 1. Database Setup
```bash
# Apply the migration to create required tables
npx supabase db push
```

### 2. Component Integration
```typescript
// Use enhanced DeckPreview for direct reading room access
<DeckPreview deck={deck} linkTo="reading" />

// Generate invite links for sharing
const inviteUrl = await generateSessionInviteLink(sessionId, userId, anonymousId);
```

### 3. Role Detection
```typescript
// URL parameters determine user role
const shouldCreateSession = urlParams.get('create') === 'true';  // Host
const isInviteAccess = urlParams.get('invite') === 'true';       // Participant
```

## File Structure

```
docs/modules/host-guest-system/
├── README.md                           # This overview file
├── host-guest-architecture.md          # Complete architecture documentation
├── invite-system-implementation.md     # Developer implementation guide
└── database-schema-reference.md        # Database schema and queries
```

## Related Code Files

### Core Implementation
- `src/utils/inviteLinks.ts` - Invite link management utilities
- `src/pages/InvitePage.tsx` - Invite link processing page
- `src/stores/readingSessionStore.ts` - Enhanced session store with role detection
- `src/utils/browserFingerprint.ts` - Anonymous user identification

### Component Updates
- `src/components/ui/DeckPreview.tsx` - Enhanced with linkTo prop
- `src/pages/reading/ReadingRoom.tsx` - Access method detection
- `src/pages/marketplace/DeckDetails.tsx` - Host creation from marketplace
- `src/pages/user/Collection.tsx` - Host creation from collections

### Database Migrations
- `supabase/migrations/20250116000005_create_session_invites.sql` - Invite system tables

## Testing

### Unit Tests
- Role determination logic
- Invite link validation
- Browser fingerprint generation

### Integration Tests
- Complete invite flow (create → share → join)
- Host/participant role assignment
- Real-time synchronization

### Manual Testing Checklist
- [ ] Internal navigation creates hosts
- [ ] Invite links create participants
- [ ] Session state synchronizes properly
- [ ] Offline mode works correctly
- [ ] Guest identification persists

## Monitoring & Analytics

### Key Metrics
- Session creation methods (internal vs invite)
- Host vs participant ratios
- Invite link usage and conversion
- Session duration and engagement

### Performance Monitoring
- Database query performance
- Real-time subscription efficiency
- Invite link processing latency

## Support & Troubleshooting

### Common Issues
1. **Users not becoming hosts** → Check `?create=true` parameter
2. **Invite links not working** → Verify database migration applied
3. **Participants not syncing** → Check real-time subscriptions

### Debug Tools
- Enable `DEBUG_INVITES` for detailed logging
- Monitor database queries with pg_stat_statements
- Track role assignment with analytics events

## Contributing

When contributing to this module:

1. **Update documentation** when adding new features
2. **Add tests** for new functionality
3. **Follow security best practices** for invite handling
4. **Consider performance impact** of database changes
5. **Maintain backward compatibility** when possible

## Version History

- **v1.0** - Initial host/guest system implementation
- **v1.1** - Added invite link wrapper system
- **v1.2** - Enhanced role determination logic
- **v1.3** - Added browser fingerprinting for guests

---

This module provides the foundation for collaborative tarot reading experiences while maintaining clear role separation and excellent user experience for both hosts and participants. 