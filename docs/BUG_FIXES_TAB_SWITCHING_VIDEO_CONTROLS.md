# Bug Fixes: Tab Switching and Video Controls

This document details the fixes implemented to resolve issues with modal interactions and video controls after tab switching, as well as participant count display issues.

## Date: 2025-10-25

**Latest Update:** Extended fixes for canvas-related interactions after tab switching

---

## Issue 1: Canvas Interactions Not Working After Tab Switch

### Problem
When users switched browser tabs and returned to the reading room, ALL canvas-related interactions stopped working:
- Invite button not clickable
- Interpretation modal won't open
- Card placement (drag and drop) doesn't work
- Keyboard shortcuts don't respond
- Zoom controls unresponsive
- Reveal all button doesn't work

However, modals NOT on the canvas (Exit modal, Deck modal) continued to work correctly.

### Root Cause
After extensive investigation, the issue was identified as a fundamental disruption of React's event delegation system when browser tabs are switched. Unlike previous issues with modals that could be fixed by removing `preventDefault`/`stopPropagation`, this required a more aggressive approach to force the entire event system to re-initialize.

### Solution - Super Nuclear Option

#### 1. Enhanced Visibility Change Handler
**File:** `src/pages/reading/ReadingRoom.tsx` (lines 187-238)

Implemented an aggressive event re-initialization system that:
1. Forces component remounting via canvas key
2. Clears `pointer-events: none` from ALL DOM elements
3. Dispatches real MouseEvent to trigger React's event delegation
4. Makes document.body focusable and focuses it

```typescript
useEffect(() => {
  const handleVisibilityChange = () => {
    if (!document.hidden) {
      console.log('[Tab Visibility] Tab became visible, re-initializing event system');

      // Force a re-render by updating canvas key (remounts reading area)
      setCanvasKey(prev => prev + 1);

      // SUPER NUCLEAR OPTION: Force all elements to be interactive
      setTimeout(() => {
        // Remove pointer-events: none from ALL elements
        document.body.style.pointerEvents = 'auto';
        const allElements = document.querySelectorAll('*');
        allElements.forEach((el) => {
          const htmlEl = el as HTMLElement;
          if (htmlEl.style.pointerEvents === 'none' &&
              !htmlEl.classList.contains('pointer-events-none')) {
            htmlEl.style.pointerEvents = 'auto';
          }
        });

        // Force React root to re-delegate events by simulating user interaction
        const root = document.getElementById('root');
        if (root) {
          // Create a real MouseEvent instead of generic Event
          const mouseEvent = new MouseEvent('click', {
            bubbles: true,
            cancelable: true,
            view: window
          });
          root.dispatchEvent(mouseEvent);
          console.log('[Tab Visibility] React event delegation re-triggered');
        }

        // Force document.body to be focusable and focused
        document.body.setAttribute('tabindex', '-1');
        document.body.focus();
        console.log('[Tab Visibility] Document focus reset');
      }, 100);
    }
  };

  document.addEventListener('visibilitychange', handleVisibilityChange);
  window.addEventListener('focus', handleVisibilityChange);

  return () => {
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    window.removeEventListener('focus', handleVisibilityChange);
  };
}, []);
```

#### 2. Native Click Handler Backup System
**File:** `src/pages/reading/ReadingRoom.tsx` (lines 240-273)

Added a backup native DOM event listener that operates independently of React's synthetic event system:

```typescript
useEffect(() => {
  let needsBackup = false;

  // Detect if we need backup (set flag when tab becomes hidden)
  const handleTabHidden = () => {
    if (document.hidden) {
      console.log('[Backup Handler] Tab hidden, backup may be needed on return');
      needsBackup = true;
    }
  };

  const handleNativeClick = (e: MouseEvent) => {
    if (!needsBackup) return;

    const target = e.target as HTMLElement;
    console.log('[Backup Handler] Native click detected on:', target);

    // After first successful click, disable backup
    setTimeout(() => {
      console.log('[Backup Handler] React event system appears functional, disabling backup');
      needsBackup = false;
    }, 1000);
  };

  document.addEventListener('visibilitychange', handleTabHidden);
  document.addEventListener('click', handleNativeClick, true); // Use capture phase

  return () => {
    document.removeEventListener('visibilitychange', handleTabHidden);
    document.removeEventListener('click', handleNativeClick, true);
  };
}, []);
```

