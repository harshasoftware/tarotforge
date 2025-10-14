/**
 * Privy Service
 *
 * Core service layer for Privy embedded wallet integration.
 * Handles silent wallet creation, transaction signing, and identity management.
 *
 * KEY PRINCIPLE: All methods work with Supabase UUID, NOT Privy DID.
 * This maintains abstraction and keeps the codebase UUID-centric.
 */

import { usePrivy } from '@privy-io/react-auth';
import { supabase } from '../lib/supabase';
import type {
  PrivyWalletInfo,
  WalletCreationOptions,
  WalletConnectionStatus,
  TransactionSignRequest,
  TransactionSignResponse,
  PrivyServiceError,
} from '../types/privy';

/**
 * Privy Service Class
 * Singleton service for Privy operations
 */
class PrivyService {
  private static instance: PrivyService;

  private constructor() {
    // Private constructor for singleton pattern
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): PrivyService {
    if (!PrivyService.instance) {
      PrivyService.instance = new PrivyService();
    }
    return PrivyService.instance;
  }

  /**
   * Create embedded wallets silently for a user
   * This happens automatically during signup without user interaction
   *
   * @param userId - Supabase user UUID
   * @param email - User's email address
   * @param options - Additional creation options
   * @returns Wallet information including addresses and Privy DID
   */
  async createSilentWallet(
    userId: string,
    email: string,
    options: Partial<WalletCreationOptions> = {}
  ): Promise<PrivyWalletInfo> {
    try {
      console.log(`🔐 Creating silent wallet for user ${userId}...`);

      // Note: Privy embedded wallets are created automatically when user authenticates
      // This function primarily stores the wallet information in our database

      // Get or create Privy user (this happens through Privy's OAuth/email flow)
      // The wallet creation is handled by Privy's embeddedWallets.createOnLogin config

      // For now, we'll simulate this since actual Privy integration requires
      // the Privy auth flow to complete first. In production, this would be:
      // 1. User authenticates via Privy (email/social)
      // 2. Privy automatically creates embedded wallets
      // 3. We retrieve wallet addresses from Privy and store them

      // Placeholder: Generate wallet-like addresses (replace with actual Privy integration)
      const privyDID = `did:privy:${this.generateRandomId()}`;
      const solanaAddress = this.generateSolanaAddress();
      const baseAddress = this.generateEthereumAddress();

      console.log(`✅ Generated wallet addresses for user ${userId}`);
      console.log(`  Solana: ${solanaAddress}`);
      console.log(`  Base: ${baseAddress}`);

      return {
        privyDID,
        solanaAddress,
        baseAddress,
        createdAt: new Date(),
        isEmbedded: true,
      };
    } catch (error) {
      console.error('❌ Error creating silent wallet:', error);
      throw new PrivyServiceError(
        'Failed to create silent wallet',
        'WALLET_CREATION_FAILED',
        error
      );
    }
  }

  /**
   * Check if user has embedded wallet
   *
   * @param userId - Supabase user UUID
   * @returns True if user has embedded wallet
   */
  async hasEmbeddedWallet(userId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('user_identity_mapping')
        .select('privy_did')
        .eq('supabase_user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      return !!data?.privy_did;
    } catch (error) {
      console.error('Error checking embedded wallet:', error);
      return false;
    }
  }

  /**
   * Get wallet connection status for user
   *
   * @param userId - Supabase user UUID
   * @returns Wallet connection status
   */
  async getWalletStatus(userId: string): Promise<WalletConnectionStatus> {
    try {
      // Check identity mapping
      const { data: mapping } = await supabase
        .from('user_identity_mapping')
        .select('*')
        .eq('supabase_user_id', userId)
        .single();

      // Check if wallet is visible to user
      const { data: visibleWallets } = await supabase
        .from('user_wallets')
        .select('*')
        .eq('user_id', userId)
        .eq('is_visible_to_user', true);

      return {
        hasWallet: !!mapping,
        hasEmbeddedWallet: mapping?.wallet_solana || mapping?.wallet_base ? true : false,
        hasExternalWallet: false, // TODO: Check for external wallets
        isWeb3Aware: (visibleWallets?.length || 0) > 0,
        wallets: {
          solana: mapping?.wallet_solana || null,
          base: mapping?.wallet_base || null,
        },
      };
    } catch (error) {
      console.error('Error getting wallet status:', error);
      return {
        hasWallet: false,
        hasEmbeddedWallet: false,
        hasExternalWallet: false,
        isWeb3Aware: false,
        wallets: { solana: null, base: null },
      };
    }
  }

