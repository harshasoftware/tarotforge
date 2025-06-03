// Helper function to get default zoom level based on layout
export const getDefaultZoomLevel = (layout: any): number => {
  if (!layout) return 1;
  if (layout.id === 'celtic-cross') return 1.0;
  if (layout.id === 'three-card') return 2.0;
  if (layout.id === 'single-card') return 2.0;
  return 1.6;
}; 