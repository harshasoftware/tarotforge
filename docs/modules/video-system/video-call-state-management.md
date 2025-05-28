# Video Call State Management

## Overview

TarotForge's video call system uses **Zustand** for state management, providing a centralized, efficient approach to handling video call state across the application. This replaces the previous React Context approach for better performance and consistency.

## Architecture

### Zustand Store Structure

**Location**: `src/stores/videoCallStore.ts`

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
  
  // Actions
  initializeVideoCall: (sessionId: string, participantId: string) => Promise<void>;
  startCall: () => Promise<void>;
  joinCall: () => Promise<void>;
  endCall: () => void;
  toggleVideo: () => void;
  toggleAudio: () => void;
  cleanup: () => void;
}
```

## Key Features

### 1. Centralized State Management
- Single source of truth for all video call state
- Efficient re-renders with Zustand's subscription system
- No prop drilling or context provider complexity

### 2. Supabase Realtime Integration
- Direct integration with Supabase channels
- Automatic presence tracking
- Real-time signaling for WebRTC

### 3. WebRTC Management
- Peer connection lifecycle management
- Stream handling and cleanup
- ICE candidate exchange

## State Management Patterns

### 1. Store Creation
```typescript
export const useVideoCallStore = create<VideoCallState>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    isInCall: false,
    localStream: null,
    remoteStreams: new Map(),
    // ... other initial values
    
    // Actions
    initializeVideoCall: async (sessionId, participantId) => {
      // Implementation
    },
    // ... other actions
  }))
);
```

### 2. Hook Interface
```typescript
// src/hooks/useVideoCall.ts
export const useVideoCall = () => {
  return useVideoCallStore();
};
```

### 3. Component Usage
```typescript
// In React components
const { 
  isInCall, 
  participants, 
  startCall, 
  endCall 
} = useVideoCall();
```

## State Lifecycle

### 1. Initialization
```typescript
// Called when entering a reading session
await initializeVideoCall(sessionId, participantId);
```

**Process**:
1. Clean up existing channel if any
2. Create new Supabase channel for session
3. Set up event listeners for presence and signaling
4. Subscribe to channel

### 2. Starting a Call
```typescript
await startCall();
```

**Process**:
1. Request media permissions
2. Acquire local stream with optimized settings
3. Track presence in Supabase channel
4. Set call state to active

### 3. Participant Management
**Automatic handling via Supabase presence**:
- `presence.sync`: Update participant list
- `presence.join`: Create peer connection for new participant
- `presence.leave`: Clean up peer connection

### 4. WebRTC Signaling
**Handled via Supabase broadcast events**:
- `video_offer`: Initiate peer connection
- `video_answer`: Complete peer connection
- `video_ice_candidate`: Exchange ICE candidates

### 5. Call Termination
```typescript
endCall();
```

**Process**:
1. Close all peer connections
2. Stop local media tracks
3. Unsubscribe from channel
4. Reset state

## Error Handling

### 1. Connection Errors
```typescript
// Automatic error state management
set({ 
  connectionStatus: 'failed', 
  error: 'Failed to connect to video call' 
});
```

### 2. Media Access Errors
```typescript
// Handle permission denials gracefully
set({ 
  error: 'Failed to access camera and microphone. Please check permissions.',
  connectionStatus: 'failed'
});
```

### 3. WebRTC Errors
```typescript
// Peer connection error handling
peerConnection.onerror = (error) => {
  console.error('Peer connection error:', error);
  // Cleanup and retry logic
};
```

## Performance Optimizations

### 1. Selective Subscriptions
```typescript
// Only subscribe to specific state changes
const participants = useVideoCallStore(state => state.participants);
const isInCall = useVideoCallStore(state => state.isInCall);
```

### 2. Efficient Stream Management
```typescript
// Use Maps for efficient participant tracking
remoteStreams: new Map<string, MediaStream>()
peerConnections: new Map<string, RTCPeerConnection>()
```

### 3. Automatic Cleanup
```typescript
// Cleanup on component unmount or session change
useEffect(() => {
  return () => {
    cleanup();
  };
}, []);
```

## Integration Points

### 1. Reading Room Integration
```typescript
// src/pages/reading/ReadingRoom.tsx
const { initializeVideoCall, isInCall } = useVideoCall();