  /**
   * Reveal wallet to user (progressive Web3 revelation)
   * Marks wallet as visible in UI
   *
   * @param userId - Supabase user UUID
   * @returns Wallet information
   */
  async revealWallet(userId: string): Promise<PrivyWalletInfo | null> {
    try {
      console.log(`👀 Revealing wallet to user ${userId}...`);

      // Get user's identity mapping
      const { data: mapping, error } = await supabase
        .from('user_identity_mapping')
        .select('*')
        .eq('supabase_user_id', userId)
        .single();

      if (error || !mapping) {
        console.warn('No wallet found to reveal');
        return null;
      }

      // Mark wallets as visible
      await supabase
        .from('user_wallets')
        .update({ is_visible_to_user: true })
        .eq('user_id', userId)
        .eq('is_embedded', true);

      console.log('✅ Wallet revealed to user');

      return {
        privyDID: mapping.privy_did,
        solanaAddress: mapping.wallet_solana,
        baseAddress: mapping.wallet_base,
        createdAt: new Date(mapping.created_at),
        isEmbedded: true,
      };
    } catch (error) {
      console.error('Error revealing wallet:', error);
      throw new PrivyServiceError(
        'Failed to reveal wallet',
        'WALLET_REVEAL_FAILED',
        error
      );
    }
  }

  /**
   * Sign transaction using embedded wallet
   * This will be used for future NFT and token operations
   *
   * @param request - Transaction signing request
   * @returns Signed transaction
   */
  async signTransaction(
    request: TransactionSignRequest
  ): Promise<TransactionSignResponse> {
    try {
      console.log(`✍️ Signing transaction for user ${request.userId} on ${request.chain}...`);

      // TODO: Implement actual Privy transaction signing
      // This will use Privy's signMessage or signTransaction methods

      // Placeholder response
      return {
        signedTransaction: '0x...', // Signed tx hex
        signature: '0x...', // Signature
      };
    } catch (error) {
      console.error('Error signing transaction:', error);
      throw new PrivyServiceError(
        'Failed to sign transaction',
        'TX_SIGN_FAILED',
        error
      );
    }
  }

  /**
   * Get user's wallet information by Supabase UUID
   *
   * @param userId - Supabase user UUID
   * @returns Wallet information or null if not found
   */
  async getWalletInfo(userId: string): Promise<PrivyWalletInfo | null> {
    try {
      const { data, error } = await supabase
        .from('user_identity_mapping')
        .select('*')
        .eq('supabase_user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (!data) {
        return null;
      }

      return {
        privyDID: data.privy_did,
        solanaAddress: data.wallet_solana,
        baseAddress: data.wallet_base,
        createdAt: new Date(data.created_at),
        isEmbedded: true,
      };
    } catch (error) {
      console.error('Error getting wallet info:', error);
      return null;
    }
  }

  /**
   * Helper: Generate random ID for testing
   * Replace with actual Privy DID in production
   */
  private generateRandomId(): string {
    return Array.from(crypto.getRandomValues(new Uint8Array(16)))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }

  /**
   * Helper: Generate Solana-like address for testing
   * Replace with actual Privy wallet creation in production
   */
  private generateSolanaAddress(): string {
    const chars = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
    let address = '';
    for (let i = 0; i < 44; i++) {
      address += chars[Math.floor(Math.random() * chars.length)];
    }
    return address;
  }

  /**
   * Helper: Generate Ethereum-like address for testing
   * Replace with actual Privy wallet creation in production
   */
  private generateEthereumAddress(): string {
    const hex = '0123456789abcdef';
    let address = '0x';
    for (let i = 0; i < 40; i++) {
      address += hex[Math.floor(Math.random() * hex.length)];
    }
    return address;
  }
}

// Export singleton instance
export const privyService = PrivyService.getInstance();

/**
 * React hook for Privy service
 * Provides easy access to Privy operations in components
 */
export const usePrivyService = () => {
  return privyService;
};
