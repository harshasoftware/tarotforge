import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { AlertCircle } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import MagicWandLoader from '../../components/ui/MagicWandLoader';

// --- Helper Functions ---

/**
 * Handles the migration of data from a pending anonymous session if the user
 * already exists and matches the email.
 */
async function handleInitialAnonymousDataMigration(pendingMigrationData: string): Promise<void> {
  try {
    const { fromUserId, email: migrationEmail } = JSON.parse(pendingMigrationData);
    const { user } = useAuthStore.getState();

    if (user && user.email === migrationEmail) {
      console.log('🔄 Performing pending data migration for existing user');
      const { migrateAnonymousUserData } = useAuthStore.getState();
      await migrateAnonymousUserData(fromUserId, user.id);
      localStorage.removeItem('pending_migration');
      console.log('✅ Data migration completed successfully for existing user');
    }
  } catch (migrationError) {
    console.error('❌ Error during initial data migration:', migrationError);
    // Non-blocking: continue auth flow even if this specific migration fails.
  }
}

/**
 * Sets up a new user account, migrates data from an anonymous profile,
 * and cleans up the anonymous record.
 */
async function setupNewUserAndMigrateData(params: {
  newUserId: string;
  newUserEmail: string;
  newUserUsername: string;
  anonymousUserId: string;
  initialProcessingStep: string;
  finalProcessingStep: string;
  setProcessingStep: (step: string) => void;
}): Promise<void> {
  const {
    newUserId,
    newUserEmail,
    newUserUsername,
    anonymousUserId,
    initialProcessingStep,
    finalProcessingStep,
    setProcessingStep,
  } = params;

  setProcessingStep(initialProcessingStep);

  // Create user profile in users table
  const { error: insertError } = await supabase
    .from('users')
    .insert({
      id: newUserId,
      email: newUserEmail,
      username: newUserUsername,
      created_at: new Date().toISOString(),
    });

  if (insertError) {
    console.warn('Could not create user profile:', insertError);
  } else {
    console.log('✅ Created user profile successfully');
  }

  // Migrate anonymous user data
  setProcessingStep('Ancient Scrolls Unfurl: Transcribing Your Journey...');
  try {
    const { migrateAnonymousUserData } = useAuthStore.getState();
    await migrateAnonymousUserData(anonymousUserId, newUserId);
    console.log('✅ Anonymous user data migrated successfully');
  } catch (migrationError) {
    console.error('❌ Error migrating anonymous user data:', migrationError);
    // Non-blocking for the main auth flow.
  }

  // Clean up anonymous user record
  const { error: cleanupError } = await supabase
    .from('anonymous_users')
    .delete()
    .eq('id', anonymousUserId);

  if (cleanupError) {
    console.warn('Could not clean up anonymous user record:', cleanupError);
  } else {
    console.log('✅ Cleaned up anonymous user record');
  }

  // Clean up backup session
  localStorage.removeItem('backup_anonymous_session');
  setProcessingStep(finalProcessingStep);
}

/**
 * Restores reading session context from localStorage if available.
 */
async function restoreReadingSessionContext(sessionContextString: string, currentUserId: string): Promise<void> {
  try {
    const { sessionId, participantId, isHost, sessionState: preservedSessionState } = JSON.parse(sessionContextString);
    console.log('🔄 Restoring session context after upgrade:', { sessionId, participantId, isHost, hasPreservedState: !!preservedSessionState });

    const { useReadingSessionStore } = await import('../../stores/readingSessionStore');
    const sessionStore = useReadingSessionStore.getState();
    sessionStore.setInitialSessionId(sessionId);

    console.log('⏳ Waiting for participant migration to sync in database...');
    await new Promise(resolve => setTimeout(resolve, 2000)); // Delay for DB sync

    let verifiedParticipantId = participantId;
    try {
      const { data: migratedParticipant } = await supabase
        .from('session_participants')
        .select('id')
        .eq('session_id', sessionId)
        .eq('user_id', currentUserId)
        .eq('is_active', true)
        .single();
      if (migratedParticipant) {
        console.log('✅ Participant migration verified in database:', migratedParticipant.id);
        verifiedParticipantId = migratedParticipant.id;
      } else {
        console.log('⚠️ Migrated participant not found yet, session restoration may create duplicates');
      }
    } catch (verifyError) {
      console.warn('Could not verify participant migration:', verifyError);
    }

    if (preservedSessionState) {
      console.log('🔄 Restoring complete session state');
      localStorage.setItem('preserved_session_state', JSON.stringify(preservedSessionState));
    }

    localStorage.setItem('session_context_restored', JSON.stringify({
      sessionId,
      participantId: verifiedParticipantId,
      isHost,
      preserveState: true,
      migrationComplete: true,
      timestamp: Date.now(),
    }));

    const returnPath = localStorage.getItem('auth_return_path');
    if (returnPath && returnPath.includes('/reading-room')) {
      const deckMatch = returnPath.match(/\/reading-room\/([^?]+)/);
      const deckId = deckMatch ? deckMatch[1] : '';
      const newPath = deckId ? `/reading-room/${deckId}?join=${sessionId}` : `/reading-room?join=${sessionId}`;
      localStorage.setItem('auth_return_path', newPath);
      console.log('📍 Updated return path to use restored session:', newPath);
    }
    localStorage.removeItem('auth_session_context');
    console.log('✅ Session context restored with migration complete flag');
  } catch (contextError) {
    console.warn('Could not restore session context:', contextError);
    localStorage.removeItem('auth_session_context'); // Clean up if parsing or other error
  }
}

