import { supabase } from './supabase';

/**
 * Checks if a user has reached their deck generation limit
 * @param userId The user's ID
 * @param deckType 'major_arcana' | 'complete'
 * @returns Detailed information about the user's limit status
 */
export const checkDeckGenerationLimit = async (
  userId: string | undefined,
  deckType: 'major_arcana' | 'complete'
): Promise<{
  canGenerate: boolean;
  reason: string;
  limitReached: boolean;
  planType: string;
  currentUsage?: number;
  limit?: number;
  remaining?: number;
}> => {
  try {
    // If no user ID, they can't generate
    if (!userId) {
      return {
        canGenerate: false,
        reason: 'anonymous_user',
        limitReached: true,
        planType: 'anonymous'
      };
    }
    
    // Call the RPC function to check the limit
    const { data, error } = await supabase.rpc('check_deck_generation_limit', {
      user_id_param: userId,
      deck_type: deckType
    });
    
    if (error) {
      console.error('Error checking deck generation limit:', error);
      return {
        canGenerate: false,
        reason: 'error',
        limitReached: true,
        planType: 'unknown'
      };
    }
    
    return {
      canGenerate: data.can_generate,
      reason: data.reason,
      limitReached: data.limit_reached,
      planType: data.plan_type,
      currentUsage: data.current_usage,
      limit: data.limit,
      remaining: data.remaining
    };
  } catch (error) {
    console.error('Error in checkDeckGenerationLimit:', error);
    return {
      canGenerate: false,
      reason: 'error',
      limitReached: true,
      planType: 'unknown'
    };
  }
};

/**
 * Checks if a user can generate a new deck based on their plan and usage
 * @param userId The user's ID
 * @param deckType 'major_arcana' | 'complete'
 * @returns Boolean indicating if user can generate this deck type
 */
export const checkDeckGenerationEligibility = async (
  userId: string,
  deckType: 'major_arcana' | 'complete'
): Promise<boolean> => {
  // If no user ID provided, they can't generate
  if (!userId) {
    return false;
  }
  
  try {
    // Fetch the user's current usage and plan limits
    const { data: usageData, error: usageError } = await supabase
      .from('user_deck_usage')
      .select(`
        *,
        limits:deck_generation_limits!inner(*)
      `)
      .eq('user_id', userId)
      .single();
      
    if (usageError) {
      console.error('Error fetching user deck usage:', usageError);
      return false;
    }
    
    if (!usageData) {
      console.warn('No usage data found for user, may need to initialize');
      return deckType === 'major_arcana'; // Default to allowing major arcana for free tier
    }
    
    // Check if the user is on a current reset period, and if not, reset their usage
    const now = new Date();
    if (usageData.next_reset_date && new Date(usageData.next_reset_date) < now) {
      // Reset period has passed, update the usage counters and dates
      await resetUserUsage(userId, usageData.plan_type);
      
      // After reset, they can generate a deck
      return true;
    }
    
    // Check against the appropriate limit
    if (deckType === 'major_arcana') {
      return usageData.major_arcana_generated < usageData.limits.major_arcana_limit;
    } else { // complete deck
      return usageData.complete_decks_generated < usageData.limits.complete_deck_limit;
    }
  } catch (error) {
    console.error('Error checking deck generation eligibility:', error);
    return false;
  }
};

/**
 * Records the generation of a new deck and updates the user's usage
 * @param userId The user's ID
 * @param deckType 'major_arcana' | 'complete'
 * @returns Boolean indicating success
 */
