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
  setLoading?: (loading: boolean) => void
): Promise<AnonymousAuthResult> => {
  console.log('🎭 Starting anonymous user creation process (singleton)');

  // If we already have an anonymous user, return it
  if (currentUser && isAnonymousCheck()) {
    console.log('✅ Already have anonymous user:', currentUser.id);
    return { user: currentUser, error: null };
  }

  // If we have a regular user, don't create anonymous
  if (currentUser && !isAnonymousCheck()) {
    console.log('✅ Already have authenticated user:', currentUser.id);
    return { user: currentUser, error: null };
  }

  // If already creating an anonymous user, return the existing promise
  if (isCreatingAnonymousUser && pendingAnonymousPromise) {
    console.log('⏳ Anonymous user creation already in progress, waiting...');
    return pendingAnonymousPromise;
  }

  // Start the creation process
  isCreatingAnonymousUser = true;
  if (setLoading) setLoading(true);

  pendingAnonymousPromise = (async (): Promise<AnonymousAuthResult> => {
    try {
      console.log('🔍 Checking for existing anonymous session...');
      
      // First check if we already have an active session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.warn('⚠️ Error checking existing session:', sessionError);
      }
      
      // If we already have an anonymous session, use it
      if (session?.user && session.user.is_anonymous) {
        console.log('✅ Found existing anonymous session:', session.user.id);
        
        // Check if we have user data in anonymous_users table
        const { data: anonymousUserData, error: fetchError } = await supabase
          .from('anonymous_users')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (fetchError) {
          console.warn('⚠️ Error fetching anonymous user data:', fetchError);
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

      console.log('🔐 Creating new anonymous user with Supabase');
      
      // Create new anonymous user
      const { data, error } = await supabase.auth.signInAnonymously();
      
      if (error) {
        console.error('❌ Supabase anonymous auth error:', error);
        return { user: null, error };
      }

      if (!data.user) {
        const noUserError = { message: 'No user returned from anonymous sign in' };
        console.error('❌ No user returned:', noUserError);
        return { user: null, error: noUserError };
      }

      console.log('✅ Supabase anonymous user created:', data.user.id);

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
  setLoading?: (loading: boolean) => void
): Promise<AnonymousAuthResult> => {
  // If we already have any user, return it
  if (currentUser) {
    return { user: currentUser, error: null };
  }

  // Otherwise create anonymous user
  return createAnonymousUserSingleton(currentUser, isAnonymousCheck, setUser, setLoading);
}; 