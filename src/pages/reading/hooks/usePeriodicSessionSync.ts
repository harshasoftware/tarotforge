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

  const syncInProgress = useRef(false);

  useEffect(() => {
    if (!isSessionReady) {
      return; // Don't run if session isn't ready
    }

    const syncInterval = setInterval(async () => {
      if (syncInProgress.current) {
        console.log('[PeriodicSync] Sync already in progress, skipping...');
        return;
      }
      syncInProgress.current = true;

      try {
        if (isOfflineMode && sessionState?.id?.startsWith('local_')) {
          const synced = await syncLocalSessionToDatabase();
          // You might clear the interval here if the ID changes
        } else if (sessionState?.id && !isHost && !sessionState.id.startsWith('local_')) {
          await syncCompleteSessionState(sessionState.id);
        }
      } catch (error) {
        console.error('[PeriodicSync] Sync operation failed:', error);
      } finally {
        syncInProgress.current = false;
      }
    }, 30000); // Try every 30 seconds

    return () => {
      clearInterval(syncInterval);
      syncInProgress.current = false;
    };
  }, [isSessionReady]); // Narrowed to avoid unnecessary re-runs
}