/**
 * Handles errors during auth upgrade (email/Google link), attempts to restore
 * anonymous session, and updates UI.
 */
async function handleAuthUpgradeError(params: {
  error: any;
  errorContextMessage: string;
  localStorageKeyToRemove: 'pending_email_upgrade' | 'pending_google_link';
  setError: (message: string | null) => void;
}) {
  const { error, errorContextMessage, localStorageKeyToRemove, setError } = params;
  console.error(`❌ Error completing ${localStorageKeyToRemove}:`, error);

  console.log('🔄 Attempting to restore anonymous session...');
  try {
    const { restoreAnonymousSession } = useAuthStore.getState();
    const restoreResult = await restoreAnonymousSession();
    if (!restoreResult.error) {
      console.log(`✅ Anonymous session restored after failed ${localStorageKeyToRemove}`);
      setError(`${errorContextMessage}, but your anonymous session has been restored.`);
    } else {
      console.error('❌ Could not restore anonymous session:', restoreResult.error);
      setError(`${errorContextMessage}. Please try again or continue as a guest.`);
    }
  } catch (restoreError) {
    console.error('❌ Error during session restoration:', restoreError);
    setError(`${errorContextMessage}. Please try again or continue as a guest.`);
  }
  localStorage.removeItem(localStorageKeyToRemove);
}

// --- AuthCallback Component ---

