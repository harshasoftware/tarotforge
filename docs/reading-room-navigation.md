# Reading Room Navigation Patterns

This document outlines the navigation patterns and user flows for the Reading Room component across mobile and desktop platforms.

## Overview

The Reading Room has multiple states and navigation patterns that differ between mobile and desktop interfaces. The main flow consists of:

1. **Deck Selection** → 2. **Layout Setup** → 3. **Ask Question (Optional)** → 4. **Drawing Cards** → 5. **Interpretation**

## Mobile Navigation Patterns

### Top Controls Layout
- **Position**: Fixed at top of screen with safe area insets
- **Layout**: Horizontal flex with left and right sections
- **Responsive**: Adjusts for landscape/portrait orientation

#### Left Section (Mobile)
- **Back Button**: Context-sensitive navigation
  - During interpretation overlay: Close interpretation
  - During ask-question step: Back to setup
  - During interpretation step: Back to drawing
  - Default: Exit to Collection/Home
- **Layout Selector**: Shows current layout with card count when active
  - Dropdown with all available layouts
  - Card count indicator (e.g., "3/3" or "5/∞")

#### Right Section (Mobile)
- **Offline Indicator**: Animated warning when offline
- **Deck Change Button**: Switch decks mid-session
- **Guest Upgrade Button**: Visible for unauthenticated users
- **Share Button**: Native share API or modal fallback
- **Video Chat Button**: Start/join video call
- **Save Button**: Download reading as image

### Mobile-Specific Interactions

#### Touch Gestures
- **Single Tap**: Flip cards or activate revealed cards
- **Double Tap**: Zoom to card and activate (revealed cards only)
- **Pinch to Zoom**: Scale reading area (0.5x to 2x)
- **Drag to Pan**: Move view when zoomed in
- **Card Dragging**: From deck pile to positions

#### Zoom Controls (Mobile)
- **Position**: Left side, vertical stack, middle of screen
- **Controls**: Zoom In, Reset, Zoom Out, Shuffle, Help, Reset Cards
- **Visibility**: Always visible during drawing/interpretation

#### Deck Pile (Mobile)
- **Layout**: Horizontal scrollable fan spread
- **Position**: Bottom center of screen
- **Interaction**: Swipe to browse all 78 cards
- **Visual**: Shallow arc with card count indicator

### Mobile State-Specific Navigation

#### Deck Selection (Mobile)
- **Layout**: Full screen modal overlay
- **Tabs**: My Collection / Marketplace
- **Grid**: 2 columns, responsive
- **Actions**: Tap to select deck

#### Setup (Mobile)
- **Layout**: Centered modal with deck info
- **Content**: Deck preview + layout options
- **Actions**: Tap layout to proceed

#### Ask Question (Mobile)
- **Layout**: Centered modal
- **Categories**: 2-column grid of life areas
- **Generated Questions**: Vertical list
- **Custom Input**: Expandable text field

#### Drawing (Mobile)
- **Interpretation Button**: Top right when reading complete
- **Help Hint**: Auto-shows on first visit with pinch tips
- **Card Positions**: Touch-optimized drop zones

#### Interpretation (Mobile)
- **Portrait Mode**: Full screen interpretation overlay
- **Landscape Mode**: Split view (3/5 cards, 2/5 interpretation)
- **Card Navigation**: Previous/Next buttons
- **Back Actions**: Context-sensitive based on mode

## Desktop Navigation Patterns

### Top Controls Layout
- **Position**: Fixed at top with larger margins
- **Layout**: Horizontal flex with more spacing
- **Session Info**: Displays room details and participant count

#### Left Section (Desktop)
- **Exit Button**: Always returns to Collection/Home
- **Layout Selector**: Larger dropdown with descriptions
- **Session Info**: Room title, deck info, participant count

#### Right Section (Desktop)
- **All Controls Visible**: No space constraints
- **Tooltips**: Hover descriptions for all buttons
- **Larger Touch Targets**: Better for mouse interaction

### Desktop-Specific Interactions

#### Mouse Interactions
- **Click**: Flip cards or activate
- **Double Click**: Activate revealed cards
- **Scroll Wheel + Ctrl/Cmd**: Zoom in/out
- **Drag**: Pan when zoomed, move cards
- **Hover**: Tooltips and visual feedback

#### Zoom Controls (Desktop)
- **Position**: Top left corner
- **Layout**: Vertical stack with more spacing
- **Additional**: Shuffle button always visible

#### Deck Pile (Desktop)
- **Layout**: Wide fan spread showing all cards
- **Position**: Bottom center
- **Interaction**: Hover to lift, drag to place
- **Visual**: Gentle arc with larger cards

