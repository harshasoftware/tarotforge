import { supabase } from './supabase';

/**
 * Force a check and fix for the current user's deck quota record
 * This is a utility function to be called when you detect a user with a paid plan
 * but no deck quota record
 */
export const fixUserCreditRecord = async (userId: string): Promise<boolean> => {
  try {
    // Call the RPC function to fix the credit record
    const { data, error } = await supabase
      .rpc('fix_missing_credit_record', {
        user_id: userId
      });
    
    if (error) {
      console.error('Error fixing credit record:', error);
      return false;
    }
    
    return data || false;
  } catch (err) {
    console.error('Error in fixUserCreditRecord:', err);
    return false;
  }
};

/**
 * Check if a user has a deck quota record and fix it if not
 */
export const ensureUserCredits = async (userId: string): Promise<boolean> => {
  try {
    // First check if a deck quota record exists
    const { data, error } = await supabase
      .from('user_deck_quotas')
      .select('id')
      .eq('user_id', userId)
      .single();
      
    if (error) {
      // No deck quota record found, attempt to fix
      console.log('No deck quota record found, attempting to create one');
      return fixUserCreditRecord(userId);
    }
    
    // Record exists, no fix needed
    return true;
  } catch (err) {
    console.error('Error in ensureUserCredits:', err);
    return false;
  }
};