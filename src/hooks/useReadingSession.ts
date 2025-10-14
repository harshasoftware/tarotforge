import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStorePrivy';
import { ReadingLayout, Card } from '../types';
import { RealtimeChannel } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import { getPersistentBrowserId } from '../utils/browserFingerprint';

let updateCallCounter = 0; // Module-level counter for updateSession calls

export interface ReadingSessionState {
  id: string;
  hostUserId: string | null;
  deckId: string;
  selectedLayout: ReadingLayout | null;
  question: string;
  readingStep: 'setup' | 'ask-question' | 'drawing' | 'interpretation';
  selectedCards: (Card & { position: string; isReversed: boolean; x?: number; y?: number; customPosition?: string })[];
  interpretation: string;
  zoomLevel: number;
  activeCardIndex: number | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  shuffledDeck?: Card[]; 
  loadingStates?: { 
    isShuffling?: boolean; 
    isGeneratingInterpretation?: boolean;
    triggeredBy?: string | null;
  } | null;
  sharedModalState?: {
    isOpen: boolean;
    cardIndex: number | null;
    showDescription: boolean;
    triggeredBy: string | null;
  } | null;
  deckSelectionState?: {
    isOpen: boolean;
    activeTab: 'collection' | 'marketplace';
    selectedMarketplaceDeck: string | null;
    triggeredBy: string | null;
  } | null;
  panOffset?: { x: number; y: number };
  zoomFocus?: {x: number; y: number} | null;
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
  const { user, isAnonymous } = useAuthStore();
  const isGuest = !user || isAnonymous();
  const [sessionState, setSessionState] = useState<ReadingSessionState | null>(null);
  const [participants, setParticipants] = useState<SessionParticipant[]>([]);
  const [isHost, setIsHost] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const channelRef = useRef<RealtimeChannel | null>(null);
  const participantIdRef = useRef<string | null>(null);
  const presenceIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const anonymousIdRef = useRef<string | null>(null);