### Desktop State-Specific Navigation

#### Deck Selection (Desktop)
- **Layout**: Large modal with more content
- **Tabs**: Enhanced with better descriptions
- **Grid**: 4 columns with larger previews
- **Details**: Expanded deck information

#### Setup (Desktop)
- **Layout**: Centered with more padding
- **Content**: Larger deck preview and descriptions
- **Hover States**: Enhanced visual feedback

#### Drawing (Desktop)
- **Interpretation Button**: Larger with text labels
- **Tooltips**: Comprehensive help system
- **Precise Positioning**: Mouse-accurate drop zones

#### Interpretation (Desktop)
- **Split View**: Always 3/5 cards, 2/5 interpretation
- **Card Details**: Larger preview with full descriptions
- **Navigation**: Enhanced with keyboard support

## Navigation States and Transitions

### State Flow
```
Deck Selection → Setup → Ask Question → Drawing → Interpretation
     ↑            ↑         ↑           ↑          ↑
     └────────────┴─────────┴───────────┴──────────┘
                    (Reset Reading)
```

### Context-Sensitive Back Navigation

#### Mobile Back Button Behavior
- **Interpretation Overlay**: → Close overlay (stay in interpretation)
- **Ask Question Step**: → Setup
- **Interpretation Step**: → Drawing
- **All Other States**: → Exit to Collection/Home

#### Desktop Back Navigation
- **Consistent**: Always exits to Collection/Home
- **Additional**: Close buttons on modals and overlays

### URL and Session Management

#### URL Patterns
- `/reading-room` - No deck selected
- `/reading-room/{deckId}` - Deck selected
- `/reading-room/{deckId}?join={sessionId}` - Join session
- `/reading-room?join={sessionId}` - Join without deck

#### Session State Persistence
- **Local Storage**: Question cache, offline sessions
- **URL Updates**: Preserve session ID and deck selection
- **State Sync**: Real-time updates across participants

## Error States and Recovery

### Navigation During Errors
- **Deck Loading Failed**: Return to deck selection
- **Session Connection Lost**: Show offline mode
- **Invalid Session ID**: Create new session or return home

### Offline Mode Navigation
- **Indicator**: Prominent offline badge
- **Sync Button**: Manual sync when connection restored
- **Limited Features**: Some actions disabled

## Accessibility Considerations

### Mobile Accessibility
- **Touch Targets**: Minimum 44px touch targets
- **Safe Areas**: Respect device safe area insets
- **Orientation**: Support both portrait and landscape
- **Gestures**: Alternative navigation for gesture-impaired users

### Desktop Accessibility
- **Keyboard Navigation**: Tab order and focus management
- **Screen Readers**: Proper ARIA labels and descriptions
- **High Contrast**: Respect system preferences
- **Zoom**: Support browser zoom up to 200%

## Testing Scenarios

### Mobile Test Cases
1. **Portrait Navigation**: All states in portrait mode
2. **Landscape Navigation**: Split view behavior
3. **Touch Gestures**: Pinch, pan, tap, double-tap
4. **Orientation Changes**: State preservation during rotation
5. **Safe Area Handling**: Notched devices and different screen sizes

### Desktop Test Cases
1. **Mouse Interactions**: Click, hover, drag behaviors
2. **Keyboard Navigation**: Tab order and shortcuts
3. **Window Resizing**: Responsive behavior
4. **Zoom Levels**: Browser zoom compatibility
5. **Multi-Monitor**: Behavior across different displays

### Cross-Platform Test Cases
1. **State Synchronization**: Real-time updates between devices
2. **Session Sharing**: Join links work across platforms
3. **Feature Parity**: Core functionality available on both
4. **Performance**: Smooth animations and interactions
5. **Error Recovery**: Graceful handling of connection issues

## Performance Considerations

### Mobile Optimizations
- **Touch Response**: < 100ms touch feedback
- **Animation Performance**: 60fps animations
- **Memory Usage**: Efficient image loading and caching
- **Battery Impact**: Minimize background processing

### Desktop Optimizations
- **Hover States**: Immediate visual feedback
- **Smooth Scrolling**: Hardware-accelerated animations
- **Large Displays**: Proper scaling for high-DPI screens
- **Multi-tasking**: Efficient when not in focus

## Future Enhancements

### Planned Navigation Improvements
- **Breadcrumb Navigation**: Show current step in flow
- **Quick Actions**: Floating action button for common tasks
- **Gesture Customization**: User-configurable gestures
- **Voice Navigation**: Voice commands for accessibility
- **Progressive Web App**: Native app-like navigation 