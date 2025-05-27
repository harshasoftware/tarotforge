import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { supabase } from '../lib/supabase';
import { useAuthStore } from './authStore';
import { ReadingLayout, Card } from '../types';
import { RealtimeChannel, RealtimePresenceState } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import { getPersistentBrowserId } from '../utils/browserFingerprint';
import { debounce, throttle } from 'lodash';

// Enhanced types for collaborative session
export interface HostTransfer {
  from: string;
  to: string;
  timestamp: string;
  type: 'manual' | 'auto_reader_join' | 'auto_reclaim';
  reason?: string;
}

export interface PendingTransfer {
  toUserId: string;
  fromUserId: string;
  expiresAt: string;
}

export interface ViewState {
  panOffset: { x: number; y: number };
  zoomLevel: number;
  zoomFocus: { x: number; y: number } | null;
}

export interface PresenceData {
  cursor?: { x: number; y: number };
  isTyping?: boolean;
  viewportBounds?: { x: number; y: number; width: number; height: number };
  lastActivity?: number;
  isFollowing?: string | null;
  userId?: string;
  name?: string;
}

export interface CollaborativeSessionState {
  // Core session data (immediate sync)
  id: string;
  hostUserId: string | null;
  originalHostUserId: string | null;
  hostTransferHistory: HostTransfer[];
  pendingHostTransfer: PendingTransfer | null;
  deckId: string;
  selectedLayout: ReadingLayout | null;
  question: string;
  readingStep: 'setup' | 'ask-question' | 'drawing' | 'interpretation';
  selectedCards: (Card & { position: string; isReversed: boolean; x?: number; y?: number; customPosition?: string })[];
  shuffledDeck: Card[];
  interpretation: string;
  activeCardIndex: number | null;
  sharedModalState: {
    isOpen: boolean;
    cardIndex: number | null;
    showDescription: boolean;
    triggeredBy: string | null;
  } | null;
  videoCallState: {
    isActive: boolean;
    sessionId: string | null;
    hostParticipantId: string | null;
    participants: string[];
  } | null;
  loadingStates?: {
    isShuffling: boolean;
    isGeneratingInterpretation: boolean;
    triggeredBy: string | null;
  } | null;
  deckSelectionState?: {
    isOpen: boolean;
    activeTab: 'collection' | 'marketplace';
    selectedMarketplaceDeck: string | null;
    triggeredBy: string | null;
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
  role?: 'host' | 'participant' | 'reader';
}

interface PerformanceMetrics {
  dbUpdatesPerMinute: number;
  presenceUpdatesPerMinute: number;
  averageLatency: number;
  activePeerConnections: number;
  lastDbUpdate: number;
  lastPresenceUpdate: number;
}

interface CollaborativeStore {
  // State
  sessionState: CollaborativeSessionState | null;
  localViewState: ViewState;
  viewUpdateQueue: Partial<ViewState>;
  participants: SessionParticipant[];
  presence: { [userId: string]: PresenceData };
  isHost: boolean;
  isLoading: boolean;
  error: string | null;
  participantId: string | null;
  anonymousId: string | null;
  
  // Channels
  channel: RealtimeChannel | null;
  presenceChannel: RealtimeChannel | null;
  viewportChannel: RealtimeChannel | null;
  
  // Performance
  metrics: PerformanceMetrics;
  metricsInterval: NodeJS.Timeout | null;
  
  // Sync state
  syncStage: 'critical' | 'view' | 'presence' | 'full' | 'complete';
  isOfflineMode: boolean;
  pendingSyncData: Partial<CollaborativeSessionState> | null;
  
  // Actions - Core
  setSessionState: (sessionState: CollaborativeSessionState | null) => void;
  setParticipants: (participants: SessionParticipant[]) => void;
  setPresence: (presence: { [userId: string]: PresenceData }) => void;
  setIsHost: (isHost: boolean) => void;
  setIsLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  
  // Actions - Session Management
  createSession: (asReader?: boolean) => Promise<string | null>;
  joinSession: (sessionId: string, accessMethod?: 'invite' | 'direct' | 'reader') => Promise<string | null>;
  leaveSession: () => Promise<void>;
  
