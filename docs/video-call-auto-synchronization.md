# Video Call Auto-Synchronization System

## Overview

The TarotForge video call auto-synchronization system seamlessly bridges **Supabase realtime session management** with **PeerJS/WebRTC video calls**, enabling automatic video call participation when users join reading sessions. This eliminates the need for manual video call joining and ensures all session participants can instantly connect via video.

## Architecture

### Core Components

1. **Reading Session Store** - Manages session state and participant tracking
2. **Video Call Context** - Handles WebRTC connections and media streams  
3. **Auto-Sync Bridge** - Coordinates between session participants and video calls
4. **Database Integration** - Persists video call state across sessions

### Data Flow

```
Session Join → Auto-Sync Detection → Video Call Join → WebRTC Connection
     ↓              ↓                    ↓               ↓
Participant    Video State         Media Stream     Peer Connection
  Added        Updated             Established       Established
```

## Implementation Details

### Database Schema

#### Reading Sessions Table Enhancement
```sql
-- Added video call state tracking
ALTER TABLE reading_sessions 
ADD COLUMN video_call_state JSONB DEFAULT NULL;

-- Structure of video_call_state:
{
  "isActive": boolean,
  "sessionId": string,
  "hostParticipantId": string,
  "participants": string[]
}
```

### Session Store Integration

#### Video Call State Management
```typescript
export interface ReadingSessionState {
  // ... existing fields ...
  videoCallState: {
    isActive: boolean;
    sessionId: string | null;
    hostParticipantId: string | null;
    participants: string[]; // participant IDs in the video call
  } | null;
}
```

#### Video Call Management Functions
```typescript
interface ReadingSessionStore {
  // ... existing methods ...
  
  // Video call management
  startVideoCall: () => Promise<string | null>;
  joinVideoCall: (videoSessionId: string) => Promise<boolean>;
  leaveVideoCall: () => Promise<void>;
  updateVideoCallParticipants: (participants: string[]) => Promise<void>;
}
```

### Enhanced Video Call Context

#### Auto-Sync Features
```typescript
type VideoCallContextType = {
  // ... existing properties ...
  
  // New auto-sync features
  isAutoJoinEnabled: boolean;
  setAutoJoinEnabled: (enabled: boolean) => void;
  videoCallParticipants: string[];
  isInVideoCall: boolean;
};
```

#### Auto-Sync Logic Implementation
```typescript
// Auto-sync with reading session video call state
useEffect(() => {
  if (!sessionState?.videoCallState || !participantId) return;

  const videoState = sessionState.videoCallState;
  setVideoCallParticipants(videoState.participants);

  // Check if current participant is in the video call
  const isParticipantInCall = videoState.participants.includes(participantId);
  setIsInVideoCall(isParticipantInCall);

  // Auto-join logic: if video call is active and auto-join is enabled
  if (videoState.isActive && isAutoJoinEnabled && !isParticipantInCall && !sessionId) {
    console.log('Auto-joining video call for session:', videoState.sessionId);
    handleAutoJoinVideoCall(videoState.sessionId);
  }

  // Auto-leave logic: if video call ended or participant was removed
  if ((!videoState.isActive || !isParticipantInCall) && sessionId) {
    console.log('Auto-leaving video call');
    handleAutoLeaveVideoCall();
  }
}, [sessionState?.videoCallState, participantId, isAutoJoinEnabled, sessionId]);
```

## User Experience Flows

### Host Starting Video Call

1. **Host clicks "Start Video Call"** in reading room interface
2. **Session store calls `startVideoCall()`**
   - Updates `videoCallState` with active call
   - Sets host as `hostParticipantId`
   - Adds host to participants array
3. **Supabase realtime broadcasts** state change to all participants
4. **Other participants receive update** via realtime subscription
5. **Auto-join logic triggers** for participants with auto-join enabled
6. **WebRTC connections establish** between all participants
7. **Video call is active** with all session participants

### Participant Joining Session with Active Video Call

