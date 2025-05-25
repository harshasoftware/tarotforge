# Multi-Party Video Call Implementation

## Overview

TarotForge now supports multi-party video calls with up to 8 participants using a mesh network architecture. Each participant connects directly to every other participant via WebRTC peer-to-peer connections.

## Architecture

### Core Components

1. **VideoCallContext** - Enhanced context provider managing multiple peer connections
2. **VideoChat Component** - Updated UI supporting multiple video streams
3. **Video Signals Table** - Database table for WebRTC signaling
4. **Mesh Network** - Direct peer-to-peer connections between all participants

### Database Schema

```sql
-- Video signals table for multi-party signaling
CREATE TABLE video_signals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL,
  from_participant TEXT NOT NULL,
  to_participant TEXT NOT NULL,
  signal_data JSONB NOT NULL,
  peer_id TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Implementation Details

### Enhanced VideoCallContext

#### Key Changes
- **Multiple Remote Streams**: `remoteStreams: Map<string, MediaStream>`
- **Peer Management**: `connectedPeers: Map<string, string>` and `peerConnections: Map<string, Peer.Instance>`
- **Mesh Network Logic**: Each participant connects to all others

#### Peer Connection Management

```typescript
const createPeerConnection = useCallback((targetParticipantId: string, initiator: boolean) => {
  const peerId = uuidv4();
  
  const peer = new Peer({
    initiator,
    trickle: false,
    stream: localStream || undefined,
    config: {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ]
    }
  });

  // Store peer connection
  setPeerConnections(prev => new Map(prev).set(peerId, peer));
  setConnectedPeers(prev => new Map(prev).set(targetParticipantId, peerId));

  // Handle signaling through Supabase
  peer.on('signal', async (data) => {
    await supabase
      .from('video_signals')
      .insert({
        session_id: sessionId,
        from_participant: participantId,
        to_participant: targetParticipantId,
        signal_data: data,
        peer_id: peerId,
        created_at: new Date().toISOString()
      });
  });

  // Handle incoming stream
  peer.on('stream', (remoteStream) => {
    setRemoteStreams(prev => new Map(prev).set(targetParticipantId, remoteStream));
  });

  return { peer, peerId };
}, [localStream, sessionId, participantId]);
```

#### Signaling System

```typescript
// Listen for incoming signals
useEffect(() => {
  if (!sessionId) return;

  const channel = supabase
    .channel(`video-signals-${sessionId}`)
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'video_signals',
      filter: `to_participant=eq.${participantId}`
    }, async (payload) => {
      const { from_participant, signal_data, peer_id } = payload.new;
      
      // Find or create peer connection
      let peer = peerConnections.get(peer_id);
      if (!peer) {
        const { peer: newPeer } = createPeerConnection(from_participant, false);
        peer = newPeer;
      }
      
      // Process signal
      peer.signal(signal_data);
      
      // Clean up signal record
      await supabase
        .from('video_signals')
        .delete()
        .eq('id', payload.new.id);
    })
    .subscribe();

  return () => supabase.removeChannel(channel);
}, [sessionId, participantId, peerConnections, createPeerConnection]);
```

### Enhanced VideoChat Component

#### Multi-Stream Video Rendering

```typescript
// Multiple remote video bubbles
{Array.from(remoteStreams.entries()).map(([participantId, stream], index) => {
  const position = remoteVideoPositions.get(participantId) || { x: 100 + (index * 140), y: 100 };
  
  // Create or get ref for this participant
  if (!remoteVideoRefs.current.has(participantId)) {
    remoteVideoRefs.current.set(participantId, React.createRef<HTMLVideoElement>());
  }
  const videoRef = remoteVideoRefs.current.get(participantId)!;
  
  return (
    <DraggableVideo
      key={participantId}
      videoRef={videoRef}
      stream={stream}
      label={`Participant ${index + 1}`}
      initialPosition={position}
      onPositionChange={(pos) => updateRemoteVideoPosition(participantId, pos)}
      isMobile={isMobile}
    />
  );
})}
```

#### Smart Video Positioning

```typescript
const calculateVideoPositions = useCallback(() => {
  const participantCount = remoteStreams.size;
  const videoSize = isMobile ? 64 : 128;
  const spacing = isMobile ? 8 : 10;
  
  if (participantCount <= 3) {
    // Horizontal layout for 1-3 participants
    const totalWidth = (participantCount * videoSize) + ((participantCount - 1) * spacing);
    const startX = (window.innerWidth - totalWidth) / 2;
    
    participantIds.forEach((participantId, index) => {
      const x = startX + (index * (videoSize + spacing));
      const y = topOffset;
      newRemotePositions.set(participantId, { x, y });
    });
  } else {
    // Grid layout for 4+ participants
    const cols = Math.ceil(Math.sqrt(participantCount));
    const rows = Math.ceil(participantCount / cols);
    
    participantIds.forEach((participantId, index) => {
      const row = Math.floor(index / cols);
      const col = index % cols;
      const x = startX + (col * (videoSize + spacing));
      const y = startY + (row * (videoSize + spacing));
      newRemotePositions.set(participantId, { x, y });
    });
  }
}, [remoteStreams.size, isMobile]);
```

## User Experience

### Participant Joining Flow

1. **Host starts video call** → Creates session and waits for participants
2. **Participant joins session** → Automatically connects to existing participants
3. **New participant joins** → All existing participants connect to new participant
4. **Participant leaves** → Connections are cleaned up automatically

### Video Layout

- **1-3 participants**: Horizontal layout at top center
- **4+ participants**: Smart grid layout
- **Mobile optimization**: Smaller video bubbles with touch controls
- **Draggable positioning**: Users can move video bubbles anywhere on screen

### Controls & Features

- **Participant counter**: Shows total number of participants
- **Individual mute/video controls**: Each participant controls their own stream
- **Auto-join functionality**: New participants automatically join ongoing video calls
- **Permission management**: Graceful handling of camera/microphone permissions

## Technical Features

### Performance Optimizations

- **Hardware acceleration**: Enabled for video rendering
- **Optimized video constraints**: Balanced quality vs performance
- **Efficient signaling**: Automatic cleanup of processed signals
- **Memory management**: Proper cleanup of peer connections and streams

### Error Handling

- **Connection failures**: Automatic retry and cleanup
- **Permission denied**: User-friendly permission request flow
- **Network issues**: Graceful degradation and reconnection
- **Participant limits**: Soft limit of 8 participants for optimal performance

### Security Considerations

- **Direct P2P connections**: No video data passes through servers
- **Session-based access**: Only session participants can join video calls
- **Automatic cleanup**: Old signals are automatically removed
- **Permission-based**: Requires explicit camera/microphone permissions

## API Reference

### VideoCallContext Methods

```typescript
interface VideoCallContextType {
  // Multi-party specific
  remoteStreams: Map<string, MediaStream>;
  connectedPeers: Map<string, string>;
  peerConnections: Map<string, Peer.Instance>;
  videoCallParticipants: string[];
  
