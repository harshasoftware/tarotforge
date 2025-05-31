import { useEffect } from 'react';
import { useReadingSessionStore } from '../../../stores/readingSessionStore';

interface UseSessionManagementProps {
  shouldCreateSession: boolean;
  joinSessionId: string | null;
  deckIdFromParams: string | undefined;
  onSessionError: (message: string) => void;
  isAnonymousAuthReady: boolean;
}

export function useSessionManagement({
  shouldCreateSession,
  joinSessionId,
  deckIdFromParams,
  onSessionError,
  isAnonymousAuthReady
}: UseSessionManagementProps) {
  const { 
    createSession,
    setInitialSessionId,
    setDeckId,
    initializeSession,
    sessionState, 
  } = useReadingSessionStore();

  useEffect(() => {
    if (!isAnonymousAuthReady) {
      console.log('[SessionManagement] Waiting for anonymous auth to be ready...');
      return; 
    }

    const initSessionLogic = async () => {
      console.log('[SessionManagement] Running session initialization. Params:', 
        { shouldCreateSession, joinSessionId, deckIdFromParams });
      try {
        if (shouldCreateSession) {
          console.log('[SessionManagement] Attempting to create new session...');
          const newSessionId = await createSession(); // createSession should call setInitialSessionId
          if (newSessionId) {
            const currentPath = window.location.pathname;
            // Ensure deckIdFromParams is used if available, otherwise it might get lost from URL
            const baseUrl = deckIdFromParams ? `/reading-room/${deckIdFromParams}` : '/reading-room';
            const newUrl = `${baseUrl}?join=${newSessionId}`;
            window.history.replaceState({}, '', newUrl);
            console.log('[SessionManagement] New session created and URL updated:', newSessionId);
            // No need to call setDeckId here, createSession or initializeSession should handle defaults
          } else {
            onSessionError('Failed to create reading room session. Please try again.');
            return; 
          }
        } else {
          // If not creating, set initial ID from join link (could be null)
          // This allows initializeSession to decide: join, resume last, or start fresh scenario.
          setInitialSessionId(joinSessionId); 
          console.log('[SessionManagement] Initial session ID set for initializeSession():', joinSessionId);
        }

        // Set deckId *before* calling initializeSession if not creating a new one.
        // If creating, createSession might handle this. If joining, initializeSession might load deck from session.
        // This ensures if it's a totally new context (no join, no create), deckId is available.
        if (!shouldCreateSession) {
             setDeckId(deckIdFromParams || 'rider-waite-classic'); 
             console.log('[SessionManagement] Deck ID set for initializeSession():', deckIdFromParams || 'rider-waite-classic');
        }
       
        // initializeSession is the main orchestrator for loading/setting up the session state
        // based on initialSessionId (which might be null) and deckId.
        await initializeSession(); 
        console.log('[SessionManagement] initializeSession() has been called.');

      } catch (error) {
        console.error('[SessionManagement] Error during session initialization logic:', error);
        onSessionError('Failed to initialize session. Please try again.');
      }
    };

    initSessionLogic();
    
  }, [
    isAnonymousAuthReady, 
    shouldCreateSession, 
    joinSessionId, 
    deckIdFromParams,
    // Store actions are dependencies as they are part of the hook's operations
    createSession, 
    setInitialSessionId, 
    setDeckId, 
    initializeSession, 
    onSessionError
  ]);

  // The session is considered ready if the sessionState from the store has an ID.
  // This ID would be set by either createSession or initializeSession.
  return { isSessionReady: !!sessionState?.id };
} 