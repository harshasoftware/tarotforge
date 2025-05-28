# Video System Module

## Overview

The Video System module provides multi-party video calling capabilities integrated with TarotForge's collaborative reading sessions. This system uses **Supabase Realtime** for signaling and **Zustand** for state management, enabling real-time video communication between hosts and participants during tarot readings.

## Key Features

- **Multi-party Video Calls**: Support for multiple participants with WebRTC peer-to-peer connections
- **Session Integration**: Seamless integration with reading sessions using session-scoped channels
- **Host-Controlled Initiation**: Video calls start only when explicitly requested by hosts
- **Mobile Optimization**: Audio-only mode for 3+ participants on mobile devices
- **Draggable Video Bubbles**: Individual draggable video elements with viewport constraints
- **Individual Controls**: Per-participant audio/video controls and volume management
- **Twitter Spaces UI**: Compact audio interface for mobile multi-participant calls

## Architecture

### Core Components

1. **Video Call Store** (`src/stores/videoCallStore.ts`)
   - Zustand-based state management
   - Supabase Realtime channel handling
   - WebRTC peer connection management
   - Automatic presence tracking

2. **VideoBubbles Component** (`src/components/video/VideoBubbles.tsx`)
   - Draggable video interface
   - Mobile-responsive design
   - Individual participant controls
   - Viewport constraint system

3. **Video Call Hook** (`src/hooks/useVideoCall.ts`)
   - Simple interface to Zustand store
   - Consistent API across components

## Current Implementation Features

### 🎯 Host-Controlled Video Calls
- **Invite Dropdown Modal**: Integrated in ReadingRoom with video call options
- **No Auto-Start**: Removed automatic video call prompts to prevent unwanted calls
- **Guest Join Prompts**: Clear participant information and permission explanations
- **Step-Based Availability**: Video calls only available during drawing and interpretation steps

### 📱 Mobile Optimization
- **Audio-Only Mode**: Automatically switches to audio-only for 3+ participants on mobile
- **Twitter Spaces Interface**: Compact right-side panel for mobile audio calls
- **Touch Controls**: Touch-friendly interactions with auto-hide controls (3 seconds)
- **Viewport Constraints**: Video bubbles stay within screen bounds with proper margins

### 🎮 Individual Bubble Controls
- **Local User Controls**: Mute/unmute, video on/off, exit call
- **Remote Participant Controls**: Individual mute, video hide/show, volume control
- **Draggable Elements**: Each video bubble is independently draggable
- **Expandable Views**: Switch between minimized bubbles and expanded grid view

### 🔧 Technical Improvements
- **Viewport Constraint System**: Dynamic calculation with real-time position clamping
- **Enhanced Touch Handling**: Mobile-optimized with proper event handling
- **Comprehensive Logging**: Detailed console logging for debugging
- **Error Recovery**: Robust error handling and automatic reconnection

## Module Documentation

### 📋 [Supabase Video Implementation](../../SUPABASE_VIDEO_IMPLEMENTATION.md)
**Complete technical documentation of the current video system**
- Zustand store architecture
- Supabase Realtime integration
- WebRTC peer connection handling
- Mobile optimization features

### 🔄 [Video Call State Management](./video-call-state-management.md)
**Zustand-based state management patterns**
- Store structure and actions
- State synchronization
- Error handling strategies
- Performance optimizations

### 🎯 [Video Call User Experience](./video-call-user-experience.md)
**User interaction patterns and workflows**
- Host-controlled initiation flows
- Guest joining experience
- Mobile audio-only mode
- Individual participant controls

### 🧪 [Video Call Testing Guide](./video-call-testing-guide.md)
**Comprehensive testing strategies for video functionality**
- Unit testing with Zustand
- Integration testing scenarios
- Mobile testing procedures
- Performance testing guidelines

### 🎨 [Video Call UI Components](./video-call-ui-components.md)
**User interface design and component architecture**
- VideoBubbles component structure
- Mobile responsive design
- Accessibility features
- Touch interaction patterns

## Quick Start

### 1. Initialize Video Call
```typescript
// In ReadingRoom component
const { 
  isInCall, 
  participants,
  startCall, 
  endCall,
  initializeVideoCall 
} = useVideoCall();

// Initialize for session
useEffect(() => {
  if (sessionState?.id && user?.id) {
    initializeVideoCall(sessionState.id, user.id);
  }
}, [sessionState?.id, user?.id]);
```