  // Actions - Updates
  updateImmediate: (updates: Partial<CollaborativeSessionState>) => Promise<void>;
  queueViewUpdate: (updates: Partial<ViewState>) => void;
  flushViewQueue: () => Promise<void>;
  updatePresence: (presence: Partial<PresenceData>) => void;
  
  // Actions - Host Transfer
  transferHost: (toUserId: string, autoTransfer?: boolean) => Promise<void>;
  acceptHostTransfer: () => Promise<void>;
  rejectHostTransfer: () => Promise<void>;
  reclaimHost: () => Promise<void>;
  
  // Actions - Realtime
  setupRealtimeSubscriptions: () => void;
  setupPresenceChannel: () => void;
  setupViewportChannel: () => void;
  cleanup: () => void;
  
  // Actions - Performance
  updateMetric: (metric: keyof PerformanceMetrics, value?: number) => void;
  resetMetrics: () => void;
  
  // Actions - Progressive Sync
  loadCriticalData: (sessionId: string) => Promise<void>;
  loadViewState: (sessionId: string) => Promise<void>;
  loadFullData: (sessionId: string) => Promise<void>;
  
  // Actions - Conflict Resolution
  resolveConflicts: (updates: Partial<CollaborativeSessionState>, currentState: CollaborativeSessionState, isHost: boolean) => Partial<CollaborativeSessionState>;
}

// Debounced view queue flush function
const createDebouncedFlush = () => {
  let flushFn: (() => Promise<void>) | null = null;
  
  const debouncedFlush = debounce(async () => {
    if (flushFn) await flushFn();
  }, 100);
  
  return {
    setFlushFn: (fn: () => Promise<void>) => { flushFn = fn; },
    flush: debouncedFlush
  };
};

const { setFlushFn, flush: debouncedFlush } = createDebouncedFlush();

// Throttled presence update function
const createThrottledPresence = () => {
  let updateFn: ((presence: Partial<PresenceData>) => void) | null = null;
  
  const throttledUpdate = throttle((presence: Partial<PresenceData>) => {
    if (updateFn) updateFn(presence);
  }, 50);
  
  return {
    setUpdateFn: (fn: (presence: Partial<PresenceData>) => void) => { updateFn = fn; },
    update: throttledUpdate
  };
};

const { setUpdateFn, update: throttledPresenceUpdate } = createThrottledPresence();

export const useCollaborativeStore = create<CollaborativeStore>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    sessionState: null,
    localViewState: { panOffset: { x: 0, y: 0 }, zoomLevel: 1, zoomFocus: null },
    viewUpdateQueue: {},
    participants: [],
    presence: {},
    isHost: false,
    isLoading: true,
    error: null,
    participantId: null,
    anonymousId: null,
    channel: null,
    presenceChannel: null,
    viewportChannel: null,
    metrics: {
      dbUpdatesPerMinute: 0,
      presenceUpdatesPerMinute: 0,
      averageLatency: 0,
      activePeerConnections: 0,
      lastDbUpdate: Date.now(),
      lastPresenceUpdate: Date.now()
    },
    metricsInterval: null,
    syncStage: 'critical',
    isOfflineMode: false,
    pendingSyncData: null,

    // Core setters
    setSessionState: (sessionState) => set({ sessionState }),
    setParticipants: (participants) => set({ participants }),
    setPresence: (presence) => set({ presence }),
    setIsHost: (isHost) => set({ isHost }),
    setIsLoading: (isLoading) => set({ isLoading }),
    setError: (error) => set({ error }),

