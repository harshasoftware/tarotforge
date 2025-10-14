import React, { useEffect } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { usePrivyAuth } from '../../hooks/usePrivyAuth';

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const initializeAuth = useAuthStore((state) => state.initializeAuth);

  // Initialize Privy auth integration - this syncs Privy with Supabase
  usePrivyAuth();

  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  return <>{children}</>;
}; 