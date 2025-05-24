import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuthStore } from '../stores/authStore';
import { useSubscription } from '../stores/subscriptionStore';
import { supabase } from '../lib/supabase';
import { STRIPE_PRODUCTS } from '../lib/stripe-config';
import { checkAndMigrateCredits } from '../lib/deck-quota-migration';
import { ensureDeckQuotas } from '../lib/deck-quota-fix';
import { updateCreditData } from '../utils/analytics';

interface DeckQuotaInfo {
  majorArcanaQuota: number;
  completeDeckQuota: number;
  majorArcanaUsed: number;
  completeDeckUsed: number;
  planType: string;
  lastRefreshDate: string | null;
  nextRefreshDate: string | null;
  maxRolloverQuota: number;
}

interface DeckQuotaContextType {
  quotas: DeckQuotaInfo | null;
  loading: boolean;
  error: string | null;
  refreshQuotas: () => Promise<void>;
  consumeQuotas: (majorArcana: number, completeDecks: number, referenceId?: string, description?: string) => Promise<boolean>;
  getEstimatedQuotaConsumption: (imageQuality: 'medium' | 'high', quantity: number) => {
    majorArcana: number;
    completeDecks: number;
    hasEnoughQuota: boolean;
  };
  initializeQuotas: () => Promise<void>;
}

const defaultDeckQuotaInfo: DeckQuotaInfo = {
  majorArcanaQuota: 0,
  completeDeckQuota: 0,
  majorArcanaUsed: 0,
  completeDeckUsed: 0,
  planType: 'free',
  lastRefreshDate: null,
  nextRefreshDate: null,
  maxRolloverQuota: 0
};

const DeckQuotaContext = createContext<DeckQuotaContextType>({
  quotas: defaultDeckQuotaInfo,
  loading: true,
  error: null,
  refreshQuotas: async () => {},
  consumeQuotas: async () => false,
  getEstimatedQuotaConsumption: () => ({ majorArcana: 0, completeDecks: 0, hasEnoughQuota: false }),
  initializeQuotas: async () => {},
});

export const useDeckQuotas = () => useContext(DeckQuotaContext);

