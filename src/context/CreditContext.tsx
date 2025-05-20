import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { useSubscription } from './SubscriptionContext';
import { supabase } from '../lib/supabase';

interface CreditInfo {
  basicCredits: number;
  premiumCredits: number;
  basicCreditsUsed: number;
  premiumCreditsUsed: number;
  planTier: string;
  lastRefreshDate: string | null;
  nextRefreshDate: string | null;
}

interface CreditContextType {
  credits: CreditInfo | null;
  loading: boolean;
  error: string | null;
  refreshCredits: () => Promise<void>;
  consumeCredits: (basicCredits: number, premiumCredits: number, referenceId?: string, description?: string) => Promise<boolean>;
  getCreditTransactions: (limit?: number) => Promise<any[]>;
  getEstimatedCreditConsumption: (imageQuality: 'medium' | 'high', quantity: number) => {
    basicCredits: number;
    premiumCredits: number;
    hasEnoughCredits: boolean;
  };
}

const defaultCreditInfo: CreditInfo = {
  basicCredits: 0,
  premiumCredits: 0,
  basicCreditsUsed: 0,
  premiumCreditsUsed: 0,
  planTier: 'free',
  lastRefreshDate: null,
  nextRefreshDate: null
};

const CreditContext = createContext<CreditContextType>({
  credits: defaultCreditInfo,
  loading: true,
  error: null,
  refreshCredits: async () => {},
  consumeCredits: async () => false,
  getCreditTransactions: async () => [],
  getEstimatedCreditConsumption: () => ({ basicCredits: 0, premiumCredits: 0, hasEnoughCredits: false }),
});

export const useCredits = () => useContext(CreditContext);

export const CreditProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const { subscription, isSubscribed } = useSubscription();
  const [credits, setCredits] = useState<CreditInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch user credits
  const fetchCredits = async () => {
    if (!user) {
      setCredits(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('user_credits')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (fetchError) {
        // If no record exists yet, create default values for display
        if (fetchError.code === 'PGRST116') { // Row not found
          setCredits({
            basicCredits: isSubscribed ? 0 : 5, // Free users start with 5 basic credits
            premiumCredits: 0,
            basicCreditsUsed: 0,
            premiumCreditsUsed: 0,
            planTier: isSubscribed ? (
              subscription?.price_id === 'price_1ROxKkCzE3rkgdDILMeJSI4D' ? 'mystic' :
              subscription?.price_id === 'price_1ROxKkCzE3rkgdDIZVPaqZHm' ? 'creator' :
              subscription?.price_id === 'price_1ROxKkCzE3rkgdDIFrJaFEtC' ? 'visionary' : 
              'free'
            ) : 'free',
            lastRefreshDate: null,
            nextRefreshDate: null,
          });
        } else {
          console.error('Error fetching user credits:', fetchError);
          setError('Failed to load credit information');
          setCredits(null);
        }
      } else if (data) {
        setCredits({
          basicCredits: data.basic_credits,
          premiumCredits: data.premium_credits,
          basicCreditsUsed: data.basic_credits_used,
          premiumCreditsUsed: data.premium_credits_used,
          planTier: data.plan_tier,
          lastRefreshDate: data.last_refresh_date,
          nextRefreshDate: data.next_refresh_date,
        });
      }
    } catch (err) {
      console.error('Error in fetchCredits:', err);
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Initial credit fetch and on user/subscription changes
  useEffect(() => {
    fetchCredits();
  }, [user, isSubscribed, subscription]);

  // Consume credits for card generation
  const consumeCredits = async (
    basicCredits: number,
    premiumCredits: number,
    referenceId?: string,
    description: string = 'Card generation'
  ): Promise<boolean> => {
    if (!user || !credits) return false;

    // Check if user has enough credits
    if (credits.basicCredits < basicCredits || credits.premiumCredits < premiumCredits) {
      return false;
    }

    try {
      // Call the RPC function to consume credits
      const { data, error } = await supabase.rpc('consume_user_credits', {
        p_user_id: user.id,
        p_basic_credits_to_use: basicCredits,
        p_premium_credits_to_use: premiumCredits,
        p_reference_id: referenceId || null,
        p_description: description
      });

      if (error) {
        console.error('Error consuming credits:', error);
        return false;
      }

      // Update local state
      if (data) {
        await fetchCredits();
        return true;
      }

      return false;
    } catch (err) {
      console.error('Error in consumeCredits:', err);
      return false;
    }
  };

  // Get credit transactions history
  const getCreditTransactions = async (limit: number = 10): Promise<any[]> => {
    if (!user) return [];

    try {
      const { data, error } = await supabase
        .from('credit_transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching credit transactions:', error);
        return [];
      }

      return data || [];
    } catch (err) {
      console.error('Error in getCreditTransactions:', err);
      return [];
    }
  };
  
  // Calculate credit cost based on image quality and quantity
  const getEstimatedCreditConsumption = (imageQuality: 'medium' | 'high', quantity: number) => {
    let basicCredits = 0;
    let premiumCredits = 0;
    
    if (imageQuality === 'medium') {
      basicCredits = quantity;
    } else {
      // High quality images cost 3 premium credits each
      premiumCredits = quantity * 3;
    }
    
    // Check if user has enough credits
    const hasEnoughCredits = credits
      ? (credits.basicCredits >= basicCredits && credits.premiumCredits >= premiumCredits)
      : false;
    
    return {
      basicCredits,
      premiumCredits,
      hasEnoughCredits
    };
  };

  return (
    <CreditContext.Provider
      value={{
        credits,
        loading,
        error,
        refreshCredits: fetchCredits,
        consumeCredits,
        getCreditTransactions,
        getEstimatedCreditConsumption
      }}
    >
      {children}
    </CreditContext.Provider>
  );
};