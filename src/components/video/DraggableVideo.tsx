import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Minimize2, Maximize2, Move, Pin, MoreVertical } from 'lucide-react';

interface DraggableVideoProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  stream: MediaStream | null;
  isVideoOff: boolean;
  label: string;
  initialPosition: { x: number; y: number };
  onPositionChange?: (position: { x: number; y: number }) => void;
  fallbackContent?: React.ReactNode;
  className?: string;
  isMobile?: boolean;
}

const DraggableVideo: React.FC<DraggableVideoProps> = ({
  videoRef,
  stream,
  isVideoOff,
  label,
  initialPosition,
  onPositionChange,
  fallbackContent,
  className = '',
  isMobile = false
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState(initialPosition);
  const [isMinimized, setIsMinimized] = useState(isMobile); // Default minimized on mobile
  const [isPinned, setIsPinned] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const [controlsTimeout, setControlsTimeout] = useState<NodeJS.Timeout | null>(null);
  
  // Calculate sizes based on mobile and minimized state
  const getVideoSize = () => {
    if (isMobile) {
      return isMinimized ? 'w-16 h-16' : 'w-24 h-24'; // Square for circular shape on mobile
    } else {
      // Use circular bubbles for desktop too, but larger
      return isMinimized ? 'w-20 h-20' : 'w-32 h-32';
    }
  };
  
  const getConstraints = () => {
    const margin = 8; // Small margin from viewport edges
    
    if (isMobile) {
      const videoSize = isMinimized ? 64 : 96; // Square size for mobile
      return {
        left: margin,
        right: Math.max(margin + videoSize, window.innerWidth - videoSize - margin),
        top: margin,
        bottom: Math.max(margin + videoSize, window.innerHeight - videoSize - margin)
      };
    } else {
      // Updated for circular desktop bubbles
      const videoSize = isMinimized ? 80 : 128; // Square size for circular desktop bubbles
      
      return {
        left: margin,
        right: Math.max(margin + videoSize, window.innerWidth - videoSize - margin),
        top: margin,
        bottom: Math.max(margin + videoSize, window.innerHeight - videoSize - margin)
      };
    }
  };
  
  const [constraints, setConstraints] = useState(getConstraints());
  
  // Helper function to ensure position is within viewport bounds
  const constrainPosition = (pos: { x: number; y: number }) => {
    const currentConstraints = getConstraints();
    return {
      x: Math.max(currentConstraints.left, Math.min(pos.x, currentConstraints.right)),
      y: Math.max(currentConstraints.top, Math.min(pos.y, currentConstraints.bottom))
    };
  };
  
  // Update position when initialPosition changes
  useEffect(() => {
    const constrainedPosition = constrainPosition(initialPosition);
    setPosition(constrainedPosition);
  }, [initialPosition]);

  // Ensure video is muted if it's the local stream
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = label === 'You' || label.includes('You');
    }
  }, [videoRef, label]);

  // Update constraints when window is resized or mobile/minimized state changes
  useEffect(() => {
    const updateConstraints = () => {
      const newConstraints = getConstraints();
      setConstraints(newConstraints);
      
      // Only adjust position if not currently dragging to prevent interference
      if (!isDragging) {
        const constrainedPosition = constrainPosition(position);
        if (constrainedPosition.x !== position.x || constrainedPosition.y !== position.y) {
          setPosition(constrainedPosition);
          if (onPositionChange) {
            onPositionChange(constrainedPosition);
          }
        }
      }
    };

    updateConstraints();
    window.addEventListener('resize', updateConstraints);
    return () => window.removeEventListener('resize', updateConstraints);
  }, [isMinimized, isMobile, position, onPositionChange, isDragging]);

  // Handle drag start
  const handleDragStart = () => {
    setIsDragging(true);
  };

  // Handle drag end
  const handleDragEnd = (event: any, info: any) => {
    setIsDragging(false);
    
    // Apply constraints smoothly at the end of drag
    const constrainedPosition = constrainPosition({ x: info.point.x, y: info.point.y });
    
    // Update both local state and parent component
    setPosition(constrainedPosition);
    
    if (onPositionChange) {
      onPositionChange(constrainedPosition);
    }
  };

  // Handle drag
  const handleDrag = (event: any, info: any) => {
    // During drag, let framer-motion handle the positioning
    // Only apply constraints at the end of drag to prevent flickering
    if (onPositionChange) {
      onPositionChange({ x: info.point.x, y: info.point.y });
    }
  };

  // Toggle minimized state
  const toggleMinimized = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsMinimized(!isMinimized);
  };

  // Toggle pinned state
  const togglePinned = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsPinned(!isPinned);
  };

  // Show controls with auto-hide timeout
  const showControlsWithTimeout = () => {
    setShowControls(true);
    
    // Clear existing timeout
    if (controlsTimeout) {
      clearTimeout(controlsTimeout);
    }
    
    // Set new timeout to hide controls after 3 seconds
    const timeout = setTimeout(() => {
      setShowControls(false);
    }, 3000);
    
    setControlsTimeout(timeout);
  };

  // Hide controls immediately
  const hideControls = () => {
    setShowControls(false);
    if (controlsTimeout) {
      clearTimeout(controlsTimeout);
      setControlsTimeout(null);
    }
  };

  // Handle mouse enter
  const handleMouseEnter = () => {
    if (!isMobile) {
      showControlsWithTimeout();
    }
  };

  // Handle mouse leave
  const handleMouseLeave = () => {
    if (!isMobile) {
      hideControls();
    }
  };

  // Handle tap/click for mobile
  const handleTap = (e: React.MouseEvent) => {
    if (isMobile) {
      e.stopPropagation();
      if (showControls) {
        hideControls();
      } else {
        showControlsWithTimeout();
      }
    }
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (controlsTimeout) {
        clearTimeout(controlsTimeout);
      }
    };
  }, [controlsTimeout]);

  return (
    <motion.div
      className={`fixed ${getVideoSize()} 
                 bg-black/80 rounded-full overflow-hidden shadow-lg cursor-move
                 draggable-video ${isDragging ? 'dragging' : ''} ${className}`}
      drag={!isPinned}
      dragMomentum={false}
      dragElastic={0}
      dragConstraints={constraints}
      dragTransition={{ bounceStiffness: 600, bounceDamping: 20 }}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDrag={handleDrag}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleTap}
      animate={{
        x: position.x,
        y: position.y,
        scale: isDragging ? 1.02 : 1,
        zIndex: isDragging ? 2000 : 1500,
        borderRadius: '50%' // Always circular for both mobile and desktop
      }}
      transition={{ 
        duration: isDragging ? 0 : 0.3, // No animation during drag to prevent conflicts
        type: "spring",
        damping: 25,
        stiffness: 400
      }}
      style={{ 
        position: 'fixed',
        left: 0,
        top: 0,
        boxShadow: '0 10px 25px rgba(0, 0, 0, 0.3)',
        touchAction: 'none'
      }}
    >
      {stream ? (
        <>
          <video
            ref={videoRef}
            autoPlay
            muted={label === 'You' || label.includes('You')} // Always mute local video to prevent feedback
            playsInline
            className="w-full h-full object-cover"
          />
          {isVideoOff && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/90">
              <div className="text-center">
                <div className={`${isMobile ? 'w-6 h-6' : 'w-10 h-10'} bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-1`}>
                  <span className={`${isMobile ? 'text-sm' : 'text-xl'} font-bold text-primary-foreground`}>
                    {label.charAt(0)}
                  </span>
                </div>
                <p className={`text-white ${isMobile ? 'text-xs' : 'text-sm'}`}>Camera Off</p>
              </div>
            </div>
          )}
        </>
      ) : (
        fallbackContent || (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className={`${isMobile ? 'w-6 h-6' : 'w-10 h-10'} bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-1`}>
                <span className={`${isMobile ? 'text-sm' : 'text-xl'} font-bold text-primary-foreground`}>
                  {label.charAt(0)}
                </span>
              </div>
              <p className={`text-white ${isMobile ? 'text-xs' : 'text-sm'}`}>{label}</p>
            </div>
          </div>
        )
      )}

      <div className={`absolute bottom-1 left-1/2 transform -translate-x-1/2 text-white ${isMobile ? 'text-xs' : 'text-xs'} bg-black/60 px-2 py-0.5 rounded-full`}>
        {isMobile && label.length > 8 ? label.slice(0, 6) + '...' : (label.length > 12 ? label.slice(0, 10) + '...' : label)}
      </div>

      {/* Floating Action Menu - positioned outside the bubble for better accessibility */}
      <AnimatePresence>
        {showControls && (
          <motion.div
            className={`absolute ${isMobile ? 'top-full mt-2' : 'top-full mt-2'} left-1/2 transform -translate-x-1/2 z-[2001]`}
            initial={{ opacity: 0, scale: 0.8, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            <div className="bg-black/90 backdrop-blur-sm rounded-lg shadow-xl border border-white/20 p-1">
              <div className="flex items-center gap-1">
                {/* Minimize/Maximize Button */}
                <button
                  onClick={toggleMinimized}
                  className="p-2 rounded-md text-white hover:bg-white/20 transition-colors flex items-center justify-center min-w-[32px] min-h-[32px]"
                  title={isMinimized ? "Expand" : "Minimize"}
                >
                  {isMinimized ? <Maximize2 className="h-3.5 w-3.5" /> : <Minimize2 className="h-3.5 w-3.5" />}
                </button>
                
                {/* Pin Button - Desktop only */}
                {!isMobile && (
                  <button
                    onClick={togglePinned}
                    className={`p-2 rounded-md text-white hover:bg-white/20 transition-colors flex items-center justify-center min-w-[32px] min-h-[32px] ${
                      isPinned ? 'bg-primary/50' : ''
                    }`}
                    title={isPinned ? "Unpin" : "Pin"}
                  >
                    <Pin className="h-3.5 w-3.5" />
                  </button>
                )}
                
                {/* Drag Handle - Desktop only */}
                {!isMobile && (
                  <button
                    className="p-2 rounded-md text-white hover:bg-white/20 transition-colors flex items-center justify-center min-w-[32px] min-h-[32px] cursor-move"
                    onMouseDown={(e) => e.stopPropagation()}
                    title="Drag to move"
                  >
                    <Move className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
            
            {/* Arrow pointing to bubble */}
            <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-black/90 rotate-45 border-l border-t border-white/20"></div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile tap indicator when no controls are shown */}
      {isMobile && !showControls && !isDragging && (
        <div className="absolute top-1 right-1 w-2 h-2 bg-white/60 rounded-full animate-pulse"></div>
      )}
    </motion.div>
  );
};

export default DraggableVideo;