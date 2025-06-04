import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { AlertCircle } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import MagicWandLoader from '../../components/ui/MagicWandLoader';

const AuthCallback = () => {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [processingStep, setProcessingStep] = useState<string>('Whispers from the Ether: Awakening Your Connection...');
  const [loading, setLoading] = useState(false);
  const [progressPercent, setProgressPercent] = useState<number>(10); // Start with a small initial progress
  
  useEffect(() => {
    switch (processingStep) {
      case 'Whispers from the Ether: Awakening Your Connection...':
        setProgressPercent(10);
        break;
      case 'Celestial Alignment: Confirming Your Star Chart...': // Google verify
      case 'The Scribe\'s Scroll: Inscribing Your Essence...': // Email upgrade setup
        setProgressPercent(30);
        break;
      case 'The Weaver\'s Loom: Crafting Your Astral Form...': // Google Link create account
        setProgressPercent(60);
        break;
      case 'Ancient Scrolls Unfurl: Transcribing Your Journey...': // Migration step
        setProgressPercent(80);
        break;
      case 'The Veil Thins: Your Path is Illuminated!': // Completion
        setProgressPercent(100);
        break;
      default:
        setProgressPercent(10); 
    }
  }, [processingStep]);
  
  // Handle auth callback
  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        setLoading(true);
        const { handleGoogleRedirect } = useAuthStore.getState();
        const result = await handleGoogleRedirect();
        
        if (result.error) {
          console.error('Auth callback error:', result.error);
          setError('Authentication failed. Please try again.');
          return;
        }
        
        // Check for pending migration from anonymous user
        const pendingMigration = localStorage.getItem('pending_migration');
        if (pendingMigration) {
          try {
            const { fromUserId, email } = JSON.parse(pendingMigration);
            const { user } = useAuthStore.getState();
            
            if (user && user.email === email) {
              console.log('🔄 Performing pending data migration');
              const { migrateAnonymousUserData } = useAuthStore.getState();
              await migrateAnonymousUserData(fromUserId, user.id);
              
              localStorage.removeItem('pending_migration');
              console.log('✅ Data migration completed successfully');
            }
          } catch (migrationError) {
            console.error('❌ Error during data migration:', migrationError);
            // Don't block the auth flow even if migration fails
          }
        }
        
        // Check for pending email upgrade confirmation
        const pendingEmailUpgrade = localStorage.getItem('pending_email_upgrade');
        if (pendingEmailUpgrade) {
          try {
            const { anonymousUserId, newUserId, email } = JSON.parse(pendingEmailUpgrade);
            const { user } = useAuthStore.getState();
            
            console.log('🔗 Completing email upgrade confirmation');
            console.log('📧 Upgrading from anonymous user:', anonymousUserId, 'to email user:', newUserId);
            
            if (user && user.email === email && user.id === newUserId) {
              setProcessingStep('The Scribe\'s Scroll: Inscribing Your Essence...');
              
              // Create user profile in users table (transition from anonymous_users)
              const { error: insertError } = await supabase
                .from('users')
                .insert({
                  id: user.id,
                  email: email,
                  username: email.split('@')[0],
                  created_at: new Date().toISOString()
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
                await migrateAnonymousUserData(anonymousUserId, user.id);
                console.log('✅ Anonymous user data migrated successfully');
              } catch (migrationError) {
                console.error('❌ Error migrating anonymous user data:', migrationError);
                // Don't block the auth flow even if migration fails
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
              
              // Clean up backup session since upgrade was successful
              localStorage.removeItem('backup_anonymous_session');
              localStorage.removeItem('pending_email_upgrade');
              
              console.log('✅ Email upgrade completed successfully');
              setProcessingStep('The Veil Thins: Your Path is Illuminated!');
            
            // Force refresh the auth state
              const { checkAuth } = useAuthStore.getState();
            await checkAuth();
              
              // Restore session context if it was preserved
              const sessionContext = localStorage.getItem('auth_session_context');
              if (sessionContext) {
                try {
                  const { sessionId, participantId, isHost, sessionState: preservedSessionState } = JSON.parse(sessionContext);
                  console.log('🔄 Restoring session context after email upgrade:', { sessionId, participantId, isHost, hasPreservedState: !!preservedSessionState });
                  
                  // Import and update the session store with preserved context
                  const { useReadingSessionStore } = await import('../../stores/readingSessionStore');
                  const sessionStore = useReadingSessionStore.getState();
                  
                  // Update session store with preserved participant ID and context
                  sessionStore.setInitialSessionId(sessionId);
                  
                  // IMPORTANT: Wait for participant migration to complete in database
                  // This prevents race conditions where ReadingRoom tries to join before migration is done
                  console.log('⏳ Waiting for participant migration to sync in database...');
                  
                  // Add a delay to ensure database has time to process the migration
                  await new Promise(resolve => setTimeout(resolve, 2000));
                  
                  // Verify the participant migration is complete by checking if we can find the migrated participant
                  let verifiedParticipantId = participantId;
                  try {
                    const { supabase } = await import('../../lib/supabase');
                    const { data: migratedParticipant, error: selectError } = await supabase
                      .from('session_participants')
                      .select('id')
                      .eq('session_id', sessionId)
                      .eq('user_id', user.id)
                      .eq('is_active', true)
                      .single();
                      
                    if (selectError) {
                      console.error('Error selecting participant during verification:', selectError);
                    }
                    
                    if (migratedParticipant) {
                      console.log('✅ Participant migration verified in database:', migratedParticipant.id);
                      verifiedParticipantId = migratedParticipant.id;
                    } else {
                      console.log('⚠️ Migrated participant not found yet, session restoration may create duplicates');
                    }
                  } catch (verifyError) {
                    console.warn('Could not verify participant migration:', verifyError);
                  }
                  
                  // If we have preserved session state, restore it
                  if (preservedSessionState) {
                    console.log('🔄 Restoring complete session state:', {
                      readingStep: preservedSessionState.readingStep,
                      selectedCardsCount: preservedSessionState.selectedCards?.length || 0,
                      hasQuestion: !!preservedSessionState.question,
                      hasSelectedLayout: !!preservedSessionState.selectedLayout
                    });
                    
                    // Store the preserved state for restoration after session initialization
                    localStorage.setItem('preserved_session_state', JSON.stringify(preservedSessionState));
                  }
                  
                  // Mark session as restored with a flag indicating it's ready
                  localStorage.setItem('session_context_restored', JSON.stringify({
                    sessionId,
                    participantId: verifiedParticipantId,
                    isHost,
                    preserveState: true,
                    migrationComplete: true, // Add flag to indicate migration is done
                    timestamp: Date.now()
                  }));
                  
                  // Update the URL to reflect the restored session if we're going back to reading room
                  const returnPath = localStorage.getItem('auth_return_path');
                  if (returnPath && returnPath.includes('/reading-room')) {
                    // Extract deck ID from return path if present
                    const deckMatch = returnPath.match(/\/reading-room\/([^?]+)/);
                    const deckId = deckMatch ? deckMatch[1] : '';
                    
                    // Construct the correct URL with the restored session
                    const newPath = deckId ? `/reading-room/${deckId}?join=${sessionId}` : `/reading-room?join=${sessionId}`;
                    
                    // Update the return path to use the restored session
                    localStorage.setItem('auth_return_path', newPath);
                    console.log('📍 Updated return path to use restored session:', newPath);
                  }
                  
                  localStorage.removeItem('auth_session_context');
                  console.log('✅ Session context restored with migration complete flag');
                } catch (contextError) {
                  console.warn('Could not restore session context:', contextError);
                  localStorage.removeItem('auth_session_context');
                }
              }
            }
          } catch (emailUpgradeError) {
            console.error('❌ Error completing email upgrade:', emailUpgradeError);
            
            // Attempt to restore anonymous session if upgrade failed
            console.log('🔄 Attempting to restore anonymous session...');
            try {
              const { restoreAnonymousSession } = useAuthStore.getState();
              const restoreResult = await restoreAnonymousSession();
              
              if (!restoreResult.error) {
                console.log('✅ Anonymous session restored after failed email upgrade');
                setError('Email confirmation failed, but your anonymous session has been restored.');
              } else {
                console.error('❌ Could not restore anonymous session:', restoreResult.error);
                setError('Email confirmation failed. Please try again or continue as a guest.');
              }
            } catch (restoreError) {
              console.error('❌ Error during session restoration:', restoreError);
              setError('Email confirmation failed. Please try again or continue as a guest.');
            }
            
            // Clean up
            localStorage.removeItem('pending_email_upgrade');
            return;
          }
        }
        
        // Check if this is an anonymous user who just linked with Google
        const pendingGoogleLink = localStorage.getItem('pending_google_link');
        
        if (pendingGoogleLink) {
          try {
            const anonymousUserId = pendingGoogleLink;
            console.log('🔗 Completing Google upgrade for anonymous user:', anonymousUserId);
            
            setProcessingStep('Celestial Alignment: Confirming Your Star Chart...');
            
            // Get the actual session to check if we have updated user info
            const { data: { session }, error: sessionError } = await supabase.auth.getSession();
            
            if (sessionError) {
              console.error('❌ Error getting session:', sessionError);
              throw sessionError;
            }
            
            if (!session?.user) {
              console.error('❌ No session user found after OAuth');
              throw new Error('OAuth session not found');
            }
            
            console.log('🔍 Session user info:', {
              email: session.user.email,
              userMetadata: session.user.user_metadata,
              identities: session.user.identities?.length,
              userId: session.user.id
            });
            
            const userEmail = session.user.email;
            const userMetadata = session.user.user_metadata || {};
            
            if (!userEmail) {
              console.error('❌ No email found after Google authentication');
              throw new Error('Google authentication failed - no email found');
            }
            
            // ✅ Google auth successful - now safe to proceed with upgrade
            setProcessingStep('The Weaver\'s Loom: Crafting Your Astral Form...');
            
            // Create user profile in users table (transition from anonymous_users)
            const { error: insertError } = await supabase
              .from('users')
              .insert({
                id: session.user.id, // Use session user ID
                email: userEmail,
                username: userMetadata.preferred_username || userEmail.split('@')[0],
                created_at: new Date().toISOString()
              });
              
            if (insertError) {
              console.warn('Could not create user profile:', insertError);
            } else {
              console.log('✅ Created user profile successfully');
            }
            
            // Migrate anonymous user data (reading sessions, decks, etc.)
            setProcessingStep('Ancient Scrolls Unfurl: Transcribing Your Journey...');
            try {
              const { migrateAnonymousUserData } = useAuthStore.getState();
              await migrateAnonymousUserData(anonymousUserId, session.user.id);
              console.log('✅ Anonymous user data migrated successfully');
            } catch (migrationError) {
              console.error('❌ Error migrating anonymous user data:', migrationError);
              // Don't block the auth flow even if migration fails
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
            
            // Clean up backup session since upgrade was successful
            localStorage.removeItem('backup_anonymous_session');
            localStorage.removeItem('pending_google_link');
            
            console.log('✅ Google upgrade completed successfully');
            setProcessingStep('The Veil Thins: Your Path is Illuminated!');
            
            // Force refresh the auth state to pick up the new user profile
            const { checkAuth } = useAuthStore.getState();
            await checkAuth();
            
            // Restore session context if it was preserved
            const sessionContext = localStorage.getItem('auth_session_context');
            if (sessionContext) {
              try {
                const { sessionId, participantId, isHost, sessionState: preservedSessionState } = JSON.parse(sessionContext);
                console.log('🔄 Restoring session context after Google upgrade:', { sessionId, participantId, isHost, hasPreservedState: !!preservedSessionState });
                
                // Import and update the session store with preserved context
                const { useReadingSessionStore } = await import('../../stores/readingSessionStore');
                const sessionStore = useReadingSessionStore.getState();
                
                // Update session store with preserved participant ID and context
                sessionStore.setInitialSessionId(sessionId);
                
                // IMPORTANT: Wait for participant migration to complete in database
                // This prevents race conditions where ReadingRoom tries to join before migration is done
                console.log('⏳ Waiting for participant migration to sync in database...');
                
                // Add a delay to ensure database has time to process the migration
                await new Promise(resolve => setTimeout(resolve, 2000));
                
                // Verify the participant migration is complete by checking if we can find the migrated participant
                let verifiedParticipantId = participantId;
                try {
                  const { supabase } = await import('../../lib/supabase');
                  const { data: migratedParticipant, error: selectError } = await supabase
                    .from('session_participants')
                    .select('id')
                    .eq('session_id', sessionId)
                    .eq('user_id', session.user.id)
                    .eq('is_active', true)
                    .single();
                    
                  if (selectError) {
                    console.error('Error selecting participant during verification:', selectError);
                  }
                    
                  if (migratedParticipant) {
                    console.log('✅ Participant migration verified in database:', migratedParticipant.id);
                    verifiedParticipantId = migratedParticipant.id;
                  } else {
                    console.log('⚠️ Migrated participant not found yet, session restoration may create duplicates');
                  }
                } catch (verifyError) {
                  console.warn('Could not verify participant migration:', verifyError);
                }
                
                // If we have preserved session state, restore it
                if (preservedSessionState) {
                  console.log('🔄 Restoring complete session state:', {
                    readingStep: preservedSessionState.readingStep,
                    selectedCardsCount: preservedSessionState.selectedCards?.length || 0,
                    hasQuestion: !!preservedSessionState.question,
                    hasSelectedLayout: !!preservedSessionState.selectedLayout
                  });
                  
                  // Store the preserved state for restoration after session initialization
                  localStorage.setItem('preserved_session_state', JSON.stringify(preservedSessionState));
                }
                
                // Mark session as restored with a flag indicating it's ready
                localStorage.setItem('session_context_restored', JSON.stringify({
                  sessionId,
                  participantId: verifiedParticipantId,
                  isHost,
                  preserveState: true,
                  migrationComplete: true, // Add flag to indicate migration is done
                  timestamp: Date.now()
                }));
                
                // Update the URL to reflect the restored session if we're going back to reading room
                const returnPath = localStorage.getItem('auth_return_path');
                if (returnPath && returnPath.includes('/reading-room')) {
                  // Extract deck ID from return path if present
                  const deckMatch = returnPath.match(/\/reading-room\/([^?]+)/);
                  const deckId = deckMatch ? deckMatch[1] : '';
                  
                  // Construct the correct URL with the restored session
                  const newPath = deckId ? `/reading-room/${deckId}?join=${sessionId}` : `/reading-room?join=${sessionId}`;
                  
                  // Update the return path to use the restored session
                  localStorage.setItem('auth_return_path', newPath);
                  console.log('📍 Updated return path to use restored session:', newPath);
                }
                
                localStorage.removeItem('auth_session_context');
                console.log('✅ Session context restored with migration complete flag');
              } catch (contextError) {
                console.warn('Could not restore session context:', contextError);
                localStorage.removeItem('auth_session_context');
              }
            }
            
          } catch (linkError) {
            console.error('❌ Error completing Google upgrade:', linkError);
            
            // Attempt to restore anonymous session if upgrade failed
            console.log('🔄 Attempting to restore anonymous session...');
            try {
              const { restoreAnonymousSession } = useAuthStore.getState();
              const restoreResult = await restoreAnonymousSession();
              
              if (!restoreResult.error) {
                console.log('✅ Anonymous session restored after failed Google upgrade');
                setError('Google sign-in failed, but your anonymous session has been restored.');
              } else {
                console.error('❌ Could not restore anonymous session:', restoreResult.error);
                setError('Google sign-in failed. Please try again or continue as a guest.');
              }
            } catch (restoreError) {
              console.error('❌ Error during session restoration:', restoreError);
              setError('Google sign-in failed. Please try again or continue as a guest.');
            }
            
            // Clean up
            localStorage.removeItem('pending_google_link');
            return;
          }
        }
        
        // Get the return path
        const { user } = useAuthStore.getState();
        const returnPath = localStorage.getItem('auth_return_path');
        if (returnPath) {
          localStorage.removeItem('auth_return_path');
          navigate(returnPath);
        } else {
          // Default redirect based on user type
          if (user?.is_creator) {
            navigate('/create-deck');
          } else {
            navigate('/');
          }
        }
      } catch (error) {
        console.error('Callback error:', error);
        setError('Authentication failed. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    
    handleAuthCallback();
  }, [navigate]);
  
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="bg-card border border-border rounded-lg p-6 max-w-md w-full text-center">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h2 className="text-2xl font-serif mb-2">Authentication Error</h2>
          <p className="text-muted-foreground mb-6">{error}</p>
          <p className="text-sm text-muted-foreground">Redirecting you to login...</p>
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