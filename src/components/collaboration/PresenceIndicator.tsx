import React, { useEffect, useRef } from 'react';
import { useCollaborativeStore } from '../../stores/collaborativeSessionStore';
import { motion, AnimatePresence } from 'framer-motion';
import { MousePointer2, Eye } from 'lucide-react';

interface CursorData {
  userId: string;
  name: string;
  x: number;
  y: number;
  color: string;
}

const PresenceIndicator: React.FC = () => {
  const { presence, participantId, updatePresence } = useCollaborativeStore();
  const containerRef = useRef<HTMLDivElement>(null);
  const lastUpdateRef = useRef<number>(0);
  
  // Generate consistent color for user
  const getUserColor = (userId: string): string => {
    const colors = [
      '#ef4444', // red
      '#f59e0b', // amber
      '#10b981', // emerald
      '#3b82f6', // blue
      '#8b5cf6', // violet
      '#ec4899', // pink
      '#14b8a6', // teal
      '#f97316', // orange
    ];
    
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      hash = userId.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    return colors[Math.abs(hash) % colors.length];
  };
  
  // Track mouse movement
  useEffect(() => {
    if (!containerRef.current) return;
    
    const handleMouseMove = (e: MouseEvent) => {
      const now = Date.now();
      // Throttle updates to 20fps
      if (now - lastUpdateRef.current < 50) return;
      lastUpdateRef.current = now;
      
      const rect = containerRef.current!.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      
      updatePresence({
        cursor: { x, y }
      });
    };
    
    const container = containerRef.current;
    container.addEventListener('mousemove', handleMouseMove);
    
    return () => {
      container.removeEventListener('mousemove', handleMouseMove);
    };
  }, [updatePresence]);
  
  // Get active cursors
  const cursors: CursorData[] = Object.entries(presence)
    .filter(([userId, data]) => {
      // Filter out self and inactive users
      if (userId === participantId) return false;
      if (!data.lastActivity) return false;
      if (Date.now() - data.lastActivity > 5000) return false; // 5 second timeout
      if (!data.cursor) return false;
      return true;
    })
    .map(([userId, data]) => ({
      userId,
      name: data.name || 'Anonymous',
      x: data.cursor!.x,
      y: data.cursor!.y,
      color: getUserColor(userId)
    }));
  
  // Get followers
  const followers = Object.entries(presence)
    .filter(([userId, data]) => data.isFollowing === participantId)
    .map(([userId, data]) => ({
      userId,
      name: data.name || 'Anonymous',
      color: getUserColor(userId)
    }));
  
  return (
    <>
      {/* Cursor container - absolute positioned over the reading area */}
      <div 
        ref={containerRef}
        className="absolute inset-0 pointer-events-none z-[60] overflow-hidden"
      >
        <AnimatePresence>
          {cursors.map(cursor => (
            <motion.div
              key={cursor.userId}
              className="absolute"
              initial={{ opacity: 0, scale: 0 }}
              animate={{ 
                opacity: 1, 
                scale: 1,
                x: `${cursor.x}%`,
                y: `${cursor.y}%`
              }}
              exit={{ opacity: 0, scale: 0 }}
              transition={{ 
                type: "spring",
                damping: 30,
                stiffness: 200
              }}
              style={{
                transform: 'translate(-50%, -50%)'
              }}
            >
              <div className="relative">
                <MousePointer2 
                  className="h-4 w-4" 
                  style={{ 
                    color: cursor.color,
                    filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.5))'
                  }} 
                />
                <div 
                  className="absolute top-4 left-2 px-2 py-1 rounded-full text-xs text-white whitespace-nowrap"
                  style={{ 
                    backgroundColor: cursor.color,
                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                  }}
                >
                  {cursor.name}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
      
      {/* Followers indicator */}
      <AnimatePresence>
        {followers.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-20 right-4 bg-card/90 backdrop-blur-sm border border-border rounded-lg p-3 shadow-lg z-[65]"
          >
            <div className="flex items-center gap-2 text-sm">
              <Eye className="h-4 w-4 text-primary" />
              <span className="font-medium">Following your view</span>
            </div>
            <div className="mt-2 space-y-1">
              {followers.map(follower => (
                <div key={follower.userId} className="flex items-center gap-2">
                  <div 
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: follower.color }}
                  />
                  <span className="text-xs text-muted-foreground">
                    {follower.name}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default PresenceIndicator; 