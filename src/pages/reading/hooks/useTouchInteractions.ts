import { useEffect, useState, useCallback, RefObject } from 'react';

/**
 * @function getTouchDistanceUtil
 * @description Utility function to calculate the distance between two touch points.
 * Used for pinch-to-zoom gestures.
 * @param {TouchList} touches - A list of current touch points on the screen.
 * @returns {number} The distance between the first two touch points, or 0 if less than two touches.
 */
const getTouchDistanceUtil = (touches: TouchList) => {
  if (touches.length < 2) return 0;
  const touch1 = touches[0];
  const touch2 = touches[1];
  return Math.sqrt(
    Math.pow(touch2.clientX - touch1.clientX, 2) +
    Math.pow(touch2.clientY - touch1.clientY, 2)
  );
};

/**
 * @interface UseTouchInteractionsProps
 * @description Props for the `useTouchInteractions` hook.
 * @property {RefObject<HTMLDivElement>} readingAreaRef - React ref to the HTML element serving as the touch interaction area.
 * @property {boolean} isMobile - Flag indicating if the current device is mobile (touch interactions are typically mobile-only).
 * @property {number} currentZoomLevel - The current zoom level of the content.
 * @property {boolean} isCardDragging - Flag indicating if a card is currently being dragged, to prevent conflicting interactions.
 * @property {function(clientX: number, clientY: number): void} onPanStart - Callback function triggered when a pan gesture starts.
 * @property {function(clientX: number, clientY: number): void} onPanMove - Callback function triggered during a pan gesture.
 * @property {function(): void} onPanEnd - Callback function triggered when a pan gesture ends.
 * @property {function(newZoomLevel: number): void} onZoomChange - Callback function to update the zoom level.
 */
interface UseTouchInteractionsProps {
  readingAreaRef: RefObject<HTMLDivElement>;
  isMobile: boolean;
  currentZoomLevel: number;
  isCardDragging: boolean;
  onPanStart: (clientX: number, clientY: number) => void;
  onPanMove: (clientX: number, clientY: number) => void;
  onPanEnd: () => void;
  onZoomChange: (newZoomLevel: number) => void;
}

/**
 * @hook useTouchInteractions
 * @description React hook to manage touch-based interactions like pinch-to-zoom and touch-panning on a specified element.
 * It attaches touch event listeners ('touchstart', 'touchmove', 'touchend') to the provided `readingAreaRef`.
 * The hook manages internal state for zooming and panning initiated by touch.
 * This hook does not return any value.
 * Its primary side effect is adding and removing touch event listeners on the `readingAreaRef` element.
 *
 * @param {UseTouchInteractionsProps} props - The properties for the hook.
 */
export const useTouchInteractions = ({
  readingAreaRef,
  isMobile,
  currentZoomLevel,
  isCardDragging,
  onPanStart,
  onPanMove,
  onPanEnd,
  onZoomChange,
}: UseTouchInteractionsProps) => {
  const [isZooming, setIsZooming] = useState(false);
  const [lastTouchDistance, setLastTouchDistance] = useState(0);
  const [isPanActiveViaTouch, setIsPanActiveViaTouch] = useState(false); // Internal state for touch-initiated pan

  const handleTouchStart = useCallback((e: TouchEvent) => {
    console.log('[TouchInteractions] handleTouchStart - e.touches.length:', e.touches.length, 'currentZoomLevel:', currentZoomLevel);
    const target = e.target as HTMLElement;
    if (!target || target.closest('[data-card-element="true"]') || target.closest('.deck-pile') || isCardDragging) {
      setIsPanActiveViaTouch(false); 
      return;
    }

    if (e.touches.length === 2) {
      setIsZooming(true);
      setLastTouchDistance(getTouchDistanceUtil(e.touches));
      setIsPanActiveViaTouch(false); 
      e.preventDefault();
      e.stopPropagation();
    } else if (e.touches.length === 1 && currentZoomLevel > 1) {
      const touch = e.touches[0];
      console.log('[TouchInteractions] Pan Start Attempt: Calling onPanStart');
      onPanStart(touch.clientX, touch.clientY);
      setIsPanActiveViaTouch(true);
      e.preventDefault();
      e.stopPropagation(); // Added stopPropagation
    } else {
      console.log('[TouchInteractions] Pan Start: No action, resetting isPanActiveViaTouch');
      setIsPanActiveViaTouch(false);
    }
  }, [currentZoomLevel, isCardDragging, onPanStart, setIsZooming, setLastTouchDistance, setIsPanActiveViaTouch]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (isZooming && e.touches.length === 2) {
      const currentDistance = getTouchDistanceUtil(e.touches);
      if (lastTouchDistance === 0) { 
        setLastTouchDistance(currentDistance);
        return;
      }
      const scale = currentDistance / lastTouchDistance;
      if (Math.abs(scale - 1) > 0.01) {
        const newZoom = Math.max(0.5, Math.min(2, currentZoomLevel * scale));
        onZoomChange(newZoom);
        setLastTouchDistance(currentDistance);
      }
      e.preventDefault();
      e.stopPropagation();
    } else if (isPanActiveViaTouch && e.touches.length === 1 && !isCardDragging) {
      const touch = e.touches[0];
      console.log('[TouchInteractions] Pan Move: Calling onPanMove');
      onPanMove(touch.clientX, touch.clientY);
      e.preventDefault();
      e.stopPropagation();
    }
  }, [isZooming, lastTouchDistance, currentZoomLevel, onZoomChange, onPanMove, isCardDragging, isPanActiveViaTouch, setLastTouchDistance]);

  const handleTouchEnd = useCallback((e: TouchEvent) => {
    if (isZooming && e.touches.length < 2) {
      setIsZooming(false);
      setLastTouchDistance(0);
    }
    if (isPanActiveViaTouch && e.touches.length === 0) {
      console.log('[TouchInteractions] Pan End: Calling onPanEnd');
      onPanEnd();
      setIsPanActiveViaTouch(false);
    }
  }, [onPanEnd, isPanActiveViaTouch, isZooming, setIsZooming, setLastTouchDistance, setIsPanActiveViaTouch]);

  useEffect(() => {
    const readingArea = readingAreaRef.current;
    if (!readingArea || !isMobile) return;

    const options = { passive: false };

    readingArea.addEventListener('touchstart', handleTouchStart, options);
    readingArea.addEventListener('touchmove', handleTouchMove, options);
    readingArea.addEventListener('touchend', handleTouchEnd, options);

    return () => {
      readingArea.removeEventListener('touchstart', handleTouchStart);
      readingArea.removeEventListener('touchmove', handleTouchMove);
      readingArea.removeEventListener('touchend', handleTouchEnd);
    };
  }, [readingAreaRef, isMobile, handleTouchStart, handleTouchMove, handleTouchEnd]);
}; 