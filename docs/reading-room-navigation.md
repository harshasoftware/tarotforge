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
- **View Cards Button**: Open card gallery (visible when cards are revealed)
- **Save Button**: Download reading as image

### Mobile-Specific Interactions

#### Touch Gestures
- **Single Tap**: Flip cards or activate revealed cards
- **Double Tap**: Open card gallery (revealed cards only)
- **Pinch to Zoom**: Scale reading area (0.5x to 2x)
- **Drag to Pan**: Move view when zoomed in
- **Card Dragging**: From deck pile to positions
- **Gallery Swipe**: Navigate between cards in full-screen gallery

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
- **Card Gallery**: Full-screen card viewer with swipe navigation
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
- **Double Click**: Open card gallery (revealed cards only)
- **Scroll Wheel + Ctrl/Cmd**: Zoom in/out
- **Drag**: Pan when zoomed, move cards
- **Hover**: Tooltips and visual feedback

#### Keyboard Interactions (Desktop)
- **Arrow Keys**: Pan the drawing area (up/down/left/right) or navigate gallery
- **Ctrl/Cmd + Scroll**: Zoom in/out
- **Escape**: Close description overlay, then gallery, then modals (hierarchical)
- **Tab**: Navigate through interactive elements

#### Zoom Controls (Desktop)
- **Position**: Top left corner
- **Layout**: Vertical stack with more spacing
- **Joypad**: Directional controls for panning (up/down/left/right)
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
- **Joypad Controls**: Visual directional panning controls

#### Interpretation (Desktop)
- **Split View**: Always 3/5 cards, 2/5 interpretation
- **Card Details**: Larger preview with full descriptions
- **Card Gallery**: Modal overlay with keyboard navigation
- **Joypad Controls**: Visual directional panning controls
- **Navigation**: Enhanced with keyboard support

## Card Gallery Feature

### Overview
The Card Gallery provides an immersive way to view and analyze individual cards in detail, with different implementations for mobile and desktop platforms.

### Mobile Gallery (Full-Screen)
- **Activation**: Double-tap on revealed cards or "View Cards" button
- **Layout**: Full-screen black background with card centered
- **Navigation**: 
  - Swipe left/right to navigate between cards
  - Tap left/right thirds of screen for navigation
  - Visual indicators on sides showing swipe direction
- **Controls**: 
  - Header with card name, position, description button, and close button
  - Footer with Previous/Next buttons and card counter
- **Content**: Large card image with basic description below
- **Description Feature**:
  - Description button (FileText icon) in header
  - Fetches detailed card meanings from API/database
  - Full-screen overlay with scrollable content
  - Different sources: Rider-Waite (traditional) vs custom decks
  - Close with X button or Escape key
- **Exit**: Close button or back gesture

### Desktop Gallery (Modal)
- **Activation**: Double-click on revealed cards or "View Cards" button
- **Layout**: Modal overlay with card-colored background
- **Navigation**: 
  - Keyboard arrows (left/right) for navigation
  - Click Previous/Next buttons
- **Controls**: 
  - Header with card details, description button, and close button
  - Footer with navigation controls and counter
- **Content**: Large card image (up to 480px height) with basic description
- **Description Feature**:
  - Description button (FileText icon) in header
  - Fetches detailed card meanings from API/database
  - Modal overlay with scrollable content
  - Different sources: Rider-Waite (traditional) vs custom decks
  - Close with X button or Escape key
- **Exit**: Escape key, close button, or click outside modal

### Gallery Navigation Logic
- **Card Selection**: Only revealed cards are included in gallery
- **Cycling**: Navigation wraps around (last card → first card)
- **State Preservation**: Gallery remembers position when reopened
- **Keyboard Support**: Arrow keys and Escape for desktop
- **Touch Support**: Swipe gestures for mobile

### Card Description System
- **Rider-Waite Decks**: Uses traditional interpretations stored locally
- **Custom Decks**: Fetches unique descriptions from `/api/cards/{cardId}/description`
- **Fallback Handling**: Uses card's basic description if API fails
- **Loading States**: Shows spinner while fetching descriptions
- **Error Handling**: Graceful fallback to existing card descriptions
- **Source Attribution**: Footer indicates description source (traditional vs custom)