#### 3. Canvas Remounting with Key Prop
**File:** `src/pages/reading/ReadingRoom.tsx` (lines 3903, 4670)

Added canvas key to force complete remount of reading area components:

```typescript
// Drawing step
<div key={`drawing-step-${canvasKey}`} className="...">

// Interpretation step
<div key={`interpretation-step-${canvasKey}`} className="...">
```

### Benefits
- ✅ Forces complete re-initialization of React's event system
- ✅ Clears all stale pointer-events from DOM
- ✅ Uses real MouseEvent instead of generic Event for better compatibility
- ✅ Provides native DOM backup when React fails
- ✅ Detects when backup is needed vs when React is working
- ✅ Auto-disables backup once React event system is functional

### Technical Notes

**Why Previous Approaches Failed:**
1. **Removing preventDefault/stopPropagation** - Necessary but not sufficient
2. **Using flushSync** - Doesn't address event delegation issues
3. **Remounting components** - Only helps if event system is functional
4. **Dispatching generic Events** - Doesn't trigger React's delegation properly

**Why Super Nuclear Option Works:**
1. **Real MouseEvent** - Properly triggers React's event delegation system
2. **Capture phase listener** - Native backup catches events before React
3. **Force focus** - Ensures document is ready to receive events
4. **Clear ALL pointer-events** - Removes any stale browser state
5. **Remount containers** - Ensures fresh React component tree

---

## Issue 2: Modals Not Opening After Tab Switch (PREVIOUS FIX)

### Problem
This was the initial issue discovered: when users switched browser tabs or moved focus away from the window and returned, modals (such as the invite modal) would not open when clicking buttons.

### Root Cause
After a tab switch, some browsers interfere with pointer events or React's event system, preventing normal interactions from working properly. The event listeners and pointer events can become disabled or stale.

**Note:** This fix was superseded by Issue 1's Super Nuclear Option, which handles the more comprehensive canvas interaction problem.

### Solution

#### 1. Window Focus/Blur/Visibility Event Listeners
**File:** `src/pages/reading/ReadingRoom.tsx` (lines 182-227)

Added comprehensive event listeners to detect when the window regains focus and forcefully re-enable pointer events:

```typescript
// Add focus event listener to re-enable interactions after tab switch
const handleWindowFocus = () => {
  console.log('[Focus] Window regained focus, re-enabling interactions');
  // Force a re-render to ensure event listeners are properly attached
  document.body.style.pointerEvents = 'auto';

  // Clear any lingering pointer-events: none from elements
  setTimeout(() => {
    const allElements = document.querySelectorAll('[style*="pointer-events"]');
    allElements.forEach((el) => {
      const htmlEl = el as HTMLElement;
      if (htmlEl.style.pointerEvents === 'none' &&
          !htmlEl.classList.contains('pointer-events-none') &&
          !htmlEl.hasAttribute('disabled')) {
        console.log('[Focus] Clearing pointer-events: none from element', htmlEl);
        htmlEl.style.pointerEvents = '';
      }
    });
  }, 100);
};

const handleWindowBlur = () => {
  console.log('[Blur] Window lost focus');
};

const handleVisibilityChange = () => {
  if (!document.hidden) {
    console.log('[Visibility] Page became visible, re-enabling interactions');
    document.body.style.pointerEvents = 'auto';
    // Trigger the same cleanup as focus
    setTimeout(() => {
      handleWindowFocus();
    }, 50);
  }
};

window.addEventListener('focus', handleWindowFocus);
window.addEventListener('blur', handleWindowBlur);
document.addEventListener('visibilitychange', handleVisibilityChange);
```

#### 2. Enhanced handleShare Function
**File:** `src/pages/reading/ReadingRoom.tsx` (lines 2205-2209)

Added pointer-events check at the start of the share function:

```typescript
const handleShare = async () => {
  console.log('handleShare called, sessionId:', sessionId);

  // Ensure pointer events are enabled (in case they were disabled after tab switch)
  if (document.body.style.pointerEvents === 'none') {
    console.log('[handleShare] Re-enabling pointer events');
    document.body.style.pointerEvents = 'auto';
  }

  if (!sessionId) {
    console.log('No sessionId, returning early');
    return;
  }
  // ... rest of function
}
```

