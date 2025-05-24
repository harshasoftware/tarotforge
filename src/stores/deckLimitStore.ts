import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { useAuthStore } from './authStore';
import { useSubscriptionStore } from './subscriptionStore';
import { getDeckGenerationStatus } from '../lib/deck-usage';

interface DeckLimits {
  majorArcanaLimit: number;
  completeDeckLimit: number;
  regenerationLimit: number;
  qualityLevel: string;
  maxStorage: number;
}

interface DeckUsage {
  majorArcanaGenerated: number;
  completeDecksGenerated: number;
  regenerationsUsed: number;
  lastResetDate: string | null;
  nextResetDate: string | null;
  planType: string;
}

interface DeckLimitState {
  limits: DeckLimits | null;
  usage: DeckUsage | null;
  loading: boolean;
  error: string | null;
  canGenerateMajorArcana: boolean;
  canGenerateCompleteDeck: boolean;
  canRegenerate: boolean;
  pollInterval: NodeJS.Timeout | null;
}

interface DeckLimitActions {
  setLimits: (limits: DeckLimits | null) => void;
  setUsage: (usage: DeckUsage | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setCanGenerateMajorArcana: (canGenerate: boolean) => void;
  setCanGenerateCompleteDeck: (canGenerate: boolean) => void;
  setCanRegenerate: (canRegenerate: boolean) => void;
  fetchLimits: () => Promise<void>;
  refreshLimits: () => Promise<void>;
  startPolling: () => void;
  stopPolling: () => void;
  reset: () => void;
}

interface DeckLimitStore extends DeckLimitState, DeckLimitActions {}

export const useDeckLimitStore = create<DeckLimitStore>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    limits: null,
    usage: null,
    loading: true,
    error: null,
    canGenerateMajorArcana: false,
    canGenerateCompleteDeck: false,
    canRegenerate: false,
    pollInterval: null,

    // Actions
    setLimits: (limits) => set({ limits }),
    setUsage: (usage) => set({ usage }),
    setLoading: (loading) => set({ loading }),
    setError: (error) => set({ error }),
    setCanGenerateMajorArcana: (canGenerateMajorArcana) => set({ canGenerateMajorArcana }),
    setCanGenerateCompleteDeck: (canGenerateCompleteDeck) => set({ canGenerateCompleteDeck }),
    setCanRegenerate: (canRegenerate) => set({ canRegenerate }),

    fetchLimits: async () => {
      const { user } = useAuthStore.getState();

      if (!user) {
        set({
          limits: null,
          usage: null,
          loading: false,
          canGenerateMajorArcana: false,
          canGenerateCompleteDeck: false,
          canRegenerate: false,
        });
        return;
      }

      try {
        set({ loading: true, error: null });
        
        // Use the helper function to get deck generation status
        const status = await getDeckGenerationStatus(user.id);
        
        if (!status) {
          // For new users, set default limits
          const defaultLimits = {
            majorArcanaLimit: 1,
            completeDeckLimit: 0,
            regenerationLimit: 2,
            qualityLevel: 'medium',
            maxStorage: 3
          };
          
          const defaultUsage = {
            majorArcanaGenerated: 0,
            completeDecksGenerated: 0,
            regenerationsUsed: 0,
            lastResetDate: null,
            nextResetDate: null,
            planType: 'free'
          };
          
          set({
            limits: defaultLimits,
            usage: defaultUsage,
            canGenerateMajorArcana: true,
            canGenerateCompleteDeck: false,
            canRegenerate: true,
          });
        } else {
          // Use the status data
          set({
            limits: status.limits,
            usage: status.usage,
            canGenerateMajorArcana: status.canGenerateMajorArcana,
            canGenerateCompleteDeck: status.canGenerateCompleteDeck,
            canRegenerate: status.canRegenerate,
          });
        }
      } catch (err) {
        console.error('Error fetching deck limits:', err);
        set({ error: 'Failed to load deck generation limits' });
      } finally {
        set({ loading: false });
      }
    },

    refreshLimits: async () => {
      await get().fetchLimits();
    },

    startPolling: () => {
      const { stopPolling } = get();
      
      // Clear any existing interval
      stopPolling();
      
      const { user } = useAuthStore.getState();
      if (!user) return;
      
      // Set up polling to check for limit updates every minute
      const interval = setInterval(() => {
        const { user: currentUser } = useAuthStore.getState();
        if (currentUser) {
          get().fetchLimits();
        } else {
          get().stopPolling();
        }
      }, 60000); // Check every minute
      
      set({ pollInterval: interval });
    },

    stopPolling: () => {
      const { pollInterval } = get();
      if (pollInterval) {
        clearInterval(pollInterval);
        set({ pollInterval: null });
      }
    },

    reset: () => {
      const { stopPolling } = get();
      stopPolling();
      set({
        limits: null,
        usage: null,
        loading: true,
        error: null,
        canGenerateMajorArcana: false,
        canGenerateCompleteDeck: false,
        canRegenerate: false,
        pollInterval: null,
      });
    },
  }))
);

// Subscribe to auth state changes
useAuthStore.subscribe(
  (state) => state.user,
  (user, prevUser) => {
    const deckLimitStore = useDeckLimitStore.getState();
    
    if (user && user !== prevUser) {
      // User logged in, fetch limits and start polling
      deckLimitStore.fetchLimits();
      deckLimitStore.startPolling();
    } else if (!user && prevUser) {
      // User logged out, reset store
      deckLimitStore.reset();
    }
  }
);

// Subscribe to subscription state changes
useSubscriptionStore.subscribe(
  (state) => ({ subscription: state.subscription, isSubscribed: state.isSubscribed }),
  ({ subscription, isSubscribed }, prev) => {
    const { user } = useAuthStore.getState();
    const deckLimitStore = useDeckLimitStore.getState();
    
    // When subscription changes, refresh limits
    if (user && (subscription !== prev?.subscription || isSubscribed !== prev?.isSubscribed)) {
      deckLimitStore.fetchLimits();
    }
  }
);

// Convenience hook that mimics the old useDeckLimits interface
export const useDeckLimits = () => {
  const store = useDeckLimitStore((state) => ({
    limits: state.limits,
    usage: state.usage,
    loading: state.loading,
    error: state.error,
    canGenerateMajorArcana: state.canGenerateMajorArcana,
    canGenerateCompleteDeck: state.canGenerateCompleteDeck,
    canRegenerate: state.canRegenerate,
    refreshLimits: state.refreshLimits,
  }));

  return store;
}; 