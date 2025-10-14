/**
 * Privy Integration Types
 *
 * Type definitions for Privy embedded wallet integration with invisible Web3 UX.
 * Users experience Web2 authentication while getting blockchain wallets automatically.
 */

/**
 * Supported blockchain networks for embedded wallets
 */
export type ChainType = 'solana' | 'base' | 'ethereum';

/**
 * Wallet provider types
 */
export type WalletProvider =
  | 'external'          // User-connected external wallet (Phantom, MetaMask, etc.)
  | 'privy_embedded'    // Auto-created Privy embedded wallet (keys managed by Privy)
  | 'privy_linked';     // User manually connected via Privy

/**
 * Wallet information returned from Privy service
 */
export interface PrivyWalletInfo {
  /** Privy Decentralized Identifier (DID) */
  privyDID: string;

  /** Solana wallet address */
  solanaAddress: string | null;

  /** Base (Ethereum L2) wallet address */
  baseAddress: string | null;

  /** Creation timestamp */
  createdAt: Date;

  /** Whether wallets are embedded (managed by Privy) */
  isEmbedded: boolean;
}

/**
 * User identity mapping between Supabase and Privy
 */
export interface UserIdentityMapping {
  /** Internal mapping ID */
  id: string;

  /** Supabase user UUID (source of truth) */
  supabaseUserId: string;

  /** Privy DID (did:privy:xxxxx) */
  privyDid: string;

  /** Solana wallet address */
  walletSolana: string | null;

  /** Base wallet address */
  walletBase: string | null;

  /** Creation timestamp */
  createdAt: Date;

  /** Last update timestamp */
  updatedAt: Date;
}

/**
 * Wallet record in user_wallets table
 */
export interface UserWallet {
  /** Wallet record ID */
  id: string;

  /** User ID (Supabase UUID) */
  userId: string;

  /** Wallet address */
  walletAddress: string;

  /** Blockchain type */
  chainType: ChainType;

  /** Wallet type (external, embedded, etc.) */
  walletType: string;

  /** Privy DID (if Privy wallet) */
  privyDid: string | null;

  /** Whether this is an embedded wallet */
  isEmbedded: boolean;

  /** Whether user has seen this wallet in UI */
  isVisibleToUser: boolean;

  /** Whether this is the primary wallet */
  isPrimary: boolean;

  /** When wallet was linked */
  linkedAt: Date;

  /** When wallet was auto-created (null for manual connections) */
  autoCreatedAt: Date | null;

  /** Wallet provider */
  provider: WalletProvider;
}

/**
 * Wallet creation options
 */
export interface WalletCreationOptions {
  /** User's email address */
  email: string;

  /** Supabase user ID */
  userId: string;

  /** Whether to create wallet silently (no UI) */
  silent?: boolean;

  /** Chains to create wallets for */
  chains?: ChainType[];
}

/**
 * Wallet connection status
 */
export interface WalletConnectionStatus {
  /** Whether user has any wallet */
  hasWallet: boolean;

  /** Whether user has embedded wallet */
  hasEmbeddedWallet: boolean;

  /** Whether user has external wallet */
  hasExternalWallet: boolean;

  /** Whether user is aware of their wallet (seen in UI) */
  isWeb3Aware: boolean;

  /** Connected wallet addresses */
  wallets: {
    solana: string | null;
    base: string | null;
  };
}

/**
 * Transaction signing request
 */
export interface TransactionSignRequest {
  /** User ID */
  userId: string;

  /** Chain to sign on */
  chain: ChainType;

  /** Transaction data */
  transaction: any;

  /** Optional transaction metadata */
  metadata?: Record<string, any>;
}

/**
 * Transaction signing response
 */
export interface TransactionSignResponse {
  /** Signed transaction */
  signedTransaction: string;

  /** Transaction hash (if submitted) */
  txHash?: string;

  /** Signature */
  signature: string;
}

/**
 * Privy service error
 */
export class PrivyServiceError extends Error {
  code: string;
  details?: any;

  constructor(message: string, code: string, details?: any) {
    super(message);
    this.name = 'PrivyServiceError';
    this.code = code;
    this.details = details;
  }
}

/**
 * Wallet revelation context
 * Used to track when/how user discovers their embedded wallet
 */
export interface WalletRevelationContext {
  /** Where user discovered wallet (profile, feature, prompt) */
  source: 'profile' | 'nft_feature' | 'tip_jar' | 'token_gate' | 'manual';

  /** Timestamp of revelation */
  revealedAt: Date;

  /** Whether user opted to explore Web3 features */
  userOptedIn: boolean;
}
