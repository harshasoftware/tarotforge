# Video Call UI Testing Guide

## Quick Reference for Testing New Features

### Test Environment Setup
- **Local Development**: `http://localhost:5174/`
- **Test Devices**: Desktop + Mobile (or browser dev tools)
- **Multiple Tabs**: Simulate multiple participants

---

## Core Feature Tests

### 1. Auto-Start Video on Share

#### Test Steps:
1. Open reading room
2. Click **Share** button
3. Verify video call auto-starts
4. Check share modal content

#### Expected Results:
- ✅ Loading spinner appears for 500ms
- ✅ Video bubbles appear automatically
- ✅ Share modal shows "Video chat is now active!"
- ✅ Share text includes "with video chat"

#### Test Cases:
```
✓ First time sharing (video starts)
✓ Already sharing (modal opens directly)
✓ Permission denied (graceful fallback)
✓ Mobile vs Desktop behavior
```

### 2. Mobile Bubble Limit

#### Test Steps:
1. Open reading room on mobile device
2. Start video call (via share)
3. Have 3+ participants join
4. Verify only 2 bubbles show

#### Expected Results:
- ✅ Local bubble always visible
- ✅ Only first remote participant shown
- ✅ Counter shows "3+" format
- ✅ Desktop shows all participants

#### Test Cases:
```
✓ 2 participants (both visible)
✓ 3 participants (2 visible, counter shows "3+")
✓ 5 participants (2 visible, counter shows "5+")
✓ Desktop shows all participants
```

### 3. Participant Counter Logic

#### Test Steps:
1. Start with 1 participant
2. Add participants one by one
3. Check counter updates
4. Test on mobile vs desktop

#### Expected Results:
- ✅ Desktop: Always exact count
- ✅ Mobile ≤2: Exact count
- ✅ Mobile >2: Count with "+"

#### Test Matrix:
| Participants | Desktop Display | Mobile Display |
|-------------|----------------|----------------|
| 1           | "1 participants" | "1"           |
| 2           | "2 participants" | "2"           |
| 3           | "3 participants" | "3+"          |
| 5           | "5 participants" | "5+"          |

---

## UI Component Tests

### Share Button States

#### Test Sequence:
```
1. Initial: [Share] button visible
2. Click: [🔄] loading spinner
3. Video starts: [Share] + bubbles appear
4. Modal: Share dialog with video text
```

#### Verification Points:
- Button remains clickable after video starts
- Loading state lasts exactly 500ms
- Video bubbles appear smoothly
- Modal content mentions video chat

### Video Bubble Behavior

#### Desktop Tests:
```
✓ Unlimited bubbles (up to 8 participants)
✓ Grid layout for 4+ participants
✓ Horizontal layout for 1-3 participants
✓ Smooth positioning animations
✓ Draggable functionality works
```

#### Mobile Tests:
```
✓ Maximum 2 bubbles always
✓ Side-by-side positioning
✓ Touch-friendly drag controls
✓ Smaller bubble size (64px vs 128px)
✓ Counter shows overflow indication
```

### Bubble Positioning

#### Desktop Layout Tests:
- **1-3 participants**: Horizontal center alignment
- **4+ participants**: Grid layout with optimal spacing
- **Drag behavior**: Smooth movement, boundary constraints
- **Resize handling**: Responsive repositioning

#### Mobile Layout Tests:
- **2 participants**: Side-by-side (local + remote)
- **3+ participants**: Still only 2 bubbles visible
- **Touch targets**: Minimum 44px touch area
- **Drag constraints**: Stay within screen bounds

---

## Cross-Platform Testing

### Desktop Browser Tests
```
✓ Chrome (latest)
✓ Firefox (latest)
✓ Safari (latest)
✓ Edge (latest)
```

### Mobile Device Tests
```
✓ iOS Safari
✓ Android Chrome
✓ Mobile responsive (dev tools)
✓ Tablet landscape/portrait
```

### Feature Compatibility
```
✓ WebRTC support
✓ Camera/microphone permissions
✓ Native share API (mobile)
✓ Drag and drop functionality
```

---

## Error Scenario Tests

### Permission Handling
1. **Deny camera permission**
   - Expected: Graceful fallback, share still works
2. **Deny microphone permission**
   - Expected: Video-only mode or fallback
3. **No camera/microphone available**
   - Expected: Audio-only or text-only fallback

