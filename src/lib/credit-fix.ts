import { supabase } from './supabase';

/**
 * Force a check and fix for the current user's credit record
 * This is a utility function to be called when you detect a user with a paid plan
 * but no credit record
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
 * Check if a user has a credit record and fix it if not
 */
export const ensureUserCredits = async (userId: string): Promise<boolean> => {
  try {
    // First check if a credit record exists
    const { data, error } = await supabase
      .from('user_credits')
      .select('id')
      .eq('user_id', userId)
      .single();
      
    if (error) {
      // No credit record found, attempt to fix
      console.log('No credit record found, attempting to create one');
      return fixUserCreditRecord(userId);
    }
    
    // Record exists, no fix needed
    return true;
  } catch (err) {
    console.error('Error in ensureUserCredits:', err);
    return false;
  }
};