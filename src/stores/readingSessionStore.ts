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
      const state = get();
      
      // Ensure anonymous ID is set for non-authenticated users before joining
      if (!user && !state.anonymousId) {
        const browserFingerprint = getPersistentBrowserId();
        set({ anonymousId: browserFingerprint });
        console.log('Generated browser fingerprint for joining session:', browserFingerprint);
      }
      
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

        // Immediately set the session state for the joining user
        const sessionState: ReadingSessionState = {
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
          isActive: session.is_active,
          createdAt: session.created_at,
          updatedAt: session.updated_at
        };

        // Set the session state immediately for better UX
        set({ sessionState });

        // Determine if user should be host based on access method and session ownership
        const { determineUserRole } = await import('../utils/inviteLinks');
        const userRole = determineUserRole(accessMethod, session.host_user_id, user?.id || null);
        const shouldBeHost = userRole === 'host';
        
        console.log('User role determination:', {
          accessMethod,
          sessionHostUserId: session.host_user_id,
          currentUserId: user?.id || null,
          determinedRole: userRole,
          shouldBeHost
        });

        set({ isHost: shouldBeHost });

        // Add participant
        const currentState = get(); // Get updated state after potential anonymousId setting
        const { data: participant, error: participantError } = await supabase
          .from('session_participants')
          .insert({
            session_id: sessionId,
            user_id: user?.id || null,
            anonymous_id: user ? null : currentState.anonymousId,
            is_active: true
          })
          .select()
          .single();
          
        console.log('Creating participant with:', {
          session_id: sessionId,
          user_id: user?.id || null,
          anonymous_id: user ? null : currentState.anonymousId,
          is_active: true
        });

        if (participantError) throw participantError;

        set({ participantId: participant.id });
        
        // Fetch current participants list
        const { data: participantsData } = await supabase
          .from('session_participants')
          .select('*')
          .eq('session_id', sessionId)
          .eq('is_active', true);

        if (participantsData) {
          set({ participants: participantsData });
        }

        console.log('Successfully joined session with complete state:', sessionState);
        return sessionId;
      } catch (err: any) {
        console.error('Error joining session:', err);
        set({ error: err.message });
        return null;
      }
    },

    updateSession: async (updates: Partial<ReadingSessionState>) => {
      const { sessionState, isOfflineMode, isHost } = get();
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

      // If user is a guest (not authenticated and not host), use broadcast instead of direct DB update
      if (!user && !isHost) {
        console.log('Guest user broadcasting action instead of direct DB update');
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

        console.log('Updating session with data:', updateData);
        console.log('Session ID:', sessionState.id);
        console.log('User info:', { 
          userId: useAuthStore.getState().user?.id, 
          participantId: get().participantId,
          anonymousId: get().anonymousId,
          isHost: get().isHost 
        });

        const { error } = await supabase
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
        
        // For development/guest users, update local state even if DB update fails
        if (err.message?.includes('permission') || 
            err.message?.includes('policy') || 
            err.message?.includes('insufficient_privilege') ||
            err.code === '42501' || // insufficient_privilege
            err.code === 'PGRST301') { // permission denied
          console.warn('Database update failed due to permissions, updating local state only');
          console.warn('This is expected for guests - they can see updates but cannot modify the database');
          set({
            sessionState: sessionState ? {
              ...sessionState,
              ...updates,
              updatedAt: new Date().toISOString()
            } : null
          });
        } else {
          console.error('Unexpected database error, setting error state');
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
            
            if (currentState) {
              const updatedState = {
                ...currentState,
                selectedLayout: newSession.selected_layout,
                question: newSession.question || '',
                readingStep: newSession.reading_step,
                selectedCards: newSession.selected_cards || [],
                shuffledDeck: newSession.shuffled_deck ?? [],
                interpretation: newSession.interpretation || '',
                zoomLevel: newSession.zoom_level || 1.0,
                panOffset: newSession.pan_offset || { x: 0, y: 0 },
                zoomFocus: newSession.zoom_focus || null,
                activeCardIndex: newSession.active_card_index,
                sharedModalState: newSession.shared_modal_state || null,
                videoCallState: newSession.video_call_state || null,
                deckId: newSession.deck_id, // Ensure deck ID is synced
                updatedAt: newSession.updated_at
              };
              
              console.log('Updating local state with:', updatedState);
              set({ sessionState: updatedState });
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
          
          // Only process if we're the host and this isn't from ourselves
          if (currentState.isHost && senderParticipantId !== currentState.participantId) {
            console.log('Processing guest action as host:', { action, data });
            
            // Handle different guest actions
            switch (action) {
              case 'updateSession':
                // Apply the guest's session updates
                get().updateSession(data);
                break;
              case 'cardSelection':
                // Handle card selection from guest
                if (data.selectedCards) {
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

      // Setup presence updates
      const currentInterval = get().presenceInterval;
      if (currentInterval) {
        clearInterval(currentInterval);
      }
      
      const newInterval = setInterval(() => {
        get().updatePresence();
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
      const state = get();
      
      set({ isLoading: true, error: null });

      // Generate persistent browser ID for non-authenticated users
      if (!user && !state.anonymousId) {
        set({ anonymousId: getPersistentBrowserId() });
      }

      try {
        let sessionId = state.initialSessionId;

        if (!sessionId) {
          // Create new session - user becomes host
          // This happens when accessing from:
          // - Navbar "Try Free Reading"
          // - Home page "Start Reading"
          // - Collections page deck selection
          // - Marketplace deck selection
          // - Any internal navigation creating new session
          console.log('Creating new session for user:', user?.id || 'anonymous');
          sessionId = await get().createSession();
          if (!sessionId) {
            set({ error: 'Failed to create session' });
            return;
          }
          set({ isHost: true });

          // Create participant record for the host
          try {
            const currentState = get(); // Get updated state after potential anonymousId setting
            const { data: participant, error: participantError } = await supabase
              .from('session_participants')
              .insert({
                session_id: sessionId,
                user_id: user?.id || null,
                anonymous_id: user ? null : currentState.anonymousId,
                is_active: true
              })
              .select()
              .single();
              
            console.log('Creating host participant with:', {
              session_id: sessionId,
              user_id: user?.id || null,
              anonymous_id: user ? null : currentState.anonymousId,
              is_active: true
            });

            if (participantError) {
              console.error('Error creating host participant:', participantError);
              // Don't fail session creation if participant creation fails
            } else {
              set({ participantId: participant.id });
              console.log('Host participant created successfully:', participant.id);
              console.log('participantId set in store:', get().participantId);
            }
          } catch (participantErr) {
            console.error('Error creating host participant:', participantErr);
            // Don't fail session creation if participant creation fails
          }
        } else {
          // Check if it's a local session first
          if (sessionId.startsWith('local_')) {
            console.log('Loading local session:', sessionId);
            const localSession = get().loadLocalSession(sessionId);
            if (localSession) {
              set({
                sessionState: localSession,
                isHost: true,
                isOfflineMode: true,
                isLoading: false
              });
              
              // Try to sync to database in the background
              setTimeout(async () => {
                const synced = await get().syncLocalSessionToDatabase();
                if (synced) {
                  console.log('Local session successfully synced to database');
                }
              }, 1000);
              
              return;
            } else {
              set({ error: 'Local session not found' });
              return;
            }
          }
          
          // Join existing database session
          console.log('Joining existing session:', sessionId);
          
          // Determine access method from URL params (this would be passed from the component)
          const urlParams = new URLSearchParams(window.location.search);
          const accessMethod = urlParams.get('invite') === 'true' ? 'invite' : 'direct';
          
          const joinedSessionId = await get().joinSession(sessionId, accessMethod);
          if (!joinedSessionId) return;
          sessionId = joinedSessionId;
          
          // Note: isHost is now set within joinSession based on access method
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
            set({
              sessionState: {
                id: sessionId,
                hostUserId: user?.id || null,
                deckId: state.deckId,
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
                isActive: true,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
              }
            });
            
            // Try to create a participant record even if session fetch failed
            try {
              const currentState = get();
              const { data: participant, error: participantError } = await supabase
                .from('session_participants')
                .insert({
                  session_id: sessionId,
                  user_id: user?.id || null,
                  anonymous_id: user ? null : currentState.anonymousId,
                  is_active: true
                })
                .select()
                .single();
                
              if (!participantError && participant) {
                set({ participantId: participant.id });
                console.log('Created participant record for fallback session:', participant.id);
                console.log('participantId set in store:', get().participantId);
              }
            } catch (participantErr) {
              console.error('Error creating participant for fallback session:', participantErr);
            }
          }
        } else {
          // Convert database format to component format
          set({
            sessionState: {
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
              isActive: session.is_active,
              createdAt: session.created_at,
              updatedAt: session.updated_at
            }
          });

          // Check if current user is host
          if (user && session.host_user_id === user.id) {
            set({ isHost: true });
          }
        }

        // Fetch participants and ensure current user has a participant record
        try {
          const { data: participantsData } = await supabase
            .from('session_participants')
            .select('*')
            .eq('session_id', sessionId)
            .eq('is_active', true);

          if (participantsData) {
            set({ participants: participantsData });
            
            // Check if current user has a participant record
            const currentState = get();
            const currentUserParticipant = participantsData.find(p => 
              (user && p.user_id === user.id) || 
              (!user && p.anonymous_id === currentState.anonymousId)
            );
            
            if (currentUserParticipant) {
              set({ participantId: currentUserParticipant.id });
              console.log('Found existing participant record:', currentUserParticipant.id);
              console.log('participantId set in store:', get().participantId);
            } else {
              // Create participant record if it doesn't exist
              console.log('No participant record found, creating one...');
              try {
                const { data: newParticipant, error: participantError } = await supabase
                  .from('session_participants')
                  .insert({
                    session_id: sessionId,
                    user_id: user?.id || null,
                    anonymous_id: user ? null : currentState.anonymousId,
                    is_active: true
                  })
                  .select()
                  .single();
                  
                if (participantError) {
                  console.error('Error creating participant record:', participantError);
                } else {
                  set({ participantId: newParticipant.id });
                  console.log('Created new participant record:', newParticipant.id);
                  console.log('participantId set in store:', get().participantId);
                  
                  // Refresh participants list
                  const { data: updatedParticipants } = await supabase
                    .from('session_participants')
                    .select('*')
                    .eq('session_id', sessionId)
                    .eq('is_active', true);
                  
                  if (updatedParticipants) {
                    set({ participants: updatedParticipants });
                  }
                }
              } catch (createParticipantErr) {
                console.error('Error creating participant record:', createParticipantErr);
              }
            }
          }
        } catch (participantsError) {
          console.warn('Failed to fetch participants:', participantsError);
          // Continue without participants data
        }

        // Setup realtime subscriptions after participant ID is set
        // Add a small delay to ensure participant ID is properly set
        setTimeout(() => {
          get().setupRealtimeSubscriptions();
        }, 100);

      } catch (err: any) {
        console.error('Error initializing session:', err);
        set({ error: err.message });
      } finally {
        set({ isLoading: false });
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
    }
  }))
);

// Computed selectors
export const getIsGuest = () => {
  const { user } = useAuthStore.getState();
  const { anonymousId } = useReadingSessionStore.getState();
  return !user && !!anonymousId;
}; 