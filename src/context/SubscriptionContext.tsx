import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { getUserSubscription } from '../lib/stripe';

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
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      setSubscription(subscriptionData);
    } catch (err) {
      console.error('Error fetching subscription:', err);
      setError('Failed to load subscription information');
    } finally {
      setLoading(false);
    }
  };

  // Fetch subscription when user changes
  useEffect(() => {
    fetchSubscription();
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