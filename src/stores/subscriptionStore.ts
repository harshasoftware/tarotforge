import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { useAuthStore } from './authStore';
import { getUserSubscription } from '../lib/stripe';
import { updateSubscriptionData } from '../utils/analytics';
import { getPlanNameFromPriceId } from '../utils/analytics';
import { supabase } from '../lib/supabase';

interface SubscriptionState {
  subscription: any | null;
  loading: boolean;
  error: string | null;
  hasFetchedInitial: boolean;
  pollInterval: NodeJS.Timeout | null;
}

interface SubscriptionActions {
  setSubscription: (subscription: any | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setHasFetchedInitial: (hasFetched: boolean) => void;
  fetchSubscription: () => Promise<void>;
  refreshSubscription: () => Promise<void>;
  startPolling: () => void;
  stopPolling: () => void;
  reset: () => void;
}

interface SubscriptionStore extends SubscriptionState, SubscriptionActions {
  // Computed values
  isSubscribed: boolean;
}

export const useSubscriptionStore = create<SubscriptionStore>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    subscription: null,
    loading: true,
    error: null,
    hasFetchedInitial: false,
    pollInterval: null,

    // Computed values
    get isSubscribed() {
      const { subscription } = get();
      return subscription?.subscription_status === 'active' || subscription?.subscription_status === 'trialing';
    },

    // Actions
    setSubscription: (subscription) => set({ subscription }),
    setLoading: (loading) => set({ loading }),
    setError: (error) => set({ error }),
    setHasFetchedInitial: (hasFetchedInitial) => set({ hasFetchedInitial }),

    fetchSubscription: async () => {
      const { subscription: currentSubscription } = get();
      const { user } = useAuthStore.getState();

      if (!user) {
        set({ subscription: null, loading: false });
        return;
      }

      try {
        set({ loading: true, error: null });
        const subscriptionData = await getUserSubscription();
        
        // Always update the subscription data to ensure we have the latest
        set({ subscription: subscriptionData });
        console.log("Subscription data updated:", subscriptionData?.subscription_status);
        
        // Update LogRocket with subscription info
        if (subscriptionData) {
          // Determine subscription type from price_id
          const subscriptionType = subscriptionData.price_id 
            ? getPlanNameFromPriceId(subscriptionData.price_id)
            : 'free';
            
          // Update LogRocket with subscription info
          updateSubscriptionData(user.id, {
            status: subscriptionData.subscription_status || 'none',
            type: subscriptionType,
            price_id: subscriptionData.price_id
          });
        }
        
        // Mark that we've fetched the initial subscription data
        const { hasFetchedInitial } = get();
        if (!hasFetchedInitial) {
          set({ hasFetchedInitial: true });
        }
        
      } catch (err) {
        console.error('Error fetching subscription:', err);
        set({ error: 'Failed to load subscription information' });
      } finally {
        set({ loading: false });
      }
    },

    refreshSubscription: async () => {
      // Force a refresh by setting loading state
      set({ loading: true });
      await get().fetchSubscription();
    },

    startPolling: () => {
      const { stopPolling } = get();
      
      // Clear any existing interval
      stopPolling();
      
      const { user } = useAuthStore.getState();
      if (!user) return;
      
      // Set up polling to check for subscription updates every minute
      const interval = setInterval(() => {
        const { user: currentUser } = useAuthStore.getState();
        if (currentUser) {
          get().fetchSubscription();
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
        subscription: null,
        loading: true,
        error: null,
        hasFetchedInitial: false,
        pollInterval: null,
      });
    },
  }))
);

let subscriptionRealtimeChannel: any = null;

const subscribeToSubscriptionRealtime = (userId: string, fetchSubscription: () => Promise<void>) => {
  // Clean up any previous channel
  if (subscriptionRealtimeChannel) {
    supabase.removeChannel(subscriptionRealtimeChannel);
    subscriptionRealtimeChannel = null;
  }
  if (!userId) return;
  // Subscribe to changes for this user's subscription row
  subscriptionRealtimeChannel = supabase.channel(`realtime:stripe_user_subscriptions:${userId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'stripe_user_subscriptions',
        filter: `user_id=eq.${userId}`,
      },
      async () => {
        // On any change, refresh subscription
        await fetchSubscription();
      }
    )
    .subscribe();
};

// Subscribe to auth state changes
useAuthStore.subscribe(
  (state) => state.user,
  (user, prevUser) => {
    const subscriptionStore = useSubscriptionStore.getState();
    if (user && user !== prevUser) {
      // User logged in, fetch subscription and start polling
      subscriptionStore.fetchSubscription();
      subscriptionStore.startPolling();
      // Subscribe to realtime updates
      subscribeToSubscriptionRealtime(user.id, subscriptionStore.fetchSubscription);
    } else if (!user && prevUser) {
      // User logged out, reset store
      subscriptionStore.reset();
      // Clean up realtime channel
      if (subscriptionRealtimeChannel) {
        supabase.removeChannel(subscriptionRealtimeChannel);
        subscriptionRealtimeChannel = null;
      }
    }
  }
);

// Convenience hook that mimics the old useSubscription interface
export const useSubscription = () => {
  const store = useSubscriptionStore((state) => ({
    isSubscribed: state.isSubscribed,
    subscription: state.subscription,
    loading: state.loading,
    error: state.error,
    refreshSubscription: state.refreshSubscription,
  }));

  return store;
}; 