import React from 'react';
import { PrivyProvider } from '@privy-io/react-auth';

interface PrivyAuthProviderProps {
  children: React.ReactNode;
}

export const PrivyAuthProvider: React.FC<PrivyAuthProviderProps> = ({ children }) => {
  const appId = import.meta.env.VITE_PRIVY_APP_ID;

  if (!appId) {
    console.error('Missing Privy App ID. Please set VITE_PRIVY_APP_ID in environment variables.');
  }

  return (
    <PrivyProvider
      appId={appId}
      config={{
        // Appearance configuration
        appearance: {
          theme: 'dark',
          accentColor: '#8B5CF6', // Mystical purple theme
          logo: '/logo.png',
        },

        // Embedded wallets configuration
        // Creates BOTH Ethereum and Solana wallets for all users automatically
        embeddedWallets: {
          createOnLogin: 'all-users',  // Creates wallets for ALL users
        },

        // Supported login methods
        loginMethods: ['google', 'email', 'wallet'],
      }}
    >
      {children}
    </PrivyProvider>
  );
};