1. **New participant joins reading session** via shared link
2. **Session state syncs** including active `videoCallState`
3. **Auto-sync effect detects** active video call
4. **Auto-join logic evaluates** participant's auto-join preference
5. **If auto-join enabled:**
   - Calls `joinVideoCall()` to update session state
   - Calls `startCall('client')` to establish WebRTC connection
   - Participant automatically joins ongoing video call
6. **If auto-join disabled:**
   - Participant sees video call indicator
   - Can manually join via UI button

### Participant Leaving Session

1. **Participant leaves session** or closes browser
2. **Session store cleanup** removes participant from session
3. **Video call state updates** removing participant from video call
4. **Realtime broadcast** notifies other participants
5. **WebRTC connections cleanup** for leaving participant
6. **If host leaves:**
   - Video call ends for all participants
   - `videoCallState.isActive` set to false
   - All participants auto-disconnect

## Technical Features

### Automatic Synchronization

#### Session-to-Video Sync
- **Participant tracking**: Video call participants always match session participants
- **Real-time updates**: Instant synchronization via Supabase realtime
- **State consistency**: Single source of truth in session database
- **Graceful handling**: Robust error handling and cleanup

#### Video-to-Session Sync
- **Connection status**: WebRTC connection state reflected in session
- **Media stream management**: Automatic stream setup and cleanup
- **Signaling coordination**: WebRTC signaling uses session ID
- **Peer management**: Automatic peer connection establishment

### Auto-Join Configuration

#### User Preferences
```typescript
// Default auto-join enabled for seamless experience
const [isAutoJoinEnabled, setAutoJoinEnabled] = useState(true);

// User can toggle auto-join behavior
<button onClick={() => setAutoJoinEnabled(!isAutoJoinEnabled)}>
  Auto-join: {isAutoJoinEnabled ? 'ON' : 'OFF'}
</button>
```

#### Smart Auto-Join Logic
- **Only joins active calls**: Won't join if video call is inactive
- **Respects user preference**: Honors auto-join enabled/disabled setting
- **Prevents duplicate joins**: Checks if already in call before joining
- **Handles permissions**: Gracefully handles camera/microphone permissions

### Error Handling and Edge Cases

#### Network Issues
- **Connection failures**: Graceful fallback and retry logic
- **Realtime disconnection**: Maintains local state until reconnection
- **WebRTC failures**: Cleans up session state if WebRTC fails
- **Partial connectivity**: Handles audio-only fallbacks

#### Permission Handling
- **Camera/microphone denied**: Shows permission request UI
- **Device not available**: Falls back to audio-only mode
- **Browser compatibility**: Checks for WebRTC support
- **Mobile considerations**: Optimized for mobile browsers

#### Race Conditions
- **Simultaneous joins**: Handles multiple participants joining simultaneously
- **State conflicts**: Resolves conflicts with last-write-wins strategy
- **Cleanup timing**: Proper cleanup order prevents resource leaks
- **Session transitions**: Smooth handling of session state changes

## API Reference

### Reading Session Store Methods

#### `startVideoCall(): Promise<string | null>`
Starts a new video call for the current session.

**Returns:** Video session ID on success, null on failure

**Usage:**
```typescript
const videoSessionId = await startVideoCall();
if (videoSessionId) {
  console.log('Video call started:', videoSessionId);
}
```

#### `joinVideoCall(videoSessionId: string): Promise<boolean>`
Joins an existing video call.

**Parameters:**
- `videoSessionId`: The video session ID to join

**Returns:** True if successfully joined, false otherwise

**Usage:**
```typescript
const joined = await joinVideoCall(sessionId);
if (joined) {
  console.log('Successfully joined video call');
}
```

#### `leaveVideoCall(): Promise<void>`
Leaves the current video call.

**Usage:**
```typescript
await leaveVideoCall();
console.log('Left video call');
```

#### `updateVideoCallParticipants(participants: string[]): Promise<void>`
Updates the list of video call participants.

**Parameters:**
- `participants`: Array of participant IDs

**Usage:**
```typescript
await updateVideoCallParticipants(['participant1', 'participant2']);
```

