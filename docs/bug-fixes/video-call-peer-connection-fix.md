# Video Call Peer Connection Fix

## Issue
When guests join a video call, the following error occurs:
```
Error creating peer connection: TypeError: Cannot read properties of undefined (reading 'call')
```

This error happens in the Simple Peer library when trying to create a peer connection.

## Root Cause
The issue was caused by passing `undefined` to the `stream` property in the Simple Peer options when `localStream` was null. Simple Peer expects either a valid MediaStream or no stream property at all.

## Solution

### 1. Fixed Peer Configuration
```typescript
// Before (problematic)
const peer = new Peer({
  initiator,
  trickle: false,
  stream: localStream || undefined, // This causes the error
  config: { ... }
});

// After (fixed)
const peerConfig: PeerOptions = {
  initiator,
  trickle: false,
  config: { ... }
};

// Only add stream if it exists
if (localStream) {
  peerConfig.stream = localStream;
}

const peer = new Peer(peerConfig);
```

### 2. Added Stream Later
When the local stream becomes available after peer connections are created, we add it to existing connections:

```typescript
useEffect(() => {
  if (localStream && peerConnections.size > 0) {
    peerConnections.forEach((peer, peerId) => {
      try {
        if (!(peer as any)._pc?.getSenders?.()?.some((sender: any) => sender.track)) {
          peer.addStream(localStream);
        }
      } catch (err) {
        console.error('Error adding stream to peer:', err);
      }
    });
  }
}, [localStream, peerConnections]);
```

### 3. Improved Connection Flow
- Added delays to ensure media permissions are granted before creating connections
- Check for local stream availability before connecting to participants
- Better error handling for peer connection creation

## Testing
1. Host starts a video call
2. Guest joins the session
3. Guest should be able to join the video call without errors
4. Both parties should see each other's video/audio streams

## Related Files
- `src/context/VideoCallContext.tsx` - Main video call context with peer management
- `src/components/video/VideoChat.tsx` - Video chat UI component 