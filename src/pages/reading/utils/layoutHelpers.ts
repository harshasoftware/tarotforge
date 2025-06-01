// Helper function to get default zoom level based on layout
// Zoom level constants
const DEFAULT_ZOOM = 1.0;
const ENHANCED_ZOOM = 1.6;

interface Layout {
  id: string;
  // Add other layout properties as needed
}

/**
 * Determines the default zoom level based on layout type
 * @param layout - The reading layout configuration
 * @returns Default zoom level for the given layout
 */
export const getDefaultZoomLevel = (layout: Layout | null | undefined): number => {
  if (!layout) return DEFAULT_ZOOM;
  return layout.id === 'celtic-cross' ? DEFAULT_ZOOM : ENHANCED_ZOOM;
};