export const recordDeckGeneration = async (
  userId: string,
  deckType: 'major_arcana' | 'complete'
): Promise<boolean> => {
  // If no user ID provided, they can't record generation
  if (!userId) {
    return false;
  }
  
  try {
    // Determine which counter to increment
    const updateField = deckType === 'major_arcana' ? 'major_arcana_generated' : 'complete_decks_generated';
    
    // Update the user's usage
    const { error } = await supabase.rpc('increment_deck_generation_counter', { 
      user_id_param: userId, 
      field_name: updateField 
    });
    
    if (error) {
      console.error('Error recording deck generation:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error recording deck generation:', error);
    return false;
  }
};

/**
 * Records the usage of card regenerations
 * @param userId The user's ID
 * @param count Number of regenerations to record
 * @returns Boolean indicating success
 */
export const recordRegenerations = async (
  userId: string,
  count: number = 1
): Promise<boolean> => {
  // If no user ID provided, they can't record regenerations
  if (!userId) {
    return false;
  }
  
  try {
    // Get current regeneration count
    const { data: usageData, error: usageError } = await supabase
      .from('user_deck_usage')
      .select('regenerations_used, plan_type, limits:deck_generation_limits!inner(regeneration_limit)')
      .eq('user_id', userId)
      .single();
      
    if (usageError) {
      console.error('Error fetching user regeneration usage:', usageError);
      return false;
    }
    
    // Check if user has enough regenerations left
    if (usageData.regenerations_used + count > usageData.limits.regeneration_limit) {
      console.warn('User has reached regeneration limit');
      return false;
    }
    
    // Update regeneration count
    const { error } = await supabase
      .from('user_deck_usage')
      .update({
        regenerations_used: usageData.regenerations_used + count,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId);
      
    if (error) {
      console.error('Error recording regeneration usage:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error recording regenerations:', error);
    return false;
  }
};

/**
 * Gets the user's current deck generation limits and usage
 * @param userId The user's ID
 * @returns Usage and limit information
 */
export const getDeckGenerationStatus = async (userId: string) => {
  // If no user ID provided, return null
  if (!userId) {
    return null;
  }
  
  try {
    // Get the user's current usage
    const { data: usageData, error: usageError } = await supabase
      .from('user_deck_usage')
      .select(`
        *,
        limits:deck_generation_limits!inner(*)
      `)
      .eq('user_id', userId)
      .single();
      
    if (usageError) {
      console.error('Error fetching user deck usage:', usageError);
      return null;
    }
    
    return {
      usage: {
        majorArcanaGenerated: usageData.major_arcana_generated,
        completeDecksGenerated: usageData.complete_decks_generated,
        regenerationsUsed: usageData.regenerations_used,
        lastResetDate: usageData.last_reset_date,
        nextResetDate: usageData.next_reset_date,
        planType: usageData.plan_type
      },
      limits: {
        majorArcanaLimit: usageData.limits.major_arcana_limit,
        completeDeckLimit: usageData.limits.complete_deck_limit,
        regenerationLimit: usageData.limits.regeneration_limit,
        qualityLevel: usageData.limits.quality_level,
        maxStorage: usageData.limits.max_storage
      },
      canGenerateMajorArcana: usageData.major_arcana_generated < usageData.limits.major_arcana_limit,
      canGenerateCompleteDeck: usageData.complete_decks_generated < usageData.limits.complete_deck_limit,
      canRegenerate: usageData.regenerations_used < usageData.limits.regeneration_limit
    };
  } catch (error) {
    console.error('Error getting deck generation status:', error);
    return null;
  }
};

/**
 * Resets a user's usage counters when a new billing period begins
 * @param userId The user's ID
 * @param planType The user's plan type
 * @returns Boolean indicating success
 */
async function resetUserUsage(userId: string, planType: string): Promise<boolean> {
  try {
    // Calculate next reset date based on plan type
    const now = new Date();
    const nextResetDate = new Date(now);
    
    // Monthly reset for most plans
    nextResetDate.setMonth(nextResetDate.getMonth() + 1);
    nextResetDate.setDate(1); // First day of next month
    nextResetDate.setHours(0, 0, 0, 0); // Midnight
    
    // Update the user's usage record
    const { error } = await supabase
      .from('user_deck_usage')
      .update({
        major_arcana_generated: 0,
        complete_decks_generated: 0,
        regenerations_used: 0,
        last_reset_date: now.toISOString(),
        next_reset_date: nextResetDate.toISOString(),
        updated_at: now.toISOString()
      })
      .eq('user_id', userId);
      
    if (error) {
      console.error('Error resetting user usage:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error in resetUserUsage:', error);
    return false;
  }
}