import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Minimize2, Maximize2, Move } from 'lucide-react';

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

  // Handle drag start
  const handleDragStart = () => {
    setIsDragging(true);
  };

  // Handle drag end
  const handleDragEnd = () => {
    setIsDragging(false);
  };

  // Handle drag
  const handleDrag = (e: any, data: any) => {
    const newPosition = { x: data.x, y: data.y };
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

  return (
    <motion.div
      className={`absolute ${isMinimized ? 'w-32 h-24' : 'w-1/2 aspect-video'} 
                 bg-black/80 rounded-lg overflow-hidden shadow-lg cursor-move z-10 
                 draggable-video ${isDragging ? 'dragging' : ''} ${className}`}
      drag
      dragMomentum={false}
      dragElastic={0}
      dragConstraints={{ left: -100, right: 100, top: -100, bottom: 100 }}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDrag={handleDrag}
      animate={{
        x: position.x,
        y: position.y,
        scale: isDragging ? 1.02 : 1,
        zIndex: isDragging ? 20 : 10
      }}
      transition={{ duration: 0.2 }}
      style={{ left: initialPosition.x, top: initialPosition.y }}
    >
      {stream ? (
        <>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted={label === 'You'}
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

      <div className="absolute bottom-2 left-2 text-white text-xs bg-black/60 px-2 py-1 rounded">
        {label}
      </div>

      {/* Controls overlay */}
      <div className="absolute top-2 right-2 flex space-x-1 video-controls-overlay">
        <button
          onClick={toggleMinimized}
          className="p-1 rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors"
        >
          {isMinimized ? <Maximize2 className="h-3 w-3" /> : <Minimize2 className="h-3 w-3" />}
        </button>
        <button
          className="p-1 rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors"
          onMouseDown={(e) => e.stopPropagation()}
        >
          <Move className="h-3 w-3" />
        </button>
      </div>
    </motion.div>
  );
};

export default DraggableVideo;