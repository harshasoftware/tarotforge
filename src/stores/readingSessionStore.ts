import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { supabase } from '../lib/supabase';
import { useAuthStore } from './authStore';
import { ReadingLayout, Card } from '../types';
import { RealtimeChannel } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import { getPersistentBrowserId } from '../utils/browserFingerprint';

export interface ReadingSessionState {
  id: string;
  hostUserId: string | null;
  deckId: string;
  selectedLayout: ReadingLayout | null;
  question: string;
  readingStep: 'setup' | 'ask-question' | 'drawing' | 'interpretation';
  selectedCards: (Card & { position: string; isReversed: boolean; x?: number; y?: number; customPosition?: string })[];
  shuffledDeck: Card[];
  interpretation: string;
  zoomLevel: number;
  panOffset: { x: number; y: number };
  zoomFocus: { x: number; y: number } | null;
  activeCardIndex: number | null;
  sharedModalState: {
    isOpen: boolean;
    cardIndex: number | null;
    showDescription: boolean;
    triggeredBy: string | null; // participant ID who triggered the modal
  } | null;
  videoCallState: {
    isActive: boolean;
    sessionId: string | null;
    hostParticipantId: string | null;
    participants: string[]; // participant IDs in the video call
  } | null;
  loadingStates?: {
    isShuffling: boolean;
    isGeneratingInterpretation: boolean;
    triggeredBy: string | null; // participant ID who triggered the action
  } | null;
  deckSelectionState?: {
    isOpen: boolean;
    activeTab: 'collection' | 'marketplace';
    selectedMarketplaceDeck: string | null; // deck ID
    triggeredBy: string | null; // participant ID who opened the modal
  } | null;
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
  lastSeenAt?: string;
}

interface ReadingSessionStore {
  sessionState: ReadingSessionState | null;
  participants: SessionParticipant[];
  isHost: boolean;
  isLoading: boolean;
  error: string | null;
  initialSessionId: string | null;
  deckId: string;
  channel: RealtimeChannel | null;
  participantId: string | null;
  presenceInterval: NodeJS.Timeout | null;
  anonymousId: string | null;
  isOfflineMode: boolean;
  pendingSyncData: Partial<ReadingSessionState> | null;
  _justRestoredFromPreservedState: boolean;

  // Actions
  setSessionState: (sessionState: ReadingSessionState | null) => void;
  setParticipants: (participants: SessionParticipant[]) => void;
  setIsHost: (isHost: boolean) => void;
  setIsLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  setInitialSessionId: (sessionId: string | null) => void;
  setDeckId: (deckId: string) => void;
  createSession: () => Promise<string | null>;
  createLocalSession: () => string;
  joinSession: (sessionId: string, accessMethod?: 'invite' | 'direct') => Promise<string | null>;
  updateSession: (updates: Partial<ReadingSessionState>) => Promise<void>;
  updateLocalSession: (updates: Partial<ReadingSessionState>) => void;
  syncLocalSessionToDatabase: () => Promise<boolean>;
  loadLocalSession: (sessionId: string) => ReadingSessionState | null;
  saveLocalSession: (sessionState: ReadingSessionState) => void;
  updatePresence: () => Promise<void>;
  leaveSession: () => Promise<void>;
  upgradeGuestAccount: (newUserId: string) => Promise<boolean>;
  setGuestName: (name: string) => Promise<boolean>;
  initializeSession: () => Promise<void>;
  setupRealtimeSubscriptions: () => void;
  syncCompleteSessionState: (sessionId: string) => Promise<boolean>;
  cleanup: () => void;
  // Video call management
  startVideoCall: () => Promise<string | null>;
  joinVideoCall: (videoSessionId: string) => Promise<boolean>;
  leaveVideoCall: () => Promise<void>;
  updateVideoCallParticipants: (participants: string[]) => Promise<void>;
  // Guest actions via broadcast
  broadcastGuestAction: (action: string, data: any) => Promise<void>;
  // Subscribe to broadcast events
  subscribeToBroadcast: (callback: (action: string, data: any, participantId: string) => void) => () => void;
  // Session cleanup
  cleanupInactiveSessions: () => Promise<void>;
  checkSessionExpiry: () => Promise<boolean>;
}

