import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { useSubscription } from './SubscriptionContext';
import { supabase } from '../lib/supabase';
import { STRIPE_PRODUCTS } from '../lib/stripe-config';
import { checkAndMigrateCredits } from '../lib/credit-migration';
import { ensureUserCredits } from '../lib/credit-fix';
import { updateCreditData } from '../utils/analytics';

interface CreditInfo {
  basicCredits: number;
  premiumCredits: number;
  basicCreditsUsed: number;
  premiumCreditsUsed: number;
  planTier: string;
  lastRefreshDate: string | null;
  nextRefreshDate: string | null;
  maxRolloverCredits: number;
}

interface CreditContextType {
  credits: CreditInfo | null;
  loading: boolean;
  error: string | null;
  refreshCredits: () => Promise<void>;
  consumeCredits: (basicCredits: number, premiumCredits: number, referenceId?: string, description?: string) => Promise<boolean>;
  getEstimatedCreditConsumption: (imageQuality: 'medium' | 'high', quantity: number) => {
    basicCredits: number;
    premiumCredits: number;
    hasEnoughCredits: boolean;
  };
  initializeCredits: () => Promise<void>;
}

const defaultCreditInfo: CreditInfo = {
  basicCredits: 0,
  premiumCredits: 0,
  basicCreditsUsed: 0,
  premiumCreditsUsed: 0,
  planTier: 'free',
  lastRefreshDate: null,
  nextRefreshDate: null,
  maxRolloverCredits: 0
};

