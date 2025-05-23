import React, { useEffect } from 'react';
import { useReadingRoom } from '../../pages/reading/ReadingRoomContext';
import { supabase } from '../../lib/supabase';

interface ReadingStateSyncProps {
  sessionId: string;
  children: React.ReactNode;
}

/**
 * Component to handle syncing reading state between participants
 * This is a wrapper component that can be used to sync state for a specific session
 */
const ReadingStateSync: React.FC<ReadingStateSyncProps> = ({ sessionId, children }) => {
  const { 
    joinReadingSession, 
    leaveReadingSession,
    isConnected
  } = useReadingRoom();
  
  // Join the reading session when the component mounts
  useEffect(() => {
    if (sessionId) {
      joinReadingSession(sessionId);
    }
    
    // Clean up when the component unmounts
    return () => {
      leaveReadingSession();
    };
  }, [sessionId, joinReadingSession, leaveReadingSession]);
  
  return (
    <>
      {/* Connection status indicator */}
      {!isConnected && sessionId && (
        <div className="fixed bottom-4 right-4 bg-warning text-warning-foreground px-3 py-1 rounded-full text-sm z-50">
          Connecting to reading session...
        </div>
      )}
      
      {/* Render children */}
      {children}
    </>
  );
};

export default ReadingStateSync;