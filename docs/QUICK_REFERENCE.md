# Quick Reference: Synchronized Notifications

## 🚀 Quick Start

### Apply Database Migration
```bash
npx supabase db push
```

### Check Migration Status
```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'reading_sessions' 
AND column_name = 'loading_states';
```

## 📋 File Changes Summary

### Modified Files
- `src/components/ui/ParticipantNotification.tsx` - Extended notification types
- `src/components/ui/ParticipantNotificationManager.tsx` - Updated interface
- `src/pages/reading/ReadingRoom.tsx` - Added deck clearing notifications
- `src/stores/readingSessionStore.ts` - Re-enabled loading states
- `supabase/migrations/20250526030000_add_loading_states.sql` - New migration

### Key Functions Modified
```typescript
// ReadingRoom.tsx
resetCards() // Added participant attribution
handleBroadcast() // Added deck-cleared notification handling
shuffleDeck() // Re-enabled loading states
generateInterpretation() // Re-enabled loading states

// readingSessionStore.ts
updateSession() // Re-enabled loading_states mapping
```

## 🎯 Notification Types

### Current Types
```typescript
type NotificationType = 'join' | 'leave' | 'deck-cleared';
```

### Adding New Notification Types
1. Update `ParticipantNotification.tsx` interface
2. Add icon in `getIcon()` function
3. Add colors in `getBorderColor()` and `getBackgroundColor()`
4. Add message in `getMessage()` function
5. Update `ParticipantNotificationManager.tsx` interface

## 🔧 Common Patterns

### Creating a Notification
```typescript
const notification = {
  id: `${type}-${participantId}-${Date.now()}`,
  type: 'deck-cleared' as const,
  participantName: getParticipantName(),
  isAnonymous: !user,
  timestamp: Date.now()
};

setNotifications(prev => [...prev, notification]);
```

### Broadcasting with Participant Info
```typescript
broadcastGuestAction('actionName', {
  // ... action data ...
  participantName: user?.email?.split('@')[0] || 
                  participants.find(p => p.id === participantId)?.name || 
                  'Anonymous',
  isAnonymous: !user
});
```

### Handling Loading States
```typescript
// Start loading
updateSession({ 
  loadingStates: { 
    isShuffling: true, 
    isGeneratingInterpretation: false,
    triggeredBy: participantId 
  } 
});

// End loading
updateSession({ 
  loadingStates: null
});
```

## 🐛 Debugging

### Common Issues
1. **Migration not applied**: Check database schema
2. **Notifications not appearing**: Check broadcast handling
3. **Loading states not syncing**: Verify session state updates

### Debug Commands
```typescript
// Check session state
console.log('Session state:', sessionState);

// Check loading states
console.log('Loading states:', sessionState?.loadingStates);

// Check notifications
console.log('Notifications:', notifications);

// Check participants
console.log('Participants:', participants);
```

### Console Logs to Look For
```
"Deck cleared notification added"
"Loading states updated"
"Broadcast received: resetCards"
"Session state synchronized"
```

## 📱 Mobile Considerations

### Mobile-Specific Checks
- Notifications appear correctly on small screens
- Touch interactions work properly
- Loading states visible during actions
- Auto-dismiss timing appropriate

### Testing on Mobile
1. Open session on mobile device
2. Trigger deck clearing from desktop
3. Verify notification appears on mobile
4. Test loading states synchronization

## 🔄 State Flow

### Deck Clearing Flow
```
User clicks "Reset Cards"
    ↓
resetCards() function called
    ↓
Deck state updated locally
    ↓
broadcastGuestAction() called
    ↓
Other participants receive broadcast
    ↓
handleBroadcast() processes action
    ↓
Notification created and displayed
    ↓
Auto-dismiss after 4 seconds
```

### Loading States Flow
```
User triggers action (shuffle/interpret)
    ↓
updateSession() with loading state
    ↓
Database updated via Supabase
    ↓
Real-time subscription triggers
    ↓
All participants see loading state
    ↓
Action completes
    ↓
updateSession() with null loading state
    ↓
Loading state cleared for all
```

## 🧪 Testing Checklist

### Manual Testing
- [ ] Deck clearing notifications appear
- [ ] Loading states synchronize
- [ ] Mobile controls work
- [ ] Multiple participants see updates
- [ ] Notifications auto-dismiss
- [ ] Error handling works

### Automated Testing
```typescript
// Test notification creation
expect(notification.type).toBe('deck-cleared');

// Test loading state sync
expect(sessionState.loadingStates?.isShuffling).toBe(true);

// Test broadcast handling
expect(handleBroadcast).toHaveBeenCalledWith({
  action: 'resetCards',
  data: expect.objectContaining({
    participantName: expect.any(String)
  })
});
```

## 🚨 Troubleshooting

### Database Issues
```sql
-- Check if migration applied
SELECT * FROM reading_sessions LIMIT 1;

-- Check loading_states column
SELECT loading_states FROM reading_sessions WHERE id = 'session-id';
```

### Network Issues
- Check Supabase connection
- Verify real-time subscriptions
- Test with multiple browser tabs

### State Issues
- Clear browser cache
- Check localStorage
- Verify session state updates

## 📚 Related Documentation
- [SYNCHRONIZED_NOTIFICATIONS.md](./SYNCHRONIZED_NOTIFICATIONS.md) - Detailed implementation
- [CHANGELOG.md](../CHANGELOG.md) - Recent changes
- Supabase Real-time Documentation
- React State Management Best Practices 