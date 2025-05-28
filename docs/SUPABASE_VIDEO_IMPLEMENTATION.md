# TarotForge Video Call System - Supabase Realtime Implementation

## Overview

TarotForge's video call system uses **Supabase Realtime** for WebRTC signaling combined with **Zustand** for state management. This implementation provides a robust, scalable video calling experience integrated seamlessly with collaborative tarot reading sessions.

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Participant A │    │  Supabase       │    │   Participant B │
│                 │    │  Realtime       │    │                 │
│  ┌───────────┐  │    │                 │    │  ┌───────────┐  │
│  │ WebRTC    │◄─┼────┤  Broadcast      ├────┼─►│ WebRTC    │  │
│  │ Peer      │  │    │  Channels       │    │  │ Peer      │  │
│  │ Connection│  │    │                 │    │  │ Connection│  │
│  └───────────┘  │    │  ┌───────────┐  │    │  └───────────┘  │
│                 │    │  │ Presence  │  │    │                 │
│  ┌───────────┐  │    │  │ Tracking  │  │    │  ┌───────────┐  │
│  │ Zustand   │  │    │  └───────────┘  │    │  │ Zustand   │  │
│  │ Store     │  │    │                 │    │  │ Store     │  │
│  └───────────┘  │    └─────────────────┘    │  └───────────┘  │
└─────────────────┘                           └─────────────────┘
```

## Key Components

### 1. Video Call Store (Zustand)

**Location**: `src/stores/videoCallStore.ts`

**Features**:
- Centralized state management with Zustand
- Supabase Realtime channel management
- WebRTC peer connection handling
- Automatic presence tracking
- Stream management and cleanup

**State Interface**:
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

### 2. Video Call Hook

**Location**: `src/hooks/useVideoCall.ts`

Simple hook that provides access to the Zustand store:
```typescript
export const useVideoCall = () => {
  return useVideoCallStore();
};
```

### 3. VideoBubbles Component

**Location**: `src/components/video/VideoBubbles.tsx`

**Features**:
- Draggable video bubbles with viewport constraints
- Individual participant controls (mute/unmute, video on/off)
- Mobile-optimized interface with audio-only mode for 3+ participants
- Twitter Spaces-style audio interface on mobile
- Expandable/minimizable video views
- Touch-friendly interactions

**Key Features**:
- **Viewport Constraints**: Video bubbles stay within screen bounds
- **Mobile Audio-Only**: Automatically switches to audio-only for 3+ participants on mobile
- **Individual Controls**: Each participant has independent audio/video controls
- **Drag & Drop**: All video elements are draggable with proper constraints

## How It Works

### 1. Initialization
```typescript
// Initialize video call for a session
await initializeVideoCall(sessionId, participantId);
```

### 2. Channel Setup
```typescript
const channelName = `video_call:${sessionId}`;
const channel = supabase.channel(channelName, {
  config: {
    broadcast: { self: false },
    presence: { key: participantId }
  }
});
```

### 3. Signaling Events
- **video_offer**: WebRTC offer exchange
- **video_answer**: WebRTC answer exchange  
- **video_ice_candidate**: ICE candidate exchange
- **presence sync/join/leave**: Participant management

### 4. WebRTC Connection Flow
1. User starts/joins call via `startCall()` or `joinCall()`
2. Local media stream acquired with optimized settings
3. Presence tracked in Supabase channel
4. Peer connections created for each participant
5. Signaling messages exchanged via Supabase broadcast
6. Direct peer-to-peer media streams established

## Integration with Reading Sessions

### Session-Based Video Calls
- Video calls are scoped to reading sessions
- Channel naming: `video_call:${sessionId}`
- Automatic participant management
- Step-based availability (drawing and interpretation only)

### Host-Controlled Initiation
- Hosts control video call start through invite dropdown
- No auto-start functionality to prevent unwanted calls
- Clear guest join prompts with participant information

### Mobile Optimization
- **2 participants**: Normal video mode
- **3+ participants**: Automatic audio-only mode on mobile
- **Twitter Spaces UI**: Compact right-side panel for mobile audio calls
- **Touch Controls**: Auto-hide controls after 3 seconds

## User Experience Features

### 1. Invite Dropdown Modal
**Location**: Integrated in ReadingRoom.tsx

Features:
- "Start Video Chat & Share" option
- "Share Reading Room" option
- Current session information display
- Video chat status and participant count

### 2. Guest Video Join Modal
**Location**: `src/components/video/GuestVideoJoinModal.tsx`

Features:
- Participant information display
- Permission explanations
- Clear camera/microphone access instructions

### 3. Individual Bubble Controls
- **Local User**: Mute/unmute, video on/off, exit call
- **Remote Participants**: Individual mute, video hide/show, volume control
- **Mobile Touch**: Touch-friendly with auto-hide controls

### 4. Viewport Constraints
- Dynamic constraint calculation based on device type
- Automatic position clamping on window resize
- Safe margins for mobile browser UI
- Separate constraints for different bubble sizes

## Mobile-Specific Features

### Audio-Only Mode
Automatically activated when:
- Device is mobile (≤768px or touch device)
- 3 or more participants in call
- Provides better performance and battery life

### Twitter Spaces-Style Interface
For mobile audio-only mode:
- Compact vertical panel on right margin
- Stacked participant avatars with gradient colors
- Audio status indicators
- Minimal screen space usage
- Slide-in animation from right edge

### Touch Optimizations
- Enhanced touch handling with `onTouchStart` events
- Touch-specific CSS (`touch-manipulation`)
- Auto-hide controls after 3 seconds
- Mobile-optimized bubble sizes and positioning

## Configuration

### WebRTC Configuration
```typescript
const rtcConfig = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' }
  ]
};
```

### Media Constraints
```typescript
// Video constraints
video: {
  width: { ideal: 1280 },
  height: { ideal: 720 },
  frameRate: { ideal: 30 }
}