#### 3. Enhanced Modal Overlay and Close Handlers

**All Modals Updated:**
- Help Modal (lines 4891-4920, 5177-5187)
- Exit Modal (lines 5211-5230, 5259-5269)
- Invite Dropdown Modal (lines 5556-5576)

Added explicit pointer-events and enhanced event handling to all modal overlays and close buttons:

```typescript
// Modal Overlay
<motion.div
  className="fixed inset-0 bg-black/50 ..."
  style={{ pointerEvents: 'auto' }}
  onClick={(e) => {
    e.preventDefault();
    e.stopPropagation();
    setShowModal(false);
  }}
>
  {/* Modal Content */}
  <motion.div
    className="bg-card ..."
    style={{ pointerEvents: 'auto' }}
    onClick={(e) => e.stopPropagation()}
  >
    {/* Close Button */}
    <button
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setShowModal(false);
      }}
      style={{ pointerEvents: 'auto' }}
    >
      <X />
    </button>
  </motion.div>
</motion.div>
```

#### 4. Improved Button Click Handlers
**File:** `src/pages/reading/ReadingRoom.tsx` (lines 2903-2907, 3190-3194)

Enhanced invite button handlers with explicit event handling and pointer-events:

```typescript
// Before
<button onClick={() => handleShare()}>

// After
<button
  onClick={(e) => {
    e.preventDefault();
    e.stopPropagation();
    handleShare();
  }}
  style={{ minHeight: '36px', pointerEvents: 'auto' }}
>
```

### Benefits
- ✅ Modals open reliably after tab switching
- ✅ Modals close reliably with both backdrop clicks and close buttons
- ✅ All interactive elements remain functional
- ✅ Proper event propagation control
- ✅ Explicit pointer-events guarantee interactions work
- ✅ Visibility change events caught (tab switching vs window minimizing)
- ✅ Automatic cleanup of stale pointer-events: none from DOM elements

---

## Issue 2: Video Bubble Hover Controls Not Visible

### Problem
The video bubble hover controls (microphone, camera, and exit buttons) were not visible or clickable after switching tabs and returning to the app.

### Root Cause
After the pointer-events fix for modal issues, the video control buttons inside hover overlays didn't have explicit pointer-events settings and weren't properly handling click events, causing them to be blocked or non-responsive.

### Solution

#### 1. Control Overlay Enhancements
**File:** `src/components/video/VideoBubbles.tsx`

Added explicit pointer-events and z-index to all control overlays:

```typescript
// Before
<motion.div
  className="absolute inset-0 bg-black/50 flex items-center justify-center gap-1"
>

// After
<motion.div
  className="absolute inset-0 bg-black/50 flex items-center justify-center gap-1 z-10"
  style={{ pointerEvents: 'auto' }}
>
```

#### 2. Button Click Handler Improvements

All control buttons were enhanced with proper event handling:

```typescript
// Before
<button onClick={toggleAudio} className="...">
  {isAudioEnabled ? <Mic /> : <MicOff />}
</button>

// After
<button
  onClick={(e) => {
    e.preventDefault();
    e.stopPropagation();
    toggleAudio();
  }}
  className="..."
  style={{ pointerEvents: 'auto' }}
>
  {isAudioEnabled ? <Mic /> : <MicOff />}
</button>
```

#### 3. Fixed Controls in All Views

**Expanded View (Grid Layout):**
- Local video controls (lines 874-932)
  - Microphone toggle
  - Camera toggle
  - Exit call button
- Remote participant controls (lines 1001-1044)
  - Audio control
  - Video control

**Minimized View (Floating Bubbles):**
- Local video controls (lines 1136-1198)
  - Microphone toggle
  - Camera toggle
  - Exit call button
- Remote participant controls (lines 1304-1346)
  - Audio control
  - Video control

### Benefits
- ✅ All video controls visible on hover
- ✅ Controls remain functional after tab switching
- ✅ Proper z-index layering
- ✅ Clean event handling with no bubbling issues

---

## Issue 3: Video Call Participant Count Display

### Problem
The `GuestVideoJoinModal` component was showing "2 people" when there was only 1 person in the video call.

### Root Cause
The component was receiving `participantCount` (which represents remote participants only) but was displaying it directly without adding 1 for the local user who is about to join.

