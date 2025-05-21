import { supabase } from './supabase';
import { STRIPE_PRODUCTS } from './stripe-config';

/**
 * Migrates a user's credit record if it doesn't exist
 * This is used for accounts that were upgraded before the credit system was fully implemented
 * @param userId The user ID to migrate
 */
export const migrateUserCredits = async (userId: string): Promise<boolean> => {
  try {
    console.log('Starting credit migration for user:', userId);
    
    // First check if a credit record already exists
    const { data: existingCredit, error: fetchError } = await supabase
      .from('user_credits')
      .select('id')
      .eq('user_id', userId)
      .single();
      
    // If a record exists, no need to migrate
    if (existingCredit) {
      console.log('User already has a credit record, no migration needed');
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
    
    // Determine credit allocations based on subscription
    let planTier = 'free';
    let basicCredits = 5; // Default for free users
    let premiumCredits = 0;
    let maxRolloverCredits = 0;
    
    if (subscription?.subscription_status === 'active' || 
        subscription?.subscription_status === 'trialing') {
      // Active subscription - find the right plan
      const priceId = subscription.price_id;
      
      if (priceId) {
        // Find the product that matches this price ID
        for (const [key, product] of Object.entries(STRIPE_PRODUCTS)) {
          if (product.priceId === priceId) {
            planTier = key.split('-')[0]; // Extract the plan name (mystic, creator, visionary)
            basicCredits = product.baseCredits || 0;
            premiumCredits = product.premiumCredits || 0;
            maxRolloverCredits = product.maxRolloverCredits || 0;
            break;
          }
        }
      }
    }
    
    // Calculate next refresh date (1 month from now)
    const nextRefreshDate = new Date();
    nextRefreshDate.setMonth(nextRefreshDate.getMonth() + 1);
    
    console.log('Creating credit record with:', {
      planTier,
      basicCredits,
      premiumCredits,
      maxRolloverCredits
    });
    
    // Insert the credit record directly using RPC to ensure it's handled server-side
    const { error: insertError } = await supabase.rpc('initialize_user_credit_record', {
      p_user_id: userId,
      p_plan_tier: planTier,
      p_basic_credits: basicCredits,
      p_premium_credits: premiumCredits,
      p_max_rollover: maxRolloverCredits,
      p_next_refresh_date: nextRefreshDate.toISOString()
    });
    
    if (insertError) {
      console.error('Error creating credit record during migration:', insertError);
      return false;
    }
    
    // Record the credit transaction
    const { error: transactionError } = await supabase
      .from('credit_transactions')
      .insert([{
        user_id: userId,
        transaction_type: 'allocation',
        basic_credits_change: basicCredits,
        premium_credits_change: premiumCredits,
        description: `Initial credit allocation during migration for ${planTier} plan`
      }]);
      
    if (transactionError) {
      console.error('Error recording credit transaction during migration:', transactionError);
      // Non-critical error, we can continue
    }
    
    console.log('Successfully migrated credits for user', userId);
    return true;
  } catch (err) {
    console.error('Unexpected error during credit migration:', err);
    return false;
  }
};

/**
 * Check if a user needs credit migration and perform it if needed
 * This should be called when the app detects a user with no credit record
 */
export const checkAndMigrateCredits = async (userId: string): Promise<boolean> => {
  // Check if user exists but has no credit record
  const { data: userExists, error: userError } = await supabase
    .from('users')
    .select('id')
    .eq('id', userId)
    .single();
    
  if (userError || !userExists) {
    console.log('User does not exist or error checking user:', userError);
    return false;
  }
  
  // Check if credit record exists
  const { data: creditExists, error: creditError } = await supabase
    .from('user_credits')
    .select('id')
    .eq('user_id', userId)
    .single();
    
  // If credit record doesn't exist, migrate
  if (creditError || !creditExists) {
    console.log('No credit record found, running migration');
    return migrateUserCredits(userId);
  }
  
  // Credit record already exists
  return true;
};