# Navigation System Module

## Overview

The Navigation System module handles user navigation flows, reading room access patterns, and user identification across TarotForge. This system ensures proper routing, user tracking, and seamless navigation experiences.

## Key Features

- **Reading Room Navigation**: Optimized navigation flows for reading sessions
- **User Identification**: Persistent user tracking and identification
- **Route Management**: Smart routing based on user context and session state
- **Access Control**: Navigation-based access control and permissions
- **Session Continuity**: Maintaining session state across navigation

## Module Documentation

### 🧭 [Reading Room Navigation](./reading-room-navigation.md)
**Navigation patterns and flows for reading sessions**
- Reading room access patterns
- Navigation state management
- Route optimization
- User experience flows

### 👤 [User Identification System](./user-identification-system.md)
**User tracking and identification across sessions**
- Anonymous user identification
- Browser fingerprinting
- Session persistence
- User state management

## Quick Start

### 1. Reading Room Navigation
```typescript
// Navigate to reading room with proper context
const navigateToReading = (deckId: string, createNew: boolean = false) => {
  const params = createNew ? '?create=true' : '';
  navigate(`/reading/${deckId}${params}`);
};
```

### 2. User Identification
```typescript
// Get persistent user identifier
import { getPersistentBrowserId } from '@/utils/browserFingerprint';

const userId = await getPersistentBrowserId();
```

### 3. Navigation State Management
```typescript
// Track navigation context for proper role assignment
const accessMethod = urlParams.get('create') === 'true' ? 'create' : 
                    urlParams.get('invite') === 'true' ? 'invite' : 'direct';
```

## Related Code Files

### Core Implementation
- `src/utils/browserFingerprint.ts` - User identification utilities
- Navigation hooks and utilities
- Route configuration and guards
- Session navigation management

### Components
- Navigation components
- Route-aware components
- User identification displays
- Navigation state indicators

## Testing

### Navigation Testing
- [ ] Reading room access works correctly
- [ ] User identification persists across sessions
- [ ] Navigation state is maintained properly
- [ ] Route parameters are handled correctly
- [ ] Access control works as expected

### User Identification Testing
- [ ] Browser fingerprinting generates consistent IDs
- [ ] User identification persists across browser sessions
- [ ] Anonymous users are tracked properly
- [ ] User transitions are handled smoothly

## Troubleshooting

### Common Issues
1. **Navigation not working** → Check route configuration
2. **User ID not persisting** → Verify localStorage availability
3. **Wrong user roles** → Check navigation parameters
4. **Session continuity issues** → Verify state management

### Debug Tools
- Navigation event logging
- User identification tracking
- Route parameter monitoring
- Session state debugging

---

This module provides the foundation for user navigation and identification throughout the TarotForge application. 