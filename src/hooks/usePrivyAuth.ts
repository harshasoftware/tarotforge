import { usePrivy } from '@privy-io/react-auth';
import { useAuthStore } from '../stores/authStore';
import { useEffect } from 'react';
import { supabase } from '../lib/supabase';

/**
 * Custom hook that integrates Privy authentication with Supabase authStore
 *
 * This hook monitors Privy's authentication state and syncs it with the
 * existing Supabase authStore so the Navbar and other components update correctly.
 */
export function usePrivyAuth() {
  const {
    ready,
    authenticated,
    user: privyUser,
  } = usePrivy();

  const {
    user: supabaseUser,
    setUser,
    signOut: supabaseSignOut,
  } = useAuthStore();

  // Sync Privy user with Supabase authStore
  useEffect(() => {
    if (!ready) return;

    const syncAuthState = async () => {
      if (authenticated && privyUser) {
        console.log('🔐 Privy user authenticated, syncing with authStore:', privyUser.id);
        await syncPrivyWithSupabase();
      } else if (!authenticated && supabaseUser) {
        console.log('🔓 Privy logged out, clearing authStore');
        await supabaseSignOut();
      }
    };

    syncAuthState();
  }, [authenticated, privyUser, ready, supabaseUser, supabaseSignOut]);

  /**
   * Sync Privy user data with Supabase authStore
   */
  const syncPrivyWithSupabase = async () => {
    if (!privyUser) return;

    try {
      // Get email from Privy user
      const email = privyUser.email?.address || privyUser.google?.email || '';

      if (!email) {
        console.warn('No email found for Privy user, skipping sync');
        return;
      }

      // Check if user exists in Supabase by email
      const { data: existingUser, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error checking user:', error);
        return;
      }

      if (existingUser) {
        console.log('✅ User exists in Supabase, updating authStore');
        // User exists, update the auth store
        setUser(existingUser);
      } else {
        console.log('🆕 Creating new user in Supabase');
        // Create new user
        const username = email.split('@')[0];
        const { data: newUser, error: insertError } = await supabase
          .from('users')
          .insert({
            email,
            username,
            created_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (insertError) {
          console.error('Error creating user:', insertError);
        } else if (newUser) {
          console.log('✅ New user created, updating authStore');
          setUser(newUser);
        }
      }
    } catch (error) {
      console.error('Error syncing Privy with Supabase:', error);
    }
  };
}
