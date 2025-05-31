import { useEffect, useState, useCallback, RefObject } from 'react';

// Re-define getTouchDistance here or import if it remains in a shared util
const getTouchDistanceUtil = (touches: TouchList) => {
  if (touches.length < 2) return 0;
  const touch1 = touches[0];
  const touch2 = touches[1];
  return Math.sqrt(
    Math.pow(touch2.clientX - touch1.clientX, 2) +
    Math.pow(touch2.clientY - touch1.clientY, 2)
  );
};

interface UseTouchInteractionsProps {
  readingAreaRef: RefObject<HTMLDivElement>;
  isMobile: boolean;
  currentZoomLevel: number; // Renamed to avoid conflict with internal state if any
  isCardDragging: boolean; // Renamed for clarity
  onPanStart: (clientX: number, clientY: number) => void;
  onPanMove: (clientX: number, clientY: number) => void;
  onPanEnd: () => void;
  onZoomChange: (newZoomLevel: number) => void;
}

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

  const handleTouchStart = useCallback((e: TouchEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('[data-card-element="true"]') || target.closest('.deck-pile') || isCardDragging) {
      return;
    }

    if (e.touches.length === 2) {
      setIsZooming(true);
      setLastTouchDistance(getTouchDistanceUtil(e.touches));
      e.preventDefault();
      e.stopPropagation();
    } else if (e.touches.length === 1 && currentZoomLevel > 1) {
      const touch = e.touches[0];
      onPanStart(touch.clientX, touch.clientY);
      e.preventDefault();
    }
  }, [currentZoomLevel, isCardDragging, onPanStart]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (isZooming && e.touches.length === 2) {
      const currentDistance = getTouchDistanceUtil(e.touches);
      const scale = currentDistance / lastTouchDistance;

      if (Math.abs(scale - 1) > 0.01) {
        const newZoom = Math.max(0.5, Math.min(2, currentZoomLevel * scale));
        onZoomChange(newZoom);
        setLastTouchDistance(currentDistance);
      }
      e.preventDefault();
      e.stopPropagation();
    } else if (readingAreaRef.current?.style.cursor === 'grabbing' && e.touches.length === 1 && !isCardDragging) { // Check for active panning state
      const touch = e.touches[0];
      onPanMove(touch.clientX, touch.clientY);
      e.preventDefault();
      e.stopPropagation();
    }
  }, [isZooming, lastTouchDistance, currentZoomLevel, onZoomChange, onPanMove, isCardDragging, readingAreaRef]);

  const handleTouchEnd = useCallback((e: TouchEvent) => {
    if (e.touches.length < 2) {
      setIsZooming(false);
      setLastTouchDistance(0);
    }
    if (e.touches.length === 0) {
      onPanEnd();
    }
  }, [onPanEnd]);

  useEffect(() => {
    const readingArea = readingAreaRef.current;
    if (!readingArea || !isMobile) return;

    const options = { passive: false };
    const passiveOptions = { passive: true };

    readingArea.addEventListener('touchstart', handleTouchStart, options);
    readingArea.addEventListener('touchmove', handleTouchMove, options);
    readingArea.addEventListener('touchend', handleTouchEnd, passiveOptions);

    return () => {
      readingArea.removeEventListener('touchstart', handleTouchStart);
      readingArea.removeEventListener('touchmove', handleTouchMove);
      readingArea.removeEventListener('touchend', handleTouchEnd);
    };
  }, [readingAreaRef, isMobile, handleTouchStart, handleTouchMove, handleTouchEnd]);
}; 