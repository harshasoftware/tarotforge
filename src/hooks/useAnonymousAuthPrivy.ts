import { useCallback } from 'react';
import { useAuthStore } from '../stores/authStorePrivy';
import { createGuestUser, getOrCreateGuestUser } from '../utils/anonymousAuthPrivy';
import type { User } from '../types';

interface AnonymousAuthResult {
  user: User | null;
  error: any;
}

/**
 * Hook for managing guest/anonymous users in Privy migration
 *
 * With Privy, guest users are stored only in the local database
 * (not in Privy authentication). They can upgrade to full accounts
 * by signing up through Privy's modal.
 */
export const useAnonymousAuth = () => {
  const { user, setUser, setLoading, isAnonymous } = useAuthStore();

  const createAnonymousUser = useCallback(async (): Promise<AnonymousAuthResult> => {
    setLoading(true);
    try {
      const result = await createGuestUser();
      if (result.user) {
        setUser(result.user);
      }
      return result;
    } finally {
      setLoading(false);
    }
  }, [setUser, setLoading]);

  const ensureAnonymousUser = useCallback(async (): Promise<AnonymousAuthResult> => {
    // If we already have a user (guest or authenticated), return it
    if (user) {
      return { user, error: null };
    }

    setLoading(true);
    try {
      const result = await getOrCreateGuestUser();
      if (result.user) {
        setUser(result.user);
      }
      return result;
    } finally {
      setLoading(false);
    }
  }, [user, setUser, setLoading]);

  return {
    createAnonymousUser,
    ensureAnonymousUser,
    isAnonymous: isAnonymous(),
    hasUser: !!user,
  };
};
