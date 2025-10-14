import { SiweMessage } from 'siwe';
import { supabase } from './supabase';
import type { Address } from 'viem';

export interface WalletLinkResult {
  success: boolean;
  error?: string;
}

export interface VerifyWalletSignatureParams {
  message: string;
  signature: `0x${string}`;
  address: Address;
  nonce: string;
  userId: string;
}

/**
 * Generate a SIWE message for wallet authentication
 */
export async function generateSiweMessage(
  address: Address,
  nonce: string,
  chainId: number = 8453 // Base mainnet
): Promise<string> {
  const domain = window.location.host;
  const origin = window.location.origin;
  const statement = 'Link your Base wallet to your TarotForge account';

  const siweMessage = new SiweMessage({
    domain,
    address,
    statement,
    uri: origin,
    version: '1',
    chainId,
    nonce,
    issuedAt: new Date().toISOString(),
  });

  return siweMessage.prepareMessage();
}

/**
 * Verify the SIWE signature on the backend
 */
export async function verifyWalletSignature(
  params: VerifyWalletSignatureParams
): Promise<WalletLinkResult> {
  try {
    const { message, signature, address, nonce, userId } = params;

    // Parse the SIWE message
    const siweMessage = new SiweMessage(message);

    // Verify the signature locally first
    const fields = await siweMessage.verify({ signature, nonce });

    if (!fields.success) {
      return { success: false, error: 'Invalid signature' };
    }

    // Verify the address matches
    if (fields.data.address.toLowerCase() !== address.toLowerCase()) {
      return { success: false, error: 'Address mismatch' };
    }

    // Check if this wallet is already linked to another account
    const { data: existingLink, error: checkError } = await supabase
      .from('user_wallets')
      .select('user_id')
      .eq('wallet_address', address.toLowerCase())
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Error checking existing wallet:', checkError);
      return { success: false, error: 'Database error' };
    }

    if (existingLink && existingLink.user_id !== userId) {
      return {
        success: false,
        error: 'This wallet is already linked to another account',
      };
    }

    // Link the wallet to the user's account
    const { error: linkError } = await supabase.from('user_wallets').upsert(
      {
        user_id: userId,
        wallet_address: address.toLowerCase(),
        wallet_type: 'base',
        linked_at: new Date().toISOString(),
        is_primary: false,
      },
      {
        onConflict: 'wallet_address',
      }
    );

    if (linkError) {
      console.error('Error linking wallet:', linkError);
      return { success: false, error: 'Failed to link wallet' };
    }

    return { success: true };
  } catch (error) {
    console.error('Error verifying wallet signature:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Unlink a wallet from the user's account
 */
export async function unlinkWallet(
  userId: string,
  walletAddress: Address
): Promise<WalletLinkResult> {
  try {
    const { error } = await supabase
      .from('user_wallets')
      .delete()
      .eq('user_id', userId)
      .eq('wallet_address', walletAddress.toLowerCase());

    if (error) {
      console.error('Error unlinking wallet:', error);
      return { success: false, error: 'Failed to unlink wallet' };
    }

    return { success: true };
  } catch (error) {
    console.error('Error unlinking wallet:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get all wallets linked to a user
 */
export async function getUserWallets(userId: string) {
  try {
    const { data, error } = await supabase
      .from('user_wallets')
      .select('*')
      .eq('user_id', userId)
      .order('linked_at', { ascending: false });

    if (error) {
      console.error('Error fetching user wallets:', error);
      return { wallets: [], error };
    }

    return { wallets: data || [], error: null };
  } catch (error) {
    console.error('Error fetching user wallets:', error);
    return { wallets: [], error };
  }
}

/**
 * Check if a user has a wallet linked
 */
export async function hasLinkedWallet(userId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('user_wallets')
      .select('id')
      .eq('user_id', userId)
      .limit(1);

    if (error) {
      console.error('Error checking linked wallet:', error);
      return false;
    }

    return (data?.length || 0) > 0;
  } catch (error) {
    console.error('Error checking linked wallet:', error);
    return false;
  }
}

/**
 * Generate a SIWE message for wallet-only authentication
 */
export async function generateWalletAuthMessage(
  address: Address,
  nonce: string,
  chainId: number = 8453
): Promise<string> {
  const domain = window.location.host;
  const origin = window.location.origin;
  const statement = 'Sign in to TarotForge with your Base wallet';

  const siweMessage = new SiweMessage({
    domain,
    address,
    statement,
    uri: origin,
    version: '1',
    chainId,
    nonce,
    issuedAt: new Date().toISOString(),
  });

  return siweMessage.prepareMessage();
}

/**
 * Authenticate with wallet (creates anonymous account + links wallet)
 */
export async function authenticateWithWallet(
  address: Address,
  signature: `0x${string}`,
  message: string,
  nonce: string
): Promise<{ success: boolean; userId?: string; error?: string }> {
  try {
    // Parse the SIWE message
    const siweMessage = new SiweMessage(message);

    // Verify the signature
    const fields = await siweMessage.verify({ signature, nonce });

    if (!fields.success) {
      return { success: false, error: 'Invalid signature' };
    }

    // Verify the address matches
    if (fields.data.address.toLowerCase() !== address.toLowerCase()) {
      return { success: false, error: 'Address mismatch' };
    }

    const walletAddressLower = address.toLowerCase();

    // Check if wallet is already registered
    const { data: existingWallet, error: walletError } = await supabase
      .from('user_wallets')
      .select('user_id, users!inner(*)')
      .eq('wallet_address', walletAddressLower)
      .single();

    if (walletError && walletError.code !== 'PGRST116') {
      console.error('Error checking wallet:', walletError);
      return { success: false, error: 'Database error' };
    }

    // If wallet exists, return success - user will be logged in via the user_id
    if (existingWallet) {
      console.log('✅ Existing wallet user found:', existingWallet.user_id);
      return { success: true, userId: existingWallet.user_id };
    }

    // Wallet not found - need to create anonymous user and link wallet
    return { success: true, userId: undefined }; // Signal that account creation is needed
  } catch (error) {
    console.error('Error authenticating with wallet:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Generate a cryptographically secure nonce for SIWE
 */
export function generateNonce(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join(
    ''
  );
}
