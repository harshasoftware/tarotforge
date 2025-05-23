import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { Card, ReadingLayout } from '../../types';

interface ReadingRoomContextType {
  readingSessionId: string | null;
  isHost: boolean;
  participants: any[];
  isConnected: boolean;
  selectedCards: (Card & { position: string; isReversed: boolean })[];
  selectedLayout: ReadingLayout | null;
  readingStarted: boolean;
  readingComplete: boolean;
  question: string;
  createReadingSession: () => string;
  joinReadingSession: (sessionId: string) => void;
  leaveReadingSession: () => void;
  updateReadingState: (state: Partial<ReadingState>) => void;
}

interface ReadingState {
  selectedLayout: ReadingLayout | null;
  selectedCards: (Card & { position: string; isReversed: boolean })[];
  readingStarted: boolean;
  readingComplete: boolean;
  question: string;
}

const ReadingRoomContext = createContext<ReadingRoomContextType>({
  readingSessionId: null,
  isHost: true,
  participants: [],
  isConnected: false,
  selectedCards: [],
  selectedLayout: null,
  readingStarted: false,
  readingComplete: false,
  question: '',
  createReadingSession: () => '',
  joinReadingSession: () => {},
  leaveReadingSession: () => {},
  updateReadingState: () => {}
});

export const useReadingRoom = () => useContext(ReadingRoomContext);

export const ReadingRoomProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  
  // Reading session state
  const [readingSessionId, setReadingSessionId] = useState<string | null>(null);
  const [isHost, setIsHost] = useState(true);
  const [participants, setParticipants] = useState<any[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [realtimeChannel, setRealtimeChannel] = useState<any>(null);
  
  // Reading state
  const [selectedCards, setSelectedCards] = useState<(Card & { position: string; isReversed: boolean })[]>([]);
  const [selectedLayout, setSelectedLayout] = useState<ReadingLayout | null>(null);
  const [readingStarted, setReadingStarted] = useState(false);
  const [readingComplete, setReadingComplete] = useState(false);
  const [question, setQuestion] = useState('');
  
  // Clean up channel on unmount
  useEffect(() => {
    return () => {
      if (realtimeChannel) {
        realtimeChannel.unsubscribe();
      }
    };
  }, [realtimeChannel]);
  
  // Create a new reading session
  const createReadingSession = () => {
    // Generate a unique session ID
    const newSessionId = `reading_${Math.random().toString(36).substring(2, 15)}`;
    setReadingSessionId(newSessionId);
    setIsHost(true);
    
    // Create a Supabase Realtime channel
    const channel = supabase.channel(`reading:${newSessionId}`, {
      config: {
        broadcast: {
          self: true
        },
        presence: {
          key: user?.id || 'anonymous'
        }
      }
    });
    
    // Subscribe to the channel
    channel
      .on('broadcast', { event: 'reading_state' }, (payload) => {
        handleReadingStateUpdate(payload);
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        console.log('User joined:', key, newPresences);
        setParticipants(prev => [...prev, ...newPresences]);
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        console.log('User left:', key, leftPresences);
        setParticipants(prev => 
          prev.filter(p => !leftPresences.some(lp => lp.user_id === p.user_id))
        );
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          // Track presence
          await channel.track({
            user_id: user?.id || 'anonymous',
            username: user?.username || 'Anonymous',
            online_at: new Date().toISOString()
          });
          
          setRealtimeChannel(channel);
          setIsConnected(true);
          
          // Broadcast initial state
          broadcastReadingState({
            selectedLayout,
            selectedCards,
            readingStarted,
            readingComplete,
            question
          });
        }
      });
      
    return newSessionId;
  };
  
  // Join an existing reading session
  const joinReadingSession = (sessionId: string) => {
    setReadingSessionId(sessionId);
    setIsHost(false);
    
    // Create a Supabase Realtime channel
    const channel = supabase.channel(`reading:${sessionId}`, {
      config: {
        broadcast: {
          self: true
        },
        presence: {
          key: user?.id || 'anonymous'
        }
      }
    });
    
    // Subscribe to the channel
    channel
      .on('broadcast', { event: 'reading_state' }, (payload) => {
        handleReadingStateUpdate(payload);
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        console.log('User joined:', key, newPresences);
        setParticipants(prev => [...prev, ...newPresences]);
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        console.log('User left:', key, leftPresences);
        setParticipants(prev => 
          prev.filter(p => !leftPresences.some(lp => lp.user_id === p.user_id))
        );
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          // Track presence
          await channel.track({
            user_id: user?.id || 'anonymous',
            username: user?.username || 'Anonymous',
            online_at: new Date().toISOString()
          });
          
          setRealtimeChannel(channel);
          setIsConnected(true);
          
          // Request current state
          channel.send({
            type: 'broadcast',
            event: 'request_state',
            payload: {
              requesterId: user?.id || 'anonymous'
            }
          });
        }
      });
  };
  
  // Leave the reading session
  const leaveReadingSession = () => {
    if (realtimeChannel) {
      realtimeChannel.unsubscribe();
    }
    
    setReadingSessionId(null);
    setIsHost(true);
    setParticipants([]);
    setIsConnected(false);
    setRealtimeChannel(null);
  };
  
  // Handle reading state updates from other participants
  const handleReadingStateUpdate = (payload: any) => {
    const { event, payload: data } = payload;
    
    if (event === 'reading_state') {
      // Update local state with received data
      if (data.selectedLayout && !isHost) {
        setSelectedLayout(data.selectedLayout);
      }
      
      if (data.selectedCards) {
        setSelectedCards(data.selectedCards);
      }
      
      if (data.readingStarted !== undefined) {
        setReadingStarted(data.readingStarted);
      }
      
      if (data.readingComplete !== undefined) {
        setReadingComplete(data.readingComplete);
      }
      
      if (data.question !== undefined && !isHost) {
        setQuestion(data.question);
      }
    } else if (event === 'request_state' && isHost) {
      // If we're the host and someone is requesting the current state, send it
      broadcastReadingState({
        selectedLayout,
        selectedCards,
        readingStarted,
        readingComplete,
        question
      });
    }
  };
  
  // Broadcast reading state to all participants
  const broadcastReadingState = (state: Partial<ReadingState>) => {
    if (realtimeChannel) {
      realtimeChannel.send({
        type: 'broadcast',
        event: 'reading_state',
        payload: state
      });
    }
  };
  
  // Update reading state and broadcast changes
  const updateReadingState = (state: Partial<ReadingState>) => {
    // Update local state
    if (state.selectedLayout !== undefined) {
      setSelectedLayout(state.selectedLayout);
    }
    
    if (state.selectedCards !== undefined) {
      setSelectedCards(state.selectedCards);
    }
    
    if (state.readingStarted !== undefined) {
      setReadingStarted(state.readingStarted);
    }
    
    if (state.readingComplete !== undefined) {
      setReadingComplete(state.readingComplete);
    }
    
    if (state.question !== undefined) {
      setQuestion(state.question);
    }
    
    // Broadcast changes
    if (isHost && readingSessionId) {
      broadcastReadingState(state);
    }
  };
  
  return (
    <ReadingRoomContext.Provider
      value={{
        readingSessionId,
        isHost,
        participants,
        isConnected,
        selectedCards,
        selectedLayout,
        readingStarted,
        readingComplete,
        question,
        createReadingSession,
        joinReadingSession,
        leaveReadingSession,
        updateReadingState
      }}
    >
      {children}
    </ReadingRoomContext.Provider>
  );
};