### Video Call Context Methods

#### `setAutoJoinEnabled(enabled: boolean): void`
Enables or disables automatic video call joining.

**Parameters:**
- `enabled`: Whether to enable auto-join

**Usage:**
```typescript
const { setAutoJoinEnabled } = useVideoCall();
setAutoJoinEnabled(false); // Disable auto-join
```

#### Video Call State Properties
```typescript
const {
  isInVideoCall,           // Boolean: Currently in video call
  videoCallParticipants,   // Array: Participant IDs in video call
  isAutoJoinEnabled,       // Boolean: Auto-join preference
  connectionStatus         // String: WebRTC connection status
} = useVideoCall();
```

## Usage Examples

### Reading Room Integration

```typescript
import { useVideoCall } from '../context/VideoCallContext';
import { useReadingSessionStore } from '../stores/readingSessionStore';

const ReadingRoom = () => {
  const { 
    isInVideoCall, 
    videoCallParticipants, 
    isAutoJoinEnabled, 
    setAutoJoinEnabled,
    startCall 
  } = useVideoCall();
  
  const { sessionState, isHost } = useReadingSessionStore();

  // Show video call status
  const renderVideoCallStatus = () => (
    <div className="video-call-status">
      {isInVideoCall ? (
        <div>
          📹 In video call with {videoCallParticipants.length} participants
        </div>
      ) : sessionState?.videoCallState?.isActive ? (
        <div>
          📹 Video call active ({videoCallParticipants.length} participants)
          {!isAutoJoinEnabled && (
            <button onClick={() => startCall('client', sessionState.id)}>
              Join Video Call
            </button>
          )}
        </div>
      ) : (
        isHost && (
          <button onClick={() => startCall('reader')}>
            Start Video Call
          </button>
        )
      )}
    </div>
  );

  // Auto-join toggle
  const renderAutoJoinToggle = () => (
    <div className="auto-join-toggle">
      <label>
        <input
          type="checkbox"
          checked={isAutoJoinEnabled}
          onChange={(e) => setAutoJoinEnabled(e.target.checked)}
        />
        Auto-join video calls
      </label>
    </div>
  );

  return (
    <div className="reading-room">
      {renderVideoCallStatus()}
      {renderAutoJoinToggle()}
      {/* ... rest of reading room UI ... */}
    </div>
  );
};
```

### Video Call Participant List

```typescript
const VideoCallParticipantList = () => {
  const { videoCallParticipants, isInVideoCall } = useVideoCall();
  const { participants } = useReadingSessionStore();

  if (!isInVideoCall) return null;

  return (
    <div className="video-participants">
      <h3>Video Call Participants ({videoCallParticipants.length})</h3>
      <ul>
        {participants
          .filter(p => videoCallParticipants.includes(p.id))
          .map(participant => (
            <li key={participant.id}>
              {participant.name || 'Anonymous'} 
              {participant.userId ? '👤' : '👻'}
            </li>
          ))}
      </ul>
    </div>
  );
};
```

## Configuration Options

### Environment Variables

```env
# WebRTC STUN servers (optional, defaults provided)
VITE_STUN_SERVER_1=stun:stun.l.google.com:19302
VITE_STUN_SERVER_2=stun:global.stun.twilio.com:3478

# Auto-join default setting
VITE_DEFAULT_AUTO_JOIN=true

# Video quality constraints
VITE_VIDEO_MAX_WIDTH=1280
VITE_VIDEO_MAX_HEIGHT=720
VITE_VIDEO_MAX_FRAMERATE=30
```

### Video Quality Settings

```typescript
const videoConstraints = {
  width: { ideal: 640, max: 1280 },
  height: { ideal: 480, max: 720 },
  frameRate: { ideal: 15, max: 30 }
};

const audioConstraints = {
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true
};
```

## Performance Considerations

### Optimization Strategies

1. **Lazy Loading**: Video call components loaded only when needed
2. **Stream Management**: Proper cleanup of media streams
3. **Connection Pooling**: Reuse WebRTC connections when possible
4. **Bandwidth Adaptation**: Automatic quality adjustment based on connection
5. **Mobile Optimization**: Reduced video quality on mobile devices

