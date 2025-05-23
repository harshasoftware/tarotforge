import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Minimize2, Maximize2, Move, Pin } from 'lucide-react';

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
  
  // Calculate sizes based on mobile and minimized state
  const getVideoSize = () => {
    if (isMobile) {
      return isMinimized ? 'w-20 h-16' : 'w-32 h-24';
    } else {
      return isMinimized ? 'w-32 h-24' : 'w-64 md:w-80';
    }
  };
  
  const getConstraints = () => {
    const videoWidth = isMobile ? (isMinimized ? 80 : 128) : (isMinimized ? 128 : 320);
    const videoHeight = isMobile ? (isMinimized ? 64 : 96) : (isMinimized ? 96 : 180);
    
    return {
      left: 0,
      right: window.innerWidth - videoWidth,
      top: 0,
      bottom: window.innerHeight - videoHeight
    };
  };
  
  const [constraints, setConstraints] = useState(getConstraints());
  
  // Ensure video is muted if it's the local stream
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = label === 'You' || label.includes('You');
    }
  }, [videoRef, label]);

  // Update constraints when window is resized or mobile/minimized state changes
  useEffect(() => {
    const updateConstraints = () => {
      setConstraints(getConstraints());
    };

    updateConstraints();
    window.addEventListener('resize', updateConstraints);
    return () => window.removeEventListener('resize', updateConstraints);
  }, [isMinimized, isMobile]);

  // Handle drag start
  const handleDragStart = () => {
    setIsDragging(true);
  };

  // Handle drag end
  const handleDragEnd = (event: any, info: any) => {
    setIsDragging(false);
    
    // Ensure the position stays within bounds
    const newX = Math.max(constraints.left, Math.min(info.point.x, constraints.right));
    const newY = Math.max(constraints.top, Math.min(info.point.y, constraints.bottom));
    
    const newPosition = { x: newX, y: newY };
    setPosition(newPosition);
    
    if (onPositionChange) {
      onPositionChange(newPosition);
    }
  };

  // Handle drag
  const handleDrag = (event: any, info: any) => {
    const newPosition = { x: info.point.x, y: info.point.y };
    setPosition(newPosition);
    if (onPositionChange) {
      onPositionChange(newPosition);
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

  return (
    <motion.div
      className={`fixed ${getVideoSize()} 
                 bg-black/80 rounded-lg overflow-hidden shadow-lg cursor-move
                 draggable-video ${isDragging ? 'dragging' : ''} ${className}`}
      drag={!isPinned}
      dragMomentum={false}
      dragElastic={0}
      dragConstraints={constraints}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDrag={handleDrag}
      animate={{
        x: position.x,
        y: position.y,
        scale: isDragging ? 1.02 : 1,
        zIndex: isDragging ? 1000 : 999,
        borderRadius: isMinimized ? '12px' : '16px'
      }}
      transition={{ 
        duration: 0.3,
        type: "spring",
        damping: 20,
        stiffness: 300
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
                <div className={`${isMobile ? 'w-6 h-6' : 'w-8 h-8 md:w-12 md:h-12'} bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-1`}>
                  <span className={`${isMobile ? 'text-sm' : 'text-lg'} font-bold text-primary-foreground`}>
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
              <div className={`${isMobile ? 'w-6 h-6' : 'w-8 h-8 md:w-12 md:h-12'} bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-1`}>
                <span className={`${isMobile ? 'text-sm' : 'text-lg'} font-bold text-primary-foreground`}>
                  {label.charAt(0)}
                </span>
              </div>
              <p className={`text-white ${isMobile ? 'text-xs' : 'text-sm'}`}>{label}</p>
            </div>
          </div>
        )
      )}

      <div className={`absolute bottom-1 left-1 text-white ${isMobile ? 'text-xs' : 'text-xs'} bg-black/60 px-1 py-0.5 rounded-full`}>
        {isMobile && label.length > 8 ? label.slice(0, 6) + '...' : label}
      </div>

      {/* Controls overlay - hide on mobile when minimized for clean look */}
      {(!isMobile || !isMinimized) && (
        <div className={`absolute top-1 right-1 flex space-x-0.5 video-controls-overlay bg-black/40 rounded-full p-0.5`}>
          <button
            onClick={toggleMinimized}
            className={`p-1 rounded-full text-white hover:bg-black/60 transition-colors ${isMobile ? 'touch-manipulation' : ''}`}
            title={isMinimized ? "Expand" : "Minimize"}
          >
            {isMinimized ? <Maximize2 className="h-2.5 w-2.5" /> : <Minimize2 className="h-2.5 w-2.5" />}
          </button>
          
          {!isMobile && (
            <>
              <button
                onClick={togglePinned}
                className={`p-1 rounded-full text-white hover:bg-black/60 transition-colors ${isPinned ? 'bg-primary/50' : ''}`}
                title={isPinned ? "Unpin" : "Pin"}
              >
                <Pin className="h-2.5 w-2.5" />
              </button>
              <button
                className="p-1 rounded-full text-white hover:bg-black/60 transition-colors"
                onMouseDown={(e) => e.stopPropagation()}
                title="Drag"
              >
                <Move className="h-2.5 w-2.5" />
              </button>
            </>
          )}
        </div>
      )}
    </motion.div>
  );
};

export default DraggableVideo;