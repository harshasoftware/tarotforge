# Video System Module

## Overview

The Video System module provides multi-party video calling capabilities integrated with TarotForge's collaborative reading sessions. This system enables real-time video communication between hosts and participants during tarot readings.

## Key Features

- **Multi-party Video Calls**: Support for multiple participants in video sessions
- **Session Integration**: Seamless integration with reading sessions
- **Auto-synchronization**: Automatic video call initiation when sharing sessions
- **UI Controls**: Comprehensive video call interface and controls
- **Real-time Communication**: WebRTC-based video and audio streaming

## Module Documentation

### 📋 [Multi-party Video Implementation](./multi-party-video-implementation.md)
**Core video calling system architecture and implementation**
- WebRTC integration patterns
- Multi-participant management
- Video stream handling
- Connection management

### 🔄 [Video Call Auto-synchronization](./video-call-auto-synchronization.md)
**Automatic video call initiation and session linking**
- Auto-start video when sharing sessions
- Auto-show video UI for participants
- Session-video call synchronization
- Participant management during calls

### 🎯 [Video Call Interaction Flows](./video-call-interaction-flows.md)
**User interaction patterns and workflows**
- Call initiation flows
- Participant joining processes
- Call management workflows
- Error handling scenarios

### 🧪 [Video Call Testing Guide](./video-call-testing-guide.md)
**Comprehensive testing strategies for video functionality**
- Unit testing approaches
- Integration testing scenarios
- Manual testing procedures
- Performance testing guidelines

### 🎨 [Video Call UI Interactions](./video-call-ui-interactions.md)
**User interface design and interaction patterns**
- Video call controls and layout
- Responsive design considerations
- Accessibility features
- Mobile optimization

## Quick Start

### 1. Video Call Integration
```typescript
// Start video call when sharing session
const handleShare = async () => {
  if (!showVideoChat && !isVideoConnecting) {
    setIsVideoConnecting(true);
    setTimeout(() => {
      setIsVideoConnecting(false);
      setShowVideoChat(true);
    }, 500);
  }
};
```

### 2. Video State Management
```typescript
// Video call state in session store
videoCallState: {
  isActive: boolean;
  sessionId: string | null;
  hostParticipantId: string | null;
  participants: string[];
}
```

## Related Code Files

### Core Implementation
- Video call components and hooks
- WebRTC integration utilities
- Video session management
- Stream handling logic

### UI Components
- Video call interface components
- Control panels and buttons
- Participant video grids
- Mobile-responsive layouts

## Testing

### Manual Testing Checklist
- [ ] Video calls start automatically when sharing
- [ ] Multiple participants can join video calls
- [ ] Video and audio quality is acceptable
- [ ] UI controls work correctly
- [ ] Mobile video calling functions properly

### Performance Considerations
- Video stream quality optimization
- Bandwidth usage monitoring
- Connection stability testing
- Multi-participant scalability

## Troubleshooting

### 🔧 [Video Call UI Troubleshooting Guide](../../troubleshooting/video-call-ui-issues.md)
**Comprehensive troubleshooting for video call UI issues**
- Guest video UI visibility problems
- Auto-join and auto-show debugging
- Permission and stream issues
- UI state synchronization problems

### Common Issues
1. **Video not starting** → Check WebRTC permissions and setup
2. **Poor video quality** → Verify bandwidth and connection
3. **Participants can't join** → Check session synchronization
4. **Guest can't see video UI** → See troubleshooting guide above

---

This module enables rich video communication experiences within TarotForge's collaborative reading environment. 