// Audio constraints
audio: { 
  echoCancellation: true, 
  noiseSuppression: true,
  autoGainControl: true
}
```

### Environment Variables
Uses existing Supabase configuration - no additional setup required.

## Usage Examples

### Basic Integration
```typescript
// In ReadingRoom component
const { 
  isInCall, 
  localStream, 
  remoteStreams, 
  participants,
  startCall, 
  endCall,
  toggleVideo,
  toggleAudio 
} = useVideoCall();

// Initialize for session
useEffect(() => {
  if (sessionState?.id && user?.id) {
    initializeVideoCall(sessionState.id, user.id);
  }
}, [sessionState?.id, user?.id]);

// Start video call
const handleStartVideoCall = async () => {
  try {
    await startCall();
  } catch (error) {
    console.error('Failed to start video call:', error);
  }
};
```

### Video Bubbles Integration
```typescript
// Show video bubbles during drawing and interpretation steps
{(readingStep === 'drawing' || readingStep === 'interpretation') && (
  <VideoBubbles 
    onClose={() => endCall()}
    readingStep={readingStep}
  />
)}
```

## Benefits

### ✅ **Performance**
- Zustand for efficient state management
- Direct WebRTC peer connections
- Optimized mobile experience
- Automatic quality adjustment

### ✅ **Reliability**
- Robust error handling and recovery
- Automatic reconnection logic
- Comprehensive logging and debugging
- Graceful degradation

### ✅ **User Experience**
- Intuitive drag-and-drop interface
- Mobile-optimized audio-only mode
- Individual participant controls
- Viewport-constrained positioning

### ✅ **Integration**
- Seamless session integration
- Host-controlled initiation
- Step-based availability
- Existing infrastructure usage

## Troubleshooting

### Common Issues

1. **Video bubbles outside viewport**
   - Fixed with enhanced viewport constraint system
   - Real-time position clamping during drag
   - Automatic adjustment on window resize

2. **Mobile video performance**
   - Audio-only mode for 3+ participants
   - Optimized bubble sizes and positioning
   - Touch-friendly controls with auto-hide

3. **Connection issues**
   - Check Supabase Realtime status
   - Verify WebRTC permissions
   - Review console logs for detailed errors

4. **Audio/video not working**
   - Check browser permissions
   - Ensure HTTPS connection
   - Verify media device availability

### Debug Mode
```typescript
// Enable detailed logging
localStorage.setItem('VIDEO_DEBUG', 'true');
```

### Console Logging
The implementation includes comprehensive logging:
- Channel connection status
- Peer connection states
- Media stream events
- Signaling message flow
- Error conditions and recovery

## Browser Support

- **Chrome/Edge**: Full support with optimal performance
- **Firefox**: Full support with WebRTC compatibility
- **Safari**: Full support (iOS 11+) with mobile optimizations
- **Mobile browsers**: Optimized with audio-only fallback

## Security & Privacy

- **End-to-end encryption**: All WebRTC traffic is encrypted
- **Session-scoped access**: Video calls limited to session participants
- **No recording**: Video streams are not stored or recorded
- **Permission-based**: Respects existing session access controls
- **Secure signaling**: Uses Supabase's secure WebSocket connections

## Performance Considerations

### Bandwidth Optimization
- Automatic quality adjustment based on connection
- Audio-only mode for mobile with multiple participants
- Efficient stream management and cleanup

### Resource Management
- Proper cleanup of peer connections and streams
- Memory-efficient participant tracking
- Optimized for mobile battery usage

### Scalability
- Leverages Supabase infrastructure
- Efficient presence management
- Direct peer-to-peer connections (no server relay)

## Future Enhancements

### Planned Features
- Screen sharing capabilities
- Recording functionality
- Advanced audio processing
- Bandwidth monitoring and adjustment
- Enhanced mobile UI features

### Technical Improvements
- WebRTC statistics monitoring
- Advanced error recovery
- Connection quality indicators
- Adaptive bitrate streaming

---

This implementation provides a robust, scalable video calling system that integrates seamlessly with TarotForge's collaborative reading experience while maintaining excellent performance across all devices. 