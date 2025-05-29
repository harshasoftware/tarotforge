import { useCallback } from 'react';
import { useAuthStore } from '../stores/authStore';
import { createAnonymousUserSingleton, ensureAnonymousUserSingleton } from '../utils/anonymousAuth';
import type { User } from '../types';

interface AnonymousAuthResult {
  user: User | null;
  error: any;
}

export const useAnonymousAuth = () => {
  const { user, setUser, setLoading, isAnonymous } = useAuthStore();

  const createAnonymousUser = useCallback(async (): Promise<AnonymousAuthResult> => {
    return createAnonymousUserSingleton(user, isAnonymous, setUser, setLoading);
  }, [user, isAnonymous, setUser, setLoading]);

  const ensureAnonymousUser = useCallback(async (): Promise<AnonymousAuthResult> => {
    return ensureAnonymousUserSingleton(user, isAnonymous, setUser, setLoading);
  }, [user, isAnonymous, setUser, setLoading]);

  return {
    createAnonymousUser,
    ensureAnonymousUser,
    isAnonymous: isAnonymous(),
    hasUser: !!user
  };
}; 