/**
 * Privy Configuration
 *
 * Configuration for Privy embedded wallet integration.
 * Supports Solana and Base chains with invisible Web3 UX.
 */

import { PrivyClientConfig } from '@privy-io/react-auth';

/**
 * Privy App ID from environment variables
 * Get this from: https://dashboard.privy.io
 */
export const PRIVY_APP_ID = import.meta.env.VITE_PRIVY_APP_ID || '';

/**
 * Feature flag to enable/disable Web3 features
 */
export const WEB3_FEATURES_ENABLED =
  import.meta.env.VITE_ENABLE_WEB3_FEATURES === 'true';

/**
 * Privy configuration for React client
 */
export const privyConfig: PrivyClientConfig = {
  // App identification
  appId: PRIVY_APP_ID,

  // Supported login methods (email/social for Web2 UX)
  loginMethods: ['email', 'google', 'wallet'],

  // Appearance configuration (mystical tarot theme)
  appearance: {
    theme: 'dark',
    accentColor: '#8b5cf6', // Purple accent matching your tarot theme
    logo: '/tarotforge-logo.png',
    showWalletLoginFirst: false, // Email/social first for Web2 UX
  },

  // Embedded wallet configuration
  embeddedWallets: {
    createOnLogin: 'all-users', // Auto-create for all users (silent)
    noPromptOnSignature: true, // No wallet popups for signatures
    requireUserPasswordOnCreate: false, // No password for embedded wallets
  },

  // Supported chains
  supportedChains: [
    {
      id: 1399811149, // Solana Mainnet
      name: 'Solana',
      network: 'mainnet',
      nativeCurrency: {
        name: 'SOL',
        symbol: 'SOL',
        decimals: 9,
      },
      rpcUrls: {
        default: {
          http: ['https://api.mainnet-beta.solana.com'],
        },
        public: {
          http: ['https://api.mainnet-beta.solana.com'],
        },
      },
    },
    {
      id: 8453, // Base Mainnet
      name: 'Base',
      network: 'base',
      nativeCurrency: {
        name: 'Ether',
        symbol: 'ETH',
        decimals: 18,
      },
      rpcUrls: {
        default: {
          http: ['https://mainnet.base.org'],
        },
        public: {
          http: ['https://mainnet.base.org'],
        },
      },
      blockExplorers: {
        default: {
          name: 'BaseScan',
          url: 'https://basescan.org',
        },
      },
    },
  ],

  // Legal URLs
  legal: {
    termsAndConditionsUrl: 'https://tarotforge.com/terms',
    privacyPolicyUrl: 'https://tarotforge.com/privacy',
  },

  // Wallet configuration
  walletConnectCloudProjectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID,
};

/**
 * Development mode configuration
 * Uses Solana devnet for testing
 */
export const privyConfigDev: PrivyClientConfig = {
  ...privyConfig,
  supportedChains: [
    {
      id: 1399811150, // Solana Devnet
      name: 'Solana Devnet',
      network: 'devnet',
      nativeCurrency: {
        name: 'SOL',
        symbol: 'SOL',
        decimals: 9,
      },
      rpcUrls: {
        default: {
          http: ['https://api.devnet.solana.com'],
        },
        public: {
          http: ['https://api.devnet.solana.com'],
        },
      },
    },
    {
      id: 84532, // Base Sepolia (testnet)
      name: 'Base Sepolia',
      network: 'base-sepolia',
      nativeCurrency: {
        name: 'Ether',
        symbol: 'ETH',
        decimals: 18,
      },
      rpcUrls: {
        default: {
          http: ['https://sepolia.base.org'],
        },
        public: {
          http: ['https://sepolia.base.org'],
        },
      },
      blockExplorers: {
        default: {
          name: 'BaseScan',
          url: 'https://sepolia.basescan.org',
        },
      },
    },
  ],
};

/**
 * Get the appropriate Privy config based on environment
 */
export const getPrivyConfig = (): PrivyClientConfig => {
  const isDev = import.meta.env.DEV || import.meta.env.MODE === 'development';
  return isDev ? privyConfigDev : privyConfig;
};

/**
 * Validate Privy configuration
 * Throws error if required environment variables are missing
 */
export const validatePrivyConfig = (): void => {
  if (!PRIVY_APP_ID) {
    console.warn(
      '⚠️ VITE_PRIVY_APP_ID is not set. Privy features will be disabled. ' +
        'Get your App ID from https://dashboard.privy.io'
    );
  }
};
