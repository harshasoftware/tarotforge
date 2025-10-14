/**
 * Privy Authentication Utilities
 *
 * This file provides helper functions and types for Privy authentication
 * integration with Tarot Forge.
 */

import type { User as PrivyUser } from '@privy-io/react-auth';
import type { User } from '../types';
import { supabase } from './supabase';

/**
 * Convert Privy user to Tarot Forge user format
 */
export const convertPrivyUserToTarotUser = async (privyUser: PrivyUser): Promise<User> => {
  // Extract email from Privy user
  const email = privyUser.email?.address || privyUser.google?.email;

  // Extract username from various sources
  const googleName = privyUser.google?.name;
  const emailPrefix = email?.split('@')[0];
  const defaultUsername = googleName || emailPrefix || `User_${privyUser.id.slice(-6)}`;

  // Step 1: Get or create UUID for Privy DID
  const { data: uuidData, error: uuidError } = await supabase
    .rpc('get_or_create_uuid_for_privy_did', { p_privy_did: privyUser.id });

  if (uuidError) {
    console.error('Error getting UUID for Privy DID in convert:', uuidError);
    // Fall back to using Privy ID directly if mapping fails
  }

  const userUuid = uuidData as string;

  // Check if user exists in Supabase database using UUID
  const { data: existingUser } = await supabase
    .from('users')
    .select('*')
    .eq('id', userUuid)
    .single();

  // Try to get profile picture from various OAuth providers
  // Note: Google OAuth in Privy doesn't include profile pictures directly
  // Twitter, Discord, and some other providers do have profilePictureUrl
  let profilePicture: string | undefined = undefined;

  // Check Twitter account for profile picture
  const twitterAccount = privyUser.linkedAccounts?.find(
    (account) => account.type === 'twitter_oauth'
  );
  if (twitterAccount?.type === 'twitter_oauth') {
    profilePicture = twitterAccount.profilePictureUrl || undefined;
  }

  // Determine auth method
  let authMethod: 'email' | 'google' | 'wallet' | 'twitter' = 'email';
  if (privyUser.google) authMethod = 'google';
  else if (privyUser.twitter) authMethod = 'twitter';
  else if (privyUser.wallet) authMethod = 'wallet';

  // Get wallet addresses
  const wallets = getUserWallets(privyUser);

  // Return user object with Privy data
  const user: User = {
    id: userUuid || privyUser.id, // Use UUID from mapping, fallback to Privy ID
    privy_id: privyUser.id,
    email: email,
    username: existingUser?.username || defaultUsername,
    full_name: googleName || existingUser?.full_name || defaultUsername,
    avatar_url: existingUser?.avatar_url,
    created_at: privyUser.createdAt ? new Date(privyUser.createdAt).toISOString() : new Date().toISOString(),
    is_creator: existingUser?.is_creator || false,
    is_reader: existingUser?.is_reader || false,
    bio: existingUser?.bio || '',
    custom_price_per_minute: existingUser?.custom_price_per_minute,

    // Privy-specific fields
    embedded_eth_wallet: wallets.embeddedEth,
    embedded_solana_wallet: wallets.embeddedSol,
    external_wallets: wallets.external.map(w => ({
      address: w?.address || '',
      type: w?.chain === 'solana' ? 'solana' : 'ethereum',
      walletClient: w?.type || 'unknown',
    })),
    auth_method: authMethod,
  };

  return user;
};

/**
 * Sync Privy user data to Supabase database
 */
