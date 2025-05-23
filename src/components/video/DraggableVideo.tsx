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
}

const DraggableVideo: React.FC<DraggableVideoProps> = ({
  videoRef,
  stream,
  isVideoOff,
  label,
  initialPosition,
  onPositionChange,
  fallbackContent,
  className = ''
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState(initialPosition);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const [constraints, setConstraints] = useState({
    left: 0,
    right: window.innerWidth - (isMinimized ? 128 : 320),
    top: 0,
    bottom: window.innerHeight - (isMinimized ? 96 : 180)
  });

  // Update constraints when window is resized
  useEffect(() => {
    const updateConstraints = () => {
      setConstraints({
        left: 0,
        right: window.innerWidth - (isMinimized ? 128 : 320),
        top: 0,
        bottom: window.innerHeight - (isMinimized ? 96 : 180)
      });
    };

    window.addEventListener('resize', updateConstraints);
    return () => window.removeEventListener('resize', updateConstraints);
  }, [isMinimized]);

  // Update constraints when minimized state changes
  useEffect(() => {
    setConstraints({
      left: 0,
      right: window.innerWidth - (isMinimized ? 128 : 320),
      top: 0,
      bottom: window.innerHeight - (isMinimized ? 96 : 180)
    });
  }, [isMinimized]);

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
      className={`fixed ${isMinimized ? 'w-32 h-24' : 'w-64 md:w-80'} 
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
        borderRadius: isMinimized ? '16px' : '16px'
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
            muted={label === 'You'}
            playsInline
            className="w-full h-full object-cover"
          />
          {isVideoOff && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/90">
              <div className="text-center">
                <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-2">
                  <span className="text-xl font-bold text-primary-foreground">
                    {label.charAt(0)}
                  </span>
                </div>
                <p className="text-white text-sm">Camera Off</p>
              </div>
            </div>
          )}
        </>
      ) : (
        fallbackContent || (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-2">
                <span className="text-xl font-bold text-primary-foreground">
                  {label.charAt(0)}
                </span>
              </div>
              <p className="text-white text-sm">{label}</p>
            </div>
          </div>
        )
      )}

      <div className="absolute bottom-2 left-2 text-white text-xs bg-black/60 px-2 py-1 rounded-full">
        {label}
      </div>

      {/* Controls overlay */}
      <div className="absolute top-2 right-2 flex space-x-1 video-controls-overlay bg-black/40 rounded-full p-1">
        <button
          onClick={toggleMinimized}
          className="p-1 rounded-full text-white hover:bg-black/60 transition-colors"
        >
          {isMinimized ? <Maximize2 className="h-3 w-3" /> : <Minimize2 className="h-3 w-3" />}
        </button>
        <button
          onClick={togglePinned}
          className={`p-1 rounded-full text-white hover:bg-black/60 transition-colors ${isPinned ? 'bg-primary/50' : ''}`}
          title={isPinned ? "Unpin" : "Pin"}
        >
          <Pin className="h-3 w-3" />
        </button>
        <button
          className="p-1 rounded-full text-white hover:bg-black/60 transition-colors"
          onMouseDown={(e) => e.stopPropagation()}
          title="Drag"
        >
          <Move className="h-3 w-3" />
        </button>
      </div>
    </motion.div>
  );
};

export default DraggableVideo;