  // Core functionality
  startCall: (mode: 'reader' | 'client', existingSessionId?: string) => Promise<string | null>;
  endCall: () => void;
  
  // Auto-sync features
  isAutoJoinEnabled: boolean;
  setAutoJoinEnabled: (enabled: boolean) => void;
}
```

### Database Operations

```typescript
// Insert signal for peer communication
await supabase
  .from('video_signals')
  .insert({
    session_id: sessionId,
    from_participant: participantId,
    to_participant: targetParticipantId,
    signal_data: data,
    peer_id: peerId
  });

// Listen for incoming signals
const channel = supabase
  .channel(`video-signals-${sessionId}`)
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'video_signals',
    filter: `to_participant=eq.${participantId}`
  }, handleIncomingSignal)
  .subscribe();
```

## Configuration

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

### STUN Servers

```typescript
const iceServers = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' }
];
```

## Testing Scenarios

### Basic Multi-Party Test

1. **Setup**: Create reading session with 3+ participants
2. **Action**: Host starts video call
3. **Expected**: All participants auto-join and see each other's video
4. **Verify**: Video streams, audio, participant counter

### Connection Management Test

1. **Setup**: Ongoing video call with 4 participants
2. **Action**: One participant leaves, new participant joins
3. **Expected**: Connections update automatically
4. **Verify**: No disruption to remaining participants

### Mobile Compatibility Test

1. **Setup**: Mix of mobile and desktop participants
2. **Action**: Test video positioning and controls
3. **Expected**: Responsive layout, touch-friendly controls
4. **Verify**: Video quality, control accessibility

### Performance Test

1. **Setup**: Maximum participants (8) in video call
2. **Action**: Monitor CPU, memory, network usage
3. **Expected**: Stable performance, acceptable quality
4. **Verify**: No crashes, smooth video playback

## Troubleshooting

### Common Issues

**Video not showing for some participants**
- Check camera permissions
- Verify network connectivity
- Check browser WebRTC support

**Audio echo or feedback**
- Ensure local video is muted
- Check audio device settings
- Verify echo cancellation is enabled

**Connection failures**
- Check STUN server accessibility
- Verify firewall settings
- Test with fewer participants

**Performance issues**
- Reduce video quality settings
- Limit number of participants
- Check device capabilities

### Debug Information

```typescript
// Enable debug logging
console.log('Multi-party video chat - Participants:', {
  localStream: !!localStream,
  remoteStreamsCount: remoteStreams.size,
  remoteParticipants: Array.from(remoteStreams.keys()),
  videoCallParticipants,
  connectedPeers: Array.from(connectedPeers.entries()),
  connectionStatus
});
```

## Future Enhancements

### Planned Features

1. **Screen sharing**: Allow participants to share their screen
2. **Recording**: Record multi-party video sessions
3. **Chat integration**: Text chat alongside video
4. **Breakout rooms**: Split participants into smaller groups
5. **Virtual backgrounds**: AI-powered background replacement
6. **Quality adaptation**: Dynamic quality adjustment based on network
7. **Moderator controls**: Host can mute/remove participants
8. **Waiting room**: Participants wait for host approval

### Performance Improvements

1. **SFU architecture**: Consider Selective Forwarding Unit for larger groups
2. **Bandwidth optimization**: Adaptive bitrate streaming
3. **Connection optimization**: ICE candidate optimization
4. **Mobile optimization**: Further mobile-specific optimizations

## Migration Guide

### From Single-Party to Multi-Party

1. **Update VideoCallContext usage**:
   ```typescript
   // Old
   const { remoteStream } = useVideoCall();
   
   // New
   const { remoteStreams } = useVideoCall();
   ```

2. **Update video rendering**:
   ```typescript
   // Old
   <video ref={remoteVideoRef} />
   
   // New
   {Array.from(remoteStreams.entries()).map(([participantId, stream]) => (
     <DraggableVideo key={participantId} stream={stream} />
   ))}
   ```

3. **Apply database migration**:
   ```bash
   npx supabase migration up
   ```

### Breaking Changes

- `remoteStream` property replaced with `remoteStreams` Map
- Video positioning logic updated for multiple participants
- New database table `video_signals` required
- Updated peer connection management

This implementation provides a robust, scalable multi-party video calling system that integrates seamlessly with TarotForge's existing session management and real-time synchronization features. 