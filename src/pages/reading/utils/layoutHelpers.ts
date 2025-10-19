// Helper function to get default zoom level based on layout
export const getDefaultZoomLevel = (layout: any, isMobile: boolean = false, isLandscape: boolean = false): number => {
  // Maximize zoom on mobile to use all available screen space
  if (isMobile) {
    if (layout?.id === 'single-card') {
      // Single card should fill most of the screen
      return isLandscape ? 4.0 : 4.5;
    }
    if (layout?.id === 'three-card') {
      // Fan layout with optimized zoom for visibility
      return isLandscape ? 3.0 : 3.5;
    }
    // Default very high zoom for mobile
    return 3.5;
  }

  // Desktop zoom levels remain unchanged
  if (!layout) return 1;
  if (layout.id === 'celtic-cross') return 1.0;
  if (layout.id === 'three-card') return 2.0;
  if (layout.id === 'single-card') return 2.0;
  return 1.6;
}; 