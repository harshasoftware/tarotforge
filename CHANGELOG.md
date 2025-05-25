# Changelog

All notable changes to TarotForge will be documented in this file.

## [Unreleased]

### Fixed
- **Video Call UI Auto-Show**: Fixed issue where guests could successfully join video calls but wouldn't see video bubbles or controls. Added automatic video chat UI display when participants are in video calls.
  - Guests now automatically see video UI when auto-joining video calls
  - Video chat UI automatically hides when leaving video calls
  - Improved debugging and logging for video call state management
  - Enhanced user experience for collaborative video sessions

### Added
- Auto-show video chat UI functionality in ReadingRoom component
- Comprehensive video call troubleshooting documentation
- Enhanced video call auto-synchronization documentation

### Technical Details
- Added `useVideoCall` hook integration in ReadingRoom
- Implemented auto-show/hide logic based on `isInVideoCall` state
- Added proper cleanup for video UI state management
- Enhanced console logging for debugging video call issues

---

## Previous Releases

### [1.0.0] - Initial Release
- Basic tarot reading functionality
- Deck management system
- User authentication
- Reading session management 