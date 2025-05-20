import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { User } from '../types';
import { supabase } from '../lib/supabase';
import { processGoogleProfileImage } from '../lib/user-profile';
import { generateMysticalUsername } from '../lib/gemini-ai';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signUp: (email: string, username?: string, fullName?: string) => Promise<{ error: any }>;
  signIn: (email: string) => Promise<{ error: any }>;
  signInWithGoogle: (returnToHome?: boolean) => Promise<{ error: any }>;
  handleGoogleRedirect: () => Promise<{ data?: any, error: any }>;
  signOut: () => Promise<void>;
  checkAuth: () => Promise<void>;
  magicLinkSent: boolean;
  setMagicLinkSent: (sent: boolean) => void;
  showSignInModal: boolean;
  setShowSignInModal: (show: boolean) => void;
  handleGoogleOneTapCallback: (response: GoogleOneTapResponse, nonce: string) => Promise<void>;
}

// Google One Tap interface
interface GoogleOneTapResponse {
  credential: string;
  select_by: string;
  clientId: string;
}

// GoogleCredential type is now handled by @supabase/supabase-js types

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
  setShowSignInModal: () => {},
  handleGoogleOneTapCallback: async () => {}
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
  const googleOneTapInitializedRef = useRef(false);
  const nonceRef = useRef<string>('');
  const scriptLoadingRef = useRef(false);
  const scriptLoadAttemptsRef = useRef(0);

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
              // Extract information from Google provider if available
              const userMetadata = session.user.user_metadata || {};
              const avatarUrl = userMetadata.avatar_url || userMetadata.picture;
              const fullName = userMetadata.full_name || userMetadata.name || '';
              
              // Generate a mystical username if none provided
              let username = userMetadata.username;
              if (!username) {
                try {
                  // Use email, name, or a combination for username generation
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
                avatar_url: undefined as string | undefined, // Will be set if we have a Google image
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
                setUser({
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
                });
              } else {
                // Fallback if profile fetch fails after creation
                setUser({
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
                });
              }
            } catch (insertError) {
              console.error('Error creating user profile:', insertError);
              // Fallback if profile creation fails
              setUser({
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
              });
            }
          } else {
            // Other profile fetch error, use fallback user data
            setUser({
              id: session.user.id,
              email: session.user.email || '',
              username: session.user.user_metadata?.username || session.user.email?.split('@')[0] || 'User',
              full_name: session.user.user_metadata?.full_name || session.user.user_metadata?.name || '',
              created_at: new Date().toISOString(),
              is_creator: false,
              is_reader: false,
              bio: '',
              custom_price_per_minute: undefined,
            });
          }
        } else if (profile) {
          // Profile found, set user data
          setUser({
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

  const signUp = async (email: string, username?: string, fullName?: string) => {
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
      
      // Generate a secure nonce for this sign-in attempt
      nonceRef.current = generateNonce();
      
      // Use Supabase's built-in OAuth flow for Google
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
            nonce: nonceRef.current
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
      if (window.location.hash || window.location.search) {
        logAuthProcess('Authentication data found in URL');
        
        if (window.location.search) {
          // Handle code exchange if we have a code parameter
          const { data, error } = await supabase.auth.exchangeCodeForSession(window.location.search);
          
          if (error) {
            throw error;
          }
          
          if (data.session) {
            logAuthProcess('Successfully authenticated via code exchange');
          }
        }
        
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
      
      // Reset One Tap state
      googleOneTapInitializedRef.current = false;
      // Revoke Google One Tap credential
      if (window.google && window.google.accounts) {
        window.google.accounts.id.disableAutoSelect();
      }
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };
  
  // Helper function to generate a basic username from email if AI generation fails
  const generateBasicUsername = (email: string): string => {
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

  // Generate a cryptographically secure random nonce
  const generateNonce = () => {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  };

  // Handle Google One Tap sign in
  const handleGoogleOneTapCallback = async (response: GoogleOneTapResponse, nonce: string): Promise<void> => {
    try {
      console.log('Google One Tap response received');
      
      // Sign in with Supabase using the ID token
      const { error } = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token: response.credential,
        nonce: nonce, // Use the provided nonce for verification
      });
      
      if (error) {
        console.error('Error signing in with Google One Tap:', error);
        return;
      }
      
      console.log('Successfully signed in with Google One Tap');
      await checkAuth();
    } catch (err) {
      console.error('Error processing Google One Tap response:', err);
    }
  };

  // Load Google One Tap script dynamically with enhanced error handling
  const loadGoogleScript = (): Promise<void> => {
    return new Promise((resolve, reject) => {
      // Prevent multiple concurrent load attempts
      if (scriptLoadingRef.current) {
        console.log('Google script is already being loaded');
        return;
      }
      
      scriptLoadingRef.current = true;
      
      const MAX_LOAD_ATTEMPTS = 3;
      
      // If script is already loaded successfully, resolve immediately
      if (window.google?.accounts?.id) {
        console.log('Google One Tap script already loaded');
        scriptLoadingRef.current = false;
        return resolve();
      }
      
      // Check if script is already being loaded
      const existingScript = document.getElementById('google-one-tap-script');
      if (existingScript) {
        // Script is loading, set up event listeners
        existingScript.addEventListener('load', () => {
          console.log('Existing Google script loaded successfully');
          scriptLoadingRef.current = false;
          resolve();
        });
        
        existingScript.addEventListener('error', (e) => {
          console.error('Error loading existing Google script:', e);
          // Remove the failed script
          existingScript.remove();
          scriptLoadingRef.current = false;
          
          // Track attempts and retry if under max
          scriptLoadAttemptsRef.current += 1;
          if (scriptLoadAttemptsRef.current < MAX_LOAD_ATTEMPTS) {
            console.log(`Retrying script load (${scriptLoadAttemptsRef.current}/${MAX_LOAD_ATTEMPTS})...`);
            // Use timeout before retry to avoid rapid failures
            setTimeout(() => {
              loadGoogleScript().then(resolve).catch(reject);
            }, 1000 * scriptLoadAttemptsRef.current); // Increase delay with each attempt
          } else {
            console.error('Maximum script load attempts reached');
            reject(e);
          }
        });
        
        return;
      }
      
      // Add timeout to detect long-running script loads that might be stuck
      const scriptLoadTimeout = setTimeout(() => {
        console.warn('Google script load timeout - might be blocked or slow network');
        // Don't reject here, just log a warning as the script might still load
      }, 10000);
      
      try {
        // Create and append script with proper error handling
        const script = document.createElement('script');
        script.id = 'google-one-tap-script';
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.defer = true;
        script.crossOrigin = 'anonymous';
        
        script.onload = () => {
          console.log('Google One Tap script loaded successfully');
          clearTimeout(scriptLoadTimeout);
          scriptLoadingRef.current = false;
          scriptLoadAttemptsRef.current = 0; // Reset attempts on success
          resolve();
        };
        
        script.onerror = (error) => {
          console.error('Error loading Google One Tap script:', error);
          clearTimeout(scriptLoadTimeout);
          
          // Remove the failed script
          script.remove();
          scriptLoadingRef.current = false;
          
          // Track attempts and retry if under max
          scriptLoadAttemptsRef.current += 1;
          if (scriptLoadAttemptsRef.current < MAX_LOAD_ATTEMPTS) {
            console.log(`Retrying script load (${scriptLoadAttemptsRef.current}/${MAX_LOAD_ATTEMPTS})...`);
            // Use timeout before retry to avoid rapid failures
            setTimeout(() => {
              loadGoogleScript().then(resolve).catch(reject);
            }, 1000 * scriptLoadAttemptsRef.current); // Increase delay with each attempt
          } else {
            console.error('Maximum script load attempts reached');
            reject(error);
          }
        };
        
        // Use try-catch for append operation which could throw in some browsers
        document.head.appendChild(script);
      } catch (error) {
        console.error('Error appending Google script to DOM:', error);
        clearTimeout(scriptLoadTimeout);
        scriptLoadingRef.current = false;
        reject(error);
      }
    });
  };

  // Try an alternative loading method as a fallback
  const loadGoogleScriptFallback = (): Promise<void> => {
    return new Promise((resolve, reject) => {
      console.log('Attempting fallback method for loading Google script');
      
      try {
        // Use direct script injection with innerHTML as a last resort
        const scriptHtml = `
          <script id="google-one-tap-script-fallback" 
                  src="https://accounts.google.com/gsi/client" 
                  async defer crossorigin="anonymous">
          </script>
        `;
        
        // Create a temporary container and add the script HTML
        const container = document.createElement('div');
        container.style.display = 'none';
        container.innerHTML = scriptHtml;
        document.body.appendChild(container);
        
        // Set a timeout to check if Google API becomes available
        const checkInterval = setInterval(() => {
          if (window.google?.accounts?.id) {
            console.log('Google API loaded via fallback method');
            clearInterval(checkInterval);
            resolve();
          }
        }, 500);
        
        // Also set a maximum timeout for the fallback attempt
        setTimeout(() => {
          if (!window.google?.accounts?.id) {
            console.error('Fallback Google script load failed - timeout');
            clearInterval(checkInterval);
            reject(new Error('Fallback load method timed out'));
          }
        }, 10000);
      } catch (error) {
        console.error('Error in fallback script loading:', error);
        reject(error);
      }
    });
  };

  // Handle Google One Tap initialization with retries and fallback
  const handleGoogleOneTap = (retryCount = 0): Promise<void> => {
    return new Promise<void>((resolve) => {
      const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
      if (!googleClientId) {
        console.error('Google Client ID is not configured');
        return resolve();
      }
      
      // Maximum retry attempts for the entire initialization process
      const MAX_RETRIES = 3;
      
      // First ensure the script is loaded with enhanced error handling
      loadGoogleScript()
        .then(() => {
          // Script loaded successfully, now check if Google API is available
          if (!window.google?.accounts?.id) {
            if (retryCount >= MAX_RETRIES) {
              console.error('Google accounts API not available after multiple retries');
              // Try the fallback method before giving up
              return loadGoogleScriptFallback()
                .then(() => {
                  initializeGoogleOneTap(googleClientId, resolve);
                })
                .catch((fallbackError) => {
                  console.error('Fallback script loading failed:', fallbackError);
                  resolve(); // Resolve anyway to prevent blocking the app
                });
            }
            
            console.warn(`Google accounts API not available yet, retrying... (${retryCount + 1}/${MAX_RETRIES})`);
            
            // Try again after a delay that increases with each retry
            const delay = Math.min(1000 * Math.pow(2, retryCount), 5000); // Exponential backoff, max 5s
            
            setTimeout(() => {
              handleGoogleOneTap(retryCount + 1).then(resolve);
            }, delay);
            
            return;
          }
          
          // Google API is available, initialize One Tap
          initializeGoogleOneTap(googleClientId, resolve);
        })
        .catch((error) => {
          console.error("Error loading Google script:", error);
          
          if (retryCount < MAX_RETRIES) {
            console.log(`Retrying Google script load process (${retryCount + 1}/${MAX_RETRIES})...`);
            setTimeout(() => {
              handleGoogleOneTap(retryCount + 1).then(resolve);
            }, 1000 * (retryCount + 1));
          } else {
            console.error("Max retries reached for Google script loading");
            // Try the fallback method before giving up
            loadGoogleScriptFallback()
              .then(() => {
                initializeGoogleOneTap(googleClientId, resolve);
              })
              .catch(() => {
                resolve(); // Resolve anyway to prevent blocking the app
              });
          }
        });
    });
  };
  
  // Separate function to initialize Google One Tap after script is loaded
  const initializeGoogleOneTap = (googleClientId: string, callback: () => void): void => {
    try {
      console.log("Initializing Google One Tap with client ID:", googleClientId);
      
      // Reset initialization flag
      googleOneTapInitializedRef.current = false;
      
      // Generate a secure nonce for this sign-in attempt
      nonceRef.current = generateNonce();
      
      // Initialize Google Identity with error handling
      try {
        window.google.accounts.id.initialize({
          client_id: googleClientId,
          callback: (response: GoogleOneTapResponse) => {
            handleGoogleOneTapCallback(response, nonceRef.current);
          },
          auto_select: false,
          cancel_on_tap_outside: true,
          use_fedcm_for_prompt: false, // Disable FedCM to ensure compatibility
        });
        
        // Add a small delay to ensure the API is fully ready
        setTimeout(() => {
          try {
            // Double-check that google is still available
            if (!window.google?.accounts?.id) {
              console.error('Google accounts API became unavailable during initialization');
              return callback();
            }
            
            // Display the One Tap prompt with proper error handling
            window.google.accounts.id.prompt((notification) => {
              if (notification) {
                const status = [
                  notification.isNotDisplayed?.() ? 'Not displayed' : '',
                  notification.isSkippedMoment?.() ? 'Skipped' : '',
                  notification.isDismissedMoment?.() ? 'Dismissed' : ''
                ].filter(Boolean).join(', ');
                
                console.log("Google One Tap prompt status:", status || 'Displayed');
                
                if (notification.isNotDisplayed?.()) {
                  const reason = notification.getNotDisplayedReason?.();
                  console.log("One Tap not displayed reason:", reason);
                }
                
                if (notification.isSkippedMoment?.()) {
                  console.log("One Tap skipped reason:", notification.getSkippedReason?.());
                }
                
                if (notification.isDismissedMoment?.()) {
                  console.log("One Tap dismissed reason:", notification.getDismissedReason?.());
                }
              }
              callback();
            });
            
            googleOneTapInitializedRef.current = true;
            console.log("Google One Tap initialized successfully");
          } catch (promptError) {
            console.error("Error showing Google One Tap prompt:", promptError);
            callback();
          }
        }, 100);
      } catch (initError) {
        console.error("Error initializing Google One Tap:", initError);
        callback();
      }
    } catch (error) {
      console.error("Uncaught error in Google One Tap initialization:", error);
      callback();
    }
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
          
          // Disable One Tap when signed in
          googleOneTapInitializedRef.current = true;
        } else if (event === 'SIGNED_OUT' || (event as string) === 'USER_DELETED') {
          console.log('User signed out or deleted');
          setUser(null);
          setLoading(false);
          
          // Reset One Tap state when signed out
          googleOneTapInitializedRef.current = false;
          
          // Reset script loading state
          scriptLoadingRef.current = false;
          scriptLoadAttemptsRef.current = 0;
          
          // Try to initialize One Tap after a delay
          setTimeout(() => {
            handleGoogleOneTap();
          }, 1000);
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
  }, [checkAuth, user]);

  // Initialize Google One Tap when user is not logged in
  useEffect(() => {
    if (!user && !googleOneTapInitializedRef.current && !scriptLoadingRef.current) {
      // Set a delay before initializing to avoid racing with other initialization logic
      const initTimeout = setTimeout(() => {
        handleGoogleOneTap();
      }, 1000);
      
      return () => {
        clearTimeout(initTimeout);
      };
    }
  }, [user]);

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
    setShowSignInModal,
    handleGoogleOneTapCallback
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};