useEffect(() => {
  if (sessionState?.id && user?.id) {
    initializeVideoCall(sessionState.id, user.id);
  }
}, [sessionState?.id, user?.id]);
```

### 2. Video Bubbles Component
```typescript
// src/components/video/VideoBubbles.tsx
const {
  isInCall,
  localStream,
  remoteStreams,
  participants,
  toggleVideo,
  toggleAudio,
  endCall
} = useVideoCall();
```

### 3. Invite Controls
```typescript
// Invite dropdown integration
const { startCall, connectionStatus } = useVideoCall();

const handleStartVideoCall = async () => {
  try {
    await startCall();
  } catch (error) {
    console.error('Failed to start video call:', error);
  }
};
```

## State Persistence

### 1. Session-Scoped State
- State is tied to reading sessions
- Automatic cleanup when session changes
- No persistent storage needed

### 2. Connection Recovery
```typescript
// Automatic reconnection on channel errors
.subscribe(async (status) => {
  if (status === 'CHANNEL_ERROR') {
    // Implement reconnection logic
    setTimeout(() => {
      initializeVideoCall(sessionId, participantId);
    }, 1000);
  }
});
```

## Debugging and Monitoring

### 1. Debug Mode
```typescript
// Enable detailed logging
localStorage.setItem('VIDEO_DEBUG', 'true');
```

### 2. State Inspection
```typescript
// Access store directly for debugging
const store = useVideoCallStore.getState();
console.log('Current video call state:', store);
```

### 3. Subscription Monitoring
```typescript
// Monitor state changes
useVideoCallStore.subscribe(
  (state) => state.connectionStatus,
  (connectionStatus) => {
    console.log('Connection status changed:', connectionStatus);
  }
);
```

## Testing Strategies

### 1. Unit Testing
```typescript
// Test store actions
import { useVideoCallStore } from '../stores/videoCallStore';

test('should initialize video call', async () => {
  const store = useVideoCallStore.getState();
  await store.initializeVideoCall('session-id', 'participant-id');
  
  expect(store.sessionId).toBe('session-id');
  expect(store.participantId).toBe('participant-id');
});
```

### 2. Integration Testing
```typescript
// Test component integration
import { renderHook } from '@testing-library/react';
import { useVideoCall } from '../hooks/useVideoCall';

test('should provide video call functionality', () => {
  const { result } = renderHook(() => useVideoCall());
  
  expect(result.current.isInCall).toBe(false);
  expect(typeof result.current.startCall).toBe('function');
});
```

### 3. Mock Testing
```typescript
// Mock Supabase for testing
jest.mock('../lib/supabase', () => ({
  supabase: {
    channel: jest.fn(() => ({
      on: jest.fn().mockReturnThis(),
      subscribe: jest.fn(),
      unsubscribe: jest.fn(),
    })),
  },
}));
```

## Migration from Context

### Previous Context Approach
```typescript
// Old approach with React Context
const VideoCallProvider = ({ children }) => {
  const [state, setState] = useState(initialState);
  // Complex state management logic
};
```

### Current Zustand Approach
```typescript
// New approach with Zustand
export const useVideoCallStore = create((set, get) => ({
  // Simplified state management
}));
```

### Benefits of Migration
1. **Performance**: Fewer re-renders with selective subscriptions
2. **Simplicity**: No provider wrapping or context drilling
3. **Debugging**: Better dev tools and state inspection
4. **Testing**: Easier to test with direct store access

## Best Practices

### 1. State Updates
```typescript
// Use functional updates for complex state
set((state) => ({
  ...state,
  remoteStreams: new Map(state.remoteStreams).set(participantId, stream)
}));
```

### 2. Error Boundaries
```typescript
// Wrap video components in error boundaries
<ErrorBoundary fallback={<VideoErrorFallback />}>
  <VideoBubbles />
</ErrorBoundary>
```

### 3. Cleanup Patterns
```typescript
// Always cleanup resources
useEffect(() => {
  return () => {
    const { cleanup } = useVideoCallStore.getState();
    cleanup();
  };
}, []);
```

---

This state management approach provides a robust, scalable foundation for TarotForge's video calling system while maintaining excellent performance and developer experience. 