### Interaction Patterns
- **Non-Interfering**: Gallery doesn't conflict with existing zoom/pan
- **Context-Aware**: Button only appears when cards are revealed
- **Responsive**: Adapts to device capabilities and screen size
- **Accessible**: Keyboard navigation and proper focus management
- **Progressive Enhancement**: Basic descriptions always available, detailed on demand

## Desktop Joypad Controls

### Overview
Desktop users have access to a visual directional control pad (joypad) integrated into the zoom controls panel for precise panning of the drawing area.

### Visual Design
- **Position**: Below zoom controls in left panel, aligned with zoom controls vertical axis
- **Layout**: Cross-shaped directional pad with center button
- **Size**: 56x56px design with larger touch targets
- **Styling**: Consistent with zoom control buttons, enhanced padding
- **Separators**: Visual dividers above and below joypad

### Directional Controls
- **Up Arrow**: Pan drawing area upward
- **Down Arrow**: Pan drawing area downward  
- **Left Chevron**: Pan drawing area leftward
- **Right Chevron**: Pan drawing area rightward
- **Center Button**: Reset pan position to center (0, 0)

### Functionality
- **Pan Step**: 50 pixels per button press
- **Max Range**: 200 pixels in any direction
- **Constraints**: Prevents over-panning beyond limits
- **Tooltips**: Show direction and keyboard shortcut
- **Hover States**: Visual feedback on button hover

### Keyboard Integration
- **Arrow Keys**: Mirror joypad functionality exactly
- **Priority**: Gallery navigation takes precedence when open
- **Context**: Only active during drawing and interpretation steps
- **Prevention**: Prevents default browser scroll behavior

### Use Cases
- **Precise Positioning**: Fine-tune view without mouse dragging
- **Accessibility**: Alternative to mouse-based panning
- **Consistency**: Predictable movement increments
- **Efficiency**: Quick repositioning with single clicks
- **Reset to Center**: Instantly return to default view position

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
3. **Touch Gestures**: Pinch, pan, tap, double-tap, swipe
4. **Card Gallery**: Full-screen viewing and swipe navigation
5. **Card Descriptions**: Fetch and display detailed card meanings
6. **Orientation Changes**: State preservation during rotation
7. **Safe Area Handling**: Notched devices and different screen sizes

### Desktop Test Cases
1. **Mouse Interactions**: Click, hover, drag behaviors
2. **Keyboard Navigation**: Tab order and shortcuts (including gallery and panning)
3. **Joypad Controls**: Directional panning button functionality
4. **Card Gallery Modal**: Modal behavior and keyboard controls
5. **Card Descriptions**: API integration and fallback handling
6. **Window Resizing**: Responsive behavior
7. **Zoom Levels**: Browser zoom compatibility
8. **Multi-Monitor**: Behavior across different displays

### Cross-Platform Test Cases
1. **State Synchronization**: Real-time updates between devices
2. **Session Sharing**: Join links work across platforms
3. **Feature Parity**: Core functionality available on both
4. **Card Description API**: Consistent behavior across platforms
5. **Performance**: Smooth animations and interactions
6. **Error Recovery**: Graceful handling of connection issues

### Description Feature Test Cases
1. **Rider-Waite Decks**: Verify traditional descriptions load instantly
2. **Custom Decks**: Test API calls to `/api/cards/{cardId}/description`
3. **Loading States**: Spinner appears during API requests
4. **Error Handling**: Fallback to basic description when API fails
5. **Network Offline**: Graceful degradation to cached descriptions
6. **Keyboard Navigation**: Escape key closes description overlay
7. **Source Attribution**: Footer shows correct description source
8. **Content Scrolling**: Long descriptions scroll properly
9. **State Persistence**: Description state resets when gallery closes
10. **Performance**: No lag when switching between cards with descriptions

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
- **Enhanced Gallery**: Zoom within gallery, card comparison view
- **Card Annotations**: Add notes and bookmarks to cards in gallery 