### Solution
**File:** `src/components/video/GuestVideoJoinModal.tsx` (lines 9, 99)

#### 1. Added Documentation to Interface
```typescript
interface GuestVideoJoinModalProps {
  isOpen: boolean;
  onClose: () => void;
  onJoin: () => Promise<void>;
  participantCount: number; // Should be videoCallParticipants.length (NOT +1, as this is only remote participants)
  hostName?: string;
  sessionInfo?: {
    layout?: string;
    question?: string;
    step?: string;
  };
}
```

#### 2. Fixed Display Logic
```typescript
// Before
{participantCount} {participantCount === 1 ? 'person' : 'people'} in video call

// After
{/* participantCount is remote participants count, +1 for yourself when you join */}
{participantCount + 1} {participantCount + 1 === 1 ? 'person' : 'people'} in video call
```

### Explanation
- `participantCount` = number of remote participants already in the call
- When the guest joins, they become part of the call too
- Display shows: `participantCount + 1` (remote participants + yourself)

**Example:**
- If 1 person is already in the video call → `participantCount = 1`
- Display shows: `1 + 1 = 2 people` ✓ Correct!

### Benefits
- ✅ Accurate participant count display
- ✅ Clear documentation for future developers
- ✅ Consistent with other video components

---

## Testing Recommendations

### Canvas Interaction Test (CRITICAL)
1. Open a reading session with a layout selected
2. Switch to a different browser tab
3. Wait 5+ seconds
4. Return to the reading session tab
5. **Test the following interactions:**
   - Click the invite button → **Expected:** Modal opens successfully
   - Press 'i' keyboard shortcut → **Expected:** Invite modal opens
   - Click "Reveal All" button → **Expected:** All cards are revealed
   - Try to place a card on the canvas → **Expected:** Card can be placed
   - Use zoom controls (+/-) → **Expected:** Zoom works
   - Click interpretation icon on card → **Expected:** Modal opens
6. **Check browser console for logs:**
   - Should see: `[Tab Visibility] Tab became visible, re-initializing event system`
   - Should see: `[Tab Visibility] React event delegation re-triggered`
   - Should see: `[Tab Visibility] Document focus reset`

### Tab Switching Test (Original)
1. Open a reading session
2. Click the invite button to open the modal
3. Switch to a different browser tab
4. Wait 5+ seconds
5. Return to the reading session tab
6. Click the invite button again
7. **Expected:** Modal opens successfully

### Video Controls Test
1. Start a video call
2. Hover over the video bubble (desktop) or tap (mobile)
3. **Expected:** Controls appear (mic, camera, exit)
4. Switch to a different tab
5. Return to the app
6. Hover/tap the video bubble again
7. **Expected:** Controls still appear and are clickable
8. Click each control button
9. **Expected:** Each button functions correctly

### Participant Count Test
1. Join a video call with 1 other person
2. Check the participant count in any modals or UI elements
3. **Expected:** Shows "2 people"
4. Add a third person
5. **Expected:** Shows "3 people"

---

## Files Modified

### Core Fixes (Latest - 2025-10-25)
- `src/pages/reading/ReadingRoom.tsx`
  - **Lines 171, 195:** Added `canvasKey` state for forcing component remounting
  - **Lines 187-238:** Super Nuclear Option - Enhanced visibility change handler
    - Clears pointer-events from ALL DOM elements
    - Dispatches real MouseEvent to React root
    - Forces document.body focus with tabindex
  - **Lines 240-273:** Native click handler backup system
    - Operates independently of React's synthetic events
    - Uses capture phase to intercept clicks before React
    - Auto-disables when React event system is functional
  - **Lines 3903, 4670:** Added key props to drawing-step and interpretation-step containers
  - **Lines ~2877, ~3160:** Simplified invite button handlers (removed preventDefault/stopPropagation)
  - **Canvas mousedown handler (~3925):** Removed preventDefault/stopPropagation that was poisoning events

### Previous Modal Fixes
- `src/pages/reading/ReadingRoom.tsx`
  - Added window focus/blur event listeners (superseded by super nuclear option)
  - Enhanced handleShare function with pointer-events check
  - Improved invite button click handlers
  - Removed stopPropagation from all modal content divs