export const DeckQuotaProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuthStore();
  const { subscription, isSubscribed } = useSubscription();
  const [quotas, setQuotas] = useState<DeckQuotaInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch user deck quotas
  const fetchQuotas = async () => {
    if (!user) {
      setQuotas(null);
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
          console.log("No deck quota record found, using default values");
          
          // Get subscription plan type from subscription if available
          let planType = 'free'; 
          let majorArcanaQuota = 1; // Free users start with 1 Major Arcana deck per month
          let completeDeckQuota = 0; // Free users can't create complete decks
          let maxRolloverQuota = 0; // No rollover for free users
          
          if (isSubscribed && subscription?.price_id) {
            // Find the product that matches this price ID
            for (const [key, product] of Object.entries(STRIPE_PRODUCTS)) {
              if (product.priceId === subscription.price_id) {
                planType = key.split('-')[0]; // Extract the plan name (mystic, creator, visionary)
                majorArcanaQuota = product.baseCredits || 0;
                completeDeckQuota = product.premiumCredits || 0;
                maxRolloverQuota = product.maxRolloverCredits || 0;
                break;
              }
            }
          }
          
          const quotaInfo = {
            majorArcanaQuota,
            completeDeckQuota,
            majorArcanaUsed: 0,
            completeDeckUsed: 0,
            planType,
            lastRefreshDate: null,
            nextRefreshDate: null,
            maxRolloverQuota
          };
          
          setQuotas(quotaInfo);

          // Update LogRocket with credit info
          if (user.id) {
            updateCreditData(user.id, {
              basicCredits: majorArcanaQuota, // Keep backward compatibility
              premiumCredits: completeDeckQuota, // Keep backward compatibility
              plan: planType
            });
          }

          // Attempt to migrate existing user quotas if this is an existing account
          try {
            // Try both migration approaches - first the legacy approach
            await checkAndMigrateCredits(user.id);
            
            // Then the new direct fix approach
            await ensureDeckQuotas(user.id);
            
            // Automatically refresh to get the newly created quota record
            const { data: newData } = await supabase
              .from('user_deck_quotas')
              .select('*')
              .eq('user_id', user.id)
              .single();
              
            if (newData) {
              const newQuotaInfo = {
                majorArcanaQuota: newData.major_arcana_quota,
                completeDeckQuota: newData.complete_deck_quota,
                majorArcanaUsed: newData.major_arcana_used,
                completeDeckUsed: newData.complete_deck_used,
                planType: newData.plan_type,
                lastRefreshDate: newData.last_refresh_date,
                nextRefreshDate: newData.next_refresh_date,
                maxRolloverQuota: newData.max_rollover_quota || 0,
              };
              
              setQuotas(newQuotaInfo);
              
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
            console.error('Error during deck quota migration:', migrationError);
          }
        } else {
          console.error('Error fetching user deck quotas:', fetchError);
          setError('Failed to load deck quota information');
          setQuotas(null);
        }
      } else if (data) {
        const quotaInfo = {
          majorArcanaQuota: data.major_arcana_quota,
          completeDeckQuota: data.complete_deck_quota,
          majorArcanaUsed: data.major_arcana_used,
          completeDeckUsed: data.complete_deck_used,
          planType: data.plan_type,
          lastRefreshDate: data.last_refresh_date,
          nextRefreshDate: data.next_refresh_date,
          maxRolloverQuota: data.max_rollover_quota || 0,
        };
        
        setQuotas(quotaInfo);
        
        // Update LogRocket with credit info
        if (user.id) {
          updateCreditData(user.id, {
            basicCredits: data.major_arcana_quota, // Keep backward compatibility
            premiumCredits: data.complete_deck_quota, // Keep backward compatibility
            plan: data.plan_type
          });
        }
      }
    } catch (err) {
      console.error('Error in fetchQuotas:', err);
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Initialize quotas - used when user subscribes or changes plan
  const initializeQuotas = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      // Make sure the user has a quota record first
      await ensureDeckQuotas(user.id);
      
      // Determine quota allocations based on subscription
      let planType = 'free';
      let majorArcanaQuota = 1; // Free users start with 1 Major Arcana deck per month
      let completeDeckQuota = 0; // Free users can't create complete decks
      let maxRolloverQuota = 0; // No rollover for free users
      
      if (isSubscribed && subscription?.price_id) {
        // Find the product that matches this price ID
        for (const [key, product] of Object.entries(STRIPE_PRODUCTS)) {
          if (product.priceId === subscription.price_id) {
            planType = key.split('-')[0]; // Extract the plan name (mystic, creator, visionary)
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
      // For yearly subscriptions, add 1 month but prorate quotas
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
            plan_type: planType,
            max_rollover_quota: maxRolloverQuota,
            next_refresh_date: nextRefreshDate.toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('user_id', user.id);
          
        if (updateError) {
          console.error('Error updating deck quotas:', updateError);
          throw new Error('Failed to update deck quotas');
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
            plan_type: planType,
            max_rollover_quota: maxRolloverQuota,
            next_refresh_date: nextRefreshDate.toISOString()
          }]);
          
        if (insertError) {
          console.error('Error inserting deck quotas:', insertError);
          throw new Error('Failed to initialize deck quotas');
        }
      }
      
      // Record the quota change
      await supabase
        .rpc('log_deck_quota_change', {
          p_user_id: user.id,
          p_major_arcana_change: majorArcanaQuota,
          p_complete_deck_change: completeDeckQuota,
          p_description: `Deck quotas allocated for ${planType} plan subscription`
        }).catch(err => {
          // Non-critical error, just log it
          console.error('Error logging deck quota change:', err);
        });
      
      // Update local state with new values
      setQuotas({
        majorArcanaQuota,
        completeDeckQuota,
        majorArcanaUsed: 0,
        completeDeckUsed: 0,
        planType,
        lastRefreshDate: new Date().toISOString(),
        nextRefreshDate: nextRefreshDate.toISOString(),
        maxRolloverQuota
      });
      
      // Update LogRocket with new credit info
      updateCreditData(user.id, {
        basicCredits: majorArcanaQuota, // Keep backward compatibility
        premiumCredits: completeDeckQuota, // Keep backward compatibility
        plan: planType
      });
      
    } catch (err) {
      console.error('Error initializing deck quotas:', err);
      setError('Failed to initialize deck quotas');
    } finally {
      setLoading(false);
    }
  };

  // Consume quotas for deck generation
  const consumeQuotas = async (
    majorArcana: number,
    completeDecks: number,
    referenceId?: string,
    description: string = 'Deck generation'
  ): Promise<boolean> => {
    if (!user || !quotas) return false;

    // Check if user has enough quotas
    if (quotas.majorArcanaQuota < majorArcana || quotas.completeDeckQuota < completeDecks) {
      return false;
    }

    try {
      // Call the RPC function to consume quotas
      const { data, error } = await supabase.rpc('consume_user_deck_quotas', {
        p_user_id: user.id,
        p_major_arcana_to_use: majorArcana,
        p_complete_deck_to_use: completeDecks,
        p_reference_id: referenceId || null,
        p_description: description
      });

      if (error) {
        console.error('Error consuming deck quotas:', error);
        return false;
      }

      // Update local state
      if (data) {
        await fetchQuotas();
        
        // Update LogRocket with updated quota info after consumption
        if (quotas) {
          const newMajorArcanaQuota = quotas.majorArcanaQuota - majorArcana;
          const newCompleteDeckQuota = quotas.completeDeckQuota - completeDecks;
          
          updateCreditData(user.id, {
            basicCredits: newMajorArcanaQuota, // Keep backward compatibility
            premiumCredits: newCompleteDeckQuota, // Keep backward compatibility
            plan: quotas.planType
          });
        }
        
        return true;
      }

      return false;
    } catch (err) {
      console.error('Error in consumeQuotas:', err);
      return false;
    }
  };

  // Calculate quota consumption based on image quality and quantity
  const getEstimatedQuotaConsumption = (imageQuality: 'medium' | 'high', quantity: number) => {
    let majorArcana = 0;
    let completeDecks = 0;
    
    if (imageQuality === 'medium') {
      majorArcana = quantity;
    } else {
      // High quality images use complete deck quota
      completeDecks = quantity * 3;
    }
    
    // Check if user has enough quotas
    const hasEnoughQuota = quotas
      ? (quotas.majorArcanaQuota >= majorArcana && quotas.completeDeckQuota >= completeDecks)
      : false;
    
    return {
      majorArcana,
      completeDecks,
      hasEnoughQuota
    };
  };

  // Watch for subscription changes and update quotas accordingly
  useEffect(() => {
    // When subscription changes, reinitialize quotas
    if (user && subscription) {
      if (isSubscribed) {
        // Initialize quotas based on the subscription
        initializeQuotas();
      } else {
        // If user lost subscription, still fetch quotas but don't initialize
        fetchQuotas();
      }
    }
  }, [user?.id, subscription]);

  // Initial quota fetch
  useEffect(() => {
    if (user) {
      fetchQuotas();
    }
  }, [user]);

  return (
    <DeckQuotaContext.Provider
      value={{
        quotas,
        loading,
        error,
        refreshQuotas: fetchQuotas,
        consumeQuotas,
        getEstimatedQuotaConsumption,
        initializeQuotas
      }}
    >
      {children}
    </DeckQuotaContext.Provider>
  );
};