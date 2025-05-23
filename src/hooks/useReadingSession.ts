import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { ReadingLayout, Card } from '../types';
import { RealtimeChannel } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

export interface ReadingSessionState {
  id: string;
  hostUserId: string | null;
  deckId: string;
  selectedLayout: ReadingLayout | null;
  question: string;
  readingStep: 'setup' | 'drawing' | 'interpretation';
  selectedCards: (Card & { position: string; isReversed: boolean; x?: number; y?: number; customPosition?: string })[];
  interpretation: string;
  zoomLevel: number;
  activeCardIndex: number | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SessionParticipant {
  id: string;
  sessionId: string;
  userId: string | null;
  anonymousId: string | null;
  name: string | null;
  isActive: boolean;
  joinedAt: string;
}

interface UseReadingSessionProps {
  initialSessionId?: string;
  deckId: string;
}

export const useReadingSession = ({ initialSessionId, deckId }: UseReadingSessionProps) => {
  const { user } = useAuth();
  const [sessionState, setSessionState] = useState<ReadingSessionState | null>(null);
  const [participants, setParticipants] = useState<SessionParticipant[]>([]);
  const [isHost, setIsHost] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const channelRef = useRef<RealtimeChannel | null>(null);
  const participantIdRef = useRef<string | null>(null);
  const presenceIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const anonymousIdRef = useRef<string | null>(null);

  // Generate anonymous ID for non-authenticated users
  useEffect(() => {
    if (!user && !anonymousIdRef.current) {
      anonymousIdRef.current = uuidv4();
    }
  }, [user]);

  // Create a new session (allows guest creation)
  const createSession = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('reading_sessions')
        .insert({
          host_user_id: user?.id || null, // Allow null for guest sessions
          deck_id: deckId,
          reading_step: 'setup',
          selected_cards: [],
          zoom_level: 1.0,
          is_active: true
        })
        .select()
        .single();

      if (error) throw error;

      return data.id;
    } catch (err: any) {
      console.error('Error creating session:', err);
      setError(err.message);
      return null;
    }
  }, [user, deckId]);

  // Join an existing session
  const joinSession = useCallback(async (sessionId: string) => {
    try {
      // Check if session exists and is active
      const { data: session, error: sessionError } = await supabase
        .from('reading_sessions')
        .select('*')
        .eq('id', sessionId)
        .eq('is_active', true)
        .single();

      if (sessionError || !session) {
        throw new Error('Session not found or inactive');
      }

      // Add participant
      const { data: participant, error: participantError } = await supabase
        .from('session_participants')
        .insert({
          session_id: sessionId,
          user_id: user?.id || null,
          anonymous_id: user ? null : anonymousIdRef.current,
          is_active: true
        })
        .select()
        .single();

      if (participantError) throw participantError;

      participantIdRef.current = participant.id;
      return sessionId;
    } catch (err: any) {
      console.error('Error joining session:', err);
      setError(err.message);
      return null;
    }
  }, [user]);

  // Update session state
  const updateSession = useCallback(async (updates: Partial<ReadingSessionState>) => {
    if (!sessionState?.id) return;

    try {
      const { error } = await supabase
        .from('reading_sessions')
        .update({
          selected_layout: updates.selectedLayout,
          question: updates.question,
          reading_step: updates.readingStep,
          selected_cards: updates.selectedCards,
          interpretation: updates.interpretation,
          zoom_level: updates.zoomLevel,
          active_card_index: updates.activeCardIndex
        })
        .eq('id', sessionState.id);

      if (error) throw error;
    } catch (err: any) {
      console.error('Error updating session:', err);
      setError(err.message);
    }
  }, [sessionState?.id]);

  // Update participant presence
  const updatePresence = useCallback(async () => {
    if (!participantIdRef.current) return;

    try {
      await supabase
        .from('session_participants')
        .update({ last_seen_at: new Date().toISOString() })
        .eq('id', participantIdRef.current);
    } catch (err: any) {
      console.error('Error updating presence:', err);
    }
  }, []);

  // Leave session
  const leaveSession = useCallback(async () => {
    if (!participantIdRef.current) return;

    try {
      await supabase
        .from('session_participants')
        .update({ is_active: false })
        .eq('id', participantIdRef.current);
    } catch (err: any) {
      console.error('Error leaving session:', err);
    }
  }, []);

  // Upgrade guest account to authenticated user
  const upgradeGuestAccount = useCallback(async (newUserId: string) => {
    if (!participantIdRef.current || !anonymousIdRef.current) return false;

    try {
      // Update the participant record to use the new user_id instead of anonymous_id
      const { error: participantError } = await supabase
        .from('session_participants')
        .update({ 
          user_id: newUserId,
          anonymous_id: null 
        })
        .eq('id', participantIdRef.current);

      if (participantError) throw participantError;

      return true;
    } catch (err: any) {
      console.error('Error upgrading guest account:', err);
      return false;
    }
  }, []);

  // Set guest name
  const setGuestName = useCallback(async (name: string) => {
    if (!participantIdRef.current) return false;

    try {
      const { error } = await supabase
        .from('session_participants')
        .update({ name: name.trim() })
        .eq('id', participantIdRef.current);

      if (error) throw error;
      return true;
    } catch (err: any) {
      console.error('Error setting guest name:', err);
      return false;
    }
  }, []);

  // Check if current user is a guest
  const isGuest = !user && !!anonymousIdRef.current;

  // Setup realtime subscriptions
  useEffect(() => {
    if (!sessionState?.id) return;

    // Clean up existing channel
    if (channelRef.current) {
      channelRef.current.unsubscribe();
    }

    // Create new channel for this session
    const channel = supabase.channel(`reading-session:${sessionState.id}`, {
      config: {
        broadcast: { self: false },
        presence: { key: participantIdRef.current || anonymousIdRef.current || 'anonymous' }
      }
    });

    // Subscribe to session updates
    channel
      .on('postgres_changes', 
        { event: 'UPDATE', schema: 'public', table: 'reading_sessions', filter: `id=eq.${sessionState.id}` },
        (payload) => {
          console.log('Session updated:', payload);
          const newSession = payload.new as any;
          setSessionState(prev => prev ? {
            ...prev,
            selectedLayout: newSession.selected_layout,
            question: newSession.question,
            readingStep: newSession.reading_step,
            selectedCards: newSession.selected_cards,
            interpretation: newSession.interpretation,
            zoomLevel: newSession.zoom_level,
            activeCardIndex: newSession.active_card_index,
            updatedAt: newSession.updated_at
          } : null);
        }
      )
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'session_participants', filter: `session_id=eq.${sessionState.id}` },
        async () => {
          // Refetch participants when they change
          const { data } = await supabase
            .from('session_participants')
            .select('*')
            .eq('session_id', sessionState.id)
            .eq('is_active', true);
          
          if (data) {
            setParticipants(data);
          }
        }
      )
      .subscribe();

    channelRef.current = channel;

    // Setup presence updates
    if (presenceIntervalRef.current) {
      clearInterval(presenceIntervalRef.current);
    }
    
    presenceIntervalRef.current = setInterval(updatePresence, 30000); // Every 30 seconds

    return () => {
      if (channelRef.current) {
        channelRef.current.unsubscribe();
      }
      if (presenceIntervalRef.current) {
        clearInterval(presenceIntervalRef.current);
      }
    };
  }, [sessionState?.id, updatePresence]);

  // Initialize session
  useEffect(() => {
    const initializeSession = async () => {
      setIsLoading(true);
      setError(null);

      try {
        let sessionId = initialSessionId;

        if (!sessionId) {
          // Create new session
          sessionId = await createSession();
          if (!sessionId) return;
          setIsHost(true);
        } else {
          // Join existing session
          sessionId = await joinSession(sessionId);
          if (!sessionId) return;
          setIsHost(false);
        }

        // Fetch session data
        const { data: session, error: sessionError } = await supabase
          .from('reading_sessions')
          .select('*')
          .eq('id', sessionId)
          .single();

        if (sessionError) throw sessionError;

        // Convert database format to component format
        setSessionState({
          id: session.id,
          hostUserId: session.host_user_id,
          deckId: session.deck_id,
          selectedLayout: session.selected_layout,
          question: session.question || '',
          readingStep: session.reading_step,
          selectedCards: session.selected_cards || [],
          interpretation: session.interpretation || '',
          zoomLevel: session.zoom_level || 1.0,
          activeCardIndex: session.active_card_index,
          isActive: session.is_active,
          createdAt: session.created_at,
          updatedAt: session.updated_at
        });

        // Check if current user is host
        if (user && session.host_user_id === user.id) {
          setIsHost(true);
        }

        // Fetch participants
        const { data: participantsData } = await supabase
          .from('session_participants')
          .select('*')
          .eq('session_id', sessionId)
          .eq('is_active', true);

        if (participantsData) {
          setParticipants(participantsData);
        }

      } catch (err: any) {
        console.error('Error initializing session:', err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    initializeSession();
  }, [initialSessionId, createSession, joinSession, user]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      leaveSession();
      if (channelRef.current) {
        channelRef.current.unsubscribe();
      }
      if (presenceIntervalRef.current) {
        clearInterval(presenceIntervalRef.current);
      }
    };
  }, [leaveSession]);

  return {
    sessionState,
    participants,
    isHost,
    isLoading,
    error,
    updateSession,
    createSession,
    joinSession,
    leaveSession,
    upgradeGuestAccount,
    isGuest,
    setGuestName
  };
}; 