const CreditContext = createContext<CreditContextType>({
  credits: defaultCreditInfo,
  loading: true,
  error: null,
  refreshCredits: async () => {},
  consumeCredits: async () => false,
  getEstimatedCreditConsumption: () => ({ basicCredits: 0, premiumCredits: 0, hasEnoughCredits: false }),
  initializeCredits: async () => {},
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
        // If no record exists yet, initialize with default values
        if (fetchError.code === 'PGRST116') { // Row not found
          console.log("No credit record found, using default values");
          
          // Get subscription plan tier from subscription if available
          let planTier = 'free';
          let basicCredits = 5; // Free users start with 5 basic credits
          let premiumCredits = 0;
          let maxRolloverCredits = 0;
          
          if (isSubscribed && subscription?.price_id) {
            // Find the product that matches this price ID
            for (const [key, product] of Object.entries(STRIPE_PRODUCTS)) {
              if (product.priceId === subscription.price_id) {
                planTier = key.split('-')[0]; // Extract the plan name (mystic, creator, visionary)
                basicCredits = product.baseCredits || 0;
                premiumCredits = product.premiumCredits || 0;
                maxRolloverCredits = product.maxRolloverCredits || 0;
                break;
              }
            }
          }
          
          const creditInfo = {
            basicCredits,
            premiumCredits,
            basicCreditsUsed: 0,
            premiumCreditsUsed: 0,
            planTier,
            lastRefreshDate: null,
            nextRefreshDate: null,
            maxRolloverCredits
          };
          
          setCredits(creditInfo);

          // Update LogRocket with credit info
          if (user.id) {
            updateCreditData(user.id, {
              basicCredits,
              premiumCredits,
              plan: planTier
            });
          }

          // Attempt to migrate existing user credits if this is an existing account
          try {
            // Try both migration approaches - first the legacy approach
            await checkAndMigrateCredits(user.id);
            
            // Then the new direct fix approach
            await ensureUserCredits(user.id);
            
            // Automatically refresh to get the newly created credit record
            const { data: newData } = await supabase
              .from('user_credits')
              .select('*')
              .eq('user_id', user.id)
              .single();
              
            if (newData) {
              const newCreditInfo = {
                basicCredits: newData.basic_credits,
                premiumCredits: newData.premium_credits,
                basicCreditsUsed: newData.basic_credits_used,
                premiumCreditsUsed: newData.premium_credits_used,
                planTier: newData.plan_tier,
                lastRefreshDate: newData.last_refresh_date,
                nextRefreshDate: newData.next_refresh_date,
                maxRolloverCredits: newData.max_rollover_credits || 0,
              };
              
              setCredits(newCreditInfo);
              
              // Update LogRocket with credit info
              if (user.id) {
                updateCreditData(user.id, {
                  basicCredits: newData.basic_credits,
                  premiumCredits: newData.premium_credits,
                  plan: newData.plan_tier
                });
              }
            }
          } catch (migrationError) {
            console.error('Error during credit migration:', migrationError);
          }
        } else {
          console.error('Error fetching user credits:', fetchError);
          setError('Failed to load credit information');
          setCredits(null);
        }
      } else if (data) {
        const creditInfo = {
          basicCredits: data.basic_credits,
          premiumCredits: data.premium_credits,
          basicCreditsUsed: data.basic_credits_used,
          premiumCreditsUsed: data.premium_credits_used,
          planTier: data.plan_tier,
          lastRefreshDate: data.last_refresh_date,
          nextRefreshDate: data.next_refresh_date,
          maxRolloverCredits: data.max_rollover_credits || 0,
        };
        
        setCredits(creditInfo);
        
        // Update LogRocket with credit info
        if (user.id) {
          updateCreditData(user.id, {
            basicCredits: data.basic_credits,
            premiumCredits: data.premium_credits,
            plan: data.plan_tier
          });
        }
      }
    } catch (err) {
      console.error('Error in fetchCredits:', err);
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Initialize credits - used when user subscribes or changes plan
  const initializeCredits = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      // Make sure the user has a credit record first
      await ensureUserCredits(user.id);
      
      // Determine credit allocations based on subscription
      let planTier = 'free';
      let basicCredits = 5; // Free users start with 5 basic credits
      let premiumCredits = 0;
      let maxRolloverCredits = 0;
      
      if (isSubscribed && subscription?.price_id) {
        // Find the product that matches this price ID
        for (const [key, product] of Object.entries(STRIPE_PRODUCTS)) {
          if (product.priceId === subscription.price_id) {
            planTier = key.split('-')[0]; // Extract the plan name (mystic, creator, visionary)
            basicCredits = product.baseCredits || 0;
            premiumCredits = product.premiumCredits || 0;
            maxRolloverCredits = product.maxRolloverCredits || 0;
            break;
          }
        }
      }
      
      // Calculate next refresh date (1 month from now)
      const now = new Date();
      const nextRefreshDate = new Date(now);
      
      // For monthly subscriptions, add 1 month
      // For yearly subscriptions, add 1 month but prorate credits
      if (subscription?.current_period_end) {
        nextRefreshDate.setTime(subscription.current_period_end * 1000);
      } else {
        nextRefreshDate.setMonth(nextRefreshDate.getMonth() + 1);
      }
      
      // Check if a record already exists
      const { data: existingData, error: fetchError } = await supabase
        .from('user_credits')
        .select('id, basic_credits, premium_credits')
        .eq('user_id', user.id)
        .single();
        
      if (!fetchError && existingData) {
        // Update existing record
        const { error: updateError } = await supabase
          .from('user_credits')
          .update({
            basic_credits: basicCredits,
            premium_credits: premiumCredits,
            plan_tier: planTier,
            max_rollover_credits: maxRolloverCredits,
            next_refresh_date: nextRefreshDate.toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('user_id', user.id);
          
        if (updateError) {
          console.error('Error updating credits:', updateError);
          throw new Error('Failed to update credits');
        }
      } else {
        // Insert new record
        const { error: insertError } = await supabase
          .from('user_credits')
          .insert([{
            user_id: user.id,
            basic_credits: basicCredits,
            premium_credits: premiumCredits,
            basic_credits_used: 0,
            premium_credits_used: 0,
            plan_tier: planTier,
            max_rollover_credits: maxRolloverCredits,
            next_refresh_date: nextRefreshDate.toISOString()
          }]);
          
        if (insertError) {
          console.error('Error inserting credits:', insertError);
          throw new Error('Failed to initialize credits');
        }
      }
      
      // Record the credit change transaction
      await supabase
        .from('credit_transactions')
        .insert([{
          user_id: user.id,
          transaction_type: 'allocation',
          basic_credits_change: basicCredits,
          premium_credits_change: premiumCredits,
          description: `Credits allocated for ${planTier} plan subscription`
        }]);
        
      // Update local state
      setCredits({
        basicCredits,
        premiumCredits,
        basicCreditsUsed: 0,
        premiumCreditsUsed: 0,
        planTier,
        lastRefreshDate: new Date().toISOString(),
        nextRefreshDate: nextRefreshDate.toISOString(),
        maxRolloverCredits
      });
      
      // Update LogRocket with new credit info
      updateCreditData(user.id, {
        basicCredits, 
        premiumCredits,
        plan: planTier
      });
      
    } catch (err) {
      console.error('Error initializing credits:', err);
      setError('Failed to initialize credits');
    } finally {
      setLoading(false);
    }
  };

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
        
        // Update LogRocket with updated credit info after consumption
        if (credits) {
          const newBasicCredits = credits.basicCredits - basicCredits;
          const newPremiumCredits = credits.premiumCredits - premiumCredits;
          
          updateCreditData(user.id, {
            basicCredits: newBasicCredits,
            premiumCredits: newPremiumCredits,
            plan: credits.planTier
          });
        }
        
        return true;
      }

      return false;
    } catch (err) {
      console.error('Error in consumeCredits:', err);
      return false;
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

  // Watch for subscription changes and update credits accordingly
  useEffect(() => {
    // When subscription changes, reinitialize credits
    if (user && subscription) {
      if (isSubscribed) {
        // Initialize credits based on the subscription
        initializeCredits();
      } else {
        // If user lost subscription, still fetch credits but don't initialize
        fetchCredits();
      }
    }
  }, [user?.id, subscription]);

  // Initial credit fetch
  useEffect(() => {
    if (user) {
      fetchCredits();
    }
  }, [user]);

  return (
    <CreditContext.Provider
      value={{
        credits,
        loading,
        error,
        refreshCredits: fetchCredits,
        consumeCredits,
        getEstimatedCreditConsumption,
        initializeCredits
      }}
    >
      {children}
    </CreditContext.Provider>
  );
};