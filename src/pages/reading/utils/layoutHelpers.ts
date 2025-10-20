// Helper function to calculate optimal zoom based on viewport and layout
const calculateOptimalMobileZoom = (layout: any, screenWidth: number, screenHeight: number, isLandscape: boolean): number => {
  // Base card dimensions in pixels (at zoom level 1)
  const baseCardWidth = 96; // w-24 = 6rem = 96px
  const baseCardHeight = 144; // h-36 = 9rem = 144px

  // Account for mobile UI elements
  const topBarHeight = 120; // Two-row top bar on mobile
  const bottomPadding = 20;
  const sidePadding = 20;

  // Calculate available viewport space
  const availableWidth = screenWidth - (sidePadding * 2);
  const availableHeight = screenHeight - topBarHeight - bottomPadding;

  if (layout?.id === 'single-card') {
    // For single card, maximize within viewport
    const maxWidthZoom = availableWidth / baseCardWidth;
    const maxHeightZoom = availableHeight / baseCardHeight;
    // Allow higher zoom for single card but ensure it fits
    return Math.min(maxWidthZoom, maxHeightZoom, 4.5);
  }

  if (layout?.id === 'three-card') {
    // For three-card fan layout
    // Cards are positioned at x: 25%, 50%, 75% of viewport
    // With rotation, the outer cards need more horizontal space

    // Account for rotation - cards at ±15° need about 10% more width
    const rotationWidthFactor = 1.1;

    // Calculate the spread width: distance from leftmost to rightmost card center
    // 75% - 25% = 50% of screen width for card centers
    // Plus half card width on each side for the actual card edges
    const spreadPercentage = 0.5; // 75% - 25%
    const spreadWidth = screenWidth * spreadPercentage;

    // We need to fit the cards plus their rotation within available width
    // With 3 cards in fan layout, effective width is about 2 cards wide due to overlap
    const effectiveCardsWidth = baseCardWidth * 2 * rotationWidthFactor;

    // Calculate zoom to fit horizontally
    const horizontalZoom = availableWidth / effectiveCardsWidth;

    // Calculate zoom to fit vertically
    // Cards at y: 45% (center) and 55% (sides) of viewport
    const verticalZoom = availableHeight / (baseCardHeight * 1.3); // 1.3 for some margin

    // Use the smaller zoom to ensure everything fits
    return Math.min(horizontalZoom, verticalZoom, 3.5);
  }

  if (layout?.id === 'celtic-cross') {
    // Celtic Cross needs more space due to multiple card positions
    // Cards span from 25% to 75% horizontally and 15% to 75% vertically
    const horizontalZoom = availableWidth / (baseCardWidth * 4);
    const verticalZoom = availableHeight / (baseCardHeight * 3);
    return Math.min(horizontalZoom, verticalZoom, 2.0);
  }

  // Default calculation for unknown layouts
  return Math.min(availableWidth / (baseCardWidth * 2), 3.0);
};

// Helper function to get default zoom level based on layout
export const getDefaultZoomLevel = (
  layout: any,
  isMobile: boolean = false,
  isLandscape: boolean = false,
  screenWidth?: number,
  screenHeight?: number
): number => {
  // Use dynamic calculation for mobile if screen dimensions are provided
  if (isMobile && screenWidth && screenHeight) {
    const calculatedZoom = calculateOptimalMobileZoom(layout, screenWidth, screenHeight, isLandscape);
    console.log('📐 Dynamic zoom calculation:', {
      layout: layout?.id,
      screenWidth,
      screenHeight,
      isLandscape,
      calculatedZoom
    });
    return calculatedZoom;
  }

  // Fallback to static values if dimensions not provided
  if (isMobile) {
    if (layout?.id === 'single-card') {
      return isLandscape ? 3.0 : 3.5;
    }
    if (layout?.id === 'three-card') {
      return isLandscape ? 2.0 : 2.5;
    }
    return 2.5;
  }

  // Desktop zoom levels remain unchanged
  if (!layout) return 1;
  if (layout.id === 'celtic-cross') return 1.0;
  if (layout.id === 'three-card') return 2.0;
  if (layout.id === 'single-card') return 2.0;
  return 1.6;
}; 