### Network Issues
1. **Poor connection**
   - Expected: Quality reduction, connection maintained
2. **Connection drops**
   - Expected: Reconnection attempt, user notification
3. **Firewall blocks WebRTC**
   - Expected: Fallback to share without video

### Browser Limitations
1. **WebRTC not supported**
   - Expected: Share works, video disabled
2. **Permissions API not available**
   - Expected: Manual permission request
3. **Native share not supported**
   - Expected: Fallback to copy link modal

---

## Performance Testing

### Mobile Performance
```
✓ Smooth 60fps animations
✓ No lag during bubble drag
✓ Quick video initialization (<2s)
✓ Low memory usage with 2 bubbles
✓ Battery impact minimal
```

### Desktop Performance
```
✓ Handles 8 participants smoothly
✓ Grid layout calculations efficient
✓ No frame drops during repositioning
✓ Memory usage scales reasonably
✓ CPU usage acceptable
```

### Network Performance
```
✓ Video quality adapts to bandwidth
✓ Graceful degradation on slow connections
✓ Efficient signaling (minimal data)
✓ Quick participant join/leave updates
```

---

## Accessibility Testing

### Keyboard Navigation
```
✓ Tab order: Share → Video controls → Bubbles
✓ Enter/Space activates buttons
✓ Escape closes modals
✓ Arrow keys for bubble positioning (optional)
```

### Screen Reader Support
```
✓ Share button announces video call feature
✓ Bubble labels read correctly
✓ Participant count announced
✓ Status changes announced
```

### Visual Accessibility
```
✓ High contrast mode support
✓ Focus indicators visible
✓ Text size respects user preferences
✓ Color-blind friendly indicators
```

---

## Integration Testing

### Session Management
```
✓ Video state syncs across participants
✓ Participant join/leave updates real-time
✓ Host privileges maintained
✓ Guest upgrade flow works with video
```

### Reading Room Integration
```
✓ Video doesn't interfere with card interactions
✓ Zoom/pan works with video bubbles
✓ Modal synchronization unaffected
✓ Share functionality enhanced, not broken
```

### Database Synchronization
```
✓ Video call state persists in session
✓ Participant list updates correctly
✓ Real-time updates via Supabase
✓ Cleanup on session end
```

---

## Regression Testing

### Existing Features
```
✓ Card flipping still works
✓ Interpretation generation unaffected
✓ Pan/zoom functionality intact
✓ Modal synchronization working
✓ Guest upgrade flow functional
```

### Share Functionality
```
✓ Native share still works on mobile
✓ Copy link functionality intact
✓ Share modal responsive design
✓ Link generation correct
```

### Video Call Features
```
✓ Manual video controls work
✓ Mute/unmute functionality
✓ Camera on/off toggle
✓ End call button works
✓ Permission handling robust
```

---

## Test Data & Scenarios

### Test User Accounts
- **Host**: Authenticated user with session creation rights
- **Participant 1**: Authenticated user joining session
- **Participant 2**: Guest user (anonymous)
- **Participant 3+**: Additional test accounts

### Test Sessions
- **Single card reading**: Quick test scenario
- **Three card spread**: Medium complexity
- **Celtic cross**: Full feature test
- **Free layout**: Custom positioning test

### Test Devices
- **Desktop**: 1920x1080, 2560x1440 resolutions
- **Mobile**: iPhone (375x812), Android (360x640)
- **Tablet**: iPad (768x1024), Android tablet

---

## Bug Report Template

### Video Call Auto-Start Issues
```
Title: [Component] - [Issue Description]
Steps to Reproduce:
1. 
2. 
3. 

Expected Result:
Actual Result:
Device/Browser:
Session ID:
Participant Count:
```

### Mobile Bubble Limit Issues
```
Title: Mobile Bubble Limit - [Issue Description]
Device: [iOS/Android/Browser]
Screen Size: [width x height]
Participant Count: [number]
Visible Bubbles: [number]
Counter Display: [text shown]
Expected: [what should happen]
Actual: [what actually happened]
```

### Performance Issues
```
Title: Performance - [Issue Description]
Device: [specifications]
Participant Count: [number]
Network: [connection type/speed]
Symptoms: [lag/freeze/crash/etc]
Duration: [how long issue persists]
Reproducible: [always/sometimes/once]
``` 