### Resource Management

- **Memory Usage**: Automatic cleanup of peer connections and streams
- **CPU Usage**: Optimized video encoding settings
- **Network Usage**: Efficient signaling and minimal state updates
- **Battery Usage**: Power-efficient video processing on mobile

## Security Considerations

### Data Protection

- **Encrypted Connections**: All WebRTC traffic is encrypted
- **Secure Signaling**: Supabase realtime uses secure WebSocket connections
- **Permission Validation**: Proper authentication checks for video call access
- **Session Isolation**: Video calls isolated to specific reading sessions

### Privacy Features

- **Opt-out Capability**: Users can disable auto-join
- **Permission Control**: Explicit camera/microphone permission requests
- **Data Minimization**: Only necessary participant data stored
- **Temporary Sessions**: Video call state cleaned up when session ends

## Troubleshooting

### Common Issues

#### Auto-join not working
**Symptoms:** Participants don't automatically join video calls
**Solutions:**
1. Check if auto-join is enabled in user preferences
2. Verify participant has proper session permissions
3. Ensure WebRTC is supported in browser
4. Check camera/microphone permissions

#### Video call state desync
**Symptoms:** Video call participants don't match session participants
**Solutions:**
1. Refresh browser to resync session state
2. Check Supabase realtime connection status
3. Verify database permissions for session updates
4. Check for JavaScript errors in console

#### WebRTC connection failures
**Symptoms:** Video/audio not working despite successful join
**Solutions:**
1. Check firewall settings for WebRTC traffic
2. Verify STUN server accessibility
3. Test with different network connection
4. Check browser WebRTC support and permissions

### Debug Information

#### Logging
```typescript
// Enable detailed logging
localStorage.setItem('debug', 'video-call:*');

// Check video call state
console.log('Video call state:', sessionState?.videoCallState);
console.log('Participant ID:', participantId);
console.log('Auto-join enabled:', isAutoJoinEnabled);
```

#### Health Checks
```typescript
// Check WebRTC support
const hasWebRTC = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);

// Check Supabase connection
const supabaseStatus = supabase.realtime.isConnected();

// Check session state
const hasActiveSession = !!sessionState?.id;
const hasVideoCall = !!sessionState?.videoCallState?.isActive;
```

## Future Enhancements

### Planned Features

1. **Multi-party Video**: Support for more than 2 participants
2. **Screen Sharing**: Share tarot card layouts via screen share
3. **Recording**: Record video calls for later review
4. **Chat Integration**: Text chat alongside video calls
5. **Virtual Backgrounds**: Custom backgrounds for video calls

### Advanced Synchronization

1. **Gesture Sync**: Synchronize pointing gestures on cards
2. **Voice Commands**: Voice-activated card navigation
3. **Emotion Detection**: Detect and share emotional responses
4. **Collaborative Annotations**: Draw on shared card views
5. **AI Moderation**: Automatic content moderation for video calls

## Migration Guide

### Updating Existing Sessions

If you have existing reading sessions, run the database migration:

```sql
-- Apply the video call state migration
npx supabase migration new add_video_call_state
npx supabase db push
```

### Code Updates

Update your components to use the new auto-sync features:

```typescript
// Before: Manual video call management
const startVideoCall = () => {
  // Manual WebRTC setup
};

// After: Auto-sync video call management
const { startCall, isInVideoCall, isAutoJoinEnabled } = useVideoCall();
const startVideoCall = () => startCall('reader');
```

## Conclusion

The video call auto-synchronization system provides a seamless, collaborative experience for TarotForge users. By automatically coordinating video call participation with reading session membership, users can focus on the tarot reading experience without worrying about manual video call management.

The system is designed to be robust, performant, and user-friendly, with comprehensive error handling and graceful fallbacks. The auto-join feature can be easily disabled for users who prefer manual control, while the default experience provides maximum convenience and engagement. 