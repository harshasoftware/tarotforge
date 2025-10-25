import { useEffect, useRef, useCallback } from 'react';
import { useReadingSessionStore } from '../stores/readingSessionStore';
import { ReadingSessionState } from '../stores/readingSessionStore';

// Store for pending update requests
const pendingUpdates = new Map<number, {
  resolve: (value: boolean) => void;
  reject: (error: Error) => void;
  timeout: NodeJS.Timeout;
}>();

let requestIdCounter = 0;

/**
 * Hook to manage the Supabase Database Worker
 *
 * This worker runs independently and handles:
 * 1. Supabase connection health monitoring
 * 2. Database updates (writes)
 * 3. Update queue management
 *
 * It's not throttled when the tab is hidden, making it more reliable
 * than main thread code.
 */
export const useSupabaseHealthWorker = (sessionId: string | null) => {
  const workerRef = useRef<Worker | null>(null);
  const setSupabaseReady = useReadingSessionStore(state => state.setSupabaseReady);

  /**
   * Send database update request to worker
   * Returns a promise that resolves when the worker confirms success
   */
  const sendDatabaseUpdate = useCallback(async (
    targetSessionId: string,
    updates: Partial<ReadingSessionState>,
    userInfo?: any
  ): Promise<boolean> => {
    if (!workerRef.current) {
      console.error('[useSupabaseHealthWorker] Worker not available for database update');
      return false;
    }

    const requestId = ++requestIdCounter;

    console.log('[useSupabaseHealthWorker] Sending database update to worker:', {
      requestId,
      sessionId: targetSessionId,
      updates
    });

    return new Promise((resolve, reject) => {
      // Set timeout for request (30 seconds)
      const timeout = setTimeout(() => {
        pendingUpdates.delete(requestId);
        reject(new Error('Database update request timed out'));
      }, 30000);

      // Store promise handlers
      pendingUpdates.set(requestId, { resolve, reject, timeout });

      // Send to worker
      workerRef.current!.postMessage({
        type: 'DATABASE_UPDATE',
        payload: {
          requestId,
          sessionId: targetSessionId,
          updates,
          userInfo
        }
      });
    });
  }, []);

  // Expose sendDatabaseUpdate globally so store can use it
  useEffect(() => {
    if (workerRef.current) {
      (window as any).__workerDatabaseUpdate = sendDatabaseUpdate;
    }
    return () => {
      delete (window as any).__workerDatabaseUpdate;
    };
  }, [sendDatabaseUpdate]);

  useEffect(() => {
    // Only initialize worker for database sessions
    if (!sessionId || sessionId.startsWith('local_')) {
      console.log('[useSupabaseHealthWorker] Skipping worker - local session');
      return;
    }

    console.log('[useSupabaseHealthWorker] Initializing worker for session:', sessionId);

    // Create worker
    try {
      workerRef.current = new Worker('/supabase-health-worker.js');

      // Listen for messages from worker
      workerRef.current.onmessage = (event) => {
        const { type, payload } = event.data;

        console.log('[useSupabaseHealthWorker] Message from worker:', type, payload);

        switch (type) {
          case 'READY_STATUS':
            // Update store with ready status
            setSupabaseReady(payload.isReady);
            break;

          case 'DATABASE_UPDATE_SUCCESS':
            // Database update succeeded in worker
            console.log('[useSupabaseHealthWorker] Database update succeeded:', payload.requestId);

            const successRequest = pendingUpdates.get(payload.requestId);
            if (successRequest) {
              clearTimeout(successRequest.timeout);
              successRequest.resolve(true);
              pendingUpdates.delete(payload.requestId);
            }
            break;

          case 'DATABASE_UPDATE_FAILED':
            // Database update failed in worker
            console.error('[useSupabaseHealthWorker] Database update failed:', payload);

            const failedRequest = pendingUpdates.get(payload.requestId);
            if (failedRequest) {
              clearTimeout(failedRequest.timeout);
              failedRequest.reject(new Error(payload.error || 'Database update failed'));
              pendingUpdates.delete(payload.requestId);
            }
            break;

          default:
            console.warn('[useSupabaseHealthWorker] Unknown message type from worker:', type);
        }
      };

      workerRef.current.onerror = (error) => {
        console.error('[useSupabaseHealthWorker] Worker error:', error);
      };

      // Initialize worker with Supabase credentials
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      workerRef.current.postMessage({
        type: 'INIT',
        payload: {
          supabaseUrl,
          supabaseKey,
          sessionId
        }
      });

      // Listen for visibility changes
      const handleVisibilityChange = () => {
        if (workerRef.current) {
          workerRef.current.postMessage({
            type: 'VISIBILITY_CHANGE',
            payload: {
              isHidden: document.hidden
            }
          });
        }
      };

      document.addEventListener('visibilitychange', handleVisibilityChange);

      console.log('[useSupabaseHealthWorker] Worker initialized successfully');

      // Cleanup
      return () => {
        console.log('[useSupabaseHealthWorker] Cleaning up worker');

        document.removeEventListener('visibilitychange', handleVisibilityChange);

        if (workerRef.current) {
          workerRef.current.postMessage({ type: 'STOP' });
          workerRef.current.terminate();
          workerRef.current = null;
        }
      };
    } catch (error) {
      console.error('[useSupabaseHealthWorker] Failed to create worker:', error);
      // Fallback: mark as ready to avoid blocking
      setSupabaseReady(true);
    }
  }, [sessionId, setSupabaseReady]);

  // Update worker when session changes
  useEffect(() => {
    if (workerRef.current && sessionId && !sessionId.startsWith('local_')) {
      console.log('[useSupabaseHealthWorker] Updating worker session to:', sessionId);
      workerRef.current.postMessage({
        type: 'SESSION_UPDATE',
        payload: { sessionId }
      });
    }
  }, [sessionId]);

  return workerRef;
};
