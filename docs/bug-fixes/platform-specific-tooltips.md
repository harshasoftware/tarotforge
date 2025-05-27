# Platform-Specific Tooltip Shortcuts Implementation

## Overview
Updated all tooltips in the drawing step to show platform-specific keyboard shortcuts instead of showing both Cmd and Ctrl in one tooltip, providing a better user experience across different operating systems.

## Implementation Details

### Helper Function
Added a `getPlatformShortcut()` helper function that detects the user's platform using `navigator.platform.toLowerCase().includes('mac')` and returns the appropriate shortcut text:

```typescript
const getPlatformShortcut = (key: string, withModifier = false): string => {
  const isMac = navigator.platform.toLowerCase().includes('mac');
  
  switch (key) {
    case 'help':
      return isMac ? 'H' : 'F1';
    case 'reset':
      return withModifier ? (isMac ? 'Cmd+R' : 'Ctrl+R') : 'R';
    default:
      return key;
  }
};
```

### Updated Tooltips

#### Drawing Step Tooltips
1. **Show Help**: `"Show help (H)"` → `"Show help (${getPlatformShortcut('help')})"`
   - Mac: "Show help (H)"
   - Windows/Linux: "Show help (F1)"

2. **Reset Cards**: `"Reset cards (Cmd+R / Ctrl+R)"` → `"Reset cards (${getPlatformShortcut('reset', true)})"`
   - Mac: "Reset cards (Cmd+R)"
   - Windows/Linux: "Reset cards (Ctrl+R)"

#### Interpretation Step Tooltips
Same tooltips were updated in the interpretation step section to maintain consistency.

#### Unchanged Tooltips
- **Exit/Back**: Already platform-appropriate (Esc key is universal)
- **Other single-key shortcuts**: Already platform-independent (R, V, L, T, D, I)

### Platform Detection Logic
Uses the same detection method already implemented throughout the codebase:
```typescript
navigator.platform.toLowerCase().includes('mac')
```

## Benefits
1. **Cleaner UI**: Tooltips are shorter and more focused
2. **Better UX**: Users only see shortcuts relevant to their platform
3. **Consistency**: Matches the existing platform detection used in the help modal
4. **Future-proof**: Easy to extend for additional platform-specific shortcuts

## Testing
- Build completed successfully with no errors
- Uses existing platform detection logic that's already tested throughout the app
- Consistent with help modal implementation that already uses the same pattern

## Files Modified
- `src/pages/reading/ReadingRoom.tsx`: Added helper function and updated tooltip content for both drawing and interpretation steps

## Related Documentation
- See `docs/bug-fixes/celtic-cross-flickering-fix.md` for Celtic Cross bug fixes
- See `docs/bug-fixes/modal-click-outside-implementation.md` for modal click-outside functionality 