import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuthStore } from '../stores/authStorePrivy';
import { useSubscription } from '../stores/subscriptionStore';
import { supabase } from '../lib/supabase';
import { STRIPE_PRODUCTS } from '../lib/stripe-config';
import { checkAndMigrateCredits } from '../lib/credit-migration';
import { ensureUserCredits } from '../lib/credit-fix';
import { updateCreditData } from '../utils/analytics';

interface CreditInfo {
  majorArcanaQuota: number;
  completeDeckQuota: number;
  majorArcanaUsed: number;
  completeDeckUsed: number;
  planTier: string;
  lastRefreshDate: string | null;
  nextRefreshDate: string | null;
  maxRolloverQuota: number;
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
  majorArcanaQuota: 0,
  completeDeckQuota: 0,
  majorArcanaUsed: 0,
  completeDeckUsed: 0,
  planTier: 'free',
  lastRefreshDate: null,
  nextRefreshDate: null,
  maxRolloverQuota: 0
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
  const { user } = useAuthStore();
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
        .from('user_deck_quotas')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (fetchError) {
        // If no record exists yet, initialize with default values
        if (fetchError.code === 'PGRST116') { // Row not found
          console.log("No credit record found, using default values");
          
          // Get subscription plan tier from subscription if available
          let planTier = 'free'; 
          let majorArcanaQuota = 5; // Free users start with 5 major arcana decks
          let premiumCredits = 0;
          let maxRolloverCredits = 0;
          
          if (isSubscribed && subscription?.price_id) {
            // Find the product that matches this price ID
            for (const [key, product] of Object.entries(STRIPE_PRODUCTS)) {
              if (product.priceId === subscription.price_id) {
                planTier = key.split('-')[0]; // Extract the plan name (mystic, creator, visionary)
                majorArcanaQuota = product.baseCredits || 0;
                completeDeckQuota = product.premiumCredits || 0;
                maxRolloverQuota = product.maxRolloverCredits || 0;
                break;
              }
            }
          }
          
          const creditInfo = {
            majorArcanaQuota,
            completeDeckQuota,
            majorArcanaUsed: 0,
            completeDeckUsed: 0,
            planTier,
            lastRefreshDate: null,
            nextRefreshDate: null,
            maxRolloverQuota
          };
          
          setCredits(creditInfo);

          // Update LogRocket with credit info
          if (user.id) {
            updateCreditData(user.id, {
              basicCredits: majorArcanaQuota, // Keep backward compatibility
              premiumCredits: completeDeckQuota, // Keep backward compatibility
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
              .from('user_deck_quotas')
              .select('*')
              .eq('user_id', user.id)
              .single();
              
            if (newData) {
              const newCreditInfo = {
                majorArcanaQuota: newData.major_arcana_quota,
                completeDeckQuota: newData.complete_deck_quota,
                majorArcanaUsed: newData.major_arcana_used,
                completeDeckUsed: newData.complete_deck_used,
                planTier: newData.plan_type,
                lastRefreshDate: newData.last_refresh_date,
                nextRefreshDate: newData.next_refresh_date,
                maxRolloverQuota: newData.max_rollover_quota || 0,
              };
              
              setCredits(newCreditInfo);
              
              // Update LogRocket with credit info
              if (user.id) {
                updateCreditData(user.id, {
                  basicCredits: newData.major_arcana_quota, // Keep backward compatibility
                  premiumCredits: newData.complete_deck_quota, // Keep backward compatibility
                  plan: newData.plan_type
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
          majorArcanaQuota: data.major_arcana_quota || data.basic_credits, // Support both old and new column names
          completeDeckQuota: data.complete_deck_quota || data.premium_credits,
          majorArcanaUsed: data.major_arcana_used || data.basic_credits_used,
          completeDeckUsed: data.complete_deck_used || data.premium_credits_used,
          planTier: data.plan_type || data.plan_tier,
          lastRefreshDate: data.last_refresh_date,
          nextRefreshDate: data.next_refresh_date,
          maxRolloverQuota: data.max_rollover_quota || data.max_rollover_credits || 0,
        };
        
        setCredits(creditInfo);
        
        // Update LogRocket with credit info
        if (user.id) {
          updateCreditData(user.id, {
            basicCredits: data.major_arcana_quota || data.basic_credits,
            premiumCredits: data.complete_deck_quota || data.premium_credits,
            plan: data.plan_type || data.plan_tier
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
      let majorArcanaQuota = 5; // Free users start with 5 major arcana decks
      let completeDeckQuota = 0;
      let maxRolloverQuota = 0;
      
      if (isSubscribed && subscription?.price_id) {
        // Find the product that matches this price ID
        for (const [key, product] of Object.entries(STRIPE_PRODUCTS)) {
          if (product.priceId === subscription.price_id) {
            planTier = key.split('-')[0]; // Extract the plan name (mystic, creator, visionary)
            majorArcanaQuota = product.baseCredits || 0;
            completeDeckQuota = product.premiumCredits || 0;
            maxRolloverQuota = product.maxRolloverCredits || 0;
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
        .from('user_deck_quotas')
        .select('id, major_arcana_quota, complete_deck_quota')
        .eq('user_id', user.id)
        .single();
        
      if (!fetchError && existingData) {
        // Update existing record
        const { error: updateError } = await supabase
          .from('user_deck_quotas')
          .update({
            major_arcana_quota: majorArcanaQuota,
            complete_deck_quota: completeDeckQuota,
            plan_type: planTier,
            max_rollover_quota: maxRolloverQuota,
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
          .from('user_deck_quotas')
          .insert([{
            user_id: user.id,
            major_arcana_quota: majorArcanaQuota,
            complete_deck_quota: completeDeckQuota,
            major_arcana_used: 0,
            complete_deck_used: 0,
            plan_type: planTier,
            max_rollover_quota: maxRolloverQuota,
            next_refresh_date: nextRefreshDate.toISOString()
          }]);
          
        if (insertError) {
          console.error('Error inserting credits:', insertError);
          throw new Error('Failed to initialize credits');
        }
      }
      
      // Record the credit change transaction
      await supabase
        .rpc('log_deck_quota_change', {
          p_user_id: user.id,
          p_major_arcana_change: majorArcanaQuota,
          p_complete_deck_change: completeDeckQuota,
          p_description: `Deck quotas allocated for ${planTier} plan subscription`
        }).catch(err => {
          // Non-critical error, just log it
          console.error('Error logging deck quota change:', err);
        });
      
      // Update local state with new values
      setCredits({
        majorArcanaQuota,
        completeDeckQuota,
        majorArcanaUsed: 0,
        completeDeckUsed: 0,
        planTier,
        lastRefreshDate: new Date().toISOString(),
        nextRefreshDate: nextRefreshDate.toISOString(),
        maxRolloverQuota
      });
      
      // Update LogRocket with new credit info
      updateCreditData(user.id, {
        basicCredits: majorArcanaQuota, // Keep backward compatibility
        premiumCredits: completeDeckQuota, // Keep backward compatibility
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
    majorArcanaQuota: number,
    completeDeckQuota: number,
    referenceId?: string,
    description: string = 'Card generation'
  ): Promise<boolean> => {
    if (!user || !credits) return false;

    // Check if user has enough credits
    if (credits.majorArcanaQuota < majorArcanaQuota || credits.completeDeckQuota < completeDeckQuota) {
      return false;
    }

    try {
      // Call the RPC function to consume credits
      const { data, error } = await supabase.rpc('consume_user_deck_quotas', {
        p_user_id: user.id,
        p_major_arcana_to_use: majorArcanaQuota,
        p_complete_deck_to_use: completeDeckQuota,
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
          const newMajorArcanaQuota = credits.majorArcanaQuota - majorArcanaQuota;
          const newCompleteDeckQuota = credits.completeDeckQuota - completeDeckQuota;
          
          updateCreditData(user.id, {
            basicCredits: newMajorArcanaQuota, // Keep backward compatibility
            premiumCredits: newCompleteDeckQuota, // Keep backward compatibility
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
    let majorArcanaQuota = 0;
    let completeDeckQuota = 0;
    
    if (imageQuality === 'medium') {
      majorArcanaQuota = quantity;
    } else {
      // High quality images use complete deck quota
      completeDeckQuota = quantity * 3;
    }
    
    // Check if user has enough credits
    const hasEnoughCredits = credits
      ? (credits.majorArcanaQuota >= majorArcanaQuota && credits.completeDeckQuota >= completeDeckQuota)
      : false;
    
    return {
      basicCredits: majorArcanaQuota, // Keep backward compatibility
      premiumCredits: completeDeckQuota, // Keep backward compatibility
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