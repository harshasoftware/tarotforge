import { useEffect } from 'react';
import { useReadingSessionStore } from '../../../stores/readingSessionStore';

interface UsePeriodicSessionSyncProps {
  isSessionReady: boolean; // Only run when session is ready
}

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