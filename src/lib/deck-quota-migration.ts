import { supabase } from './supabase';
import { STRIPE_PRODUCTS } from './stripe-config';

/**
 * Migrates a user's deck quota record if it doesn't exist
 * This is used for accounts that were upgraded before the deck quota system was fully implemented
 * @param userId The user ID to migrate
 */
export const migrateUserDeckQuotas = async (userId: string): Promise<boolean> => {
  try {
    console.log('Starting deck quota migration for user:', userId);
    
    // First check if a deck quota record already exists
    const { data: existingQuota, error: fetchError } = await supabase
      .from('user_deck_quotas')
      .select('id')
      .eq('user_id', userId)
      .single();
      
    // If a record exists, no need to migrate
    if (existingQuota) {
      console.log('User already has a deck quota record, no migration needed');
      return true;
    }
    
    // Check if the user has an active subscription
    const { data: subscription, error: subError } = await supabase
      .from('stripe_user_subscriptions')
      .select('subscription_status, price_id')
      .maybeSingle();
      
    if (subError) {
      console.error('Error fetching subscription for migration:', subError);
    }
    
    // Determine quota allocations based on subscription
    let planType = 'free';
    let majorArcanaQuota = 1; // Default for free users - 1 Major Arcana deck per month
    let completeDeckQuota = 0; // Free users can't create complete decks
    let maxRolloverQuota = 0; // No rollover for free users
    
    if (subscription?.subscription_status === 'active' || 
        subscription?.subscription_status === 'trialing') {
      // Active subscription - find the right plan
      const priceId = subscription.price_id;
      
      if (priceId) {
        // Find the product that matches this price ID
        for (const [key, product] of Object.entries(STRIPE_PRODUCTS)) {
          if (product.priceId === priceId) {
            planType = key.split('-')[0]; // Extract the plan name (mystic, creator, visionary)
            majorArcanaQuota = product.baseCredits || 0;
            completeDeckQuota = product.premiumCredits || 0;
            maxRolloverQuota = product.maxRolloverCredits || 0;
            break;
          }
        }
      }
    }
    
    // Calculate next refresh date (1 month from now)
    const nextRefreshDate = new Date();
    nextRefreshDate.setMonth(nextRefreshDate.getMonth() + 1);
    
    console.log('Creating deck quota record with:', {
      planType,
      majorArcanaQuota,
      completeDeckQuota,
      maxRolloverQuota
    });
    
    // Insert the deck quota record directly using RPC to ensure it's handled server-side
    const { error: insertError } = await supabase.rpc('initialize_user_deck_quota', {
      p_user_id: userId,
      p_plan_tier: planType,
      p_major_arcana_quota: majorArcanaQuota,
      p_complete_deck_quota: completeDeckQuota,
      p_max_rollover: maxRolloverQuota,
      p_next_refresh_date: nextRefreshDate.toISOString()
    });
    
    if (insertError) {
      console.error('Error creating deck quota record during migration:', insertError);
      return false;
    }
    
    console.log('Successfully migrated deck quotas for user', userId);
    return true;
  } catch (err) {
    console.error('Unexpected error during deck quota migration:', err);
    return false;
  }
};

/**
 * Check if a user needs deck quota migration and perform it if needed
 * This should be called when the app detects a user with no deck quota record
 */
export const checkAndMigrateCredits = async (userId: string): Promise<boolean> => {
  // Check if user exists but has no deck quota record
  const { data: userExists, error: userError } = await supabase
    .from('users')
    .select('id')
    .eq('id', userId)
    .single();
    
  if (userError || !userExists) {
    console.log('User does not exist or error checking user:', userError);
    return false;
  }
  
  // Check if deck quota record exists
  const { data: quotaExists, error: quotaError } = await supabase
    .from('user_deck_quotas')
    .select('id')
    .eq('user_id', userId)
    .single();
    
  // If deck quota record doesn't exist, migrate
  if (quotaError || !quotaExists) {
    console.log('No deck quota record found, running migration');
    return migrateUserDeckQuotas(userId);
  }
  
  // Deck quota record already exists
  return true;
};