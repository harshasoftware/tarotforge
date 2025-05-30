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
        
        // Store current session context for post-auth restoration
        const sessionStore = (await import('./readingSessionStore')).useReadingSessionStore.getState();
        if (sessionStore.sessionState) {
          // Capture complete session state for restoration
          const sessionContext = {
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
          };
          
          localStorage.setItem('auth_session_context', JSON.stringify(sessionContext));
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
      let backupUser: User | null = null;
      
      try {
        console.log('🔗 Upgrading anonymous user to Google account (session-safe)');
        
        const { user } = get();
        if (!user || !get().isAnonymous()) {
          throw new Error('No anonymous user to upgrade');
        }
        
        // Store user for potential restoration
        backupUser = user;
        
        // Store the anonymous user ID for post-auth data migration
        localStorage.setItem('pending_google_link', user.id);
        console.log('📍 Storing pending_google_link for migration:', user.id);
        
        // Store current session context for post-auth restoration
        const sessionStore = (await import('./readingSessionStore')).useReadingSessionStore.getState();
        if (sessionStore.sessionState) {
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
          console.log('💾 Preserved session context for post-auth restoration');
        }
        
        // Store the current path for post-auth redirect
        localStorage.setItem('auth_return_path', window.location.pathname + window.location.search);
        
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
        
        // Step 2: Migrate session participants (anonymous users in sessions)
        // First, find all sessions where the anonymous user is participating
        const { data: anonymousParticipants, error: findError } = await supabase
          .from('session_participants')
          .select('*')
          .eq('user_id', fromUserId)
          .eq('is_active', true);
          
        if (findError) {
          console.warn('Could not find anonymous participants:', findError);
        } else if (anonymousParticipants && anonymousParticipants.length > 0) {
          console.log(`Found ${anonymousParticipants.length} anonymous participant records to migrate`);
          
          // For each session, ensure we don't create duplicates
          for (const participant of anonymousParticipants) {
            // Check if target user already has a participant in this session
            const { data: existingParticipant } = await supabase
              .from('session_participants')
              .select('id')
              .eq('session_id', participant.session_id)
              .eq('user_id', toUserId)
              .eq('is_active', true)
              .single();
              
            if (existingParticipant) {
              // Target user already has a participant in this session - remove the anonymous one
              console.log(`Removing duplicate anonymous participant in session ${participant.session_id}`);
              await supabase
                .from('session_participants')
                .update({ is_active: false })
                .eq('id', participant.id);
            } else {
              // Migrate the anonymous participant to the target user
              console.log(`Migrating participant ${participant.id} to user ${toUserId}`);
              await supabase
                .from('session_participants')
                .update({ user_id: toUserId })
                .eq('id', participant.id);
            }
          }
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