const AuthCallback = () => {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [processingStep, setProcessingStep] = useState<string>('Whispers from the Ether: Awakening Your Connection...');
  const [loading, setLoading] = useState(true); // Start with loading true
  const [progressPercent, setProgressPercent] = useState<number>(10);
  
  useEffect(() => {
    // Progress bar animation logic (remains unchanged)
    switch (processingStep) {
      case 'Whispers from the Ether: Awakening Your Connection...': setProgressPercent(10); break;
      case 'Celestial Alignment: Confirming Your Star Chart...':
      case 'The Scribe\'s Scroll: Inscribing Your Essence...': setProgressPercent(30); break;
      case 'The Weaver\'s Loom: Crafting Your Astral Form...': setProgressPercent(60); break;
      case 'Ancient Scrolls Unfurl: Transcribing Your Journey...': setProgressPercent(80); break;
      case 'The Veil Thins: Your Path is Illuminated!': setProgressPercent(100); break;
      default: setProgressPercent(10);
    }
  }, [processingStep]);
  
  useEffect(() => {
    const processAuthCallback = async () => {
      setLoading(true); // Ensure loading is true at the start

      try {
        const { handleGoogleRedirect, checkAuth, setAuthStateDetermined } = useAuthStore.getState();

        // Mark auth as determined immediately to prevent race condition
        setAuthStateDetermined(true);

        const authResult = await handleGoogleRedirect();

        if (authResult.error) {
          console.error('Auth callback error (handleGoogleRedirect):', authResult.error);
          setError('Authentication failed during initial redirect. Please try again.');
          setLoading(false);
          return;
        }

        // Wait for auth state to be fully updated
        await new Promise(resolve => setTimeout(resolve, 500));

        const pendingMigration = localStorage.getItem('pending_migration');
        if (pendingMigration) {
          await handleInitialAnonymousDataMigration(pendingMigration);
        }

        const authState = useAuthStore.getState(); // Get current auth state
        let currentUserId = authState.user?.id;
        let currentUserEmail = authState.user?.email;

        console.log('AuthCallback: Auth state after handleGoogleRedirect:', { currentUserId, currentUserEmail, hasUser: !!authState.user });

        const pendingEmailUpgrade = localStorage.getItem('pending_email_upgrade');
        const pendingGoogleLink = localStorage.getItem('pending_google_link');

        if (pendingEmailUpgrade) {
          try {
            const { anonymousUserId, newUserId, email: expectedEmail } = JSON.parse(pendingEmailUpgrade);
            if (authState.user && authState.user.email === expectedEmail && authState.user.id === newUserId) {
              currentUserId = authState.user.id; // Confirm user ID
              currentUserEmail = authState.user.email; // Confirm user email
              await setupNewUserAndMigrateData({
                newUserId: currentUserId,
                newUserEmail: currentUserEmail!,
                newUserUsername: currentUserEmail!.split('@')[0],
                anonymousUserId,
                initialProcessingStep: 'The Scribe\'s Scroll: Inscribing Your Essence...',
                finalProcessingStep: 'The Veil Thins: Your Path is Illuminated!',
                setProcessingStep,
              });
              localStorage.removeItem('pending_email_upgrade'); // Success, so remove flag
              await checkAuth(); // Refresh auth state
              const sessionContext = localStorage.getItem('auth_session_context');
              if (sessionContext && currentUserId) {
                await restoreReadingSessionContext(sessionContext, currentUserId);
              }
            } else {
                // This condition implies the user state after redirect does not match expected for email upgrade
                console.warn('User state mismatch for pending email upgrade. User:', authState.user, 'Expected email:', expectedEmail, 'Expected ID:', newUserId);
                throw new Error('User state mismatch during email upgrade.');
            }
          } catch (err) {
            await handleAuthUpgradeError({
              error: err,
              errorContextMessage: 'Email confirmation failed',
              localStorageKeyToRemove: 'pending_email_upgrade',
              setError,
            });
            setLoading(false);
            return;
          }
        } else if (pendingGoogleLink) {
          try {
            const anonymousUserId = pendingGoogleLink;
            setProcessingStep('Celestial Alignment: Confirming Your Star Chart...');
            
            const { data: { session }, error: sessionError } = await supabase.auth.getSession();
            if (sessionError || !session?.user?.email || !session.user.id) {
              throw sessionError || new Error('OAuth session not found or incomplete.');
            }
            
            currentUserId = session.user.id; // Update with session user ID
            currentUserEmail = session.user.email; // Update with session user email
            const userMetadata = session.user.user_metadata || {};

            await setupNewUserAndMigrateData({
              newUserId: currentUserId,
              newUserEmail: currentUserEmail,
              newUserUsername: userMetadata.preferred_username || currentUserEmail.split('@')[0],
              anonymousUserId,
              initialProcessingStep: 'The Weaver\'s Loom: Crafting Your Astral Form...',
              finalProcessingStep: 'The Veil Thins: Your Path is Illuminated!',
              setProcessingStep,
            });
            localStorage.removeItem('pending_google_link'); // Success, so remove flag
            await checkAuth(); // Refresh auth state
            const sessionContext = localStorage.getItem('auth_session_context');
            if (sessionContext && currentUserId) {
              await restoreReadingSessionContext(sessionContext, currentUserId);
            }
          } catch (err) {
            await handleAuthUpgradeError({
              error: err,
              errorContextMessage: 'Google sign-in failed',
              localStorageKeyToRemove: 'pending_google_link',
              setError,
            });
            setLoading(false);
            return;
          }
        }

        // Final navigation
        const finalReturnPath = localStorage.getItem('auth_return_path');
        const { user: finalUser } = useAuthStore.getState(); // Get latest user state for navigation
        if (finalReturnPath) {
          localStorage.removeItem('auth_return_path');
          navigate(finalReturnPath);
        } else {
          navigate(finalUser?.is_creator ? '/create-deck' : '/');
        }

      } catch (mainError) {
        console.error('Critical AuthCallback error:', mainError);
        setError('A critical error occurred during authentication. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    processAuthCallback();
  }, [navigate]); // Dependencies for the main effect

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="bg-card border border-border rounded-lg p-6 max-w-md w-full text-center">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h2 className="text-2xl font-serif mb-2">Authentication Error</h2>
          <p className="text-muted-foreground mb-6">{error}</p>
          {/* Consider adding a button to navigate to login, or auto-redirect after delay */}
          <button 
            onClick={() => navigate('/login')} 
            className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <MagicWandLoader size="md" className="mb-4" />
      <div className="mt-8 max-w-md text-center">
        <h2 className="text-xl font-medium mb-2">Unveiling Your Destiny</h2>
        <p className="text-muted-foreground mb-4">{processingStep}</p>
        <div className="h-2 w-full bg-muted/30 rounded-full overflow-hidden">
          <div
            className="h-2 bg-primary rounded-full transition-all duration-500 ease-in-out"
            style={{ width: `${progressPercent}%` }}
          ></div>
        </div>
      </div>
    </div>
  );
};

export default AuthCallback;