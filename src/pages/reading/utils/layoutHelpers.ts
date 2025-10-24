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
    // For single card, fit comfortably within viewport
    const maxWidthZoom = availableWidth / (baseCardWidth * 1.5); // Add padding around card
    const maxHeightZoom = availableHeight / (baseCardHeight * 1.3);
    // Reduced max zoom for better mobile experience
    return Math.min(maxWidthZoom, maxHeightZoom, 2.0);
  }

  if (layout?.id === 'three-card') {
    // For three-card fan layout - more conservative calculation
    // Cards are positioned at x: 25%, 50%, 75% of viewport
    // With rotation, the outer cards need more horizontal space

    // Account for rotation and card overlap
    const rotationWidthFactor = 1.2; // More space for rotated cards

    // Three cards with some overlap - effective width is about 2.5 cards
    const effectiveCardsWidth = baseCardWidth * 2.5 * rotationWidthFactor;

    // Calculate zoom to fit horizontally with padding
    const horizontalZoom = availableWidth / effectiveCardsWidth * 0.85; // Scale down for padding

    // Calculate zoom to fit vertically with generous margin
    const verticalZoom = availableHeight / (baseCardHeight * 1.5);

    // Use smaller zoom with conservative max
    return Math.min(horizontalZoom, verticalZoom, 1.8);
  }

  if (layout?.id === 'celtic-cross') {
    // Celtic Cross needs the most space - be very conservative
    const horizontalZoom = availableWidth / (baseCardWidth * 5); // More space for complex layout
    const verticalZoom = availableHeight / (baseCardHeight * 3.5);
    return Math.min(horizontalZoom, verticalZoom, 1.2); // Lower max for complex layout
  }

  // Default calculation for unknown layouts - conservative approach
  return Math.min(availableWidth / (baseCardWidth * 3), 1.5);
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
      return isLandscape ? 1.5 : 1.8;
    }
    if (layout?.id === 'three-card') {
      return isLandscape ? 1.2 : 1.5;
    }
    if (layout?.id === 'celtic-cross') {
      return isLandscape ? 1.0 : 1.2;
    }
    return 1.5;
  }

  // Desktop zoom levels remain unchanged
  if (!layout) return 1;
  if (layout.id === 'celtic-cross') return 1.0;
  if (layout.id === 'three-card') return 2.0;
  if (layout.id === 'single-card') return 2.0;
  return 1.6;
}; 