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

  // Use refs to store current callbacks to avoid stale closures
  const onDragMoveRef = useRef(onDragMove);
  const onPanMoveRef = useRef(onPanMove);
  const onDragEndRef = useRef(onDragEnd);
  const onPanEndRef = useRef(onPanEnd);

  // Update refs when callbacks change
  onDragMoveRef.current = onDragMove;
  onPanMoveRef.current = onPanMove;
  onDragEndRef.current = onDragEnd;
  onPanEndRef.current = onPanEnd;

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      console.log('[MOUSE-LISTENER] mousemove event fired', {
        isDraggingCard,
        isPanningView,
        isDraggingPlacedCard,
        clientX: e.clientX,
        clientY: e.clientY
      });

      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
      }
      animationFrameIdRef.current = requestAnimationFrame(() => {
        if (isDraggingCard) {
          console.log('[MOUSE-LISTENER] Calling onDragMove');
          onDragMoveRef.current({ x: e.clientX, y: e.clientY });
        } else if (isPanningView && !isDraggingCard && !isDraggingPlacedCard) { // Ensure not card dragging
          console.log('[MOUSE-LISTENER] Calling onPanMove');
          onPanMoveRef.current(e.clientX, e.clientY);
        }
      });
    };

    const handleMouseUp = () => {
      console.log('[MOUSE-LISTENER] mouseup event fired', {
        isDraggingCard,
        isPanningView
      });

      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
        animationFrameIdRef.current = null;
      }

      if (isDraggingCard) {
        console.log('[MOUSE-LISTENER] Calling onDragEnd');
        onDragEndRef.current();
      } else if (isPanningView) {
        console.log('[MOUSE-LISTENER] Calling onPanEnd');
        onPanEndRef.current();
      }
      // If isDraggingPlacedCard needs a specific onEnd, it would be called here based on its state.
      // Currently, ReadingRoom.tsx seems to handle placed card drag end via its own onDragEnd prop on the Motion component.
    };

    // Only add listeners if any of the relevant states are true
    if (isDraggingCard || isPanningView) {
      console.log('[MOUSE-LISTENER] Adding document event listeners', {
        isDraggingCard,
        isPanningView,
        isDraggingPlacedCard,
        timestamp: new Date().toISOString()
      });
      document.addEventListener('mousemove', handleMouseMove, { passive: true });
      document.addEventListener('mouseup', handleMouseUp, { passive: true });
    } else {
      console.log('[MOUSE-LISTENER] NOT adding listeners (all states false)', {
        isDraggingCard,
        isPanningView,
        isDraggingPlacedCard
      });
    }

    return () => {
      console.log('[MOUSE-LISTENER] Cleanup called - removing event listeners', {
        isDraggingCard,
        isPanningView,
        isDraggingPlacedCard,
        timestamp: new Date().toISOString()
      });
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
      }
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDraggingCard, isPanningView, isDraggingPlacedCard]); // Removed callback dependencies - using refs instead
}; 