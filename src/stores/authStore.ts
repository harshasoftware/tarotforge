import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { User } from '../types';
import { supabase } from '../lib/supabase';
import { processGoogleProfileImage } from '../lib/user-profile';
import { generateMysticalUsername } from '../lib/gemini-ai';
import { setUserContext, clearUserContext } from '../utils/errorTracking';
import { identifyUser } from '../utils/analytics';

interface AuthStore {
  user: User | null;
  loading: boolean;
  magicLinkSent: boolean;
  showSignInModal: boolean;
  isCheckingRef: boolean;
  lastCheckTime: number;
  authStateDetermined: boolean;
  nonceRef: string;
  
  // Actions
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  setMagicLinkSent: (sent: boolean) => void;
  setShowSignInModal: (show: boolean) => void;
  signUp: (email: string, username?: string, fullName?: string) => Promise<{ error: any }>;
  signIn: (email: string) => Promise<{ error: any }>;
  signInWithGoogle: (returnToHome?: boolean) => Promise<{ error: any }>;
  handleGoogleRedirect: () => Promise<{ data?: any, error: any }>;
  signOut: () => Promise<void>;
  checkAuth: () => Promise<void>;
  initializeAuth: () => void;
}

export const useAuthStore = create<AuthStore>()(
  subscribeWithSelector((set, get) => ({
    user: null,
    loading: true,
    magicLinkSent: false,
    showSignInModal: false,
    isCheckingRef: false,
    lastCheckTime: 0,
    authStateDetermined: false,
    nonceRef: '',

    setUser: (user) => set({ user }),
    setLoading: (loading) => set({ loading }),
    setMagicLinkSent: (magicLinkSent) => set({ magicLinkSent }),
    setShowSignInModal: (showSignInModal) => set({ showSignInModal }),

    checkAuth: async () => {
      const state = get();
      
      // Prevent concurrent auth checks
      if (state.isCheckingRef) {
        console.log('Auth check already in progress, skipping...');
        return;
      }
      
      // Debounce rapid auth checks (minimum 2 seconds between checks)
      const now = Date.now();
      if (now - state.lastCheckTime < 2000) {
        console.log('Auth check debounced, too soon since last check');
        return;
      }
      
      try {
        set({ isCheckingRef: true, lastCheckTime: now });
        
        console.log('Checking authentication status...');
        
        // Check active session
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error getting session:', error);
          set({ user: null, loading: false, authStateDetermined: true });
          clearUserContext();
          identifyUser(null);
          return;
        }
        
        if (session?.user) {
          console.log('Session found, user is authenticated:', session.user.id);
          
          // Get user profile data
          const { data: profile, error: profileError } = await supabase
            .from('users')
            .select('*')
            .eq('id', session.user.id)
            .single();
            
          if (profileError) {
            console.error('Error fetching user profile:', profileError);
            
            // If profile doesn't exist yet, create it
            if (profileError.code === 'PGRST116') {
              console.log('User profile not found, creating it...');
              
              try {
                // Extract information from Google provider if available
                const userMetadata = session.user.user_metadata || {};
                const avatarUrl = userMetadata.avatar_url || userMetadata.picture;
                const fullName = userMetadata.full_name || userMetadata.name || '';
                
                // Generate a mystical username if none provided
                let username = userMetadata.username;
                if (!username) {
                  try {
                    const nameSource = fullName || session.user.email || '';
                    username = await generateMysticalUsername(nameSource);
                    console.log('Generated mystical username:', username);
                  } catch (usernameError) {
                    console.error('Error generating username:', usernameError);
                    username = session.user.email?.split('@')[0] || 'User';
                  }
                }
                
                // Prepare user data for insertion
                const userData = {
                  id: session.user.id,
                  email: session.user.email || '',
                  username: username,
                  full_name: fullName,
                  avatar_url: undefined as string | undefined,
                  created_at: new Date().toISOString()
                };
                
                // Insert the user profile
                await supabase.from('users').insert([userData]);
                
                console.log('User profile created successfully');
                
                // If we have an avatar from Google, process and upload it
                if (avatarUrl) {
                  console.log('Processing Google profile image...');
                  const newAvatarUrl = await processGoogleProfileImage(session.user.id, avatarUrl);
                  if (newAvatarUrl) {
                    userData.avatar_url = newAvatarUrl;
                  }
                }
                
                // Retry profile fetch
                const { data: newProfile } = await supabase
                  .from('users')
                  .select('*')
                  .eq('id', session.user.id)
                  .single();
                  
                if (newProfile) {
                  const userObj = {
                    id: session.user.id,
                    email: session.user.email || '',
                    username: newProfile?.username || session.user.email?.split('@')[0] || 'User',
                    full_name: newProfile?.full_name || undefined,
                    avatar_url: newProfile?.avatar_url || undefined,
                    created_at: newProfile?.created_at || new Date().toISOString(),
                    is_creator: newProfile?.is_creator || false,
                    is_reader: newProfile?.is_reader || false,
                    bio: newProfile?.bio || '',
                    custom_price_per_minute: newProfile?.custom_price_per_minute || undefined,
                  };
                  set({ user: userObj });
                  setUserContext(userObj);
                  identifyUser(userObj);
                } else {
                  // Fallback if profile fetch fails after creation
                  const userObj = {
                    id: session.user.id,
                    email: session.user.email || '',
                    username: username || undefined,
                    full_name: fullName || undefined,
                    avatar_url: userData?.avatar_url || undefined,
                    created_at: new Date().toISOString(),
                    is_creator: false,
                    is_reader: false,
                    bio: '',
                    custom_price_per_minute: undefined,
                  };
                  set({ user: userObj });
                  setUserContext(userObj);
                  identifyUser(userObj);
                }
              } catch (insertError) {
                console.error('Error creating user profile:', insertError);
                // Fallback if profile creation fails
                const userObj = {
                  id: session.user.id,
                  email: session.user.email || '',
                  username: session.user.user_metadata?.username || session.user.email?.split('@')[0] || 'User',
                  full_name: session.user.user_metadata?.full_name || session.user.user_metadata?.name || '',
                  avatar_url: session.user.user_metadata?.avatar_url || undefined,
                  created_at: new Date().toISOString(),
                  is_creator: false,
                  is_reader: false,
                  bio: '',
                  custom_price_per_minute: undefined,
                };
                set({ user: userObj });
                setUserContext(userObj);
                identifyUser(userObj);
              }
            } else {
              // Other profile fetch error, use fallback user data
              const userObj = {
                id: session.user.id,
                email: session.user.email || '',
                username: session.user.user_metadata?.username || session.user.email?.split('@')[0] || 'User',
                full_name: session.user.user_metadata?.full_name || session.user.user_metadata?.name || '',
                created_at: new Date().toISOString(),
                is_creator: false,
                is_reader: false,
                bio: '',
                custom_price_per_minute: undefined,
              };
              set({ user: userObj });
              setUserContext(userObj);
              identifyUser(userObj);
            }
          } else if (profile) {
            // Profile found, set user data
            const userObj = {
              id: session.user.id,
              email: session.user.email || '',
              username: profile?.username,
              full_name: profile?.full_name,
              avatar_url: profile?.avatar_url,
              created_at: profile?.created_at || new Date().toISOString(),
              is_creator: profile?.is_creator || false,
              is_reader: profile?.is_reader || false,
              bio: profile?.bio || '',
              custom_price_per_minute: profile?.custom_price_per_minute,
            };
            set({ user: userObj });
            setUserContext(userObj);
            identifyUser(userObj);
          }
        } else {
          console.log('No session found, user is not authenticated');
          set({ user: null });
          clearUserContext();
          identifyUser(null);
        }
      } catch (error) {
        console.error('Error checking auth:', error);
        set({ user: null });
        clearUserContext();
        identifyUser(null);
      } finally {
        set({ 
          loading: false,
          isCheckingRef: false,
          authStateDetermined: true
        });
      }
    },

    signUp: async (email: string, username?: string, fullName?: string) => {
      try {
        // Generate a mystical username if not provided
        let mysticalUsername = username;
        if (!mysticalUsername) {
          try {
            mysticalUsername = await generateMysticalUsername(email || fullName || '');
          } catch (usernameError) {
            console.error('Error generating mystical username:', usernameError);
            mysticalUsername = generateBasicUsername(email);
          }
        }
        
        console.log('Signing up user with email:', email);
        
        // Generate a random secure password
        const password = generateSecurePassword();
        
        // Create the account with email and password
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              username: mysticalUsername,
              full_name: fullName || '',
            },
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          }
        });
        
        if (error) throw error;
        
        // Send magic link
        const { error: signInError } = await supabase.auth.signInWithOtp({
          email,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          }
        });
        
        if (signInError) throw signInError;
        
        // Indicate the confirmation email was sent
        set({ magicLinkSent: true });
        
        return { error: null };
      } catch (error) {
        console.error('Sign up error:', error);
        return { error };
      }
    },

    signIn: async (email: string) => {
      try {
        console.log('Signing in user with email:', email);
        
        // Send magic link directly
        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          }
        });
        
        if (error) throw error;
        
        // Indicate magic link was sent
        set({ magicLinkSent: true });
        
        return { error: null };
      } catch (error) {
        console.error('Sign in error:', error);
        return { error };
      }
    },

    signInWithGoogle: async (returnToHome = false) => {
      try {
        console.log('Starting Google sign-in flow');
        
        // Store the current path and any deck creation intent
        if (returnToHome) {
          localStorage.setItem('auth_return_to_home', 'true');
          localStorage.setItem('auth_with_deck_creation', 'true');
        } else {
          localStorage.setItem('auth_return_path', window.location.pathname + window.location.search);
        }
        
        // Generate a secure nonce for this sign-in attempt
        const nonce = generateNonce();
        set({ nonceRef: nonce });
        
        // Use Supabase's built-in OAuth flow for Google
        const { error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: `${window.location.origin}/auth/callback`,
            queryParams: {
              access_type: 'offline',
              prompt: 'consent',
              nonce: nonce
            }
          }
        });
        
        if (error) throw error;
        
        return { error: null };
      } catch (error) {
        console.error('Google sign-in error:', error);
        return { error };
      }
    },

    handleGoogleRedirect: async () => {
      console.log('Processing authentication callback');
      
      try {
        // This method works for all providers including Google
        if (window.location.hash || window.location.search) {
          console.log('Authentication data found in URL');
          
          if (window.location.search) {
            // Handle code exchange if we have a code parameter
            const { data, error } = await supabase.auth.exchangeCodeForSession(window.location.search);
            
            if (error) {
              throw error;
            }
            
            if (data.session) {
              console.log('Successfully authenticated via code exchange');
            }
          }
          
          // Let Supabase handle the callback
          await get().checkAuth();
          return { error: null };
        } else {
          console.log('No authentication data found in URL');
          return { error: 'No authentication data received' };
        }
      } catch (error) {
        console.error('Error handling authentication callback:', error);
        return { error };
      }
    },

    signOut: async () => {
      try {
        console.log('Signing out user');
        // Sign out from Supabase
        await supabase.auth.signOut();
        set({ user: null });
        clearUserContext();
        identifyUser(null);
      } catch (error) {
        console.error('Error signing out:', error);
      }
    },

    initializeAuth: () => {
      console.log('Setting up auth state listener');
      
      // Initial auth check
      const initAuth = async () => {
        try {
          await get().checkAuth();
        } catch (error) {
          console.error('Error during initial auth check:', error);
          set({ loading: false, authStateDetermined: true });
        }
        
        // Safety timeout to ensure loading state never gets stuck
        setTimeout(() => {
          const state = get();
          if (!state.authStateDetermined) {
            console.log('Safety timeout triggered - forcing loading state to false');
            set({ loading: false, authStateDetermined: true });
          }
        }, 5000);
      };
      
      initAuth();
      
      // Set up the auth state change listener
      supabase.auth.onAuthStateChange(
        async (event, session) => {
          console.log('Auth state changed:', event, session?.user?.id);
          
          if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
            console.log('User signed in or token refreshed, updating auth state');
            await get().checkAuth();
            set({ showSignInModal: false });
          } else if (event === 'SIGNED_OUT' || (event as string) === 'USER_DELETED') {
            console.log('User signed out or deleted');
            set({ 
              user: null, 
              loading: false, 
              authStateDetermined: true 
            });
            clearUserContext();
            identifyUser(null);
          }
        }
      );
    }
  }))
);

// Helper functions
const generateBasicUsername = (email: string): string => {
  const prefix = email.split('@')[0];
  const randomSuffix = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `${prefix}${randomSuffix}`;
};

const generateSecurePassword = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+~`|}{[]:;?><,./-=';
  let password = '';
  for (let i = 0; i < 16; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
};

const generateNonce = () => {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}; 