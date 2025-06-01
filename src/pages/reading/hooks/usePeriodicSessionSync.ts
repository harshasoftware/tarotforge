import { useEffect } from 'react';
import { useReadingSessionStore } from '../../../stores/readingSessionStore';

/**
 * @interface UsePeriodicSessionSyncProps
 * @description Props for the `usePeriodicSessionSync` hook.
 * @property {boolean} isSessionReady - Flag indicating if the session is ready and sync operations can begin.
 */
interface UsePeriodicSessionSyncProps {
  isSessionReady: boolean; // Only run when session is ready
}

/**
 * @hook usePeriodicSessionSync
 * @description React hook to periodically synchronize the reading session state.
 * - If in offline mode with a local session ID, it attempts to sync the local session to the database.
 * - If online and a participant (not the host), it fetches the complete session state from the database.
 * This hook helps maintain data consistency, especially for users who might have intermittent connectivity
 * or for participants to get the latest state.
 * This hook does not return any value.
 * Its primary side effect is setting up and clearing an interval for periodic sync operations.
 *
 * @param {UsePeriodicSessionSyncProps} props - The properties for the hook.
 */
export function usePeriodicSessionSync({ isSessionReady }: UsePeriodicSessionSyncProps) {
  const {
    isOfflineMode,
    syncLocalSessionToDatabase,
    syncCompleteSessionState,
    sessionState,
    isHost,
  } = useReadingSessionStore();

  useEffect(() => {
    if (!isSessionReady) {
      console.log('[PeriodicSync] Waiting for session to be ready...');
      return; // Don't run if session isn't ready
    }

    console.log('[PeriodicSync] Setting up periodic sync interval. Offline mode:', isOfflineMode, 'Session ID:', sessionState?.id, 'Is Host:', isHost);

    const syncInterval = setInterval(async () => {
      if (isOfflineMode && sessionState?.id?.startsWith('local_')) {
        console.log('[PeriodicSync] Attempting periodic sync of local session...');
        const synced = await syncLocalSessionToDatabase();
        if (synced) {
          console.log('[PeriodicSync] Periodic sync successful');
          // Consider clearing interval here if syncLocalSessionToDatabase changes session ID
        }
      } else if (sessionState?.id && !isHost && !sessionState.id.startsWith('local_')) {
        console.log('[PeriodicSync] Syncing session state for participant...');
        await syncCompleteSessionState(sessionState.id);
      }
    }, 30000); // Try every 30 seconds

    return () => {
      console.log('[PeriodicSync] Clearing periodic sync interval.');
      clearInterval(syncInterval);
    };
  }, [isSessionReady, isOfflineMode, sessionState?.id, isHost, syncLocalSessionToDatabase, syncCompleteSessionState]);
} 