  // Generate persistent browser ID for non-authenticated users
  useEffect(() => {
    if (!user && !anonymousIdRef.current) {
      anonymousIdRef.current = getPersistentBrowserId();
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

      // Add the session creator as a participant
      try {
        const { data: participant, error: participantError } = await supabase
          .from('session_participants')
          .insert({
            session_id: data.id,
            user_id: user?.id || null,
            anonymous_id: user ? null : (anonymousIdRef.current || null),
            is_active: true
          })
          .select()
          .single();

        if (participantError) {
          console.warn('Failed to add creator as participant:', participantError);
        } else {
          participantIdRef.current = participant.id;
        }
      } catch (participantErr) {
        console.warn('Error adding creator as participant:', participantErr);
        // Don't fail the session creation for this
      }

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

      // Check if user is already a participant in this session
      const { data: existingParticipant, error: checkError } = await supabase
        .from('session_participants')
        .select('id')
        .eq('session_id', sessionId)
        .eq('is_active', true)
        .or(
          user?.id 
            ? `user_id.eq.${user.id}` 
            : `anonymous_id.eq.${anonymousIdRef.current}`
        )
        .maybeSingle();

      if (checkError && checkError.code !== 'PGRST116') {
        // PGRST116 is "not found" which is expected if no participant exists
        console.error('Error checking existing participant:', checkError);
      }

      if (existingParticipant) {
        console.log('User is already a participant in this session');
        participantIdRef.current = existingParticipant.id;
        return sessionId;
      }

      // Add participant only if they're not already in the session
      const { data: participant, error: participantError } = await supabase
        .from('session_participants')
        .insert({
          session_id: sessionId,
          user_id: user?.id || null,
          anonymous_id: user ? null : (anonymousIdRef.current || null),
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
    const callId = updateCallCounter++;
    if (!sessionState?.id) {
      console.warn(`[useReadingSession update #${callId}] updateSession: No session ID. Updates:`, JSON.stringify(updates));
      return;
    }
    console.log(`[useReadingSession update #${callId}] updateSession: Called with updates:`, JSON.stringify(updates), 'Current local selectedCards count:', sessionState.selectedCards?.length);

    try {
      const updateData: any = {};
      const fieldsToMap: Partial<Record<keyof ReadingSessionState, string>> = {
        selectedLayout: 'selected_layout',
        readingStep: 'reading_step',
        selectedCards: 'selected_cards',
        zoomLevel: 'zoom_level',
        activeCardIndex: 'active_card_index',
        shuffledDeck: 'shuffled_deck',
        loadingStates: 'loading_states',
        sharedModalState: 'shared_modal_state',
        deckSelectionState: 'deck_selection_state',
        panOffset: 'pan_offset',
        zoomFocus: 'zoom_focus'
      };

      for (const key in updates) {
        if (updates.hasOwnProperty(key) && updates[key as keyof ReadingSessionState] !== undefined) {
          const dbKey = fieldsToMap[key as keyof ReadingSessionState] || key;
          updateData[dbKey] = updates[key as keyof ReadingSessionState];
        }
      }

      if (Object.keys(updateData).length === 0) {
        console.log(`[useReadingSession update #${callId}] updateSession: No actual data fields to update in DB.`);
        return;
      }
      
      console.log(`[useReadingSession update #${callId}] Sending to DB (session ${sessionState.id}): DATA:`, JSON.stringify(updateData));

      const { error: dbError } = await supabase
        .from('reading_sessions')
        .update(updateData)
        .eq('id', sessionState.id);

      if (dbError) {
        console.error(`[useReadingSession update #${callId}] Database update error:`, dbError, 'for data:', JSON.stringify(updateData));
        if (isGuest && (dbError.message?.includes('permission') || dbError.message?.includes('policy'))) {
            console.warn(`[useReadingSession update #${callId}] DB update failed for guest (permissions), applying local optimistic update.`);
      setSessionState((prev: ReadingSessionState | null) => prev ? {
        ...prev,
        ...updates,
        updatedAt: new Date().toISOString()
      } : null);
        } else {
            setError(dbError.message);
        }
        return;
      }

      console.log(`[useReadingSession update #${callId}] DB update successful for session ${sessionState.id}. Host optimistic update (if host):`, isHost);
      if (isHost) {
        setSessionState((prev: ReadingSessionState | null) => {
          if (!prev) return null;
          const newState = {
          ...prev,
          ...updates,
          updatedAt: new Date().toISOString()
          };
          console.log(`[useReadingSession update #${callId}] Host optimistic. Prev cards:`, prev.selectedCards?.length, 'New cards:', newState.selectedCards?.length);
          return newState;
        });
      }
    } catch (err: any) {
      console.error(`[useReadingSession update #${callId}] Unexpected error:`, err, 'Updates attempted:', JSON.stringify(updates));
      setError(err.message);
    }
  }, [sessionState, supabase, isHost, isGuest, setError]);

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

  // Setup realtime subscriptions
  useEffect(() => {
    if (!sessionState?.id) return;

    if (channelRef.current) {
      channelRef.current.unsubscribe();
      channelRef.current = null; // Ensure old channel is cleared
    }

    const channel = supabase.channel(`reading-session:${sessionState.id}`, {
      config: {
        broadcast: { self: false }, // Usually good, but for selectedCards, self:true might be needed if host relies on this too
        presence: { key: participantIdRef.current || anonymousIdRef.current || uuidv4() }
      }
    });

    channel
      .on('postgres_changes', 
        { event: 'UPDATE', schema: 'public', table: 'reading_sessions', filter: `id=eq.${sessionState.id}` },
        (payload: any) => {
          const newDbSession = payload.new as any; 
          const commitTs = payload.commit_timestamp;
          console.log(`[useReadingSession Realtime Evt ${commitTs}] Session ${sessionState?.id} UPDATE received.`, 'Payload NEW:', JSON.stringify(newDbSession));
          
          setSessionState((prevLocalState) => {
            if (!prevLocalState) {
                console.warn("[useReadingSession Realtime Evt ${commitTs}] prevLocalState is null. Initializing with new DB data.");
                return { 
                    id: newDbSession.id,
                    hostUserId: newDbSession.host_user_id,
                    deckId: newDbSession.deck_id,
                    selectedLayout: newDbSession.selected_layout,
                    question: newDbSession.question || '',
                    readingStep: newDbSession.reading_step,
                    selectedCards: newDbSession.selected_cards || [],
                    interpretation: newDbSession.interpretation || '',
                    zoomLevel: newDbSession.zoom_level || 1.0,
                    activeCardIndex: newDbSession.active_card_index,
                    isActive: newDbSession.is_active,
                    createdAt: newDbSession.created_at,
                    updatedAt: newDbSession.updated_at,
                    shuffledDeck: newDbSession.shuffled_deck,
                    loadingStates: newDbSession.loading_states,
                    sharedModalState: newDbSession.shared_modal_state,
                    deckSelectionState: newDbSession.deck_selection_state,
                    panOffset: newDbSession.pan_offset,
                    zoomFocus: newDbSession.zoom_focus,
                } as ReadingSessionState;
            }

            const remoteUpdateTime = new Date(newDbSession.updated_at).getTime();
            const localUpdateTime = prevLocalState.updatedAt ? new Date(prevLocalState.updatedAt).getTime() : 0;

            console.log(`[useReadingSession Realtime Evt ${commitTs}] Comparing timestamps. Local: ${prevLocalState.updatedAt} (${localUpdateTime}), Remote: ${newDbSession.updated_at} (${remoteUpdateTime}). IsHost: ${isHost}`);
            console.log(`[useReadingSession Realtime Evt ${commitTs}] Prev local selectedCards (${prevLocalState.selectedCards?.length}):`, JSON.stringify(prevLocalState.selectedCards?.map(c => c.id)));
            console.log(`[useReadingSession Realtime Evt ${commitTs}] Incoming DB selected_cards (${newDbSession.selected_cards?.length}):`, JSON.stringify(newDbSession.selected_cards?.map((c: any) => c.id)));
            
            let resolvedSelectedCards = newDbSession.selected_cards !== undefined 
                ? newDbSession.selected_cards 
                : prevLocalState.selectedCards;

            if (!isHost && 
                remoteUpdateTime <= localUpdateTime &&
                newDbSession.selected_cards !== undefined && 
                newDbSession.selected_cards.length === 0 && 
                prevLocalState.selectedCards && 
                prevLocalState.selectedCards.length > 0) {
                
                console.warn(`[useReadingSession Realtime Evt ${commitTs}] Non-host received update that would set cards to empty, but local state had ${prevLocalState.selectedCards.length} cards. Keeping previous cards due to suspicion of stale/conflicting update.`);
                resolvedSelectedCards = prevLocalState.selectedCards;
            }
            
            const mergedState: ReadingSessionState = {
                ...prevLocalState,
                id: newDbSession.id || prevLocalState.id,
                hostUserId: newDbSession.host_user_id !== undefined ? newDbSession.host_user_id : prevLocalState.hostUserId,
                deckId: newDbSession.deck_id || prevLocalState.deckId,
                selectedLayout: newDbSession.selected_layout !== undefined ? newDbSession.selected_layout : prevLocalState.selectedLayout,
                question: newDbSession.question !== undefined ? newDbSession.question : prevLocalState.question,
                readingStep: newDbSession.reading_step || prevLocalState.readingStep,
                selectedCards: resolvedSelectedCards,
                interpretation: newDbSession.interpretation !== undefined ? newDbSession.interpretation : prevLocalState.interpretation,
                zoomLevel: newDbSession.zoom_level !== undefined ? newDbSession.zoom_level : prevLocalState.zoomLevel,
                activeCardIndex: newDbSession.active_card_index !== undefined ? newDbSession.active_card_index : prevLocalState.activeCardIndex,
                isActive: newDbSession.is_active !== undefined ? newDbSession.is_active : prevLocalState.isActive,
                shuffledDeck: newDbSession.shuffled_deck !== undefined ? newDbSession.shuffled_deck : prevLocalState.shuffledDeck,
                loadingStates: newDbSession.loading_states !== undefined ? newDbSession.loading_states : prevLocalState.loadingStates,
                sharedModalState: newDbSession.shared_modal_state !== undefined ? newDbSession.shared_modal_state : prevLocalState.sharedModalState,
                deckSelectionState: newDbSession.deck_selection_state !== undefined ? newDbSession.deck_selection_state : prevLocalState.deckSelectionState,
                panOffset: newDbSession.pan_offset !== undefined ? newDbSession.pan_offset : prevLocalState.panOffset,
                zoomFocus: newDbSession.zoom_focus !== undefined ? newDbSession.zoom_focus : prevLocalState.zoomFocus,
                updatedAt: newDbSession.updated_at || prevLocalState.updatedAt,
                createdAt: newDbSession.created_at || prevLocalState.createdAt
            };

            console.log(`[useReadingSession Realtime Evt ${commitTs}] Applying merged state. Final selectedCards (${mergedState.selectedCards?.length}):`, JSON.stringify(mergedState.selectedCards?.map(c => c.id)));
            return mergedState;
          });
        }
      )
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'session_participants', filter: `session_id=eq.${sessionState.id}` },
        async (payload:any) => {
          console.log(`[useReadingSession Realtime Evt ${payload.commit_timestamp}] Participants changed for session ${sessionState.id}`, payload);
          const { data } = await supabase
            .from('session_participants')
            .select('*')
            .eq('session_id', sessionState.id)
            .eq('is_active', true);
          if (data) setParticipants(data);
        }
      )
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          console.log(`[useReadingSession Realtime] Subscribed to session ${sessionState.id}`);
        }
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.error(`[useReadingSession Realtime] Channel error/timeout for session ${sessionState.id}`, err);
          setError(`Realtime connection issue: ${status}`);
        }
        if (err) {
            console.error(`[useReadingSession Realtime] Subscription error for session ${sessionState.id}`, err);
        }
      });

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
  }, [sessionState?.id, supabase, updatePresence, isHost, setError]); // Added supabase and isHost

  // Initialize session
  useEffect(() => {
    const initializeSession = async () => {
      setIsLoading(true);
      setError(null);

      try {
        let sessionId = initialSessionId;

        if (!sessionId) {
          // Create new session
          console.log('Creating new session for user:', user?.id || 'anonymous');
          sessionId = await createSession();
          if (!sessionId) {
            // If database creation fails, create a local session for development
            console.warn('Database session creation failed, creating local session');
            sessionId = uuidv4();
            setSessionState({
              id: sessionId,
              hostUserId: user?.id || null,
              deckId: deckId,
              selectedLayout: null,
              question: '',
              readingStep: 'setup',
              selectedCards: [],
              interpretation: '',
              zoomLevel: 1.0,
              activeCardIndex: null,
              isActive: true,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            });
            setIsHost(true);
            setIsLoading(false);
            return;
          }
          setIsHost(true);
        } else {
          // Join existing session
          console.log('Joining existing session:', sessionId);
          const joinedSessionId = await joinSession(sessionId);
          if (!joinedSessionId) return;
          sessionId = joinedSessionId;
          setIsHost(false);
        }

        // Fetch session data
        const { data: session, error: sessionError } = await supabase
          .from('reading_sessions')
          .select('*')
          .eq('id', sessionId)
          .single();

        if (sessionError) {
          console.error('Failed to fetch session:', sessionError);
          // If we can't fetch from database, create a minimal local session
          if (sessionId) {
            setSessionState({
              id: sessionId,
              hostUserId: user?.id || null,
              deckId: deckId,
              selectedLayout: null,
              question: '',
              readingStep: 'setup',
              selectedCards: [],
              interpretation: '',
              zoomLevel: 1.0,
              activeCardIndex: null,
              isActive: true,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            });
          }
        } else {
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
        }

        // Fetch participants (optional, don't fail if this doesn't work)
        try {
          const { data: participantsData } = await supabase
            .from('session_participants')
            .select('*')
            .eq('session_id', sessionId)
            .eq('is_active', true);

          if (participantsData) {
            setParticipants(participantsData);
          }
        } catch (participantsError) {
          console.warn('Failed to fetch participants:', participantsError);
          // Continue without participants data
        }

      } catch (err: any) {
        console.error('Error initializing session:', err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    initializeSession();
  }, [initialSessionId, createSession, joinSession, user, deckId]);

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
    setGuestName,
    participantId: participantIdRef.current, // Expose participantId if needed by ReadingRoom
    anonymousId: anonymousIdRef.current    // Expose anonymousId if needed
  };
}; 