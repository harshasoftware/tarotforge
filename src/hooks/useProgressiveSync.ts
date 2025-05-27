import { useState, useEffect, useRef } from 'react';
import { useCollaborativeStore } from '../stores/collaborativeSessionStore';

export type SyncStage = 'critical' | 'view' | 'presence' | 'full' | 'complete';

interface ProgressiveSyncOptions {
  sessionId: string;
  accessMethod?: 'direct' | 'invite' | 'reader';
  onStageComplete?: (stage: SyncStage) => void;
  onError?: (error: Error) => void;
}

interface ProgressiveSyncState {
  stage: SyncStage;
  isLoading: boolean;
  error: Error | null;
  progress: number; // 0-100
}

export function useProgressiveSync({
  sessionId,
  accessMethod = 'direct',
  onStageComplete,
  onError
}: ProgressiveSyncOptions) {
  const [state, setState] = useState<ProgressiveSyncState>({
    stage: 'critical',
    isLoading: true,
    error: null,
    progress: 0
  });

  const mountedRef = useRef(true);
  const { joinSession, syncStage } = useCollaborativeStore();

  useEffect(() => {
    mountedRef.current = true;
    
    const performProgressiveSync = async () => {
      try {
        setState(prev => ({ ...prev, isLoading: true, error: null }));

        // Join session with progressive loading
        const result = await joinSession(sessionId, accessMethod);
        
        if (!result) {
          throw new Error('Failed to join session');
        }

        // The store handles the progressive loading internally
        // We just track the progress here
        
      } catch (error) {
        if (mountedRef.current) {
          const err = error instanceof Error ? error : new Error('Unknown sync error');
          setState(prev => ({ ...prev, error: err, isLoading: false }));
          onError?.(err);
        }
      }
    };

    performProgressiveSync();

    return () => {
      mountedRef.current = false;
    };
  }, [sessionId, accessMethod]);

  // Track sync stage changes from store
  useEffect(() => {
    if (!syncStage) return;

    const progressMap: Record<SyncStage, number> = {
      critical: 25,
      view: 50,
      presence: 75,
      full: 90,
      complete: 100
    };

    setState(prev => ({
      ...prev,
      stage: syncStage as SyncStage,
      progress: progressMap[syncStage as SyncStage] || 0,
      isLoading: syncStage !== 'complete'
    }));

    // Call stage complete callback
    onStageComplete?.(syncStage as SyncStage);

    // Mark as complete after full sync
    if (syncStage === 'full') {
      setTimeout(() => {
        if (mountedRef.current) {
          setState(prev => ({
            ...prev,
            stage: 'complete',
            progress: 100,
            isLoading: false
          }));
          onStageComplete?.('complete');
        }
      }, 500);
    }
  }, [syncStage, onStageComplete]);

  return state;
} 