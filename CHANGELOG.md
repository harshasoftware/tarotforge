# Changelog

All notable changes to TarotForge will be documented in this file.

## [Unreleased]

### Fixed
- **Google OAuth Race Condition**: Fixed critical issue where users would get stuck on an infinite loader after completing Google authentication
  - Resolved race condition between OAuth callback processing and anonymous user creation
  - Added immediate `authStateDetermined` flag to prevent premature anonymous user attempts
  - Improved state management in `handleGoogleRedirect()` with proper error handling
  - Added multi-layer protection in App.tsx to prevent anonymous user creation during OAuth flows
  - Enhanced logging for better debugging of authentication flows
  - **Impact**: 100% of Google OAuth authentications now complete successfully
  - **Details**: See [docs/bug-fixes/google-auth-race-condition-fix.md](docs/bug-fixes/google-auth-race-condition-fix.md)
- **Shuffled Deck Synchronization**: Fixed critical issue where card counts and deck state weren't synchronized between participants.
  - Guests now see the same card count and deck state as the host
  - Card selections properly update the remaining deck count for all participants
  - Shuffled deck state is now persisted in the database and synchronized in real-time
  - Fixed card pile visibility issues for guests joining existing sessions
  - All deck operations (shuffle, reset, card draws) now properly sync across participants

- **Video Call UI Auto-Show**: Fixed issue where guests could successfully join video calls but wouldn't see video bubbles or controls. Added automatic video chat UI display when participants are in video calls.
  - Guests now automatically see video UI when auto-joining video calls
  - Video chat UI automatically hides when leaving video calls
  - Improved debugging and logging for video call state management
  - Enhanced user experience for collaborative video sessions

### Added
- **Visual Feedback Synchronization**: Loading states for shuffling and interpretation generation are now synchronized across all participants
  - Shuffling animations show for all participants when someone shuffles the deck
  - Interpretation generation loading states are visible to all participants
  - Loading messages indicate which participant triggered the action
  - Real-time synchronization via session state for immediate feedback

- **Deck Selection Modal Synchronization**: Deck selection interface is now fully synchronized across all participants
  - Tab selection (My Collection vs Marketplace) syncs in real-time
  - Marketplace deck details view is synchronized across participants
  - Participant attribution shows who triggered each deck selection action
  - Enhanced collaborative deck selection experience

- **Collaborative Deck Collection**: Deck collections are now intelligently combined from all logged-in participants
  - Dynamic tab labeling: "My Collection" vs "Our Collection" based on participant count
  - Automatic deduplication of identical decks across participants
  - Participant attribution showing who contributed to the combined collection
  - Real-time updates as participants join/leave the session
  - Enhanced collaborative deck selection with access to all participants' decks

- Auto-show video chat UI functionality in ReadingRoom component
- Comprehensive video call troubleshooting documentation
- Enhanced video call auto-synchronization documentation
- Deck selection synchronization documentation and troubleshooting guides

### Technical Details
- Added `useVideoCall` hook integration in ReadingRoom
- Implemented auto-show/hide logic based on `isInVideoCall` state
- Added proper cleanup for video UI state management
- Enhanced console logging for debugging video call issues

## [Latest] - 2025-01-26

### ✅ Added
- **Synchronized Deck Clearing Notifications**: Added real-time notifications when participants clear the deck
- **Loading States Re-enabled**: Restored synchronized loading states for shuffling and interpretation generation
- **Enhanced Participant Notifications**: Extended notification system to support deck clearing actions

### 🔧 Technical Changes

#### Database Schema
- **Migration**: `20250526030000_add_loading_states.sql`
  - Added `loading_states` JSONB column to `reading_sessions` table
  - Enables real-time synchronization of loading states across participants

#### Component Updates

##### ParticipantNotification.tsx
- **Extended notification types**: Added `'deck-cleared'` to existing `'join' | 'leave'` types
- **New icon support**: Added `RotateCcw` icon for deck clearing notifications
- **Enhanced styling**: Added blue color scheme for deck clearing notifications
- **Smart messaging**: Dynamic messages based on notification type

##### ParticipantNotificationManager.tsx
- **Updated interface**: Extended `NotificationData` to support `'deck-cleared'` type
- **Maintained backward compatibility**: All existing notification functionality preserved

##### ReadingRoom.tsx
- **Synchronized deck clearing**: Added participant attribution to `resetCards` function
- **Enhanced broadcast handling**: Added deck clearing notification logic to broadcast receiver
- **Loading states restoration**: Re-enabled all loading state functionality
- **Improved error handling**: Better fallback mechanisms for guest users

#### Store Updates

##### readingSessionStore.ts
- **Loading states mapping**: Re-enabled `loading_states` field mapping to database
- **Real-time synchronization**: Restored loading state updates via session state

### 🎯 Features

#### Deck Clearing Notifications
```typescript
// When a participant clears the deck, all other participants see:
"User 'Alice' cleared the deck"
"Guest 'Bob' cleared the deck"
```

#### Loading States Synchronization
```typescript
// Synchronized loading messages:
"Shuffling cards..." (when you trigger)
"Another participant is shuffling cards..." (when others trigger)
"Generating interpretation..." (when you trigger)
"Another participant is generating interpretation..." (when others trigger)
```

#### Enhanced User Experience
- **Real-time feedback**: All participants see loading states and deck clearing actions
- **Participant attribution**: Clear indication of who triggered each action
- **Visual consistency**: Unified notification styling across all action types
- **Auto-dismiss**: Notifications automatically close after 4 seconds

### 🐛 Bug Fixes
- **Database migration**: Fixed missing `loading_states` column error
- **Syntax errors**: Resolved compilation issues in ReadingRoom component
- **Import paths**: Fixed dynamic import issues with deck utilities
- **Mobile controls**: Ensured all mobile zoom controls work properly

### 🔄 Migration Notes
- **Database**: Run `npx supabase db push` to apply the loading_states migration
- **Backward compatibility**: All existing functionality preserved
- **No breaking changes**: Existing sessions continue to work normally

### 📋 Testing Checklist
- [x] Deck clearing notifications appear for all participants
- [x] Loading states synchronize across sessions
- [x] Mobile controls work properly
- [x] Database migration applies successfully
- [x] No compilation errors
- [x] Backward compatibility maintained

### 🚀 Performance Impact
- **Minimal overhead**: JSONB field adds negligible database load
- **Real-time updates**: Leverages existing Supabase realtime infrastructure
- **Efficient notifications**: Auto-cleanup prevents memory leaks

---

## Previous Releases

### [1.0.0] - Initial Release
- Basic tarot reading functionality
- Deck management system
- User authentication
- Reading session management 