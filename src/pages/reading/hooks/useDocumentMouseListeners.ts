import { useEffect, useRef } from 'react';

interface UseDocumentMouseListenersProps {
  isDraggingCard: boolean; // Renamed for clarity (card from deck)
  isPanningView: boolean;  // Renamed for clarity
  isDraggingPlacedCard: boolean;
  onDragMove: (position: { x: number; y: number }) => void;
  onPanMove: (clientX: number, clientY: number) => void;
  onDragEnd: () => void; // For card from deck
  onPanEnd: () => void;
  // If dragging a placed card has a distinct end action, add prop e.g., onPlacedCardDragEnd: () => void;
}

export const useDocumentMouseListeners = ({
  isDraggingCard,
  isPanningView,
  isDraggingPlacedCard, // Keep this to prevent pan during placed card drag
  onDragMove,
  onPanMove,
  onDragEnd,
  onPanEnd,
}: UseDocumentMouseListenersProps) => {
  const animationFrameIdRef = useRef<number | null>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
      }
      animationFrameIdRef.current = requestAnimationFrame(() => {
        if (isDraggingCard) {
          onDragMove({ x: e.clientX, y: e.clientY });
        } else if (isPanningView && !isDraggingCard && !isDraggingPlacedCard) { // Ensure not card dragging
          onPanMove(e.clientX, e.clientY);
        }
      });
    };

    const handleMouseUp = () => {
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
        animationFrameIdRef.current = null;
      }
      
      if (isDraggingCard) {
        onDragEnd();
      } else if (isPanningView) {
        onPanEnd();
      }
      // If isDraggingPlacedCard needs a specific onEnd, it would be called here based on its state.
      // Currently, ReadingRoom.tsx seems to handle placed card drag end via its own onDragEnd prop on the Motion component.
    };

    // Only add listeners if any of the relevant states are true
    if (isDraggingCard || isPanningView) {
      document.addEventListener('mousemove', handleMouseMove, { passive: true });
      document.addEventListener('mouseup', handleMouseUp, { passive: true });
    }

    return () => {
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
      }
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDraggingCard, isPanningView, isDraggingPlacedCard, onDragMove, onPanMove, onDragEnd, onPanEnd]);
}; 