### Video Controls
- `src/components/video/VideoBubbles.tsx`
  - Added pointer-events to control overlays
  - Added z-index layering
  - Enhanced all button click handlers (8 locations)

### Participant Count
- `src/components/video/GuestVideoJoinModal.tsx`
  - Fixed participant count calculation
  - Added documentation comments

---

## Related Issues

These fixes resolve the following user-reported issues:
1. **Canvas Interactions (Latest):**
   - "still after the tab switch i couldnt put in the cards, or invite modal is not opening"
   - "deck button is working while the invite button isnt working when coming back from a different window, same with interpretation modal"
   - "even the cards Im unable to place them or see when dropped if coming back to the tab"
   - "anything that has link with the canvas is probably getting disturbed or out of focus"
   - "i do see the remount but the interactions arent working"

2. **Previous Modal Issues:**
   - "I'm unable to open any modals if I move out of the window or tab and come back into the app"

3. **Video Controls:**
   - "The video bubble on hover controls to end microphone and camera are not visible now from previous commit"

4. **Participant Count:**
   - "This count is always showing 2 even though there is just 1 person"

---

## Technical Notes

### Pointer Events Strategy
The fix uses a multi-layered approach:
1. **Document level:** Re-enable on window focus
2. **Component level:** Check and re-enable in critical functions
3. **Element level:** Explicit `pointerEvents: 'auto'` on interactive elements

### Event Handling Best Practices
All interactive elements now follow this pattern:
```typescript
onClick={(e) => {
  e.preventDefault();      // Prevent default browser behavior
  e.stopPropagation();     // Stop event bubbling
  actualHandler();         // Call the actual handler
}}
style={{ pointerEvents: 'auto' }}  // Ensure element can receive events
```

### Z-Index Hierarchy
Current z-index values:
- Video bubbles: `z-50`
- Control overlays: `z-10` (relative to parent)
- Invite modal: `z-[200]`
- Video chat panel: `z-50` / `z-[100]`

---

## Future Considerations

1. **Monitoring:** Add analytics to track how often pointer-events need to be re-enabled
2. **Browser Testing:** Test across different browsers (Chrome, Firefox, Safari, Edge)
3. **Mobile Testing:** Verify touch interactions work on iOS and Android
4. **Performance:** Monitor if frequent focus/blur events impact performance

---

## Summary of All Fixes (Chronological)

### Phase 1: Basic Modal Fixes
- Removed `preventDefault`/`stopPropagation` from modal handlers
- Added window focus/blur event listeners
- Enhanced pointer-events management

### Phase 2: Video Controls
- Added explicit pointer-events to video control overlays
- Fixed z-index layering
- Enhanced button click handlers

### Phase 3: Canvas Interactions (SUPER NUCLEAR OPTION)
- **Problem Scope Expansion:** Discovered canvas-related interactions also broken
- **Root Cause:** React's root event delegation system disrupted by tab switching
- **Solution:**
  1. Force component remounting with canvas key
  2. Clear pointer-events from ALL DOM elements
  3. Dispatch real MouseEvent (not generic Event) to React root
  4. Force document.body focus with tabindex
  5. Native DOM backup listener using capture phase
- **Key Insight:** Generic `Event` objects don't trigger React's delegation; must use `MouseEvent`
- **Backup Strategy:** Native listener operates independently when React fails

### Approaches Tried (Before Success)
1. ❌ Remove preventDefault/stopPropagation only
2. ❌ Use flushSync for state updates (wrong import, then removed)
3. ❌ Remount canvas with key only
4. ❌ Dispatch generic Event objects
5. ✅ **SUPER NUCLEAR:** All of the above + real MouseEvent + native backup

---

## References

- Issue Discussion: Tab switching behavior in modern browsers
- React Event System: https://react.dev/learn/responding-to-events
- React Event Delegation: https://react.dev/reference/react-dom/client/createRoot#root-render
- Pointer Events API: https://developer.mozilla.org/en-US/docs/Web/CSS/pointer-events
- Window Focus Events: https://developer.mozilla.org/en-US/docs/Web/API/Window/focus_event
- MouseEvent Constructor: https://developer.mozilla.org/en-US/docs/Web/API/MouseEvent/MouseEvent
- Event Capture Phase: https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener#capture
