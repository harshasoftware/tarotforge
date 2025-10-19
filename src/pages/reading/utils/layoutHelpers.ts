// Helper function to get default zoom level based on layout
export const getDefaultZoomLevel = (layout: any, isMobile: boolean = false): number => {
  // Always use maximum zoom on mobile for better card visibility
  if (isMobile) return 2.0;

  if (!layout) return 1;
  if (layout.id === 'celtic-cross') return 1.0;
  if (layout.id === 'three-card') return 2.0;
  if (layout.id === 'single-card') return 2.0;
  return 1.6;
}; 