export const useReadingSessionStore = create<ReadingSessionStore>()(
  subscribeWithSelector((set, get) => ({
    sessionState: null,
    participants: [],
    isHost: false,
    isLoading: true,
    error: null,
    initialSessionId: null,
    deckId: 'rider-waite-classic',
    channel: null,
    participantId: null,
    presenceInterval: null,
    anonymousId: null,
    isOfflineMode: false,
    pendingSyncData: null,
    _justRestoredFromPreservedState: false,

    setSessionState: (sessionState) => set({ sessionState }),
    setParticipants: (participants) => set({ participants }),
    setIsHost: (isHost) => set({ isHost }),
    setIsLoading: (isLoading) => set({ isLoading }),
    setError: (error) => set({ error }),
    setInitialSessionId: (initialSessionId) => set({ initialSessionId }),
    setDeckId: (deckId) => set({ deckId }),

    createSession: async () => {
      const { user } = useAuthStore.getState();
      const { deckId } = get();
      
      try {
        const { data, error } = await supabase
          .from('reading_sessions')
          .insert({
            host_user_id: user?.id || null, // null for guest sessions - clear and simple
            deck_id: deckId,
            reading_step: 'setup',
            selected_cards: [],
            zoom_level: 1.0,
            pan_offset: { x: 0, y: 0 },
            zoom_focus: null,
            shared_modal_state: null,
            is_active: true
          })
          .select()
          .single();

        if (error) throw error;

        return data.id;
      } catch (err: any) {
        console.error('Error creating session:', err);
        
        // Fallback to local session if database fails
        console.log('Database failed, creating local session as fallback');
        const localSessionId = get().createLocalSession();
        set({ isOfflineMode: true });
        return localSessionId;
      }
    },

    createLocalSession: () => {
      const { user } = useAuthStore.getState();
      const { deckId } = get();
      
      const sessionId = `local_${uuidv4()}`;
      const now = new Date().toISOString();
      
      const localSession: ReadingSessionState = {
        id: sessionId,
        hostUserId: user?.id || null,
        deckId,
        selectedLayout: null,
        question: '',
        readingStep: 'setup',
        selectedCards: [],
        shuffledDeck: [],
        interpretation: '',
        zoomLevel: 1.0,
        panOffset: { x: 0, y: 0 },
        zoomFocus: null,
        activeCardIndex: null,
        sharedModalState: null,
        videoCallState: null,
        loadingStates: null,
        isActive: true,
        createdAt: now,
        updatedAt: now
      };
      
      // Save to localStorage
      get().saveLocalSession(localSession);
      
      // Set as current session
      set({ 
        sessionState: localSession,
        isHost: true,
        isOfflineMode: true
      });
      
      return sessionId;
    },

    loadLocalSession: (sessionId: string) => {
      try {
        const stored = localStorage.getItem(`tarot_session_${sessionId}`);
        if (stored) {
          return JSON.parse(stored) as ReadingSessionState;
        }
      } catch (error) {
        console.error('Error loading local session:', error);
      }
      return null;
    },

    saveLocalSession: (sessionState: ReadingSessionState) => {
      try {
        localStorage.setItem(`tarot_session_${sessionState.id}`, JSON.stringify(sessionState));
      } catch (error) {
        console.error('Error saving local session:', error);
      }
    },

    updateLocalSession: (updates: Partial<ReadingSessionState>) => {
      const { sessionState } = get();
      
      if (!sessionState) return;
      
      const updatedSession = {
        ...sessionState,
        ...updates,
        updatedAt: new Date().toISOString()
      };
      
      // Update local state
      set({ sessionState: updatedSession });
      
      // Save to localStorage
      get().saveLocalSession(updatedSession);
      
      // Store pending sync data if we're offline
      const { isOfflineMode } = get();
      if (isOfflineMode) {
        set({ pendingSyncData: { ...get().pendingSyncData, ...updates } });
      }
    },

    syncLocalSessionToDatabase: async () => {
      const { sessionState, pendingSyncData, isOfflineMode } = get();
      
      if (!sessionState || !isOfflineMode || !sessionState.id.startsWith('local_')) {
        return false;
      }
      
      try {
        const { user } = useAuthStore.getState();
        
        // Create the session in the database
        const { data, error } = await supabase
          .from('reading_sessions')
          .insert({
            host_user_id: user?.id || sessionState.hostUserId,
            deck_id: sessionState.deckId,
            selected_layout: sessionState.selectedLayout,
            question: sessionState.question,
            reading_step: sessionState.readingStep,
            selected_cards: sessionState.selectedCards,
            interpretation: sessionState.interpretation,
            zoom_level: sessionState.zoomLevel,
            active_card_index: sessionState.activeCardIndex,
            is_active: true
          })
          .select()
          .single();

        if (error) throw error;

        // Update session with new database ID
        const syncedSession: ReadingSessionState = {
          ...sessionState,
          id: data.id,
          updatedAt: new Date().toISOString()
        };
        
        // Clean up local session
        localStorage.removeItem(`tarot_session_${sessionState.id}`);
        
        // Save synced session
        get().saveLocalSession(syncedSession);
        
        // Update state
        set({ 
          sessionState: syncedSession,
          isOfflineMode: false,
          pendingSyncData: null
        });
        
        console.log('Successfully synced local session to database:', data.id);
        return true;
      } catch (error) {
        console.error('Failed to sync local session to database:', error);
        return false;
      }
    },

    joinSession: async (sessionId: string, accessMethod: 'invite' | 'direct' = 'direct') => {
      const { user } = useAuthStore.getState();

      try {
        const { data: session, error: sessionError } = await supabase
          .from('reading_sessions')
          .select('*')
          .eq('id', sessionId)
          .eq('is_active', true)
          .single();

        if (sessionError || !session) {
          throw new Error('Session not found or inactive');
        }

        set({ 
          sessionState: session as ReadingSessionState,
          isHost: (user && session.host_user_id === user.id) || (!user && session.host_user_id === null && accessMethod === 'direct'),
          isLoading: false, 
          error: null,
          initialSessionId: sessionId
        });

        let participantQuery = supabase
            .from('session_participants')
          .select('*')
            .eq('session_id', sessionId)
          .eq('is_active', true);

        if (user && user.email) {
          participantQuery = participantQuery.eq('user_id', user.id);
        } else if (user && !user.email) {
          participantQuery = participantQuery.eq('anonymous_id', user.id);
          } else {
          console.warn("joinSession: No valid user from authStore to find participant by.");
          participantQuery = participantQuery.limit(0); 
        }
        
        const { data: existingParticipant, error: existingParticipantError } = await participantQuery.maybeSingle();

        if (existingParticipantError && existingParticipantError.code !== 'PGRST116') {
            console.error("Error finding existing participant in joinSession:", existingParticipantError);
        }
          
        let participant = existingParticipant;
        
        if (existingParticipant) {
          console.log('Found existing participant in joinSession, reusing:', existingParticipant.id);
          await supabase
          .from('session_participants')
            .update({ last_seen_at: new Date().toISOString() })
            .eq('id', existingParticipant.id);
        } else {
          console.log('Creating new participant in joinSession...');
          const participantDataToInsert = {
            session_id: sessionId,
            user_id: (user && user.email) ? user.id : null,
            anonymous_id: (user && !user.email) ? user.id : null,
            name: user?.username || ((user && !user.email) ? 'Anonymous Guest' : 'Guest'),
            is_active: true,
            role: 'participant' // Default role, can be adjusted by other logic if needed
            // role: accessMethod === 'reader' ? 'reader' : 'participant' // Reverted this, as 'reader' is not a valid accessMethod here
          };
          console.log('Creating participant in joinSession with:', participantDataToInsert);

          const { data: newParticipant, error: participantError } = await supabase
            .from('session_participants')
            .insert(participantDataToInsert)
          .select()
          .single();

        if (participantError) throw participantError;
          participant = newParticipant;
        }

        if (!participant) {
            console.error("Failed to establish participant record in joinSession.");
            set({ error: "Could not establish participant record."});
            return null;
        }

        set({ participantId: participant.id });
        
        // Fetch current participants list
        const { data: participantsData } = await supabase
          .from('session_participants')
          .select('*')
          .eq('session_id', sessionId)
          .eq('is_active', true);

        if (participantsData) {
          set({ participants: participantsData as SessionParticipant[] });
        }

        // Setup realtime subscriptions
        if (get().participantId) {
            get().setupRealtimeSubscriptions();
        } else {
            console.warn("joinSession: Cannot setup realtime subscriptions without a participantId.");
        }

        console.log('Successfully joined session:', sessionId);
        return sessionId;
      } catch (err: any) {
        console.error('Error joining session:', err);
        set({ error: err.message, isLoading: false });
        return null;
      }
    },

    updateSession: async (updates: Partial<ReadingSessionState>) => {
      const { sessionState, isOfflineMode, isHost, participantId, anonymousId } = get();
      const { user } = useAuthStore.getState();
      
      if (!sessionState?.id) {
        console.warn('No session ID available for update');
        return;
      }

      // If in offline mode or local session, use local update
      if (isOfflineMode || sessionState.id.startsWith('local_')) {
        get().updateLocalSession(updates);
        return;
      }

      // If user is a guest (not authenticated) and not the host, use broadcast
      if (!user && !isHost) {
        console.log('Guest user (non-host) broadcasting action instead of direct DB update');
        await get().broadcastGuestAction('updateSession', updates);
        
        // Update local state immediately for better UX
        set({
          sessionState: sessionState ? {
            ...sessionState,
            ...updates,
            updatedAt: new Date().toISOString()
          } : null
        });
        return;
      }

      try {
        // Build update object only with defined values
        const updateData: any = {};
        
        if (updates.selectedLayout !== undefined) {
          updateData.selected_layout = updates.selectedLayout;
        }
        if (updates.question !== undefined) {
          updateData.question = updates.question;
        }
        if (updates.readingStep !== undefined) {
          updateData.reading_step = updates.readingStep;
        }
        if (updates.selectedCards !== undefined) {
          updateData.selected_cards = updates.selectedCards;
        }
        if (updates.shuffledDeck !== undefined) {
          updateData.shuffled_deck = updates.shuffledDeck;
        }
        if (updates.interpretation !== undefined) {
          updateData.interpretation = updates.interpretation;
        }
        if (updates.zoomLevel !== undefined) {
          updateData.zoom_level = updates.zoomLevel;
        }
        if (updates.panOffset !== undefined) {
          updateData.pan_offset = updates.panOffset;
        }
        if (updates.zoomFocus !== undefined) {
          updateData.zoom_focus = updates.zoomFocus;
        }
        if (updates.activeCardIndex !== undefined) {
          updateData.active_card_index = updates.activeCardIndex;
        }
        if (updates.sharedModalState !== undefined) {
          updateData.shared_modal_state = updates.sharedModalState;
        }
        if (updates.videoCallState !== undefined) {
          updateData.video_call_state = updates.videoCallState;
        }
        if (updates.loadingStates !== undefined) {
          updateData.loading_states = updates.loadingStates;
        }
        if (updates.deckSelectionState !== undefined) {
          updateData.deck_selection_state = updates.deckSelectionState;
        }

        console.log('Updating session with data:', updateData);
        console.log('Session ID:', sessionState.id);
        console.log('User info:', { 
          userId: user?.id, 
          participantId,
          anonymousId,
          isHost,
          isAnonymous: !user
        });

        let supabaseClient = supabase;

        // For anonymous hosts, we need to ensure the RLS context includes our participant info
        // This is a workaround since Supabase RLS doesn't have direct access to anonymous session data
        if (!user && isHost && anonymousId) {
          console.log('Anonymous host update - using participant context');
          
          // First verify this anonymous user is indeed the host
          const { data: hostCheck } = await supabase
            .from('session_participants')
            .select('id, joined_at')
            .eq('session_id', sessionState.id)
            .eq('anonymous_id', anonymousId)
            .order('joined_at', { ascending: true })
            .limit(1)
            .single();
            
          if (!hostCheck) {
            throw new Error('Anonymous host verification failed');
          }
          
          console.log('Anonymous host verified:', hostCheck);
        }

        const { error } = await supabaseClient
          .from('reading_sessions')
          .update(updateData)
          .eq('id', sessionState.id);

        if (error) {
          console.error('Database update error:', error);
          console.error('Error details:', {
            message: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code
          });
          throw error;
        }

        // Update local state immediately for better UX
        set({
          sessionState: sessionState ? {
            ...sessionState,
            ...updates,
            updatedAt: new Date().toISOString()
          } : null
        });

      } catch (err: any) {
        console.error('Error updating session:', err);
        
        // For anonymous hosts who can't update due to RLS, fall back to broadcast
        if (!user && isHost && (
          err.message?.includes('permission') || 
          err.message?.includes('policy') || 
          err.message?.includes('insufficient_privilege') ||
          err.code === '42501' || // insufficient_privilege
          err.code === 'PGRST301' // permission denied
        )) {
          console.warn('Anonymous host cannot update directly, falling back to broadcast mechanism');
          
          // Broadcast the update for other participants to apply
          await get().broadcastGuestAction('hostUpdate', updates);
          
          // Update local state
          set({
            sessionState: sessionState ? {
              ...sessionState,
              ...updates,
              updatedAt: new Date().toISOString()
            } : null
          });
        } else if (!user && !isHost && (
          err.message?.includes('permission') || 
          err.message?.includes('policy')
        )) {
          // Expected for non-host guests
          console.warn('Guest cannot update database - this is expected behavior');
          set({
            sessionState: sessionState ? {
              ...sessionState,
              ...updates,
              updatedAt: new Date().toISOString()
            } : null
          });
        } else {
          console.error('Unexpected database error:', err);
          set({ error: err.message });
        }
      }
    },

    updatePresence: async () => {
      const { participantId } = get();
      
      if (!participantId) return;

      try {
        await supabase
          .from('session_participants')
          .update({ last_seen_at: new Date().toISOString() })
          .eq('id', participantId);
      } catch (err: any) {
        console.error('Error updating presence:', err);
      }
    },

    leaveSession: async () => {
      const { participantId } = get();
      
      if (!participantId) return;

      try {
        await supabase
          .from('session_participants')
          .update({ is_active: false })
          .eq('id', participantId);
      } catch (err: any) {
        console.error('Error leaving session:', err);
      }
    },

    upgradeGuestAccount: async (newUserId: string) => {
      const { participantId, anonymousId, sessionState, isHost } = get();
      
      if (!participantId || !anonymousId) return false;

      try {
        // Update the participant record to use the new user_id instead of anonymous_id
        const { error: participantError } = await supabase
          .from('session_participants')
          .update({ 
            user_id: newUserId,
            anonymous_id: null 
          })
          .eq('id', participantId);

        if (participantError) throw participantError;

        // If this guest was the host (created the session), update the session's host_user_id
        if (isHost && sessionState?.id && sessionState.hostUserId === null) {
          const { error: sessionError } = await supabase
            .from('reading_sessions')
            .update({ host_user_id: newUserId })
            .eq('id', sessionState.id);

          if (sessionError) {
            console.error('Error updating session host:', sessionError);
            // Don't fail the upgrade if session update fails, participant update is more important
          } else {
            // Update local session state
            set({
              sessionState: {
                ...sessionState,
                hostUserId: newUserId,
                updatedAt: new Date().toISOString()
              }
            });
          }
        }

        // Clear the anonymous ID from store since user is now authenticated
        set({ anonymousId: null });

        // Refresh participants list to show updated user info
        if (sessionState?.id) {
          try {
            const { data: updatedParticipants } = await supabase
              .from('session_participants')
              .select('*')
              .eq('session_id', sessionState.id)
              .eq('is_active', true);
            
            if (updatedParticipants) {
              set({ participants: updatedParticipants });
            }
          } catch (participantsError) {
            console.warn('Could not refresh participants after upgrade:', participantsError);
          }
        }

        console.log('✅ Guest account upgraded successfully in session store');
        return true;
      } catch (err: any) {
        console.error('Error upgrading guest account:', err);
        return false;
      }
    },

    setGuestName: async (name: string) => {
      const { participantId } = get();
      
      if (!participantId) return false;

      try {
        const { error } = await supabase
          .from('session_participants')
          .update({ name: name.trim() })
          .eq('id', participantId);

        if (error) throw error;
        return true;
      } catch (err: any) {
        console.error('Error setting guest name:', err);
        return false;
      }
    },

    setupRealtimeSubscriptions: () => {
      const { sessionState, channel } = get();
      
      if (!sessionState?.id) return;

      // Clean up existing channel
      if (channel) {
        channel.unsubscribe();
      }

      // Create new channel for this session
      const newChannel = supabase.channel(`reading-session:${sessionState.id}`, {
        config: {
          broadcast: { self: false },
          presence: { key: get().participantId || get().anonymousId || 'anonymous' }
        }
      });

      // Subscribe to session updates
      newChannel
        .on('postgres_changes', 
          { event: 'UPDATE', schema: 'public', table: 'reading_sessions', filter: `id=eq.${sessionState.id}` },
          (payload: any) => {
            console.log('Real-time session update received:', payload);
            const newSession = payload.new as any;
            const currentState = get().sessionState;
            const justRestored = get()._justRestoredFromPreservedState;
            
            if (currentState) {
              const localStateAge = Date.now() - new Date(currentState.updatedAt).getTime();
              const isRecentLocalUpdate = localStateAge < 2000; 
              const incomingCards = newSession.selected_cards || [];
              const currentCards = currentState.selectedCards || [];
              const wouldReduceCards = incomingCards.length < currentCards.length;
              const shouldPreserveLocalCards = isRecentLocalUpdate && wouldReduceCards && currentCards.length > 0;

              const stepOrder = ['setup', 'ask-question', 'drawing', 'interpretation'];
              const currentStepIndex = stepOrder.indexOf(currentState.readingStep);
              const incomingStepIndex = stepOrder.indexOf(newSession.reading_step);
              
              console.log('Real-time update analysis:', {
                localStateAge,
                isRecentLocalUpdate,
                currentSelectedCards: currentCards.length,
                incomingSelectedCards: incomingCards.length,
                wouldReduceCards,
                shouldPreserveLocalCards,
                justRestoredFromPreserved: justRestored,
                currentReadingStep: currentState.readingStep,
                incomingReadingStep: newSession.reading_step,
                currentStepIndex,
                incomingStepIndex,
                currentShuffledDeckLength: currentState.shuffledDeck?.length,
                incomingShuffledDeckLength: newSession.shuffled_deck?.length,
                currentQuestion: currentState.question,
                incomingQuestion: newSession.question,
                currentLayout: currentState.selectedLayout?.id,
                incomingLayout: newSession.selected_layout?.id
              });
              
              let finalShuffledDeck = newSession.shuffled_deck ?? [];
              if (justRestored && 
                  currentState.shuffledDeck && 
                  newSession.shuffled_deck && 
                  newSession.shuffled_deck.length > currentState.shuffledDeck.length) {
                console.log('[RT PRESERVE] ShuffledDeck: Using local (more cards removed).');
                finalShuffledDeck = currentState.shuffledDeck;
              }

              let finalReadingStep = newSession.reading_step;
              if (justRestored && incomingStepIndex < currentStepIndex) {
                console.log('[RT PRESERVE] ReadingStep: Using local (more advanced).');
                finalReadingStep = currentState.readingStep;
              }

              let finalSelectedLayout = newSession.selected_layout;
              if (justRestored && currentState.selectedLayout && !newSession.selected_layout) {
                console.log('[RT PRESERVE] SelectedLayout: Using local (incoming is null).');
                finalSelectedLayout = currentState.selectedLayout;
              }
              
              let finalQuestion = newSession.question;
              if (justRestored && currentState.question && !newSession.question) {
                console.log('[RT PRESERVE] Question: Using local (incoming is empty).');
                finalQuestion = currentState.question;
              }

              set({
                sessionState: {
                  ...currentState,
                  ...newSession,
                  shuffledDeck: finalShuffledDeck,
                  readingStep: finalReadingStep,
                  selectedLayout: finalSelectedLayout,
                  question: finalQuestion,
                  selectedCards: shouldPreserveLocalCards ? currentCards : (newSession.selected_cards || []),
                  updatedAt: newSession.updated_at || currentState.updatedAt || new Date().toISOString(),
                  deckId: newSession.deck_id || currentState.deckId,
                }
              });
            }
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
              set({ participants: data });
            }
          }
        )
        .on('broadcast', { event: 'guest_action' }, (payload: any) => {
          console.log('Received guest action:', payload);
          const { action, data, participantId: senderParticipantId } = payload.payload;
          const currentState = get();
          
          // Process different types of actions
          if (senderParticipantId !== currentState.participantId) {
            console.log('Processing action:', { action, data, fromHost: action === 'hostUpdate' });
            
            switch (action) {
              case 'updateSession':
                // Guest update - only process if we're the host
                if (currentState.isHost) {
                  console.log('Processing guest update as host');
                  get().updateSession(data);
                }
                break;
                
              case 'hostUpdate':
                // Host update - all participants should apply this
                console.log('Processing host update as participant');
                // Directly update local state since this comes from the host
                const sessionState = currentState.sessionState;
                if (sessionState) {
                  set({
                    sessionState: {
                      ...sessionState,
                      ...data,
                      updatedAt: new Date().toISOString()
                    }
                  });
                }
                break;
                
              case 'cardSelection':
                // Handle card selection from guest
                if (currentState.isHost && data.selectedCards) {
                  get().updateSession({ selectedCards: data.selectedCards });
                }
                break;
                
              default:
                console.log('Unknown guest action:', action);
            }
          }
        })
        .subscribe();

      set({ channel: newChannel });

      // Setup presence updates and session expiry checks
      const currentInterval = get().presenceInterval;
      if (currentInterval) {
        clearInterval(currentInterval);
      }
      
      const newInterval = setInterval(async () => {
        // Update presence
        get().updatePresence();
        
        // Check if current session has expired every 5 minutes (10 cycles)
        const now = Date.now();
        const lastExpiryCheck = (get() as any).lastExpiryCheck || 0;
        if (now - lastExpiryCheck > 5 * 60 * 1000) { // 5 minutes
          const isExpired = await get().checkSessionExpiry();
          if (isExpired) {
            console.log('Current session has expired, cleaning up...');
            get().cleanup();
            // Optionally redirect to home or show a message
            window.location.href = '/';
          }
          // Store the last check time
          (get() as any).lastExpiryCheck = now;
        }
      }, 30000); // Every 30 seconds

      set({ presenceInterval: newInterval });
    },

    syncCompleteSessionState: async (sessionId: string) => {
      try {
        console.log('Syncing complete session state for:', sessionId);
        
        const { isHost, sessionState: currentState } = get();
        
        // Fetch the latest session data
        const { data: session, error: sessionError } = await supabase
          .from('reading_sessions')
          .select('*')
          .eq('id', sessionId)
          .eq('is_active', true)
          .single();

        if (sessionError || !session) {
          console.error('Failed to fetch session for sync:', sessionError);
          return false;
        }

        // Convert to local format
        const syncedState: ReadingSessionState = {
          id: session.id,
          hostUserId: session.host_user_id,
          deckId: session.deck_id,
          selectedLayout: session.selected_layout,
          question: session.question || '',
          readingStep: session.reading_step,
          selectedCards: session.selected_cards || [],
          shuffledDeck: session.shuffled_deck ?? [],
          interpretation: session.interpretation || '',
          zoomLevel: session.zoom_level || 1.0,
          panOffset: session.pan_offset || { x: 0, y: 0 },
          zoomFocus: session.zoom_focus || null,
          activeCardIndex: session.active_card_index,
          sharedModalState: session.shared_modal_state || null,
          videoCallState: session.video_call_state || null,
          loadingStates: session.loading_states || null,
          deckSelectionState: session.deck_selection_state || null,
          isActive: session.is_active,
          createdAt: session.created_at,
          updatedAt: session.updated_at
        };

        // Check if we should preserve local state
        const { user } = useAuthStore.getState();
        const isSessionCreator = isHost || 
          (syncedState.hostUserId === null && !user) || // Guest session creator
          (syncedState.hostUserId === user?.id); // Authenticated session creator
          
        // Check if local state was recently updated (within last 10 seconds)
        const localStateAge = currentState ? Date.now() - new Date(currentState.updatedAt).getTime() : Infinity;
        const isRecentLocalUpdate = localStateAge < 10000; // 10 seconds
          
        if (currentState) {
          const currentStepOrder = ['setup', 'ask-question', 'drawing', 'interpretation'];
          const currentStepIndex = currentStepOrder.indexOf(currentState.readingStep);
          const syncedStepIndex = currentStepOrder.indexOf(syncedState.readingStep);
          
          console.log('Session sync check:', {
            isHost,
            isSessionCreator,
            isRecentLocalUpdate,
            localStateAge,
            currentStep: currentState.readingStep,
            syncedStep: syncedState.readingStep,
            currentStepIndex,
            syncedStepIndex,
            hostUserId: syncedState.hostUserId,
            currentUserId: user?.id
          });
          
          // Preserve local state if:
          // 1. User is session creator AND local state is more advanced, OR
          // 2. Local state was recently updated (user is actively working)
          const shouldPreserveLocal = 
            (isSessionCreator && currentStepIndex > syncedStepIndex) ||
            isRecentLocalUpdate;
            
          if (shouldPreserveLocal) {
            console.log('Preserving local state:', {
              reason: isRecentLocalUpdate ? 'recent local update' : 'session creator with advanced progress',
              preserving: {
                readingStep: currentState.readingStep,
                selectedLayout: currentState.selectedLayout,
                question: currentState.question,
                selectedCardsCount: currentState.selectedCards.length
              }
            });
            
            syncedState.readingStep = currentState.readingStep;
            syncedState.selectedLayout = currentState.selectedLayout || syncedState.selectedLayout;
            syncedState.question = currentState.question || syncedState.question;
            syncedState.selectedCards = currentState.selectedCards.length > 0 ? currentState.selectedCards : syncedState.selectedCards;
            syncedState.interpretation = currentState.interpretation || syncedState.interpretation;
            syncedState.activeCardIndex = currentState.activeCardIndex ?? syncedState.activeCardIndex;
          } else {
            console.log('Using synced state - no local preservation needed');
          }
        } else {
          console.log('No current state to preserve, using synced state');
        }

        set({ sessionState: syncedState });

        // Also sync participants
        const { data: participantsData } = await supabase
          .from('session_participants')
          .select('*')
          .eq('session_id', sessionId)
          .eq('is_active', true);

        if (participantsData) {
          set({ participants: participantsData });
        }

        console.log('Complete session state synced successfully:', syncedState);
        return true;
      } catch (error) {
        console.error('Error syncing complete session state:', error);
        return false;
      }
    },

    initializeSession: async () => {
      const { user } = useAuthStore.getState();
      const initialStoreState = get();
      
      set({ isLoading: true, error: null });

      try {
        let sessionId = initialStoreState.initialSessionId;
        let isNewSession = false;

        if (!sessionId) {
          isNewSession = true;
          console.log('Creating new session for user:', user?.id || 'anonymous (no auth user id yet)');
          sessionId = await get().createSession();
          if (!sessionId) {
            set({ error: 'Failed to create session', isLoading: false });
            return;
          }
          set({ isHost: true });
        }
        
        const { data: sessionData, error: sessionFetchError } = await supabase
          .from('reading_sessions')
          .select('*')
          .eq('id', sessionId)
              .single();
              
        if (sessionFetchError || !sessionData) {
          console.error('Failed to fetch session for initialization:', sessionFetchError);
          set({ error: 'Failed to load session data', isLoading: false });
          return;
        }
        
              set({
          sessionState: sessionData as ReadingSessionState,
          isHost: isNewSession || (user ? sessionData.host_user_id === user.id : sessionData.host_user_id === null),
          initialSessionId: sessionId
          // isLoading will be set to false after participant is resolved and state restored
        });

        let participantQueryInit = supabase
          .from('session_participants')
          .select('*')
          .eq('session_id', sessionId)
          .eq('is_active', true);

        if (user && user.email) {
          participantQueryInit = participantQueryInit.eq('user_id', user.id);
        } else if (user && !user.email) { // This is an anonymous Supabase auth user
          participantQueryInit = participantQueryInit.eq('anonymous_id', user.id);
            } else {
          console.warn("initializeSession: No valid user from authStore to find/create participant by.");
          // Attempt to use browser fingerprint if available, otherwise can't find participant
          const browserFingerprint = getPersistentBrowserId();
          if (browserFingerprint) {
             console.log("initializeSession: Trying to find participant by browser fingerprint:", browserFingerprint);
             participantQueryInit = participantQueryInit.eq('anonymous_id', browserFingerprint);
          } else {
            participantQueryInit = participantQueryInit.limit(0); 
          }
        }
        
        const { data: existingParticipantInit, error: existingParticipantErrorInit } = await participantQueryInit.maybeSingle();

        if (existingParticipantErrorInit && existingParticipantErrorInit.code !== 'PGRST116') { // PGRST116: 0 rows
            console.error("Error finding existing participant in initializeSession:", existingParticipantErrorInit);
        }

        let finalParticipantId: string | null = null;

        if (existingParticipantInit) {
          console.log('Found existing participant in initializeSession, reusing:', existingParticipantInit.id);
          finalParticipantId = existingParticipantInit.id;
          await supabase
                .from('session_participants')
            .update({ last_seen_at: new Date().toISOString() })
            .eq('id', existingParticipantInit.id);
        } else {
          console.log('Creating new participant in initializeSession as none found matching user/anon context...');
          const participantNameToSet = user?.username || 
                                     ((user && !user.email) ? (get().isHost ? 'Anonymous Host' : 'Anonymous Guest') : 
                                     (get().isHost ? 'Host' : 'Guest'));
          const anonymousIdToSet = (user && !user.email) ? user.id : (!user ? getPersistentBrowserId() : null);

          const participantDataToInsertInit = {
                  session_id: sessionId,
            user_id: (user && user.email) ? user.id : null,
            anonymous_id: anonymousIdToSet,
            name: participantNameToSet,
            is_active: true,
            role: get().isHost ? 'host' : 'participant'
          };
          console.log('Creating participant in initializeSession with:', participantDataToInsertInit);

          const { data: newParticipantInit, error: newParticipantErrorInit } = await supabase
            .from('session_participants')
            .insert(participantDataToInsertInit)
            .select('id') 
                .single();
                
          if (newParticipantErrorInit) {
            console.error('Error creating participant in initializeSession:', newParticipantErrorInit);
          } else if (newParticipantInit) {
            finalParticipantId = newParticipantInit.id;
            console.log('Participant created successfully in initializeSession:', finalParticipantId);
              }
        }

        if (!finalParticipantId) {
            console.error("Failed to establish participant ID in initializeSession.");
            set({ error: "Could not establish participant for session.", isLoading: false });
            return; 
        }
        set({ participantId: finalParticipantId });

        // --- BEGIN STATE RESTORATION LOGIC ---
        try {
          const restoredContextRaw = localStorage.getItem('session_context_restored');
          if (restoredContextRaw) {
            const restoredContext = JSON.parse(restoredContextRaw);
            console.log('Found session_context_restored:', restoredContext);

            if (restoredContext.sessionId === sessionId && 
                restoredContext.migrationComplete && 
                restoredContext.preserveState) {
                  
              const preservedStateRaw = localStorage.getItem('preserved_session_state');
              if (preservedStateRaw) {
                const preservedState = JSON.parse(preservedStateRaw);
                console.log('Applying preserved_session_state:', preservedState);
                
                // Merge into existing sessionState
                // Ensure all relevant fields from ReadingSessionState are considered
                const updatedSessionData = {
                  ...get().sessionState, // current session state from DB
                  ...preservedState,    // potentially overriding with preserved state
                  id: sessionId,        // ensure session ID is correct
                  // Explicitly carry over participant-specific or newly established things if needed
                  hostUserId: get().sessionState?.hostUserId || preservedState.hostUserId,
                  // Ensure deckId is consistent if it was part of preserved state or initial state
                  deckId: preservedState.deckId || get().sessionState?.deckId || initialStoreState.deckId,
                };
                
                // Use updateSession to ensure DB is also updated if this is the host
                // or if we want to ensure all fields are synced.
                // For now, just update local store, DB update will happen via normal interaction.
                set(state => ({
                  sessionState: updatedSessionData as ReadingSessionState,
                  // Update isHost based on the potentially updated hostUserId from preservedState
                  isHost: (user ? updatedSessionData.hostUserId === user.id : updatedSessionData.hostUserId === null) || state.isHost,
                  _justRestoredFromPreservedState: true // Set flag
                }));
                
                // Clear flag after a delay
                setTimeout(() => {
                  set({ _justRestoredFromPreservedState: false });
                  console.log('_justRestoredFromPreservedState flag cleared after timeout.');
                }, 3000);
            
                if (restoredContext.participantId && restoredContext.participantId !== finalParticipantId) {
                    console.warn(`Restored participantId (${restoredContext.participantId}) differs from established one (${finalParticipantId}). Using established one.`);
                }
                
                // Clean up localStorage
                localStorage.removeItem('preserved_session_state');
                localStorage.removeItem('session_context_restored'); // Remove this too as it's now processed
                console.log('✅ Preserved session state applied and localStorage cleaned.');
              } else {
                console.log('session_context_restored found, but no preserved_session_state item.');
                localStorage.removeItem('session_context_restored'); // Clean up if no corresponding state
              }
            } else {
              console.log('session_context_restored not applicable or migration not complete. SessionId match:', restoredContext.sessionId === sessionId);
              // If context is old or not for this session, remove it
              if (restoredContext.sessionId !== sessionId || Date.now() - (restoredContext.timestamp || 0) > 300000) { // Older than 5 mins
                localStorage.removeItem('session_context_restored');
              }
            }
          }
        } catch (e) {
          console.error('Error processing preserved session state:', e);
          // Clean up potentially corrupted localStorage items
          localStorage.removeItem('session_context_restored');
          localStorage.removeItem('preserved_session_state');
        }
        // --- END STATE RESTORATION LOGIC ---

        const { data: participantsDataFromDB, error: participantsError } = await supabase
                    .from('session_participants')
                    .select('*')
                    .eq('session_id', sessionId)
                    .eq('is_active', true);
                  
        if (participantsError) {
          console.warn('Failed to fetch participants list in initializeSession:', participantsError);
        } else if (participantsDataFromDB) {
          set({ participants: participantsDataFromDB as SessionParticipant[] });
        }
        
        set({ isLoading: false }); // Moved loading:false to after potential state restoration

        if (get().participantId) {
          get().setupRealtimeSubscriptions();
        } else {
          console.warn("initializeSession: Cannot setup realtime subscriptions without a participantId.");
        }

      } catch (err: any) {
        console.error('Error initializing session:', err);
        set({ error: err.message, isLoading: false });
      }
    },

    cleanup: () => {
      const state = get();
      
      // Leave session
      state.leaveSession();
      
      // Clean up channel
      if (state.channel) {
        state.channel.unsubscribe();
      }
      
      // Clean up presence interval
      if (state.presenceInterval) {
        clearInterval(state.presenceInterval);
      }
      
      // Reset state
      set({
        channel: null,
        presenceInterval: null,
        participantId: null
      });
    },

    // Video call management functions
    startVideoCall: async () => {
      const { sessionState, participantId } = get();
      
      console.log('startVideoCall called with state:', {
        sessionId: sessionState?.id,
        participantId,
        hasSession: !!sessionState,
        hasParticipantId: !!participantId
      });
      
      if (!sessionState?.id || !participantId) {
        console.error('Cannot start video call: No session or participant ID');
        console.error('Current state:', {
          sessionState: sessionState ? { id: sessionState.id } : null,
          participantId,
          allState: get()
        });
        return null;
      }

      try {
        // Generate a video session ID (could be same as reading session or separate)
        const videoSessionId = sessionState.id; // Use same ID for simplicity
        
        // Update session state to indicate video call is active
        await get().updateSession({
          videoCallState: {
            isActive: true,
            sessionId: videoSessionId,
            hostParticipantId: participantId,
            participants: [participantId]
          }
        });

        return videoSessionId;
      } catch (error) {
        console.error('Error starting video call:', error);
        return null;
      }
    },

    joinVideoCall: async (videoSessionId: string) => {
      const { sessionState, participantId } = get();
      
      console.log('joinVideoCall called with state:', {
        videoSessionId,
        sessionId: sessionState?.id,
        participantId,
        hasSession: !!sessionState,
        hasParticipantId: !!participantId
      });
      
      if (!sessionState?.id || !participantId) {
        console.error('Cannot join video call: No session or participant ID');
        console.error('Current state:', {
          sessionState: sessionState ? { id: sessionState.id } : null,
          participantId,
          allState: get()
        });
        return false;
      }

      try {
        const currentVideoState = sessionState.videoCallState;
        
        if (!currentVideoState?.isActive) {
          console.error('No active video call to join');
          return false;
        }

        // Add participant to video call
        const updatedParticipants = currentVideoState.participants.includes(participantId)
          ? currentVideoState.participants
          : [...currentVideoState.participants, participantId];

        await get().updateSession({
          videoCallState: {
            ...currentVideoState,
            participants: updatedParticipants
          }
        });

        return true;
      } catch (error) {
        console.error('Error joining video call:', error);
        return false;
      }
    },

    leaveVideoCall: async () => {
      const { sessionState, participantId } = get();
      
      console.log('leaveVideoCall called with state:', {
        sessionId: sessionState?.id,
        participantId,
        hasSession: !!sessionState,
        hasParticipantId: !!participantId
      });
      
      if (!sessionState?.id || !participantId) {
        console.error('Cannot leave video call: No session or participant ID');
        console.error('Current state:', {
          sessionState: sessionState ? { id: sessionState.id } : null,
          participantId,
          allState: get()
        });
        return;
      }

      try {
        const currentVideoState = sessionState.videoCallState;
        
        if (!currentVideoState?.isActive) {
          return; // No active video call
        }

        // Remove participant from video call
        const updatedParticipants = currentVideoState.participants.filter(p => p !== participantId);
        
        // If no participants left or if host is leaving, end the call
        if (updatedParticipants.length === 0 || currentVideoState.hostParticipantId === participantId) {
          await get().updateSession({
            videoCallState: {
              ...currentVideoState,
              isActive: false,
              participants: []
            }
          });
        } else {
          await get().updateSession({
            videoCallState: {
              ...currentVideoState,
              participants: updatedParticipants
            }
          });
        }
      } catch (error) {
        console.error('Error leaving video call:', error);
      }
    },

    updateVideoCallParticipants: async (participants: string[]) => {
      const { sessionState } = get();
      
      if (!sessionState?.id) {
        console.error('Cannot update video call participants: No session ID');
        return;
      }

      try {
        const currentVideoState = sessionState.videoCallState;
        
        if (!currentVideoState?.isActive) {
          console.error('No active video call to update');
          return;
        }

        await get().updateSession({
          videoCallState: {
            ...currentVideoState,
            participants
          }
        });
      } catch (error) {
        console.error('Error updating video call participants:', error);
      }
    },

    broadcastGuestAction: async (action: string, data: any) => {
      const { channel, participantId, sessionState } = get();
      
      if (!channel || !sessionState?.id) {
        console.error('Cannot broadcast guest action: No channel or session');
        return;
      }

      try {
        console.log('Broadcasting guest action:', { action, data, participantId });
        
        const payload = {
          action,
          data,
          participantId,
          timestamp: Date.now()
        };

        channel.send({
          type: 'broadcast',
          event: 'guest_action',
          payload
        });
      } catch (error) {
        console.error('Error broadcasting guest action:', error);
      }
    },

    subscribeToBroadcast: (callback: (action: string, data: any, participantId: string) => void) => {
      const { channel } = get();
      
      if (!channel) {
        console.warn('Cannot subscribe to broadcast: No channel available');
        return () => {}; // Return empty unsubscribe function
      }

      // Subscribe to broadcast events
      const unsubscribe = channel.on('broadcast', { event: 'guest_action' }, (payload: any) => {
        const { action, data, participantId } = payload.payload;
        callback(action, data, participantId);
      });

      // Return unsubscribe function
      return () => {
        if (unsubscribe && typeof unsubscribe.unsubscribe === 'function') {
          unsubscribe.unsubscribe();
        }
      };
    },

    cleanupInactiveSessions: async () => {
      try {
        // Call the database function to cleanup inactive sessions
        const { error } = await supabase.rpc('cleanup_inactive_sessions');
        
        if (error) {
          console.error('Error cleaning up inactive sessions:', error);
        } else {
          console.log('Successfully cleaned up inactive sessions');
        }
      } catch (err: any) {
        console.error('Error in cleanupInactiveSessions:', err);
      }
    },

    checkSessionExpiry: async () => {
      const { sessionState } = get();
      
      if (!sessionState?.id) return false;

      try {
        // Check if current session has any active participants
        const { data: activeParticipants, error } = await supabase
          .from('session_participants')
          .select('last_seen_at')
          .eq('session_id', sessionState.id)
          .eq('is_active', true);

        if (error) {
          console.error('Error checking session expiry:', error);
          return false;
        }

        // If no active participants, session should be considered expired
        if (!activeParticipants || activeParticipants.length === 0) {
          console.log('Session expired: no active participants');
          return true;
        }

        // Check if all participants have been inactive for more than 1 hour
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        const allInactive = activeParticipants.every(participant => {
          const lastSeen = new Date(participant.last_seen_at);
          return lastSeen < oneHourAgo;
        });

        if (allInactive) {
          console.log('Session expired: all participants inactive for over 1 hour');
          
          // Mark session as inactive
          await supabase
            .from('reading_sessions')
            .update({ is_active: false })
            .eq('id', sessionState.id);
          
          return true;
        }

        return false;
      } catch (err: any) {
        console.error('Error checking session expiry:', err);
        return false;
      }
    }
  }))
);

// Computed selectors
export const getIsGuest = () => {
  const { user, isAnonymous } = useAuthStore.getState();
  const { anonymousId } = useReadingSessionStore.getState();
  // User is a guest if they don't exist OR if they're anonymous (have user object but no email)
  return (!user && !!anonymousId) || (user && isAnonymous());
}; 