import { PrivyProvider } from '@privy-io/react-auth';
import { base, baseSepolia } from 'viem/chains';
import React from 'react';

interface PrivyProviderWrapperProps {
  children: React.ReactNode;
}

export const PrivyProviderWrapper: React.FC<PrivyProviderWrapperProps> = ({ children }) => {
  const appId = import.meta.env.VITE_PRIVY_APP_ID;

  if (!appId) {
    console.error('VITE_PRIVY_APP_ID is not set in environment variables');
    return <>{children}</>;
  }

  return (
    <PrivyProvider
      appId={appId}
      config={{
        // Appearance - match your mystical theme
        appearance: {
          theme: 'dark',
          accentColor: '#8B5CF6', // Purple accent
          logo: 'https://tarotforge.xyz/logo.png',
          showWalletLoginFirst: false, // Keep Google/Email primary
        },

        // Embedded wallets - create wallet for users automatically
        embeddedWallets: {
          createOnLogin: 'users-without-wallets', // Auto-create for new users
          noPromptOnSignature: false, // Show signature prompts
        },

        // Login methods
        loginMethods: ['google', 'email', 'wallet'],

        // Supported chains
        supportedChains: [base, baseSepolia],

        // Default chain
        defaultChain: base,

        // Wallet modal config
        walletConnectCloudProjectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID,

        // Legal links
        legal: {
          termsAndConditionsUrl: 'https://tarotforge.xyz/terms',
          privacyPolicyUrl: 'https://tarotforge.xyz/privacy',
        },
      }}
    >
      {children}
    </PrivyProvider>
  );
};
