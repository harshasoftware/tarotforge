import { usePrivy, useWallets } from '@privy-io/react-auth';
import { useAuthStore } from '../stores/authStore';
import { useEffect } from 'react';
import { supabase } from '../lib/supabase';

/**
 * Custom hook that integrates Privy authentication with Supabase
 *
 * This hook:
 * - Syncs Privy auth state with Supabase
 * - Links wallets to Supabase user accounts
 * - Provides unified auth methods
 */
export function usePrivyAuth() {
  const {
    ready,
    authenticated,
    user: privyUser,
    login,
    logout: privyLogout,
    linkEmail,
    linkWallet,
    unlinkEmail,
    unlinkWallet,
    exportWallet,
  } = usePrivy();

  const { wallets } = useWallets();
  const {
    user: supabaseUser,
    setUser,
    signOut: supabaseSignOut,
  } = useAuthStore();

  // Sync Privy user with Supabase
  useEffect(() => {
    if (!ready) return;

    const syncAuthState = async () => {
      if (authenticated && privyUser) {
        // User is logged in with Privy
        await syncPrivyWithSupabase();
      } else if (!authenticated && supabaseUser) {
        // Privy logged out but Supabase still has user - sync logout
        await supabaseSignOut();
      }
    };

    syncAuthState();
  }, [authenticated, privyUser, ready]);

  /**
   * Sync Privy user data with Supabase
   */
  const syncPrivyWithSupabase = async () => {
    if (!privyUser) return;

    try {
      // Check if user exists in Supabase
      const { data: existingUser, error } = await supabase
        .from('users')
        .select('*')
        .eq('privy_id', privyUser.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error checking user:', error);
        return;
      }

      if (existingUser) {
        // User exists, update their data
        await updateSupabaseUser(existingUser.id);
        setUser(existingUser);
      } else {
        // New user, create in Supabase
        await createSupabaseUser();
      }

      // Sync wallet addresses
      if (wallets.length > 0) {
        await syncWallets();
      }
    } catch (error) {
      console.error('Error syncing Privy with Supabase:', error);
    }
  };

  /**
   * Create new Supabase user from Privy data
   */
  const createSupabaseUser = async () => {
    if (!privyUser) return;

    const email = privyUser.email?.address || '';
    const username = email ? email.split('@')[0] : `user_${privyUser.id.slice(0, 8)}`;

    const { data: newUser, error } = await supabase
      .from('users')
      .insert({
        privy_id: privyUser.id,
        email,
        username,
        avatar_url: privyUser.google?.pictureUrl || null,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating user:', error);
      return;
    }

    setUser(newUser);
    console.log('✅ Created new user from Privy:', newUser.id);
  };

  /**
   * Update existing Supabase user
   */
  const updateSupabaseUser = async (userId: string) => {
    if (!privyUser) return;

    await supabase
      .from('users')
      .update({
        email: privyUser.email?.address || '',
        avatar_url: privyUser.google?.pictureUrl || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);
  };

  /**
   * Sync Privy wallets with Supabase user_wallets table
   */
  const syncWallets = async () => {
    if (!supabaseUser || wallets.length === 0) return;

    try {
      for (const wallet of wallets) {
        // Check if wallet already exists
        const { data: existing } = await supabase
          .from('user_wallets')
          .select('id')
          .eq('wallet_address', wallet.address.toLowerCase())
          .single();

        if (!existing) {
          // Add new wallet
          await supabase.from('user_wallets').insert({
            user_id: supabaseUser.id,
            wallet_address: wallet.address.toLowerCase(),
            wallet_type: wallet.walletClientType,
            chain_type: wallet.chainType,
            linked_at: new Date().toISOString(),
            is_primary: wallets.length === 1, // First wallet is primary
          });

          console.log('✅ Linked wallet:', wallet.address);
        }
      }
    } catch (error) {
      console.error('Error syncing wallets:', error);
    }
  };

  /**
   * Unified login method
   */
  const handleLogin = async () => {
    try {
      await login();
    } catch (error) {
      console.error('Login error:', error);
    }
  };

  /**
   * Unified logout method
   */
  const handleLogout = async () => {
    try {
      await Promise.all([privyLogout(), supabaseSignOut()]);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  /**
   * Link new wallet to existing account
   */
  const handleLinkWallet = async () => {
    try {
      await linkWallet();
      await syncWallets();
    } catch (error) {
      console.error('Link wallet error:', error);
    }
  };

  /**
   * Unlink wallet from account
   */
  const handleUnlinkWallet = async (walletAddress: string) => {
    try {
      await unlinkWallet(walletAddress);

      // Remove from Supabase
      if (supabaseUser) {
        await supabase
          .from('user_wallets')
          .delete()
          .eq('user_id', supabaseUser.id)
          .eq('wallet_address', walletAddress.toLowerCase());
      }

      console.log('✅ Unlinked wallet:', walletAddress);
    } catch (error) {
      console.error('Unlink wallet error:', error);
    }
  };

  return {
    // State
    ready,
    authenticated,
    user: privyUser,
    wallets,
    supabaseUser,

    // Methods
    login: handleLogin,
    logout: handleLogout,
    linkEmail,
    linkWallet: handleLinkWallet,
    unlinkEmail,
    unlinkWallet: handleUnlinkWallet,
    exportWallet,
  };
}
