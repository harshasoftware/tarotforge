import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { User } from '../types';
import { supabase } from '../lib/supabase';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signUp: (email: string, username?: string) => Promise<{ error: any }>;
  signIn: (email: string) => Promise<{ error: any }>;
  signInWithGoogle: () => Promise<{ error: any }>;
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
              await supabase
                .from('users')
                .insert([{
                  id: session.user.id,
                  email: session.user.email || '',
                  username: session.user.user_metadata?.username || session.user.email?.split('@')[0] || 'User',
                  created_at: new Date().toISOString()
                }]);
              
              console.log('User profile created successfully');
              
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
                  avatar_url: newProfile.avatar_url,
                  created_at: newProfile.created_at,
                  is_creator: newProfile.is_creator || false,
                  is_reader: newProfile.is_reader || false,
                });
              } else {
                // Fallback if profile fetch fails after creation
                setUser({
                  id: session.user.id,
                  email: session.user.email || '',
                  username: session.user.user_metadata?.username || session.user.email?.split('@')[0] || 'User',
                  created_at: new Date().toISOString(),
                  is_creator: false,
                  is_reader: false,
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

  // Helper function to generate a cryptographically secure random string
  const generateSecureNonce = () => {
    if (window.crypto && window.crypto.getRandomValues) {
      const array = new Uint32Array(4);
      window.crypto.getRandomValues(array);
      return Array.from(array, dec => ('0' + dec.toString(16)).slice(-2)).join('');
    }
    
    // Fallback to less secure but still reasonable random string
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15);
  };
  
  // Helper function to parse JWT without a library
  const parseJwt = (token: string) => {
    try {
      const base64Url = token.split('.')[1];
      if (!base64Url) return {};
      
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        window.atob(base64)
          .split('')
          .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      
      return JSON.parse(jsonPayload);
    } catch (error) {
      console.error('Error parsing JWT:', error);
      return {};
    }
  };

  const signInWithGoogle = async () => {
    try {
      console.log('Starting Google sign-in flow (Implicit Grant)');
      
      // Construct the Google OAuth URL manually for implicit flow
      const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
      const redirectUri = import.meta.env.VITE_GOOGLE_CLIENT_REDIRECT_URI;
      const scope = 'openid profile email'; // Adjust scopes as needed
      const responseType = 'token id_token'; // Request tokens directly (implicit flow)
      
      // Generate a cryptographically secure random nonce
      const nonce = generateSecureNonce();
      
      // Generate a cryptographically secure random state
      const state = generateSecureNonce();
      
      // Store nonce and state in localStorage to verify later
      localStorage.setItem('google_auth_nonce', nonce);
      localStorage.setItem('google_auth_state', state);
      localStorage.setItem('google_auth_timestamp', Date.now().toString());
      
      // Construct full URL with nonce and state parameters
      const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${googleClientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=${responseType}&scope=${encodeURIComponent(scope)}&nonce=${nonce}&state=${state}`;
      
      // Redirect the user to Google for authentication
      window.location.href = googleAuthUrl;
      
      return { error: null };
    } catch (error) {
      console.error('Google sign-in error:', error);
      return { error };
    }
  };
  
  // Handle the redirect from Google
  const handleGoogleRedirect = async () => {
    // Only process if we have a hash fragment (which contains tokens)
    if (!window.location.hash) return { error: 'No authentication data received' };
    
    try {
      // Parse the URL fragment
      const fragmentString = window.location.hash.substring(1);
      const params: Record<string, string> = {};
      
      // Extract parameters from the fragment
      const regex = /([^&=]+)=([^&]*)/g;
      let m;
      while (m = regex.exec(fragmentString)) {
        params[decodeURIComponent(m[1])] = decodeURIComponent(m[2]);
      }
      
      // Verify state parameter to prevent CSRF attacks
      const storedState = localStorage.getItem('google_auth_state');
      if (!params.state || params.state !== storedState) {
        console.error('State mismatch. Possible CSRF attack');
        return { error: 'State validation failed' };
      }
      
      // Get the ID token and access token from the response
      const idToken = params.id_token;
      const accessToken = params.access_token;
      
      if (!idToken || !accessToken) {
        console.error('Missing tokens in response');
        return { error: 'Authentication failed' };
      }
      
      // Decode the ID token to verify nonce
      const payload = parseJwt(idToken);
      
      // Verify the nonce to prevent replay attacks
      const storedNonce = localStorage.getItem('google_auth_nonce');
      if (!payload.nonce || payload.nonce !== storedNonce) {
        console.error('Nonce mismatch. Possible replay attack');
        return { error: 'Nonce validation failed' };
      }
      
      // Check timestamp to prevent stale authentication attempts
      const timestamp = localStorage.getItem('google_auth_timestamp');
      const authTime = timestamp ? parseInt(timestamp) : 0;
      const now = Date.now();
      const MAX_AUTH_AGE = 10 * 60 * 1000; // 10 minutes
      
      if (now - authTime > MAX_AUTH_AGE) {
        console.error('Authentication attempt expired');
        return { error: 'Authentication expired' };
      }
      
      // Clean up stored values
      localStorage.removeItem('google_auth_nonce');
      localStorage.removeItem('google_auth_state');
      localStorage.removeItem('google_auth_timestamp');
      
      // Now that we've validated the tokens on the client side,
      // sign in with Supabase using the validated Google token
      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token: idToken,
        access_token: accessToken,
      });
      
      if (error) throw error;
      
      // Trigger auth check to update user state
      await checkAuth();
      
      return { data, error: null };
    } catch (error) {
      console.error('Error handling Google redirect:', error);
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