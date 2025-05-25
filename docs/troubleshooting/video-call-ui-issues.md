# Video Call UI Troubleshooting Guide

This guide covers common issues with video call UI display and provides debugging steps to resolve them.

## Common Issue: Guest Can't See Video Bubbles

### Problem Description

**Symptoms:**
- Guest joins a session with an active video call
- Browser requests camera/microphone permissions
- Permissions are granted successfully
- Guest appears in participant list
- **But no video bubbles or controls are visible**

**Console Logs:**
```
Joining existing session: d7ed0090-b53a-46d5-8113-c0beadc5f23e
Auto-sync evaluation: Object
Successfully joined session with complete state: Object
Found existing participant record: ad2a5a5b-3a78-4c4a-97df-f5c33d3da950
participantId set in store: ad2a5a5b-3a78-4c4a-97df-f5c33d3da950
```

### Root Cause

The issue occurs when:
1. ✅ Auto-join functionality works correctly (guest joins video call)
2. ✅ Permissions are granted and streams are established
3. ❌ **Video chat UI state (`showVideoChat`) is not automatically updated**

The guest is technically in the video call but the UI components (`VideoChat`) are not rendered because `showVideoChat` remains `false`.

### Solution Implemented

Added auto-show video chat functionality in `ReadingRoom.tsx`:

```typescript
// Auto-show video chat when user is in a video call
useEffect(() => {
  // Show video chat UI when:
  // 1. User is in a video call (isInVideoCall is true)
  // 2. Video chat UI is not already shown
  // 3. Not currently connecting (to avoid double-showing)
  if (isInVideoCall && !showVideoChat && !isVideoConnecting) {
    console.log('Auto-showing video chat UI - user is in video call');
    setShowVideoChat(true);
  }
  
  // Hide video chat UI when user leaves video call
  if (!isInVideoCall && showVideoChat && connectionStatus === 'disconnected') {
    console.log('Auto-hiding video chat UI - user left video call');
    setShowVideoChat(false);
  }
}, [isInVideoCall, showVideoChat, isVideoConnecting, connectionStatus]);
```

## Debugging Steps

### Step 1: Check Video Call State

Open browser console and check these values:

```javascript
// Check if user is in video call
console.log('isInVideoCall:', window.videoCallContext?.isInVideoCall);

// Check connection status
console.log('connectionStatus:', window.videoCallContext?.connectionStatus);

// Check if video chat UI is shown
console.log('showVideoChat:', document.querySelector('[data-video-chat]') !== null);
```

### Step 2: Verify Auto-Join Functionality

Look for these console logs:

```
✅ Auto-sync evaluation: { isActive: true, participants: [...], participantId: "...", ... }
✅ Auto-joining video call for participant: ad2a5a5b-3a78-4c4a-97df-f5c33d3da950
✅ Permissions granted
```

### Step 3: Check Auto-Show Trigger

Look for this console log:

```
✅ Auto-showing video chat UI - user is in video call
```

If missing, check:
- `isInVideoCall` should be `true`
- `showVideoChat` should be `false`
- `isVideoConnecting` should be `false`

### Step 4: Verify Component Rendering

Check if `VideoChat` component is in DOM:

```javascript
// Should find video chat component
console.log('VideoChat rendered:', document.querySelector('[data-testid="video-chat"]') !== null);

// Should find video bubbles
console.log('Video bubbles:', document.querySelectorAll('[data-testid="video-bubble"]').length);
```

## Manual Workarounds

### For Users

If video UI doesn't appear automatically:

1. **Refresh the page** - This will re-trigger auto-join
2. **Check browser permissions** - Ensure camera/mic access is granted
3. **Try manual join** - Look for video call controls in the interface

### For Developers

If debugging in development:

```javascript
// Manually trigger video chat UI
const readingRoom = document.querySelector('[data-component="reading-room"]');
if (readingRoom) {
  readingRoom.dispatchEvent(new CustomEvent('show-video-chat'));
}

// Force video call state
window.videoCallContext?.startCall('client', sessionId);
```

## Prevention Measures

### Code Review Checklist

When modifying video call functionality:

- [ ] Verify `isInVideoCall` state is properly updated
- [ ] Check that `showVideoChat` responds to video call state changes
- [ ] Test auto-join with guest accounts
- [ ] Verify UI state synchronization across participants
- [ ] Test permission flows on different browsers

### Testing Scenarios

1. **Guest Auto-Join Test:**
   - Host starts video call
   - Guest joins via invite link
   - Verify guest sees video UI automatically

2. **Permission Denial Test:**
   - Guest denies camera/mic permissions
   - Verify graceful fallback behavior
   - Check that UI still shows with permission prompts

3. **Multi-Participant Test:**
   - Multiple guests join active video call
   - Verify all see video bubbles for all participants
   - Test participant leave/join scenarios

## Related Issues

### Video Permissions but No Stream

**Symptoms:** Video UI shows but no video stream in bubbles

**Debug:**
```javascript
// Check local stream
console.log('Local stream:', window.videoCallContext?.localStream);

// Check remote streams
console.log('Remote streams:', window.videoCallContext?.remoteStreams);
```

**Common causes:**
- Camera blocked by other application
- Browser security restrictions
- WebRTC connection failures

### Video UI Shows but No Controls

**Symptoms:** Video bubbles visible but no mute/video toggle controls

**Debug:**
```javascript
// Check control state
console.log('Controls visible:', document.querySelector('[data-testid="video-controls"]') !== null);
```

**Common causes:**
- Mobile responsive layout issues
- Z-index conflicts
- Component state desynchronization

## Monitoring and Alerts

### Key Metrics to Track

1. **Auto-join success rate** - Percentage of guests who successfully auto-join
2. **UI state sync failures** - Cases where video call state and UI state diverge
3. **Permission grant rate** - How often users grant camera/mic permissions
4. **Video call completion rate** - Successful end-to-end video call sessions

### Alert Conditions

Set up alerts for:

- High rate of permission denials
- Auto-join failures exceeding 5%
- UI state desynchronization events
- WebRTC connection failures

## Version History

### v1.0 - Initial Implementation
- Basic video call functionality
- Manual UI state management

### v1.1 - Auto-Join Added
- Automatic video call joining for guests
- Session state synchronization

### v1.2 - Auto-Show UI Fix ⭐
- **Fixed guest video UI visibility issue**
- Added automatic `showVideoChat` state management
- Improved debugging and logging

### Future Enhancements

- Smart retry logic for failed auto-joins
- Bandwidth-aware video quality adjustment
- Advanced permission recovery flows
- Real-time connection quality monitoring 