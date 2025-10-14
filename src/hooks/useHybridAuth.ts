import { useEffect, useState } from 'react';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { useAuthStore } from '../stores/authStore';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

export interface HybridAuthState {
  // Supabase user state
  supabaseUser: any;
  isSupabaseAuthenticated: boolean;

  // Privy wallet state
  privyUser: any;
  walletAddress: string | null;
  isWalletConnected: boolean;

  // Combined capabilities
  canAccessNFTFeatures: boolean;
  hasWallet: boolean;

  // Authentication methods
  connectWallet: () => Promise<void>;
  linkWalletToAccount: () => Promise<void>;
  disconnectWallet: () => Promise<void>;

  // Loading states
  isLinkingWallet: boolean;
}

/**
 * Hook that provides hybrid Web2/Web3 authentication state and methods.
 * Combines Supabase authentication with Privy wallet connectivity.
 */
export const useHybridAuth = (): HybridAuthState => {
  const { user: supabaseUser, isAnonymous } = useAuthStore();
  const {
    user: privyUser,
    login: privyLogin,
    logout: privyLogout,
    authenticated: privyAuthenticated,
    ready: privyReady
  } = usePrivy();
  const { wallets } = useWallets();

  const [isLinkingWallet, setIsLinkingWallet] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);

  // Check if user is authenticated with Supabase (not anonymous)
  const isSupabaseAuthenticated = supabaseUser && !isAnonymous();

  // Check if wallet is connected via Privy
  const isWalletConnected = privyAuthenticated && wallets.length > 0;

  // User can access NFT features if they have both Supabase auth and wallet
  const canAccessNFTFeatures = isSupabaseAuthenticated && isWalletConnected;

  // User has a wallet if connected via Privy
  const hasWallet = wallets.length > 0;

  // Update wallet address when wallets change
  useEffect(() => {
    if (wallets.length > 0) {
      const primaryWallet = wallets[0];
      setWalletAddress(primaryWallet.address);
    } else {
      setWalletAddress(null);
    }
  }, [wallets]);

  // Connect wallet via Privy
  const connectWallet = async () => {
    try {
      if (!privyReady) {
        toast.error('Wallet connection not ready. Please try again.');
        return;
      }

      await privyLogin();
      toast.success('Wallet connected successfully!');
    } catch (error) {
      console.error('Error connecting wallet:', error);
      toast.error('Failed to connect wallet. Please try again.');
    }
  };

  // Link wallet to existing Supabase account
  const linkWalletToAccount = async () => {
    if (!supabaseUser) {
      toast.error('Please sign in first before connecting your wallet.');
      return;
    }

    if (!privyUser || wallets.length === 0) {
      toast.error('No wallet connected. Please connect a wallet first.');
      return;
    }

    try {
      setIsLinkingWallet(true);

      // Get all wallet addresses from Privy
      const walletAddresses = wallets.reduce((acc, wallet) => {
        const chainType = wallet.walletClientType;
        acc[chainType] = wallet.address;
        return acc;
      }, {} as Record<string, string>);

      // Update Supabase user metadata with wallet addresses
      const { error: updateError } = await supabase.auth.updateUser({
        data: {
          wallet_addresses: walletAddresses,
          privy_user_id: privyUser.id,
          nft_features_enabled: true,
        },
      });

      if (updateError) throw updateError;

      // Also update the users table for easy querying
      const { error: profileError } = await supabase
        .from('users')
        .update({
          wallet_addresses: walletAddresses,
          privy_user_id: privyUser.id,
          nft_features_enabled: true,
        })
        .eq('id', supabaseUser.id);

      if (profileError) {
        console.warn('Error updating user profile with wallet:', profileError);
      }

      toast.success('Wallet linked to your account!');
    } catch (error) {
      console.error('Error linking wallet to account:', error);
      toast.error('Failed to link wallet. Please try again.');
    } finally {
      setIsLinkingWallet(false);
    }
  };

  // Disconnect wallet
  const disconnectWallet = async () => {
    try {
      await privyLogout();
      setWalletAddress(null);
      toast.success('Wallet disconnected');
    } catch (error) {
      console.error('Error disconnecting wallet:', error);
      toast.error('Failed to disconnect wallet');
    }
  };

  // Automatically link wallet to Supabase account when both are authenticated
  useEffect(() => {
    const autoLinkWallet = async () => {
      // Only auto-link if:
      // 1. User is authenticated with Supabase
      // 2. Privy user exists (wallet connected)
      // 3. Wallet addresses are not yet saved to Supabase
      // 4. Not currently linking
      if (
        isSupabaseAuthenticated &&
        privyUser &&
        wallets.length > 0 &&
        !isLinkingWallet &&
        !supabaseUser?.wallet_addresses
      ) {
        console.log('🔗 Auto-linking Privy wallet to Supabase account');
        await linkWalletToAccount();
      }
    };

    autoLinkWallet();
  }, [isSupabaseAuthenticated, privyUser, wallets.length, supabaseUser?.wallet_addresses]);

  return {
    supabaseUser,
    isSupabaseAuthenticated,
    privyUser,
    walletAddress,
    isWalletConnected,
    canAccessNFTFeatures,
    hasWallet,
    connectWallet,
    linkWalletToAccount,
    disconnectWallet,
    isLinkingWallet,
  };
};