export const syncPrivyUserToSupabase = async (privyUser: PrivyUser): Promise<{ error: any }> => {
  try {
    const tarotUser = await convertPrivyUserToTarotUser(privyUser);

    // Step 1: Get or create UUID mapping for Privy DID
    const { data: uuidData, error: uuidError } = await supabase
      .rpc('get_or_create_uuid_for_privy_did', { p_privy_did: privyUser.id });

    if (uuidError) {
      console.error('Error getting UUID for Privy DID:', uuidError);
      return { error: uuidError };
    }

    const userUuid = uuidData as string;
    console.log(`✅ Mapped Privy DID ${privyUser.id} to UUID ${userUuid}`);

    // Get embedded wallet addresses from linkedAccounts
    // Wallet accounts have type 'wallet' and include address, chainType, walletClientType
    const ethWallet = privyUser.linkedAccounts?.find(
      (account) => {
        // Type guard to check if this is a wallet account
        if (account.type === 'wallet') {
          return account.walletClientType === 'privy' && account.chainType === 'ethereum';
        }
        return false;
      }
    );

    const solWallet = privyUser.linkedAccounts?.find(
      (account) => {
        if (account.type === 'wallet') {
          return account.walletClientType === 'privy' && account.chainType === 'solana';
        }
        return false;
      }
    );

    // Get external wallets (non-Privy wallets)
    const externalWallets = privyUser.linkedAccounts
      ?.filter((account) => {
        if (account.type === 'wallet') {
          return account.walletClientType !== 'privy';
        }
        return false;
      })
      .map((wallet) => {
        // Type assertion since we know these are wallet accounts
        if (wallet.type === 'wallet') {
          return {
            address: wallet.address,
            type: wallet.walletClientType || 'unknown',
            chain: wallet.chainType,
          };
        }
        return null;
      })
      .filter((w) => w !== null) || [];

    // Determine auth method
    let authMethod: 'email' | 'google' | 'wallet' | 'twitter' = 'email';
    if (privyUser.google) authMethod = 'google';
    else if (privyUser.twitter) authMethod = 'twitter';
    else if (privyUser.wallet) authMethod = 'wallet';

    // Step 2: Upsert user data to Supabase using the UUID
    const { error } = await supabase
      .from('users')
      .upsert({
        id: userUuid, // Use UUID instead of Privy DID
        privy_id: privyUser.id, // Store Privy DID for reference
        email: tarotUser.email,
        username: tarotUser.username,
        full_name: tarotUser.full_name,
        avatar_url: tarotUser.avatar_url,
        embedded_eth_wallet: ethWallet?.type === 'wallet' ? ethWallet.address : null,
        embedded_solana_wallet: solWallet?.type === 'wallet' ? solWallet.address : null,
        external_wallets: externalWallets,
        auth_method: authMethod,
        created_at: tarotUser.created_at,
      }, {
        onConflict: 'id', // Conflict on UUID primary key
      });

    if (error) {
      console.error('Error syncing Privy user to Supabase:', error);
      return { error };
    }

    console.log('✅ Privy user synced to Supabase successfully');
    return { error: null };
  } catch (error) {
    console.error('Error in syncPrivyUserToSupabase:', error);
    return { error };
  }
};

/**
 * Check if a Privy user is a guest (anonymous) user
 */
export const isPrivyGuest = (privyUser: PrivyUser | null): boolean => {
  if (!privyUser) return false;

  // Guest users in Privy don't have email or social accounts linked
  return !privyUser.email && !privyUser.google && !privyUser.twitter;
};

/**
 * Get user's wallet addresses from Privy user object
 */
export const getUserWallets = (privyUser: PrivyUser) => {
  const ethWallet = privyUser.linkedAccounts?.find(
    (account) => {
      if (account.type === 'wallet') {
        return account.walletClientType === 'privy' && account.chainType === 'ethereum';
      }
      return false;
    }
  );

  const solWallet = privyUser.linkedAccounts?.find(
    (account) => {
      if (account.type === 'wallet') {
        return account.walletClientType === 'privy' && account.chainType === 'solana';
      }
      return false;
    }
  );

  const externalWallets = privyUser.linkedAccounts
    ?.filter((account) => {
      if (account.type === 'wallet') {
        return account.walletClientType !== 'privy';
      }
      return false;
    })
    .map((wallet) => {
      if (wallet.type === 'wallet') {
        return {
          address: wallet.address,
          type: wallet.walletClientType || 'unknown',
          chain: wallet.chainType,
        };
      }
      return null;
    })
    .filter((w) => w !== null) || [];

  return {
    embeddedEth: ethWallet?.type === 'wallet' ? ethWallet.address : undefined,
    embeddedSol: solWallet?.type === 'wallet' ? solWallet.address : undefined,
    external: externalWallets,
  };
};