    // Create session with role support
    createSession: async (asReader = false) => {
      const { user } = useAuthStore.getState();
      
      try {
        const { data, error } = await supabase
          .from('reading_sessions')
          .insert({
            host_user_id: user?.id || null,
            original_host_user_id: user?.id || null,
            host_transfer_history: [],
            pending_host_transfer: null,
            deck_id: 'rider-waite-classic',
            reading_step: 'setup',
            selected_cards: [],
            shuffled_deck: [],
            zoom_level: 1.0,
            pan_offset: { x: 0, y: 0 },
            zoom_focus: null,
            shared_modal_state: null,
            is_active: true
          })
          .select()
          .single();

        if (error) throw error;

        get().updateMetric('dbUpdatesPerMinute');
        return data.id;
      } catch (err: any) {
        console.error('Error creating session:', err);
        set({ error: err.message });
        return null;
      }
    },

    // Join session with progressive loading
    joinSession: async (sessionId: string, accessMethod = 'direct') => {
      const { user } = useAuthStore.getState();
      const state = get();
      
      // Ensure anonymous ID for guests
      if (!user && !state.anonymousId) {
        const browserFingerprint = getPersistentBrowserId();
        set({ anonymousId: browserFingerprint });
      }
      
      try {
        set({ isLoading: true, syncStage: 'critical' });
        
        // Stage 1: Load critical data immediately
        await get().loadCriticalData(sessionId);
        
        // Create participant record
        const currentState = get();
        const { data: participant, error: participantError } = await supabase
          .from('session_participants')
          .insert({
            session_id: sessionId,
            user_id: user?.id || null,
            anonymous_id: user ? null : currentState.anonymousId,
            is_active: true,
            role: accessMethod === 'reader' ? 'reader' : 'participant'
          })
          .select()
          .single();

        if (participantError) throw participantError;
        set({ participantId: participant.id });

        // Check for auto host transfer if joining as reader
        const { sessionState } = get();
        if (accessMethod === 'reader' && sessionState?.pendingHostTransfer?.toUserId === user?.id) {
          await get().acceptHostTransfer();
        }

        // Stage 2: Setup realtime subscriptions
        get().setupRealtimeSubscriptions();
        get().setupPresenceChannel();
        
        // Stage 3: Load view state (delayed)
        setTimeout(async () => {
          set({ syncStage: 'view' });
          await get().loadViewState(sessionId);
          get().setupViewportChannel();
        }, 500);
        
        // Stage 4: Load full data (delayed)
        setTimeout(async () => {
          set({ syncStage: 'full' });
          await get().loadFullData(sessionId);
        }, 2000);

        return sessionId;
      } catch (err: any) {
        console.error('Error joining session:', err);
        set({ error: err.message });
        return null;
      } finally {
        set({ isLoading: false });
      }
    },

    // Leave session
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

