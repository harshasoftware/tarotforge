import { supabase } from '../lib/supabase';
import type { User } from '../types';
import { v4 as uuidv4 } from 'uuid';

interface AnonymousAuthResult {
  user: User | null;
  error: any;
}

// Singleton state for anonymous user creation
let isCreatingAnonymousUser = false;
let pendingAnonymousPromise: Promise<AnonymousAuthResult> | null = null;

/**
 * Create a guest user in the local database only (no Privy auth)
 *
 * With Privy, "anonymous" users are just non-authenticated users.
 * We create a local database record to track them in reading sessions,
 * but they don't have a Privy account until they sign up.
 */
export const createGuestUser = async (): Promise<AnonymousAuthResult> => {
  console.log('🎭 [GuestAuth] Creating guest user (database-only, no Privy auth)');

  // If already creating, return pending promise
  if (isCreatingAnonymousUser && pendingAnonymousPromise) {
    console.log('⏳ [GuestAuth] Guest user creation already in progress, waiting...');
    return pendingAnonymousPromise;
  }

  isCreatingAnonymousUser = true;

  pendingAnonymousPromise = (async (): Promise<AnonymousAuthResult> => {
    try {
      // Generate a unique guest ID
      const guestId = `guest_${uuidv4()}`;
      const guestName = `Guest_${guestId.slice(-6)}`;

      console.log('💾 [GuestAuth] Creating guest user record:', guestId);

      // Create guest user record in database
      const { error: insertError } = await supabase
        .from('anonymous_users')
        .insert({
          id: guestId,
          name: guestName,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

      if (insertError) {
        console.error('❌ [GuestAuth] Failed to create guest user:', insertError);
        return { user: null, error: insertError };
      }

      console.log('✅ [GuestAuth] Guest user created successfully');

      // Create User object for local state
      const userObj: User = {
        id: guestId,
        email: undefined,
        username: guestName,
        full_name: undefined,
        avatar_url: undefined,
        is_reader: false,
        created_at: new Date().toISOString(),
      };

      // Store guest ID in localStorage for persistence across page reloads
      localStorage.setItem('guest_user_id', guestId);

      return { user: userObj, error: null };
    } catch (error) {
      console.error('❌ [GuestAuth] Unexpected error creating guest user:', error);
      return { user: null, error };
    } finally {
      isCreatingAnonymousUser = false;
      pendingAnonymousPromise = null;
    }
  })();

  return pendingAnonymousPromise;
};

/**
 * Get existing guest user from localStorage or create new one
 */
export const getOrCreateGuestUser = async (): Promise<AnonymousAuthResult> => {
  console.log('🎭 [GuestAuth] Getting or creating guest user');

  // Check localStorage for existing guest
  const existingGuestId = localStorage.getItem('guest_user_id');

  if (existingGuestId) {
    console.log('🔍 [GuestAuth] Found existing guest ID in localStorage:', existingGuestId);

    // Verify guest still exists in database
    const { data: guestData, error: fetchError } = await supabase
      .from('anonymous_users')
      .select('*')
      .eq('id', existingGuestId)
      .single();

    if (!fetchError && guestData) {
      console.log('✅ [GuestAuth] Guest user verified in database');

      const userObj: User = {
        id: guestData.id,
        email: undefined,
        username: guestData.name || `Guest_${guestData.id.slice(-6)}`,
        full_name: guestData.name || undefined,
        avatar_url: undefined,
        is_reader: false,
        created_at: guestData.created_at,
      };

      return { user: userObj, error: null };
    }

    console.warn('⚠️ [GuestAuth] Guest user not found in database, creating new one');
    localStorage.removeItem('guest_user_id');
  }

  // No existing guest or verification failed - create new
  return createGuestUser();
};

/**
 * Check if a user ID is a guest user
 */
export const isGuestUser = (userId: string | undefined): boolean => {
  if (!userId) return false;
  return userId.startsWith('guest_');
};

/**
 * Clear guest user from localStorage
 */
export const clearGuestUser = () => {
  localStorage.removeItem('guest_user_id');
  console.log('🧹 [GuestAuth] Cleared guest user from localStorage');
};