### 2. Host-Controlled Video Start
```typescript
// Invite dropdown integration
const handleStartVideoCall = async () => {
  try {
    await startCall();
    // Video bubbles will automatically appear
  } catch (error) {
    console.error('Failed to start video call:', error);
  }
};
```

### 3. Video Bubbles Integration
```typescript
// Show during drawing and interpretation steps
{(readingStep === 'drawing' || readingStep === 'interpretation') && (
  <VideoBubbles 
    onClose={() => endCall()}
    readingStep={readingStep}
  />
)}
```

## State Management

### Video Call Store Structure
```typescript
interface VideoCallState {
  // Call state
  isInCall: boolean;
  localStream: MediaStream | null;
  remoteStreams: Map<string, MediaStream>;
  isVideoEnabled: boolean;
  isAudioEnabled: boolean;
  participants: string[];
  connectionStatus: 'disconnected' | 'connecting' | 'connected' | 'failed';
  error: string | null;
  
  // Internal state
  channel: RealtimeChannel | null;
  peerConnections: Map<string, RTCPeerConnection>;
  sessionId: string | null;
  participantId: string | null;
}
```

## Mobile Features

### Audio-Only Mode
- **Trigger**: 3+ participants on mobile devices
- **Benefits**: Better performance, battery life, bandwidth usage
- **UI**: Twitter Spaces-style compact interface
- **Automatic**: Seamlessly switches without user intervention

### Touch Optimizations
- **Enhanced Touch Events**: `onTouchStart` for better mobile responsiveness
- **Auto-Hide Controls**: Controls disappear after 3 seconds on mobile
- **Touch-Friendly Sizing**: Optimized bubble sizes for touch interaction
- **Gesture Support**: Proper drag and touch gesture handling

## Testing

### Manual Testing Checklist
- [ ] Video calls start only when host initiates
- [ ] Mobile audio-only mode activates for 3+ participants
- [ ] Video bubbles stay within viewport bounds
- [ ] Individual participant controls work correctly
- [ ] Touch interactions work on mobile devices
- [ ] Guest join experience is clear and functional

### Performance Testing
- [ ] Video quality adapts to connection
- [ ] Mobile battery usage is optimized
- [ ] Memory usage is efficient with cleanup
- [ ] Multiple participant calls are stable

## Troubleshooting

### Common Issues

1. **Video bubbles outside viewport**
   - ✅ Fixed with enhanced viewport constraint system
   - Real-time position clamping during drag
   - Automatic adjustment on window resize

2. **Mobile video performance issues**
   - ✅ Audio-only mode for 3+ participants
   - Optimized bubble sizes and positioning
   - Touch-friendly controls with auto-hide

3. **Guest can't see video UI**
   - Check session synchronization
   - Verify participant presence tracking
   - Review console logs for connection issues

4. **Touch controls not working on mobile**
   - ✅ Enhanced touch handling implemented
   - Touch-specific CSS applied
   - Event propagation properly managed

### Debug Mode
```typescript
// Enable detailed logging
localStorage.setItem('VIDEO_DEBUG', 'true');
```

## Related Code Files

### Core Implementation
- `src/stores/videoCallStore.ts` - Zustand store with Supabase integration
- `src/hooks/useVideoCall.ts` - Hook interface to store
- `src/components/video/VideoBubbles.tsx` - Main video UI component
- `src/components/video/GuestVideoJoinModal.tsx` - Guest onboarding

### Integration Points
- `src/pages/reading/ReadingRoom.tsx` - Video call integration
- `src/components/reading/InviteDropdownModal.tsx` - Host controls
- `src/components/reading/DeckDetails.tsx` - Session sharing

## Performance Considerations

### Optimization Strategies
- **Zustand State Management**: Efficient re-renders and state updates
- **WebRTC Direct Connections**: Peer-to-peer media without server relay
- **Mobile Audio-Only**: Automatic fallback for better performance
- **Viewport Constraints**: Optimized positioning calculations
- **Stream Cleanup**: Proper resource management and cleanup

### Scalability
- **Session-Scoped Channels**: Efficient participant management
- **Supabase Infrastructure**: Leverages existing reliable infrastructure
- **Direct Peer Connections**: No server bandwidth usage for media
- **Presence Tracking**: Automatic participant join/leave handling

---

This module provides a comprehensive video calling system that enhances TarotForge's collaborative reading experience with robust, mobile-optimized video communication capabilities. 