    // Immediate updates for critical data
    updateImmediate: async (updates) => {
      const { sessionState, isHost } = get();
      const { user } = useAuthStore.getState();
      
      if (!sessionState?.id) return;

      // Apply conflict resolution
      const resolvedUpdates = get().resolveConflicts(updates, sessionState, isHost);

      // Update local state immediately
      set({
        sessionState: {
          ...sessionState,
          ...resolvedUpdates,
          updatedAt: new Date().toISOString()
        }
      });

      // Update metrics
      get().updateMetric('dbUpdatesPerMinute');

      try {
        // Build database update object
        const dbUpdate: any = {};
        
        // Map fields to database columns
        if (resolvedUpdates.hostUserId !== undefined) dbUpdate.host_user_id = resolvedUpdates.hostUserId;
        if (resolvedUpdates.originalHostUserId !== undefined) dbUpdate.original_host_user_id = resolvedUpdates.originalHostUserId;
        if (resolvedUpdates.hostTransferHistory !== undefined) dbUpdate.host_transfer_history = resolvedUpdates.hostTransferHistory;
        if (resolvedUpdates.pendingHostTransfer !== undefined) dbUpdate.pending_host_transfer = resolvedUpdates.pendingHostTransfer;
        if (resolvedUpdates.selectedLayout !== undefined) dbUpdate.selected_layout = resolvedUpdates.selectedLayout;
        if (resolvedUpdates.question !== undefined) dbUpdate.question = resolvedUpdates.question;
        if (resolvedUpdates.readingStep !== undefined) dbUpdate.reading_step = resolvedUpdates.readingStep;
        if (resolvedUpdates.selectedCards !== undefined) dbUpdate.selected_cards = resolvedUpdates.selectedCards;
        if (resolvedUpdates.shuffledDeck !== undefined) dbUpdate.shuffled_deck = resolvedUpdates.shuffledDeck;
        if (resolvedUpdates.interpretation !== undefined) dbUpdate.interpretation = resolvedUpdates.interpretation;
        if (resolvedUpdates.activeCardIndex !== undefined) dbUpdate.active_card_index = resolvedUpdates.activeCardIndex;
        if (resolvedUpdates.sharedModalState !== undefined) dbUpdate.shared_modal_state = resolvedUpdates.sharedModalState;
        if (resolvedUpdates.videoCallState !== undefined) dbUpdate.video_call_state = resolvedUpdates.videoCallState;
        if (resolvedUpdates.loadingStates !== undefined) dbUpdate.loading_states = resolvedUpdates.loadingStates;
        if (resolvedUpdates.deckSelectionState !== undefined) dbUpdate.deck_selection_state = resolvedUpdates.deckSelectionState;

        const { error } = await supabase
          .from('reading_sessions')
          .update(dbUpdate)
          .eq('id', sessionState.id);

        if (error) throw error;
      } catch (err: any) {
        console.error('Error updating session:', err);
        
        // For guests or permission errors, broadcast the update
        if (!user || err.message?.includes('permission')) {
          const channel = get().channel;
          if (channel) {
            channel.send({
              type: 'broadcast',
              event: 'session_update',
              payload: { updates: resolvedUpdates, participantId: get().participantId }
            });
          }
        }
      }
    },

    // Queue view updates (debounced)
    queueViewUpdate: (updates) => {
      // Update local state immediately
      set(state => ({
        localViewState: { ...state.localViewState, ...updates },
        viewUpdateQueue: { ...state.viewUpdateQueue, ...updates }
      }));
      
      // Trigger debounced flush
      debouncedFlush();
    },

    // Flush view queue to database
    flushViewQueue: async () => {
      const { viewUpdateQueue, sessionState, participantId } = get();
      if (!sessionState || Object.keys(viewUpdateQueue).length === 0) return;

      try {
        // Use separate viewport table for high-frequency updates
        await supabase
          .from('session_viewports')
          .upsert({
            session_id: sessionState.id,
            user_id: participantId || 'anonymous',
            pan_offset: viewUpdateQueue.panOffset,
            zoom_level: viewUpdateQueue.zoomLevel,
            zoom_focus: viewUpdateQueue.zoomFocus,
            updated_at: new Date().toISOString()
          });

        set({ viewUpdateQueue: {} });
      } catch (err) {
        console.error('Error flushing view queue:', err);
      }
    },

    // Update presence (throttled)
    updatePresence: (presence) => {
      throttledPresenceUpdate(presence);
    },

    // Host transfer
    transferHost: async (toUserId: string, autoTransfer = false) => {
      const { sessionState, isHost } = get();
      if (!sessionState || !isHost) return;

      // Validate target user
      const targetParticipant = get().participants.find(p => p.userId === toUserId);
      if (!targetParticipant?.userId) {
        throw new Error('Can only transfer to authenticated users');
      }

      // Check cooldown
      const lastTransfer = sessionState.hostTransferHistory[sessionState.hostTransferHistory.length - 1];
      if (lastTransfer && Date.now() - new Date(lastTransfer.timestamp).getTime() < 60000) {
        throw new Error('Please wait before transferring host again');
      }

      // Create transfer record
      const transfer: HostTransfer = {
        from: sessionState.hostUserId!,
        to: toUserId,
        timestamp: new Date().toISOString(),
        type: autoTransfer ? 'auto_reader_join' : 'manual'
      };

      // Update session
      await get().updateImmediate({
        hostUserId: toUserId,
        originalHostUserId: sessionState.originalHostUserId || sessionState.hostUserId,
        hostTransferHistory: [...sessionState.hostTransferHistory, transfer],
        pendingHostTransfer: null
      });

      set({ isHost: false });
    },

