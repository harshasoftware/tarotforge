import { useEffect } from 'react';
import { useReadingSessionStore } from '../../../stores/readingSessionStore';

/**
 * @interface UseSessionManagementProps
 * @description Props for the `useSessionManagement` hook.
 * @property {boolean} shouldCreateSession - Flag indicating whether a new session should be created.
 * @property {string | null} joinSessionId - The ID of a session to join, if provided in the URL.
 * @property {string | undefined} deckIdFromParams - The ID of the deck to use, if provided in the URL.
 * @property {function(message: string): void} onSessionError - Callback function to handle session-related errors.
 * @property {boolean} isAnonymousAuthReady - Flag indicating if anonymous authentication is complete and ready.
 */
interface UseSessionManagementProps {
  shouldCreateSession: boolean;
  joinSessionId: string | null;
  deckIdFromParams: string | undefined;
  onSessionError: (message: string) => void;
  isAnonymousAuthReady: boolean;
}

/**
 * @hook useSessionManagement
 * @description React hook to manage the lifecycle of a reading session.
 * It handles creating a new session or joining/resuming an existing one based on URL parameters and anonymous authentication status.
 * It interacts with the `useReadingSessionStore` to update and manage session state.
 * A key side effect is updating the browser's URL history using `window.history.replaceState`
 * when a new session is created, to include the new session ID in the URL.
 *
 * @param {UseSessionManagementProps} props - The properties for the hook.
 * @returns {{ isSessionReady: boolean }} An object indicating whether the session is ready.
 * @property {boolean} isSessionReady - True if the session has been successfully initialized (i.e., has an ID).
 */
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