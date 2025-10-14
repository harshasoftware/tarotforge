import { ReactNode } from 'react';
import { PrivyProvider as BasePrivyProvider } from '@privy-io/react-auth';
import { base, baseSepolia, mainnet, sepolia } from 'viem/chains';
import { solana, solanaDevnet } from '@privy-io/react-auth';

interface PrivyProviderWrapperProps {
  children: ReactNode;
}

export const PrivyProviderWrapper = ({ children }: PrivyProviderWrapperProps) => {
  const appId = import.meta.env.VITE_PRIVY_APP_ID;

  if (!appId) {
    console.warn('VITE_PRIVY_APP_ID not found. Privy features will not be available.');
    return <>{children}</>;
  }

  return (
    <BasePrivyProvider
      appId={appId}
      config={{
        // Appearance configuration to match Tarot Forge's mystical theme
        appearance: {
          theme: 'dark',
          accentColor: '#8B5CF6', // Purple accent matching your theme
          logo: '/logo.png',
          showWalletLoginFirst: false, // Keep Web2 auth primary
          walletChainType: 'ethereum-and-solana', // Support both chains
        },

        // Embedded wallets - create for users who don't have wallets
        embeddedWallets: {
          createOnLogin: 'users-without-wallets',
          requireUserPasswordOnCreate: false,
          noPromptOnSignature: true,
        },

        // Login methods - prioritize Web2 first
        loginMethods: ['email', 'google', 'wallet'],

        // Supported chains
        supportedChains: [
          base,
          baseSepolia,
          mainnet,
          sepolia,
          solana,
          solanaDevnet,
        ],

        // Default chain
        defaultChain: base,

        // Legal configuration
        legal: {
          termsAndConditionsUrl: 'https://tarotforge.xyz/terms',
          privacyPolicyUrl: 'https://tarotforge.xyz/privacy',
        },
      }}
    >
      {children}
    </BasePrivyProvider>
  );
};
