import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { User } from '../types';
import { supabase } from '../lib/supabase';
import { processGoogleProfileImage } from '../lib/user-profile';
import { generateMysticalUsername } from '../lib/gemini-ai';
import { setUserContext, clearUserContext } from '../utils/errorTracking';
import { identifyUser } from '../utils/analytics';
import { persist, createJSONStorage } from 'zustand/middleware';

export type { User }; // Re-export the User type

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
  signInAnonymously: () => Promise<{ error: any }>;
  isAnonymous: () => boolean;
  linkWithEmail: (email: string, password: string) => Promise<{ error: any }>;
  linkWithGoogle: () => Promise<{ error: any }>;
  handleGoogleRedirect: () => Promise<{ data?: any, error: any }>;
  signOut: () => Promise<void>;
  checkAuth: () => Promise<void>;
  initializeAuth: () => void;
  migrateAnonymousUserData: (fromUserId: string, toUserId: string) => Promise<{ error: any }>;
  linkToExistingAccount: (email: string, anonymousUserId: string) => Promise<{ error: any }>;
  restoreAnonymousSession: () => Promise<{ error: any }>;
  cleanupUpgradeProcess: () => void;
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
    setShowSignInModal: async (show) => {
      if (show) {
        // Log reading session state specifically when the modal is being opened
        try {
          const readingSessionStore = (await import('./readingSessionStore')).useReadingSessionStore.getState();
          if (readingSessionStore.sessionState) {
            console.log(
              '🕵️‍♂️ authStore.setShowSignInModal(true): Pre-modal open check: shuffledDeck length:',
              readingSessionStore.sessionState.shuffledDeck?.length,
              'selectedCards length:',
              readingSessionStore.sessionState.selectedCards?.length,
              'readingStep:',
              readingSessionStore.sessionState.readingStep
            );
          } else {
            console.log('🕵️‍♂️ authStore.setShowSignInModal(true): Pre-modal open check: No active reading session state.');
          }
        } catch (e) {
          console.warn('Error accessing readingSessionStore in authStore.setShowSignInModal:', e);
        }
      }
      set({ showSignInModal: show });
    },

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
                const sessionUser = session.user; // Cache for easier access
                const userMetadata = sessionUser.user_metadata || {};
                const authProviderFullName = userMetadata.full_name || userMetadata.name || '';
                const avatarUrl = userMetadata.avatar_url || userMetadata.picture;
                
                let usernameFromMeta = userMetadata.username;
                let generatedUsername = '';
                if (!usernameFromMeta) {
                  try {
                    const nameSource = authProviderFullName || sessionUser.email || '';
                    generatedUsername = await generateMysticalUsername(nameSource);
                  } catch (usernameError) {
                    console.error('Error generating username:', usernameError);
                    generatedUsername = sessionUser.email?.split('@')[0] || 'User';
                  }
                }
                const finalUsernameForTable = usernameFromMeta || generatedUsername;
                
                const userDataToInsert = {
                  id: sessionUser.id,
                  email: sessionUser.email || '',
                  username: finalUsernameForTable,
                  created_at: new Date().toISOString()
                };
                
                await supabase.from('users').insert([userDataToInsert]);
                console.log('User profile (core) created successfully in public.users');
                
                let finalAvatarUrl = undefined;
                if (avatarUrl) {
                  finalAvatarUrl = await processGoogleProfileImage(sessionUser.id, avatarUrl);
                }
                
                const { data: newProfile, error: refetchError } = await supabase
                  .from('users')
                  .select('username, created_at, is_creator, is_reader, bio, custom_price_per_minute')
                  .eq('id', sessionUser.id)
                  .single();
                  
                if (refetchError) {
                   console.warn("Error re-fetching profile after insert:", refetchError);
                }
                  
                const userObj: User = {
                  id: sessionUser.id,
                  email: sessionUser.email || '',
                  username: newProfile?.username || finalUsernameForTable,
                  full_name: authProviderFullName || newProfile?.username || finalUsernameForTable,
                  avatar_url: finalAvatarUrl === null ? undefined : finalAvatarUrl,
                  created_at: newProfile?.created_at || userDataToInsert.created_at,
                    is_creator: newProfile?.is_creator || false,
                    is_reader: newProfile?.is_reader || false,
                    bio: newProfile?.bio || '',
                  custom_price_per_minute: newProfile?.custom_price_per_minute,
                  };
                  set({ user: userObj });
                  setUserContext(userObj);
                  identifyUser(userObj);

              } catch (insertError: any) {
                console.error('Error creating user profile (in catch block):', insertError);
                const sessionUser = session.user; 
                const userMetadata = sessionUser.user_metadata || {};
                const authProviderFullName = userMetadata.full_name || userMetadata.name || '';
                const defaultUsername = userMetadata.username || sessionUser.email?.split('@')[0] || 'User';

                if (insertError && insertError.code === '23505') {
                  console.log('User profile already exists (23505 conflict), attempting to re-fetch for store...');
                  try {
                    const { data: existingProfile, error: conflictRefetchError } = await supabase
                      .from('users')
                      .select('username, created_at, avatar_url, is_creator, is_reader, bio, custom_price_per_minute')
                      .eq('id', sessionUser.id)
                      .single();

                    if (conflictRefetchError) {
                        console.warn("Error re-fetching profile after 23505 conflict:", conflictRefetchError);
                    }
                    
                    const userObj: User = {
                      id: sessionUser.id,
                      email: sessionUser.email || '',
                      username: existingProfile?.username || defaultUsername,
                      full_name: authProviderFullName || existingProfile?.username || defaultUsername,
                      avatar_url: existingProfile?.avatar_url || userMetadata.avatar_url || userMetadata.picture,
                      created_at: existingProfile?.created_at || new Date().toISOString(),
                      is_creator: existingProfile?.is_creator || false,
                      is_reader: existingProfile?.is_reader || false,
                      bio: existingProfile?.bio || '',
                      custom_price_per_minute: existingProfile?.custom_price_per_minute,
                  };
                  set({ user: userObj });
                  setUserContext(userObj);
                  identifyUser(userObj);
                  } catch (refetchCatchError) {
                    console.error('Catch block: Error re-fetching profile after 23505 conflict:', refetchCatchError);
                    const fallbackUserObj: User = {
                      id: sessionUser.id, email: sessionUser.email || '', username: defaultUsername,
                      full_name: authProviderFullName, avatar_url: userMetadata.avatar_url || userMetadata.picture,
                      created_at: new Date().toISOString(), is_creator: false, is_reader: false, bio: '',
                    };
                    set({ user: fallbackUserObj }); setUserContext(fallbackUserObj); identifyUser(fallbackUserObj);
                  }
                } else {
                  const fallbackUserObj: User = {
                    id: sessionUser.id, email: sessionUser.email || '', username: defaultUsername,
                    full_name: authProviderFullName, avatar_url: userMetadata.avatar_url || userMetadata.picture,
                    created_at: new Date().toISOString(), is_creator: false, is_reader: false, bio: '',
                };
                  set({ user: fallbackUserObj }); setUserContext(fallbackUserObj); identifyUser(fallbackUserObj);
                }
              }
            } else {
              // Other profile fetch error (not PGRST116)
              const sessionUser = session.user;
              const userMetadata = sessionUser.user_metadata || {};
              const authProviderFullName = userMetadata.full_name || userMetadata.name || '';
              const defaultUsername = userMetadata.username || sessionUser.email?.split('@')[0] || 'User';
              const fallbackUserObj: User = {
                id: sessionUser.id,
                email: sessionUser.email || '',
                username: defaultUsername,
                full_name: authProviderFullName,
                avatar_url: userMetadata.avatar_url || userMetadata.picture,
                created_at: new Date().toISOString(),
                is_creator: false, is_reader: false, bio: '',
              };
              set({ user: fallbackUserObj }); setUserContext(fallbackUserObj); identifyUser(fallbackUserObj);
            }
          } else if (profile) {
            // Profile found in public.users, construct userObj for store
            const sessionUser = session.user;
            const userMetadata = sessionUser.user_metadata || {};
            const authProviderFullName = userMetadata.full_name || userMetadata.name || '';

            const userObj: User = {
              id: sessionUser.id,
              email: sessionUser.email || '',
              username: profile.username, // From public.users
              full_name: authProviderFullName || profile.username, // Prioritize auth metadata, then table username
              avatar_url: profile.avatar_url || userMetadata.avatar_url || userMetadata.picture, // Prefer table, then auth meta
              created_at: profile.created_at || new Date().toISOString(),
              is_creator: profile.is_creator || false,
              is_reader: profile.is_reader || false,
              bio: profile.bio || '',
              custom_price_per_minute: profile.custom_price_per_minute,
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
      console.log('🚀 authStore.signInWithGoogle CALLED');
      try {
        const readingSessionStoreState = (await import('./readingSessionStore')).useReadingSessionStore.getState().sessionState;
        console.log('  ➡️ readingSessionStore state:', 
          'shuffledDeck:', readingSessionStoreState?.shuffledDeck?.length,
          'readingStep:', readingSessionStoreState?.readingStep
        );
        const storedAuthContext = localStorage.getItem('auth_session_context');
        console.log('  ➡️ localStorage.auth_session_context:', storedAuthContext ? JSON.parse(storedAuthContext) : null);
      } catch (e) { console.warn('Error logging pre-signInWithGoogle state:', e); }

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

    signInAnonymously: async () => {
      try {
        const { ensureAnonymousUserSingleton } = await import('../utils/anonymousAuth');
        const { user, isAnonymous } = get();
        
        console.log('🎭 Using singleton anonymous auth from authStore');
        const result = await ensureAnonymousUserSingleton(
          user, 
          isAnonymous, 
          (newUser) => set({ user: newUser }),
          (loading) => set({ loading })
        );
        
        // For additional authStore-specific logic (analytics, etc.)
        if (result.user && !result.error) {
          setUserContext(result.user);
          identifyUser(result.user);
        }
        
        return { error: result.error };
      } catch (error) {
        console.error('❌ Error in authStore signInAnonymously:', error);
        return { error };
      }
    },

    isAnonymous: () => {
      const user = get().user;
      // User is anonymous if they exist but don't have an email
      // (indicating they're from the anonymous_users table)
      return !!(user && !user.email);
    },

    linkWithEmail: async (email: string, password: string) => {
      let backupUser: User | null = null;
      
      try {
        console.log('🔗 Upgrading anonymous user with email (session-safe)');
        
        const { user } = get();
        if (!user || !get().isAnonymous()) {
          throw new Error('No anonymous user to upgrade');
        }
        
        // Store user for potential restoration
        backupUser = user;
        const anonymousUserId = user.id;
        
        // IMPORTANT: Store current anonymous session for potential restoration
        const { data: { session: currentSession }, error: sessionError } = await supabase.auth.getSession();
        if (currentSession && !sessionError) {
          localStorage.setItem('backup_anonymous_session', JSON.stringify({
            access_token: currentSession.access_token,
            refresh_token: currentSession.refresh_token,
            user: user,
            timestamp: Date.now()
          }));
          console.log('💾 Backed up anonymous session for safety');
        }
        
        // Introduce a small delay to allow ReadingRoom updates to propagate
        await new Promise(resolve => setTimeout(resolve, 200));

        // Store current session context for post-auth restoration
        const sessionStore = (await import('./readingSessionStore')).useReadingSessionStore.getState();
        if (sessionStore.sessionState) {
          console.log(
            '💾🔍 authStore.initiateLoginOrSignupWithContext: Pre-localStorage save: shuffledDeck length:',
            sessionStore.sessionState.shuffledDeck?.length,
            'readingStep:',
            sessionStore.sessionState.readingStep
          );
          localStorage.setItem('auth_session_context', JSON.stringify({
            sessionId: sessionStore.sessionState.id,
            participantId: sessionStore.participantId,
            isHost: sessionStore.isHost,
            anonymousId: sessionStore.anonymousId,
            // Preserve the actual session state content
            sessionState: {
              readingStep: sessionStore.sessionState.readingStep,
              selectedLayout: sessionStore.sessionState.selectedLayout,
              question: sessionStore.sessionState.question,
              selectedCards: sessionStore.sessionState.selectedCards,
              shuffledDeck: sessionStore.sessionState.shuffledDeck,
              interpretation: sessionStore.sessionState.interpretation,
              zoomLevel: sessionStore.sessionState.zoomLevel,
              panOffset: sessionStore.sessionState.panOffset,
              zoomFocus: sessionStore.sessionState.zoomFocus,
              activeCardIndex: sessionStore.sessionState.activeCardIndex,
              sharedModalState: sessionStore.sessionState.sharedModalState,
              videoCallState: sessionStore.sessionState.videoCallState,
              loadingStates: sessionStore.sessionState.loadingStates,
              deckSelectionState: sessionStore.sessionState.deckSelectionState
            },
            timestamp: Date.now()
          }));
          console.log('💾 Preserved complete session context including state for post-auth restoration');
        }
        
        // Store the current path for post-auth redirect
        localStorage.setItem('auth_return_path', window.location.pathname + window.location.search);
        
        // Try to sign up with email (this creates a new authenticated user)
        // We use signUp instead of updateUser to avoid conflicts
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: email,
          password: password,
          options: {
            data: {
              username: email.split('@')[0],
              full_name: `User ${email.split('@')[0]}`,
              anonymous_upgrade: anonymousUserId // Track the upgrade
            },
            emailRedirectTo: `${window.location.origin}/auth/callback`
          }
        });
        
        if (signUpError) {
          // Check if this is because the email already exists
          if (signUpError.message?.includes('already registered') || 
              signUpError.message?.includes('already exists') ||
              signUpError.message?.includes('already taken')) {
            // Email belongs to existing user - return special error for handling
            localStorage.removeItem('backup_anonymous_session');
            localStorage.removeItem('auth_session_context');
            throw new Error(`EXISTING_ACCOUNT:${email}:${anonymousUserId}`);
          }
          // Other signup error
          localStorage.removeItem('backup_anonymous_session');
          localStorage.removeItem('auth_session_context');
          throw signUpError;
        }
        
        // Store pending upgrade info for the email confirmation callback
        localStorage.setItem('pending_email_upgrade', JSON.stringify({
          anonymousUserId: anonymousUserId,
          newUserId: signUpData.user?.id,
          email: email
        }));
        
        console.log('✅ Email upgrade initiated - check your email for confirmation');
        console.log('🛡️ Anonymous session preserved - will only be replaced on email confirmation');
        
        // Don't clean up anonymous session yet - wait for email confirmation
        return { error: null };
      } catch (error: any) {
        console.error('❌ Error upgrading to email account:', error);
        
        // Clean up session context on error
        localStorage.removeItem('auth_session_context');
        
        // Ensure we still have the anonymous user in case of any session issues
        if (!get().user && backupUser) {
          console.log('🔄 Restoring anonymous user state after failed email upgrade');
          set({ user: backupUser });
        }
        
        return { error };
      }
    },

    linkWithGoogle: async () => {
      console.log('🔗🚀 authStore.linkWithGoogle CALLED');
      try {
        const readingSessionStoreState = (await import('./readingSessionStore')).useReadingSessionStore.getState().sessionState;
        console.log('  ➡️ readingSessionStore state:', 
          'shuffledDeck:', readingSessionStoreState?.shuffledDeck?.length,
          'readingStep:', readingSessionStoreState?.readingStep
        );
        const storedAuthContext = localStorage.getItem('auth_session_context');
        console.log('  ➡️ localStorage.auth_session_context:', storedAuthContext ? JSON.parse(storedAuthContext) : null);
      } catch (e) { console.warn('Error logging pre-linkWithGoogle state:', e); }

      let backupUser: User | null = null;
      try {
        console.log('🔗 Upgrading anonymous user to Google account (session-safe)');

        const { user } = get();
        if (!user || !get().isAnonymous()) {
          throw new Error('No anonymous user to upgrade with Google');
        }

        backupUser = user;
        const anonymousUserId = user.id; // Ensure this is declared

        // Store the anonymous user ID for post-auth data migration
        localStorage.setItem('pending_google_link', anonymousUserId);
        console.log('📍 Storing pending_google_link for migration:', anonymousUserId);
        
        // IMPORTANT: Store current anonymous session for potential restoration
        // Use different variable names if currentSession/sessionError are declared later in the same scope
        const { data: { session: anonSessionBackup }, error: anonSessionBackupError } = await supabase.auth.getSession();
        if (anonSessionBackup && !anonSessionBackupError) {
          localStorage.setItem('backup_anonymous_session', JSON.stringify({
            access_token: anonSessionBackup.access_token,
            refresh_token: anonSessionBackup.refresh_token,
            user: user, // The anonymous user object being backed up
            timestamp: Date.now()
          }));
          console.log('💾 Backed up anonymous session for safety');
        }

        // Introduce a small delay to allow ReadingRoom updates to propagate
        await new Promise(resolve => setTimeout(resolve, 200));

        // Store current session context for post-auth restoration
        const sessionStore = (await import('./readingSessionStore')).useReadingSessionStore.getState();
        if (sessionStore.sessionState) {
          console.log(
            '💾🔍 authStore.linkWithGoogle: Pre-localStorage save: shuffledDeck length:',
            sessionStore.sessionState.shuffledDeck?.length,
            'readingStep:',
            sessionStore.sessionState.readingStep
          );
          localStorage.setItem('auth_session_context', JSON.stringify({
            sessionId: sessionStore.sessionState.id,
            participantId: sessionStore.participantId,
            isHost: sessionStore.isHost,
            anonymousId: sessionStore.anonymousId, // Preserve the anonymousId from reading session store
            sessionState: {
              readingStep: sessionStore.sessionState.readingStep,
              selectedLayout: sessionStore.sessionState.selectedLayout,
              question: sessionStore.sessionState.question,
              selectedCards: sessionStore.sessionState.selectedCards,
              shuffledDeck: sessionStore.sessionState.shuffledDeck,
              interpretation: sessionStore.sessionState.interpretation,
              zoomLevel: sessionStore.sessionState.zoomLevel,
              panOffset: sessionStore.sessionState.panOffset,
              zoomFocus: sessionStore.sessionState.zoomFocus,
              activeCardIndex: sessionStore.sessionState.activeCardIndex,
              sharedModalState: sessionStore.sessionState.sharedModalState,
              videoCallState: sessionStore.sessionState.videoCallState,
              loadingStates: sessionStore.sessionState.loadingStates,
              deckSelectionState: sessionStore.sessionState.deckSelectionState
            },
            timestamp: Date.now()
          }));
          console.log('💾 Preserved complete session context including state for post-auth restoration (Google)');
        }

        // Store the current path for post-auth redirect
        localStorage.setItem('auth_return_path', window.location.pathname + window.location.search);
        
        // Try Google OAuth without signing out first
        // This allows us to fall back to anonymous session if it fails
        const { data, error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: `${window.location.origin}/auth/callback`,
            // Add a flag to indicate this is an upgrade from anonymous
            queryParams: {
              anonymous_upgrade: 'true'
            }
          }
        });
            
            if (error) {
          // Clean up on failure but keep anonymous session intact
          localStorage.removeItem('pending_google_link');
          localStorage.removeItem('backup_anonymous_session');
          localStorage.removeItem('auth_session_context');
          console.log('❌ Google OAuth failed, keeping anonymous session intact');
              throw error;
            }
            
        console.log('✅ Google OAuth upgrade initiated - will redirect to Google');
        console.log('🛡️ Anonymous session preserved - will only be replaced on success');
        return { error: null };
      } catch (error) {
        console.error('❌ Error upgrading to Google account:', error);
        // Clean up the pending flag but preserve anonymous session
        localStorage.removeItem('pending_google_link');
        localStorage.removeItem('backup_anonymous_session');
        localStorage.removeItem('auth_session_context');
        
        // Ensure we still have the anonymous user in case of any session issues
        if (!get().user && backupUser) {
          console.log('🔄 Restoring anonymous user state after failed Google upgrade');
          set({ user: backupUser });
        }
        
        return { error };
      }
    },

    handleGoogleRedirect: async () => {
      console.log('Processing authentication callback');
      
      try {
        // Use getSession() which handles the callback automatically
        // This is more reliable than manual exchangeCodeForSession
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error getting session:', error);
          throw error;
        }
        
        if (session) {
          console.log('✅ Successfully authenticated via callback');
          // Update auth state
          await get().checkAuth();
          return { error: null };
        } else {
          console.log('No session found in callback');
          return { error: 'No session found' };
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
    },

    migrateAnonymousUserData: async (fromUserId: string, toUserId: string) => {
      try {
        console.log('🔄 Migrating data from anonymous user to existing user');
        console.log('From:', fromUserId, 'To:', toUserId);
        
        // Step 0: Check target user's subscription plan and existing quotas
        console.log('📊 Checking target user subscription and quota status...');
        
        // First, check if user already has quotas (simple query to avoid RLS issues)
        const { data: existingQuotas, error: quotaCheckError } = await supabase
          .from('user_deck_quotas')
          .select('*')
          .eq('user_id', toUserId)
          .single();
          
        if (quotaCheckError && quotaCheckError.code !== 'PGRST116') {
          console.warn('Error checking existing quotas:', quotaCheckError);
        }
        
        if (existingQuotas) {
          console.log('✅ Target user already has deck quotas:', {
            planType: existingQuotas.plan_type,
            majorArcana: existingQuotas.major_arcana_quota,
            completeDeck: existingQuotas.complete_deck_quota
          });
          
          // User has existing quotas - we should preserve them and not override
          // This means the account upgrade process has already set appropriate quotas
        } else {
          console.log('⚠️ Target user has no deck quotas - this is unusual for an existing account');
          console.log('🔄 Attempting to initialize quotas using existing quota system...');
          
          // Try to trigger the normal quota initialization process
          // This will use the deckQuotaStore logic to determine correct quotas
          try {
            const { useAuthStore } = await import('./authStore');
            const { checkAuth } = useAuthStore.getState();
            
            // Trigger a re-check which should initialize quotas
            await checkAuth();
            
            // Check again if quotas were created
            const { data: newQuotas } = await supabase
              .from('user_deck_quotas')
              .select('*')
              .eq('user_id', toUserId)
              .single();
              
            if (newQuotas) {
              console.log('✅ Quotas initialized successfully via auth check');
            } else {
              console.log('⚠️ Quotas still not found after auth check');
            }
          } catch (initError) {
            console.warn('Could not initialize quotas via auth check:', initError);
          }
        }
        
        // Step 1: Migrate reading sessions hosted by the anonymous user
        const { error: sessionsError } = await supabase
          .from('reading_sessions')
          .update({ 
            host_user_id: toUserId,
            original_host_user_id: fromUserId // Keep track of original host
          })
          .eq('host_user_id', fromUserId);
          
        if (sessionsError) {
          console.warn('Could not migrate reading sessions:', sessionsError);
        } else {
          console.log('✅ Migrated reading sessions');
        }

        // ---- START: Update reading_sessions with preserved state ----
        try {
          const authSessionContextRaw = localStorage.getItem('auth_session_context');
          if (authSessionContextRaw) {
            const authSessionContext = JSON.parse(authSessionContextRaw);
            if (authSessionContext && authSessionContext.sessionState && authSessionContext.sessionId) {
              const { sessionState, sessionId: preservedSessionId, participantId: preservedParticipantId } = authSessionContext;
              
              // Construct the payload carefully, ensuring all fields are compatible with the ReadingSessionState type
              // and the actual database schema.
              const updatePayload: any = {
                // Fields confirmed or assumed to be part of ReadingSessionState and DB schema
                reading_step: sessionState.readingStep,
                shuffled_deck: sessionState.shuffledDeck,
                selected_layout: sessionState.selectedLayout,
                question: sessionState.question,
                selected_cards: sessionState.selectedCards,
                interpretation: sessionState.interpretation,
                zoom_level: sessionState.zoomLevel,
                // Ensure other potentially relevant fields from sessionState are included if they exist on the type
                // and are meant to be preserved directly on the reading_sessions table.
                // Example:
                // active_card_index: sessionState.activeCardIndex, 
                // shared_modal_state: sessionState.sharedModalState,
                // video_call_state: sessionState.videoCallState,
                // loading_states: sessionState.loadingStates,
                // deck_selection_state: sessionState.deckSelectionState,
              };

              // Filter out undefined values to prevent errors during DB update
              const cleanedUpdatePayload = Object.fromEntries(
                Object.entries(updatePayload).filter(([, value]) => value !== undefined)
              );

              console.log('Deep dive into payload for reading_sessions update:', JSON.stringify(cleanedUpdatePayload, null, 2));

              const { error: preservedStateUpdateError } = await supabase
                .from('reading_sessions')
                .update(cleanedUpdatePayload) // Use the cleaned payload
                .eq('id', preservedSessionId);

              if (preservedStateUpdateError) {
                console.warn(`⚠️ Failed to update reading_sessions table (${preservedSessionId}) with preserved state:`, preservedStateUpdateError);
              } else {
                console.log(`✅ Successfully updated reading_sessions table (${preservedSessionId}) with preserved state.`);
              }
            }
          }
        } catch (e) {
          console.error('Error processing auth_session_context for DB update:', e);
        }
        // ---- END: Update reading_sessions with preserved state ----
        
        // Step 2: Migrate session participants (anonymous users in sessions)
        // First, find all sessions where the anonymous user is participating
        const { data: anonymousParticipants, error: findError } = await supabase
          .from('session_participants')
          .select('*')
          .eq('anonymous_id', fromUserId)
          .eq('is_active', true);
          
        if (findError) {
          console.warn('Could not find anonymous participants to migrate. Error:', findError);
        } else if (anonymousParticipants && anonymousParticipants.length > 0) {
          console.log(`Found ${anonymousParticipants.length} anonymous participant records to potentially migrate for fromUserId: ${fromUserId}`);
          
          for (const participant of anonymousParticipants) {
            console.log('Processing participant record:', JSON.stringify(participant)); // Log current participant details

            // Check if target user already has a participant in this session
            const { data: existingParticipant, error: selectError } = await supabase
              .from('session_participants')
              .select('id')
              .eq('session_id', participant.session_id)
              .eq('user_id', toUserId)
              .eq('is_active', true)
              .single();
              
            if (selectError && selectError.code !== 'PGRST116') { // PGRST116 (0 rows) is not an error here
              console.error(`Error checking for existing authenticated participant in session ${participant.session_id} for user ${toUserId}:`, selectError);
              continue; // Skip to next participant if this check fails
            }
              
            if (existingParticipant) {
              // Target user already has a participant in this session - deactivate the anonymous one being processed
              console.log(`Target user ${toUserId} already in session ${participant.session_id}. Deactivating current anonymous participant record ${participant.id} (originally linked to ${fromUserId})`);
              const { error: deactivateError } = await supabase
                .from('session_participants')
                .update({ is_active: false })
                .eq('id', participant.id);
              if (deactivateError) {
                console.error(`Error deactivating duplicate anonymous participant ${participant.id}:`, deactivateError);
              }
            } else {
              // Migrate the anonymous participant to the target user
              console.log(`Migrating participant ${participant.id} (current user_id: ${participant.user_id}, anon_id: ${participant.anonymous_id}) to user ${toUserId} in session ${participant.session_id}`);
              
              let newName = 'User'; // Ultimate fallback
              const originalParticipantName = participant.name;

              try {
                // Fetch username from the public.users table for the toUserId
                const { data: userTableProfile, error: profileError } = await supabase
                  .from('users')
                  .select('username') // Select only username
                  .eq('id', toUserId)
                  .single();

                if (profileError && profileError.code !== 'PGRST116') {
                  console.warn(`Could not fetch username from public.users for user ${toUserId} during participant migration:`, profileError);
                }
                
                const tableUsername = userTableProfile?.username;
                const storeUserFullName = get().user?.full_name; // Might be populated from auth metadata by checkAuth

                if (tableUsername) {
                  newName = tableUsername;
                  console.log(`Using tableUsername for participant: ${newName}`);
                } else if (storeUserFullName) {
                  newName = storeUserFullName;
                  console.log(`Using storeUserFullName for participant: ${newName}`);
                } else if (originalParticipantName) {
                  newName = originalParticipantName;
                  console.log(`Using originalParticipantName for participant: ${newName}`);
                }
                // If all else fails, newName remains 'User'

              } catch (e) {
                console.error('Error determining new name for participant, falling back:', e);
                if (originalParticipantName) {
                  newName = originalParticipantName; // Fallback to original guest name on error
                }
              }
              
              const updatePayloadForParticipant: any = { 
                user_id: toUserId, 
                anonymous_id: null, // Explicitly set anonymous_id to null
                name: newName, // Update the name
                is_host: participant.is_host // Explicitly carry over host status
              };

              const { error: updateError } = await supabase
                .from('session_participants')
                .update(updatePayloadForParticipant)
                .eq('id', participant.id);
              if (updateError) {
                console.error(`Error migrating participant ${participant.id} to user ${toUserId}:`, updateError);
              }
            }
          }
        } else {
          console.log(`No active anonymous participant records found for fromUserId: ${fromUserId} to migrate.`);
        }
        
        // Additional cleanup: deactivate any remaining duplicate participants for the target user
        const { data: targetParticipants } = await supabase
          .from('session_participants')
          .select('id, session_id, joined_at')
          .eq('user_id', toUserId)
          .eq('is_active', true);
          
        if (targetParticipants) {
          // Group by session_id and keep only the earliest joined participant per session
          const sessionGroups = targetParticipants.reduce((groups: any, participant) => {
            const sessionId = participant.session_id;
            if (!groups[sessionId]) {
              groups[sessionId] = [];
            }
            groups[sessionId].push(participant);
            return groups;
          }, {});
          
          // For each session, deactivate all but the earliest participant
          for (const sessionId in sessionGroups) {
            const participants = sessionGroups[sessionId];
            if (participants.length > 1) {
              // Sort by joined_at to find the earliest
              participants.sort((a: any, b: any) => new Date(a.joined_at).getTime() - new Date(b.joined_at).getTime());
              
              // Deactivate all except the first (earliest)
              const toDeactivate = participants.slice(1);
              console.log(`Deactivating ${toDeactivate.length} duplicate participants in session ${sessionId}`);
              
              for (const duplicate of toDeactivate) {
                await supabase
                  .from('session_participants')
                  .update({ is_active: false })
                  .eq('id', duplicate.id);
              }
            }
          }
        }
        
        console.log('✅ Session participant migration and cleanup complete');
        
        // Step 3: Migrate any decks created by anonymous user (if applicable)
        const { error: decksError } = await supabase
          .from('decks')
          .update({ creator_id: toUserId })
          .eq('creator_id', fromUserId);
          
        if (decksError) {
          console.warn('Could not migrate decks:', decksError);
        } else {
          console.log('✅ Migrated created decks');
        }
        
        // Step 4: Handle deck quotas - ensure target user has appropriate quotas
        if (!existingQuotas) {
          console.log('🎫 Target user has no deck quotas, attempting to create them...');
          
          // Try to initialize quotas by triggering the deckQuotaStore initialization
          try {
            const { useDeckQuotaStore } = await import('./deckQuotaStore');
            const { initializeQuotas } = useDeckQuotaStore.getState();
            
            // This will properly determine the plan from subscription and create quotas
            await initializeQuotas();
            
            console.log('✅ Quota initialization attempted via deckQuotaStore');
          } catch (initError) {
            console.warn('Could not initialize quotas via deckQuotaStore:', initError);
            
            // Simple fallback - create free plan quotas
            try {
              const { error: quotaError } = await supabase
                .from('user_deck_quotas')
                .insert({
                  user_id: toUserId,
                  major_arcana_quota: 1,
                  complete_deck_quota: 0,
                  major_arcana_used: 0,
                  complete_deck_used: 0,
                  plan_type: 'free',
                  last_refresh_date: new Date().toISOString(),
                  next_refresh_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
                });
                
              if (!quotaError) {
                console.log('✅ Created fallback free plan quotas');
              }
            } catch (fallbackError) {
              console.warn('Could not create fallback quotas:', fallbackError);
            }
          }
        } else {
          console.log('✅ Target user already has deck quotas, preserving existing quotas');
        }
        
        // Step 5: Merge anonymous user quotas (if any) with existing quotas
        const { data: anonymousQuotas } = await supabase
          .from('user_deck_quotas')
          .select('*')
          .eq('user_id', fromUserId)
          .single();
          
        if (anonymousQuotas && existingQuotas) {
          console.log('🔄 Merging anonymous user quota usage with target user quotas');
          
          // Add anonymous user's usage to target user's usage (but don't exceed quotas)
          const newMajorUsed = Math.min(
            existingQuotas.major_arcana_quota,
            existingQuotas.major_arcana_used + (anonymousQuotas.major_arcana_used || 0)
          );
          const newCompleteUsed = Math.min(
            existingQuotas.complete_deck_quota,
            existingQuotas.complete_deck_used + (anonymousQuotas.complete_deck_used || 0)
          );
          
          const { error: updateQuotaError } = await supabase
            .from('user_deck_quotas')
            .update({
              major_arcana_used: newMajorUsed,
              complete_deck_used: newCompleteUsed
            })
            .eq('user_id', toUserId);
            
          if (updateQuotaError) {
            console.warn('Could not update target user quota usage:', updateQuotaError);
          } else {
            console.log('✅ Merged quota usage from anonymous user');
          }
          
          // Clean up anonymous user quotas
          await supabase
            .from('user_deck_quotas')
            .delete()
            .eq('user_id', fromUserId);
        }
        
        // Step 6: Clean up - remove the anonymous user record
        const { error: cleanupError } = await supabase
          .from('anonymous_users')
          .delete()
          .eq('id', fromUserId);
          
        if (cleanupError) {
          console.warn('Could not clean up anonymous user record:', cleanupError);
        } else {
          console.log('✅ Cleaned up anonymous user record');
        }
        
        console.log('✅ Data migration completed successfully with proper subscription-based quotas');
        return { error: null };
      } catch (error) {
        console.error('❌ Error migrating user data:', error);
        return { error };
      }
    },

    linkToExistingAccount: async (email: string, anonymousUserId: string) => {
      try {
        console.log('🔗 Sending magic link to existing account for data migration');
        
        // Store current path for post-auth redirect
        const currentPath = window.location.pathname + window.location.search;
        localStorage.setItem('auth_return_path', currentPath);
        console.log('📍 Storing auth_return_path for existing account linking:', currentPath);
        
        // Store migration info for when user signs in via magic link
        localStorage.setItem('pending_migration', JSON.stringify({
          fromUserId: anonymousUserId,
          email: email
        }));
        
        // Send magic link to existing account
        const { data: signInData, error: signInError } = await supabase.auth.signInWithOtp({
          email: email,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`
          }
        });
        
        if (signInError) throw signInError;
        
        console.log('✅ Magic link sent to existing account');
        return { error: null };
      } catch (error) {
        console.error('❌ Error sending magic link for account linking:', error);
        return { error };
      }
    },

    // Utility function to restore anonymous session if Google upgrade fails
    restoreAnonymousSession: async () => {
      try {
        console.log('🔄 Attempting to restore anonymous session...');
        
        const backupSessionData = localStorage.getItem('backup_anonymous_session');
        if (!backupSessionData) {
          console.log('❌ No backup session found');
          return { error: 'No backup session available' };
        }
        
        const { access_token, refresh_token, user: backupUser, timestamp } = JSON.parse(backupSessionData);
        
        // Check if backup is not too old (max 1 hour)
        if (Date.now() - timestamp > 3600000) {
          console.log('❌ Backup session too old, removing it');
          localStorage.removeItem('backup_anonymous_session');
          return { error: 'Backup session expired' };
        }
        
        // Try to restore the session
        const { data, error } = await supabase.auth.setSession({
          access_token,
          refresh_token
        });
        
        if (error) {
          console.error('❌ Could not restore anonymous session:', error);
          localStorage.removeItem('backup_anonymous_session');
          return { error };
        }
        
        // Restore user state
        set({ user: backupUser });
        setUserContext(backupUser);
        identifyUser(backupUser);
        
        // Clean up backup
        localStorage.removeItem('backup_anonymous_session');
        
        console.log('✅ Anonymous session restored successfully');
        return { error: null };
      } catch (error) {
        console.error('❌ Error restoring anonymous session:', error);
        localStorage.removeItem('backup_anonymous_session');
        return { error };
      }
    },

    // Cleanup function for when user abandons upgrade process
    cleanupUpgradeProcess: () => {
      console.log('🧹 Cleaning up abandoned upgrade process');
      
      // Remove any pending upgrade flags
      localStorage.removeItem('pending_google_link');
      localStorage.removeItem('pending_email_upgrade');
      
      // If there's a backup session, it will expire after 1 hour automatically
      // But we can clean it up now if the user explicitly cancels
      const backupExists = localStorage.getItem('backup_anonymous_session');
      if (backupExists) {
        console.log('💾 Keeping backup session in case user wants to retry');
        // Keep backup for potential retry - it will auto-expire
      }
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