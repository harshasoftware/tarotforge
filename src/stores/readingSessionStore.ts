import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { supabase } from '../lib/supabase';
import { useAuthStore } from './authStore';
import { ReadingLayout, Card } from '../types';
import { RealtimeChannel } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

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
  joinSession: (sessionId: string) => Promise<string | null>;
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
  cleanup: () => void;
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
        interpretation: '',
        zoomLevel: 1.0,
        activeCardIndex: null,
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

    joinSession: async (sessionId: string) => {
      const { user } = useAuthStore.getState();
      const state = get();
      
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
            anonymous_id: user ? null : state.anonymousId,
            is_active: true
          })
          .select()
          .single();

        if (participantError) throw participantError;

        set({ participantId: participant.id });
        return sessionId;
      } catch (err: any) {
        console.error('Error joining session:', err);
        set({ error: err.message });
        return null;
      }
    },

    updateSession: async (updates: Partial<ReadingSessionState>) => {
      const { sessionState, isOfflineMode } = get();
      
      if (!sessionState?.id) {
        console.warn('No session ID available for update');
        return;
      }

      // If in offline mode or local session, use local update
      if (isOfflineMode || sessionState.id.startsWith('local_')) {
        get().updateLocalSession(updates);
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
        if (updates.interpretation !== undefined) {
          updateData.interpretation = updates.interpretation;
        }
        if (updates.zoomLevel !== undefined) {
          updateData.zoom_level = updates.zoomLevel;
        }
        if (updates.activeCardIndex !== undefined) {
          updateData.active_card_index = updates.activeCardIndex;
        }

        console.log('Updating session with data:', updateData);

        const { error } = await supabase
          .from('reading_sessions')
          .update(updateData)
          .eq('id', sessionState.id);

        if (error) {
          console.error('Database update error:', error);
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
        if (err.message?.includes('permission') || err.message?.includes('policy')) {
          console.warn('Database update failed due to permissions, updating local state only');
          set({
            sessionState: sessionState ? {
              ...sessionState,
              ...updates,
              updatedAt: new Date().toISOString()
            } : null
          });
        } else {
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
            console.log('Session updated:', payload);
            const newSession = payload.new as any;
            const currentState = get().sessionState;
            
            if (currentState) {
              set({
                sessionState: {
                  ...currentState,
                  selectedLayout: newSession.selected_layout,
                  question: newSession.question,
                  readingStep: newSession.reading_step,
                  selectedCards: newSession.selected_cards,
                  interpretation: newSession.interpretation,
                  zoomLevel: newSession.zoom_level,
                  activeCardIndex: newSession.active_card_index,
                  updatedAt: newSession.updated_at
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

    initializeSession: async () => {
      const { user } = useAuthStore.getState();
      const state = get();
      
      set({ isLoading: true, error: null });

      // Generate anonymous ID for non-authenticated users
      if (!user && !state.anonymousId) {
        set({ anonymousId: uuidv4() });
      }

      try {
        let sessionId = state.initialSessionId;

        if (!sessionId) {
          // Create new session
          console.log('Creating new session for user:', user?.id || 'anonymous');
          sessionId = await get().createSession();
          if (!sessionId) {
            set({ error: 'Failed to create session' });
            return;
          }
          set({ isHost: true });
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
          const joinedSessionId = await get().joinSession(sessionId);
          if (!joinedSessionId) return;
          sessionId = joinedSessionId;
          set({ isHost: false });
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
                interpretation: '',
                zoomLevel: 1.0,
                activeCardIndex: null,
                isActive: true,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
              }
            });
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
              interpretation: session.interpretation || '',
              zoomLevel: session.zoom_level || 1.0,
              activeCardIndex: session.active_card_index,
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

        // Fetch participants (optional, don't fail if this doesn't work)
        try {
          const { data: participantsData } = await supabase
            .from('session_participants')
            .select('*')
            .eq('session_id', sessionId)
            .eq('is_active', true);

          if (participantsData) {
            set({ participants: participantsData });
          }
        } catch (participantsError) {
          console.warn('Failed to fetch participants:', participantsError);
          // Continue without participants data
        }

        // Setup realtime subscriptions
        get().setupRealtimeSubscriptions();

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
    }
  }))
);

// Computed selectors
export const getIsGuest = () => {
  const { user } = useAuthStore.getState();
  const { anonymousId } = useReadingSessionStore.getState();
  return !user && !!anonymousId;
}; 