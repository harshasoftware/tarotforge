import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuthStore } from '../stores/authStore';
import { getUserSubscription } from '../lib/stripe';
import { updateSubscriptionData } from '../utils/analytics';
import { getPlanNameFromPriceId } from '../utils/analytics';

interface SubscriptionContextType {
  isSubscribed: boolean;
  subscription: any | null;
  loading: boolean;
  error: string | null;
  refreshSubscription: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextType>({
  isSubscribed: false,
  subscription: null,
  loading: true,
  error: null,
  refreshSubscription: async () => {},
});

export const useSubscription = () => useContext(SubscriptionContext);

export const SubscriptionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuthStore();
  const [subscription, setSubscription] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasFetchedInitial, setHasFetchedInitial] = useState(false);

  const fetchSubscription = async () => {
    if (!user) {
      setSubscription(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const subscriptionData = await getUserSubscription();
      
      // Check if subscription has changed
      const hasChanged = JSON.stringify(subscriptionData) !== JSON.stringify(subscription);
      
      if (hasChanged) {
        setSubscription(subscriptionData);
        console.log("Subscription status changed:", subscriptionData?.subscription_status);
        
        // Update LogRocket with subscription info when it changes
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
      }
      
      // Mark that we've fetched the initial subscription data
      if (!hasFetchedInitial) {
        setHasFetchedInitial(true);
      }
      
    } catch (err) {
      console.error('Error fetching subscription:', err);
      setError('Failed to load subscription information');
    } finally {
      setLoading(false);
    }
  };

  // Fetch subscription when user changes
  useEffect(() => {
    if (user) {
      fetchSubscription();
    } else {
      setSubscription(null);
      setLoading(false);
    }
  }, [user]);

  // Set up polling to check for subscription updates every minute
  useEffect(() => {
    if (!user) return;
    
    const pollInterval = setInterval(() => {
      fetchSubscription();
    }, 60000); // Check every minute
    
    return () => clearInterval(pollInterval);
  }, [user]);

  const isSubscribed = subscription?.subscription_status === 'active' || subscription?.subscription_status === 'trialing';

  return (
    <SubscriptionContext.Provider
      value={{
        isSubscribed,
        subscription,
        loading,
        error,
        refreshSubscription: fetchSubscription,
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
};