import { useEffect, useRef, useCallback, useMemo } from 'react';
import { Card } from '../types';

// Store for pending requests
const pendingRequests = new Map<number, {
  resolve: (value: any) => void;
  reject: (error: Error) => void;
  timeout: NodeJS.Timeout;
}>();

let requestIdCounter = 0;

/**
 * Hook to manage the Card Operations Worker
 *
 * Handles CPU-intensive card operations:
 * - Fisher-Yates shuffle algorithm
 * - Card signature generation
 * - Card array transformations
 *
 * Prevents UI stuttering during card operations.
 */
export const useCardOperationsWorker = () => {
  const workerRef = useRef<Worker | null>(null);

  /**
   * Shuffle cards using Fisher-Yates algorithm in worker
   */
  const shuffleCards = useCallback(async (cards: Card[]): Promise<Card[]> => {
    if (!workerRef.current) {
      console.warn('[useCardOperationsWorker] Worker not available, using fallback shuffle');
      // Fallback to synchronous shuffle
      return fisherYatesShuffleFallback(cards);
    }

    const requestId = ++requestIdCounter;

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        pendingRequests.delete(requestId);
        reject(new Error('Shuffle request timed out'));
      }, 5000);

      pendingRequests.set(requestId, { resolve, reject, timeout });

      workerRef.current!.postMessage({
        type: 'SHUFFLE',
        payload: { requestId, cards }
      });
    });
  }, []);

  /**
   * Generate card signature for comparison
   */
  const generateSignature = useCallback(async (cards: any[]): Promise<string> => {
    if (!workerRef.current) {
      console.warn('[useCardOperationsWorker] Worker not available, using fallback signature');
      return generateSignatureFallback(cards);
    }

    const requestId = ++requestIdCounter;

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        pendingRequests.delete(requestId);
        reject(new Error('Signature generation timed out'));
      }, 5000);

      pendingRequests.set(requestId, { resolve, reject, timeout });

      workerRef.current!.postMessage({
        type: 'GENERATE_SIGNATURE',
        payload: { requestId, cards }
      });
    });
  }, []);

  /**
   * Reveal and format cards in one operation
   */
  const revealAndFormatCards = useCallback(async (cards: any[]): Promise<any[]> => {
    if (!workerRef.current) {
      console.warn('[useCardOperationsWorker] Worker not available, using fallback');
      return revealAndFormatFallback(cards);
    }

    const requestId = ++requestIdCounter;

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        pendingRequests.delete(requestId);
        reject(new Error('Reveal and format request timed out'));
      }, 5000);

      pendingRequests.set(requestId, { resolve, reject, timeout });

      workerRef.current!.postMessage({
        type: 'REVEAL_AND_FORMAT',
        payload: { requestId, cards }
      });
    });
  }, []);

  /**
   * Batch multiple operations
   */
  const batchOperations = useCallback(async (operations: any[]): Promise<any> => {
    if (!workerRef.current) {
      console.warn('[useCardOperationsWorker] Worker not available for batch operations');
      return null;
    }

    const requestId = ++requestIdCounter;

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        pendingRequests.delete(requestId);
        reject(new Error('Batch operations timed out'));
      }, 10000);

      pendingRequests.set(requestId, { resolve, reject, timeout });

      workerRef.current!.postMessage({
        type: 'BATCH_OPERATIONS',
        payload: { requestId, operations }
      });
    });
  }, []);

  // Initialize worker
  useEffect(() => {
    try {
      workerRef.current = new Worker('/card-operations-worker.js');

      workerRef.current.onmessage = (event) => {
        const { type, payload } = event.data;

        switch (type) {
          case 'SHUFFLE_COMPLETE': {
            const request = pendingRequests.get(payload.requestId);
            if (request) {
              clearTimeout(request.timeout);
              request.resolve(payload.shuffledCards);
              pendingRequests.delete(payload.requestId);
            }
            break;
          }

          case 'SIGNATURE_COMPLETE': {
            const request = pendingRequests.get(payload.requestId);
            if (request) {
              clearTimeout(request.timeout);
              request.resolve(payload.signature);
              pendingRequests.delete(payload.requestId);
            }
            break;
          }

          case 'REVEAL_AND_FORMAT_COMPLETE': {
            const request = pendingRequests.get(payload.requestId);
            if (request) {
              clearTimeout(request.timeout);
              request.resolve(payload.formattedCards);
              pendingRequests.delete(payload.requestId);
            }
            break;
          }

          case 'BATCH_OPERATIONS_COMPLETE': {
            const request = pendingRequests.get(payload.requestId);
            if (request) {
              clearTimeout(request.timeout);
              request.resolve(payload.results);
              pendingRequests.delete(payload.requestId);
            }
            break;
          }

          case 'ERROR': {
            console.error('[useCardOperationsWorker] Worker error:', payload.error);
            break;
          }

          default:
            console.warn('[useCardOperationsWorker] Unknown message type:', type);
        }
      };

      workerRef.current.onerror = (error) => {
        console.error('[useCardOperationsWorker] Worker error:', error);
      };

      console.log('[useCardOperationsWorker] Worker initialized successfully');
    } catch (error) {
      console.error('[useCardOperationsWorker] Failed to create worker:', error);
    }

    // Cleanup
    return () => {
      if (workerRef.current) {
        workerRef.current.postMessage({ type: 'STOP' });
        workerRef.current.terminate();
        workerRef.current = null;
      }
    };
  }, []);

  return useMemo(() => ({
    shuffleCards,
    generateSignature,
    revealAndFormatCards,
    batchOperations,
    isWorkerAvailable: () => workerRef.current !== null
  }), [shuffleCards, generateSignature, revealAndFormatCards, batchOperations]);
};

// Fallback functions (synchronous)
function fisherYatesShuffleFallback(array: Card[]): Card[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function generateSignatureFallback(cards: any[]): string {
  if (!Array.isArray(cards) || cards.length === 0) {
    return '';
  }
  return cards
    .map(card => `${card.name}-${card.position || 'none'}-${card.isReversed || false}`)
    .sort()
    .join('|');
}

function revealAndFormatFallback(cards: any[]): any[] {
  return cards.map(card => ({
    name: card.name,
    position: card.position || null,
    isReversed: card.isReversed || false,
    revealed: true
  }));
}
