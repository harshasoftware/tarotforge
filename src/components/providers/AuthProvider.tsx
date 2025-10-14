import React, { useEffect } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { useAuthStore } from '../../stores/authStorePrivy';

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const { user: privyUser, authenticated, ready } = usePrivy();
  const { handlePrivyLogin, handlePrivyLogout, setLoading, setAuthStateDetermined } = useAuthStore();

  // Handle Privy authentication state changes
  useEffect(() => {
    if (!ready) {
      // Privy is still initializing
      setLoading(true);
      return;
    }

    if (authenticated && privyUser) {
      // User is authenticated with Privy
      console.log('✅ Privy user authenticated:', privyUser.id);
      handlePrivyLogin(privyUser);
    } else {
      // User is not authenticated
      console.log('❌ No Privy user authenticated');
      handlePrivyLogout();
      setLoading(false);
      setAuthStateDetermined(true);
    }
  }, [privyUser, authenticated, ready, handlePrivyLogin, handlePrivyLogout, setLoading, setAuthStateDetermined]);

  return <>{children}</>;
}; 