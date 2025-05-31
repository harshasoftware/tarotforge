// Helper function to get default zoom level based on layout
export const getDefaultZoomLevel = (layout: any): number => {
  if (!layout) return 1;
  return layout.id === 'celtic-cross' ? 1.0 : 1.6;
}; 