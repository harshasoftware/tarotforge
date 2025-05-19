import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { User } from '../types';
import { supabase } from '../lib/supabase';
import { processGoogleProfileImage } from '../lib/user-profile';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signUp: (email: string, username?: string) => Promise<{ error: any }>;
  signIn: (email: string) => Promise<{ error: any }>;
  signInWithGoogle: (returnToHome?: boolean) => Promise<{ error: any }>;
  handleGoogleRedirect: () => Promise<{ data?: any, error: any }>;
  signOut: () => Promise<void>;
  checkAuth: () => Promise<void>;
  magicLinkSent: boolean;
  setMagicLinkSent: (sent: boolean) => void;
  showSignInModal: boolean;
  setShowSignInModal: (show: boolean) => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signUp: async () => ({ error: null }),
  signIn: async () => ({ error: null }),
  signInWithGoogle: async () => ({ error: null }),
  handleGoogleRedirect: async () => ({ error: null }),
  signOut: async () => {},
  checkAuth: async () => {},
  magicLinkSent: false,
  setMagicLinkSent: () => {},
  showSignInModal: false,
  setShowSignInModal: () => {}
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [showSignInModal, setShowSignInModal] = useState(false);
  
  // Use refs to prevent unnecessary re-renders and debounce auth checks
  const isCheckingRef = useRef(false);
  const lastCheckTimeRef = useRef(0);
  const authCheckTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const checkAuth = useCallback(async () => {
    // Prevent concurrent auth checks
    if (isCheckingRef.current) {
      console.log('Auth check already in progress, skipping...');
      return;
    }
    
    // Debounce rapid auth checks (minimum 2 seconds between checks)
    const now = Date.now();
    if (now - lastCheckTimeRef.current < 2000) {
      console.log('Auth check debounced, too soon since last check');
      return;
    }
    
    try {
      isCheckingRef.current = true;
      lastCheckTimeRef.current = now;
      
      console.log('Checking authentication status...');
      
      // Check active session
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('Error getting session:', error);
        setUser(null);
        setLoading(false);
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
              // Extract information from OAuth user_metadata if available
              const userMetadata = session.user.user_metadata || {};
              const username = userMetadata.username || userMetadata.name || userMetadata.full_name || session.user.email?.split('@')[0] || 'User';
              let avatarUrl = userMetadata.avatar_url || userMetadata.picture || null;
              
              // Create initial profile
              await supabase
                .from('users')
                .insert([{
                  id: session.user.id,
                  email: session.user.email || '',
                  username: username,
                  created_at: new Date().toISOString(),
                  avatar_url: null // We'll update this after uploading to our storage
                }]);
              
              console.log('User profile created successfully');
              
              // If there is an avatar URL from OAuth, process it
              if (avatarUrl && session.user.id) {
                console.log('Processing OAuth profile image...');
                const processedUrl = await processGoogleProfileImage(session.user.id, avatarUrl);
                if (processedUrl) {
                  avatarUrl = processedUrl;
                }
              }
              
              // Retry profile fetch
              const { data: newProfile } = await supabase
                .from('users')
                .select('*')
                .eq('id', session.user.id)
                .single();
                
              if (newProfile) {
                setUser({
                  id: session.user.id,
                  email: session.user.email || '',
                  username: newProfile.username,
                  avatar_url: avatarUrl || newProfile.avatar_url,
                  created_at: newProfile.created_at,
                  is_creator: newProfile.is_creator || false,
                  is_reader: newProfile.is_reader || false,
                  bio: newProfile.bio || '',
                });
              } else {
                // Fallback if profile fetch fails after creation
                setUser({
                  id: session.user.id,
                  email: session.user.email || '',
                  username: username,
                  avatar_url: avatarUrl,
                  created_at: new Date().toISOString(),
                  is_creator: false,
                  is_reader: false,
                  bio: '',
                });
              }
            } catch (insertError) {
              console.error('Error creating user profile:', insertError);
              // Fallback if profile creation fails
              setUser({
                id: session.user.id,
                email: session.user.email || '',
                username: session.user.user_metadata?.username || session.user.email?.split('@')[0] || 'User',
                created_at: new Date().toISOString(),
                is_creator: false,
                is_reader: false,
                bio: '',
              });
            }
          } else {
            // Other profile fetch error, use fallback user data
            setUser({
              id: session.user.id,
              email: session.user.email || '',
              username: session.user.user_metadata?.username || session.user.email?.split('@')[0] || 'User',
              created_at: new Date().toISOString(),
              is_creator: false,
              is_reader: false,
              bio: '',
            });
          }
        } else if (profile) {
          // Profile found, set user data
          setUser({
            id: session.user.id,
            email: session.user.email || '',
            username: profile?.username,
            avatar_url: profile?.avatar_url,
            created_at: profile?.created_at || new Date().toISOString(),
            is_creator: profile?.is_creator || false,
            is_reader: profile?.is_reader || false,
            bio: profile?.bio || '',
          });
        }
      } else {
        console.log('No session found, user is not authenticated');
        setUser(null);
      }
    } catch (error) {
      console.error('Error checking auth:', error);
      setUser(null);
    } finally {
      setLoading(false);
      isCheckingRef.current = false;
    }
  }, []);

  const signUp = async (email: string, username?: string) => {
    try {
      // Generate a random username if not provided
      const generatedUsername = username || generateRandomUsername(email);
      
      console.log('Signing up user with email:', email);
      
      // Generate a random secure password
      const password = generateSecurePassword();
      
      // Create the account with email and password
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username: generatedUsername,
          },
          // Set the redirect URL for the magic link
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
      setMagicLinkSent(true);
      
      return { error: null };
    } catch (error) {
      console.error('Sign up error:', error);
      return { error };
    }
  };

  const signIn = async (email: string) => {
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
      setMagicLinkSent(true);
      
      return { error: null };
    } catch (error) {
      console.error('Sign in error:', error);
      return { error };
    }
  };

  // Helper function to log OAuth process steps for debugging
  const logAuthProcess = (step: string, data?: any) => {
    console.log(`Auth process: ${step}`, data || '');
  };

  const signInWithGoogle = async (returnToHome = false) => {
    try {
      logAuthProcess('Starting Google sign-in flow');
      
      // Store the current path and any deck creation intent
      if (returnToHome) {
        // Store that we want to return to home page with deck creation intent
        localStorage.setItem('auth_return_to_home', 'true');
        localStorage.setItem('auth_with_deck_creation', 'true');
      } else {
        // Store current path for regular flow
        localStorage.setItem('auth_return_path', window.location.pathname + window.location.search);
      }
      
      // Use Supabase's built-in OAuth flow for Google
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: import.meta.env.VITE_GOOGLE_CLIENT_REDIRECT_URI,
          scopes: 'email profile openid https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile',
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
            response_type: 'code',
            include_granted_scopes: 'true'
          }
        }
      });
      
      if (error) throw error;
      
      return { error: null };
    } catch (error) {
      console.error('Google sign-in error:', error);
      return { error };
    }
  };
  
  // Handle auth callback from any provider
  const handleGoogleRedirect = async () => {
    logAuthProcess('Processing authentication callback');
    
    try {
      // This method works for all providers including Google
      // Supabase automatically handles tokens and session creation
      if (window.location.hash || window.location.search) {
        logAuthProcess('Authentication data found in URL');        
        // Let Supabase handle the callback
        await checkAuth();
        return { error: null };
      } else {
        logAuthProcess('No authentication data found in URL');
        return { error: 'No authentication data received' };
      }
    } catch (error) {
      console.error('Error handling authentication callback:', error);
      return { error };
    }
  };

  const signOut = async () => {
    try {
      console.log('Signing out user');
      // Sign out from Supabase
      await supabase.auth.signOut();
      setUser(null);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };
  
  // Helper function to generate a random username based on email
  const generateRandomUsername = (email: string) => {
    const prefix = email.split('@')[0];
    const randomSuffix = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `${prefix}${randomSuffix}`;
  };
  
  // Helper function to generate a secure random password
  const generateSecurePassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+~`|}{[]:;?><,./-=';
    let password = '';
    // Generate a 16-character random password
    for (let i = 0; i < 16; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  };

  // Set up auth state listener
  useEffect(() => {
    console.log('Setting up auth state listener');
    
    // Initial auth check - only run once
    const initAuth = async () => {
      try {
        await checkAuth();
      } catch (error) {
        console.error('Error during initial auth check:', error);
        setLoading(false);
      }
      
      // Safety timeout to ensure loading state never gets stuck
      if (authCheckTimeoutRef.current) {
        clearTimeout(authCheckTimeoutRef.current);
      }
      
      authCheckTimeoutRef.current = setTimeout(() => {
        console.log('Safety timeout triggered - forcing loading state to false');
        setLoading(false);
      }, 8000);
    };
    
    initAuth();
    
    // Set up the auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.id);
        
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          console.log('User signed in or token refreshed, updating auth state');
          await checkAuth();
          // Close sign in modal if it's open
          setShowSignInModal(false);
        } else if (event === 'SIGNED_OUT' || (event as string) === 'USER_DELETED') {
          console.log('User signed out or deleted');
          setUser(null);
          setLoading(false);
        }
      }
    );

    // Clean up the subscription and any timeouts on unmount
    return () => {
      console.log('Cleaning up auth state listener');
      subscription.unsubscribe();
      
      if (authCheckTimeoutRef.current) {
        clearTimeout(authCheckTimeoutRef.current);
      }
    };
  }, [checkAuth]);

  const value = {
    user,
    loading,
    signUp,
    signIn,
    signInWithGoogle,
    handleGoogleRedirect,
    signOut,
    checkAuth,
    magicLinkSent,
    setMagicLinkSent,
    showSignInModal,
    setShowSignInModal
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};