    // Accept host transfer
    acceptHostTransfer: async () => {
      const { sessionState } = get();
      const { user } = useAuthStore.getState();
      
      if (!sessionState?.pendingHostTransfer || sessionState.pendingHostTransfer.toUserId !== user?.id) {
        return;
      }

      await get().transferHost(user.id, true);
    },

    // Reject host transfer
    rejectHostTransfer: async () => {
      const { sessionState } = get();
      if (!sessionState?.pendingHostTransfer) return;

      await get().updateImmediate({
        pendingHostTransfer: null
      });
    },

    // Reclaim host (for original host)
    reclaimHost: async () => {
      const { sessionState } = get();
      const { user } = useAuthStore.getState();
      
      if (!sessionState || sessionState.originalHostUserId !== user?.id) return;

      const transfer: HostTransfer = {
        from: sessionState.hostUserId!,
        to: user.id,
        timestamp: new Date().toISOString(),
        type: 'auto_reclaim'
      };

      await get().updateImmediate({
        hostUserId: user.id,
        hostTransferHistory: [...sessionState.hostTransferHistory, transfer]
      });

      set({ isHost: true });
    },

    // Setup realtime subscriptions
    setupRealtimeSubscriptions: () => {
      const { sessionState } = get();
      if (!sessionState?.id) return;

      // Clean up existing channels
      get().cleanup();

      // Main session channel
      const channel = supabase.channel(`session:${sessionState.id}`);
      
      // Subscribe to session updates
      channel
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'reading_sessions',
          filter: `id=eq.${sessionState.id}`
        }, (payload) => {
          const newSession = payload.new;
          const currentState = get().sessionState;
          
          if (currentState) {
            set({
              sessionState: {
                ...currentState,
                hostUserId: newSession.host_user_id,
                originalHostUserId: newSession.original_host_user_id,
                hostTransferHistory: newSession.host_transfer_history || [],
                pendingHostTransfer: newSession.pending_host_transfer,
                selectedLayout: newSession.selected_layout,
                question: newSession.question || '',
                readingStep: newSession.reading_step,
                selectedCards: newSession.selected_cards || [],
                shuffledDeck: newSession.shuffled_deck || [],
                interpretation: newSession.interpretation || '',
                activeCardIndex: newSession.active_card_index,
                sharedModalState: newSession.shared_modal_state,
                videoCallState: newSession.video_call_state,
                loadingStates: newSession.loading_states,
                deckSelectionState: newSession.deck_selection_state,
                updatedAt: newSession.updated_at
              }
            });
            
            // Check if host changed
            if (newSession.host_user_id !== currentState.hostUserId) {
              const { user } = useAuthStore.getState();
              set({ isHost: newSession.host_user_id === user?.id });
            }
          }
        })
        .on('broadcast', { event: 'session_update' }, (payload) => {
          // Handle updates from guests
          const { updates, participantId: senderId } = payload.payload;
          if (senderId !== get().participantId && get().isHost) {
            // Host processes guest updates
            get().updateImmediate(updates);
          }
        })
        .subscribe();

      set({ channel });
    },

    // Setup presence channel
    setupPresenceChannel: () => {
      const { sessionState, participantId } = get();
      if (!sessionState?.id) return;

      const presenceChannel = supabase.channel(`presence:${sessionState.id}`, {
        config: {
          presence: {
            key: participantId || 'anonymous'
          }
        }
      });

      presenceChannel
        .on('presence', { event: 'sync' }, () => {
          const state = presenceChannel.presenceState();
          const presence: { [userId: string]: PresenceData } = {};
          
          Object.entries(state).forEach(([key, data]) => {
            const presenceData = Array.isArray(data) ? data[0] : data;
            presence[key] = presenceData as PresenceData;
          });
          
          set({ presence });
          get().updateMetric('presenceUpdatesPerMinute');
        })
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            // Track initial presence
            const { user } = useAuthStore.getState();
            await presenceChannel.track({
              userId: user?.id || get().anonymousId,
              name: user?.email?.split('@')[0] || 'Anonymous',
              lastActivity: Date.now()
            });
          }
        });

      set({ presenceChannel });
      
      // Set up throttled presence update function
      setUpdateFn(async (presence: Partial<PresenceData>) => {
        if (presenceChannel) {
          await presenceChannel.track({
            ...presence,
            lastActivity: Date.now()
          });
          get().updateMetric('presenceUpdatesPerMinute');
        }
      });
    },

    // Setup viewport channel for view state sync
    setupViewportChannel: () => {
      const { sessionState } = get();
      if (!sessionState?.id) return;

      const viewportChannel = supabase.channel(`viewport:${sessionState.id}`);
      
      viewportChannel
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'session_viewports',
          filter: `session_id=eq.${sessionState.id}`
        }, (payload) => {
          if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
            const { user_id, pan_offset, zoom_level, zoom_focus } = payload.new;
            
            // Only update if from different user and following them
            const currentPresence = get().presence[get().participantId || ''];
            if (user_id !== get().participantId && currentPresence?.isFollowing === user_id) {
              set({
                localViewState: {
                  panOffset: pan_offset || { x: 0, y: 0 },
                  zoomLevel: zoom_level || 1,
                  zoomFocus: zoom_focus || null
                }
              });
            }
          }
        })
        .subscribe();

      set({ viewportChannel });
      
      // Set up debounced flush function
      setFlushFn(() => get().flushViewQueue());
    },

    // Cleanup
    cleanup: () => {
      const state = get();
      
      // Leave session
      state.leaveSession();
      
      // Unsubscribe channels
      if (state.channel) state.channel.unsubscribe();
      if (state.presenceChannel) state.presenceChannel.unsubscribe();
      if (state.viewportChannel) state.viewportChannel.unsubscribe();
      
      // Clear metrics interval
      if (state.metricsInterval) clearInterval(state.metricsInterval);
      
      // Reset state
      set({
        channel: null,
        presenceChannel: null,
        viewportChannel: null,
        metricsInterval: null,
        participantId: null
      });
    },

    // Performance metrics
    updateMetric: (metric, value) => {
      set(state => ({
        metrics: {
          ...state.metrics,
          [metric]: value !== undefined ? value : state.metrics[metric] + 1,
          [`last${metric.charAt(0).toUpperCase() + metric.slice(1).replace(/PerMinute$/, '')}Update`]: Date.now()
        }
      }));
    },

    resetMetrics: () => {
      set({
        metrics: {
          dbUpdatesPerMinute: 0,
          presenceUpdatesPerMinute: 0,
          averageLatency: 0,
          activePeerConnections: 0,
          lastDbUpdate: Date.now(),
          lastPresenceUpdate: Date.now()
        }
      });
    },

    // Progressive loading stages
    loadCriticalData: async (sessionId: string) => {
      const { data: session, error } = await supabase
        .from('reading_sessions')
        .select('*')
        .eq('id', sessionId)
        .eq('is_active', true)
        .single();

      if (error || !session) {
        throw new Error('Session not found or inactive');
      }

      const sessionState: CollaborativeSessionState = {
        id: session.id,
        hostUserId: session.host_user_id,
        originalHostUserId: session.original_host_user_id || session.host_user_id,
        hostTransferHistory: session.host_transfer_history || [],
        pendingHostTransfer: session.pending_host_transfer,
        deckId: session.deck_id,
        selectedLayout: session.selected_layout,
        question: session.question || '',
        readingStep: session.reading_step,
        selectedCards: session.selected_cards || [],
        shuffledDeck: [],
        interpretation: '',
        activeCardIndex: session.active_card_index,
        sharedModalState: session.shared_modal_state,
        videoCallState: session.video_call_state,
        loadingStates: session.loading_states,
        deckSelectionState: session.deck_selection_state,
        isActive: session.is_active,
        createdAt: session.created_at,
        updatedAt: session.updated_at
      };

      set({ sessionState });
      
      // Determine host status
      const { user } = useAuthStore.getState();
      set({ isHost: session.host_user_id === user?.id });
    },

    loadViewState: async (sessionId: string) => {
      const { participantId } = get();
      
      // Load viewport data
      const { data: viewports } = await supabase
        .from('session_viewports')
        .select('*')
        .eq('session_id', sessionId)
        .eq('user_id', participantId || 'anonymous')
        .single();

      if (viewports) {
        set({
          localViewState: {
            panOffset: viewports.pan_offset || { x: 0, y: 0 },
            zoomLevel: viewports.zoom_level || 1,
            zoomFocus: viewports.zoom_focus || null
          }
        });
      }
    },

    loadFullData: async (sessionId: string) => {
      // Load participants
      const { data: participants } = await supabase
        .from('session_participants')
        .select('*')
        .eq('session_id', sessionId)
        .eq('is_active', true);

      if (participants) {
        set({ participants });
      }

      // Load shuffled deck and interpretation
      const { data: session } = await supabase
        .from('reading_sessions')
        .select('shuffled_deck, interpretation')
        .eq('id', sessionId)
        .single();

      if (session && get().sessionState) {
        set({
          sessionState: {
            ...get().sessionState!,
            shuffledDeck: session.shuffled_deck || [],
            interpretation: session.interpretation || ''
          }
        });
      }
    },

    // Conflict resolution
    resolveConflicts: (updates, currentState, isHost) => {
      // Host updates always win
      if (isHost) return updates;

      // For non-hosts, only allow certain updates
      const allowedUpdates: Partial<CollaborativeSessionState> = {};
      
      // Non-hosts can update these fields
      const allowedFields = [
        'selectedCards',
        'shuffledDeck',
        'loadingStates',
        'sharedModalState',
        'videoCallState'
      ];

      Object.keys(updates).forEach(key => {
        if (allowedFields.includes(key)) {
          (allowedUpdates as any)[key] = (updates as any)[key];
        }
      });

      return allowedUpdates;
    }
  }))
);

// Start metrics tracking
let metricsInterval: NodeJS.Timeout;

export const startMetricsTracking = () => {
  metricsInterval = setInterval(() => {
    const store = useCollaborativeStore.getState();
    const now = Date.now();
    
    // Calculate updates per minute
    const dbUpdatesPerMinute = Math.round(
      (store.metrics.dbUpdatesPerMinute * 60000) / 
      (now - store.metrics.lastDbUpdate + 1)
    );
    
    const presenceUpdatesPerMinute = Math.round(
      (store.metrics.presenceUpdatesPerMinute * 60000) / 
      (now - store.metrics.lastPresenceUpdate + 1)
    );
    
    // Update metrics
    store.updateMetric('dbUpdatesPerMinute', dbUpdatesPerMinute);
    store.updateMetric('presenceUpdatesPerMinute', presenceUpdatesPerMinute);
    
    // Reset counters every minute
    if (now - store.metrics.lastDbUpdate > 60000) {
      store.resetMetrics();
    }
  }, 5000); // Check every 5 seconds
};

export const stopMetricsTracking = () => {
  if (metricsInterval) clearInterval(metricsInterval);
}; 