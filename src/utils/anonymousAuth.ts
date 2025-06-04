import { supabase } from '../lib/supabase';
import type { User } from '../types';

interface AnonymousAuthResult {
  user: User | null;
  error: any;
}

// Singleton state for anonymous user creation - shared across hook and store
let isCreatingAnonymousUser = false;
let pendingAnonymousPromise: Promise<AnonymousAuthResult> | null = null;

/**
 * Core singleton logic for anonymous user creation
 * Can be used by both React hooks and Zustand stores
 */
export const createAnonymousUserSingleton = async (
  currentUser: User | null,
  isAnonymousCheck: () => boolean,
  setUser: (user: User | null) => void,
  setLoading?: (loading: boolean) => void,
  setAuthStateDetermined?: (determined: boolean) => void
): Promise<AnonymousAuthResult> => {
  console.log('🎭 [AnonAuth] Starting anonymous user creation process (singleton)');

  // If we already have an anonymous user, return it
  if (currentUser && isAnonymousCheck()) {
    console.log('✅ [AnonAuth] Already have anonymous user in store:', currentUser.id);
    if (setAuthStateDetermined) setAuthStateDetermined(true);
    return { user: currentUser, error: null };
  }

  // If we have a regular user, don't create anonymous
  if (currentUser && !isAnonymousCheck()) {
    console.log('✅ [AnonAuth] Already have authenticated user in store:', currentUser.id);
    if (setAuthStateDetermined) setAuthStateDetermined(true);
    return { user: currentUser, error: null };
  }

  // If already creating an anonymous user, return the existing promise
  if (isCreatingAnonymousUser && pendingAnonymousPromise) {
    console.log('⏳ [AnonAuth] Anonymous user creation already in progress, waiting...');
    return pendingAnonymousPromise;
  }

  // Start the creation process
  isCreatingAnonymousUser = true;
  if (setLoading) setLoading(true);

  pendingAnonymousPromise = (async (): Promise<AnonymousAuthResult> => {
    try {
      console.log('🔍 [AnonAuth] Checking for existing Supabase anonymous session...');
      
      // First check if we already have an active session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.warn('⚠️ [AnonAuth] Error checking existing Supabase session:', sessionError);
      }
      
      // If we already have an anonymous session, use it
      if (session?.user && session.user.is_anonymous) {
        console.log('✅ [AnonAuth] Found existing Supabase anonymous session. User ID:', session.user.id);
        
        // Check if we have user data in anonymous_users table
        const { data: anonymousUserData, error: fetchError } = await supabase
          .from('anonymous_users')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (fetchError) {
          console.warn('⚠️ [AnonAuth] Error fetching anonymous user data:', fetchError);
        }

        // Set user state with existing anonymous user data
        const userObj: User = {
          id: session.user.id,
          email: undefined,
          username: anonymousUserData?.name || `Guest_${session.user.id.slice(-6)}`,
          full_name: anonymousUserData?.name || undefined,
          avatar_url: undefined,
          is_reader: false,
          created_at: session.user.created_at
        };

        setUser(userObj);
        return { user: userObj, error: null };
      }

      console.log('🔐 [AnonAuth] No existing Supabase anonymous session found or session was not anonymous. Creating new anonymous user with Supabase...');
      
      // Create new anonymous user
      const { data, error } = await supabase.auth.signInAnonymously();
      
      if (error) {
        console.error('❌ [AnonAuth] Supabase anonymous auth error during new signInAnonymously:', error);
        return { user: null, error };
      }

      if (!data.user) {
        const noUserError = { message: 'No user returned from new anonymous sign in' };
        console.error('❌ [AnonAuth] No user returned from new signInAnonymously:', noUserError);
        return { user: null, error: noUserError };
      }

      console.log('✅ [AnonAuth] New Supabase anonymous user created. User ID:', data.user.id);

      // Create anonymous user record in our database
      const anonymousUserData = {
        id: data.user.id,
        name: `Guest_${data.user.id.slice(-6)}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      console.log('💾 Inserting anonymous user into database:', anonymousUserData);

      const { error: insertError } = await supabase
        .from('anonymous_users')
        .insert(anonymousUserData);

      if (insertError) {
        console.error('❌ Failed to insert anonymous user:', insertError);
        // Continue anyway - the auth user exists
      } else {
        console.log('✅ Anonymous user record created in database');
      }

      // Create User object for our store
      const userObj: User = {
        id: data.user.id,
        email: undefined,
        username: anonymousUserData.name,
        full_name: undefined,
        avatar_url: undefined,
        is_reader: false,
        created_at: data.user.created_at
      };

      console.log('👤 Setting anonymous user in store:', userObj.id);
      setUser(userObj);

      return { user: userObj, error: null };

    } catch (error) {
      console.error('❌ Unexpected error in anonymous user creation:', error);
      return { user: null, error };
    } finally {
      // Reset singleton state
      isCreatingAnonymousUser = false;
      pendingAnonymousPromise = null;
      if (setLoading) setLoading(false);
      if (setAuthStateDetermined) setAuthStateDetermined(true);
    }
  })();

  return pendingAnonymousPromise;
};

/**
 * Ensures an anonymous user exists, creating one only if needed
 */
export const ensureAnonymousUserSingleton = async (
  currentUser: User | null,
  isAnonymousCheck: () => boolean,
  setUser: (user: User | null) => void,
  setLoading?: (loading: boolean) => void,
  setAuthStateDetermined?: (determined: boolean) => void
): Promise<AnonymousAuthResult> => {
  console.log('🎭 [AnonAuth] ensureAnonymousUserSingleton called.');
  // If we already have any user, return it
  if (currentUser) {
    console.log('✅ [AnonAuth] ensureAnonymousUserSingleton: currentUser already exists in store. ID:', currentUser.id, 'IsAnonymous:', isAnonymousCheck());
    if (setAuthStateDetermined) setAuthStateDetermined(true);
    return { user: currentUser, error: null };
  }

  console.log('🤔 [AnonAuth] ensureAnonymousUserSingleton: No currentUser in store. Proceeding to create/find anonymous user.');
  // Otherwise create anonymous user
  return createAnonymousUserSingleton(currentUser, isAnonymousCheck, setUser, setLoading, setAuthStateDetermined);
}; 