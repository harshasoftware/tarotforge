import { useEffect, useRef, useCallback, useMemo } from 'react';
import { Deck } from '../types';

// Store for pending requests
const pendingRequests = new Map<number, {
  resolve: (value: any) => void;
  reject: (error: Error) => void;
  timeout: NodeJS.Timeout;
}>();

let requestIdCounter = 0;

/**
 * Hook to manage the Collection Worker
 *
 * Handles CPU-intensive collection operations:
 * - Deck collection sorting and deduplication
 * - Question cache JSON parsing and cleanup
 * - Coordinate transformations for card placement
 * - Participant data aggregation
 *
 * Prevents UI blocking during data-heavy operations.
 */
export const useCollectionWorker = () => {
  const workerRef = useRef<Worker | null>(null);

  /**
   * Sort decks alphabetically
   */
  const sortDecks = useCallback(async (decks: Deck[]): Promise<Deck[]> => {
    if (!workerRef.current) {
      console.warn('[useCollectionWorker] Worker not available, using fallback sort');
      return sortDecksFallback(decks);
    }

    const requestId = ++requestIdCounter;

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        pendingRequests.delete(requestId);
        reject(new Error('Sort decks request timed out'));
      }, 5000);

      pendingRequests.set(requestId, { resolve, reject, timeout });

      workerRef.current!.postMessage({
        type: 'SORT_DECKS',
        payload: { requestId, decks }
      });
    });
  }, []);

  /**
   * Process deck collection (deduplicate and sort)
   */
  const processDeckCollection = useCallback(async (decks: Deck[]): Promise<Deck[]> => {
    if (!workerRef.current) {
      console.warn('[useCollectionWorker] Worker not available, using fallback');
      return processDeckCollectionFallback(decks);
    }

    const requestId = ++requestIdCounter;

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        pendingRequests.delete(requestId);
        reject(new Error('Process deck collection request timed out'));
      }, 10000);

      pendingRequests.set(requestId, { resolve, reject, timeout });

      workerRef.current!.postMessage({
        type: 'PROCESS_DECK_COLLECTION',
        payload: { requestId, decks }
      });
    });
  }, []);

  /**
   * Parse and clean question cache
   */
  const parseCache = useCallback(async (cacheString: string, todayDateString: string): Promise<any> => {
    if (!workerRef.current) {
      console.warn('[useCollectionWorker] Worker not available, using fallback');
      return parseCacheFallback(cacheString, todayDateString);
    }

    const requestId = ++requestIdCounter;

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        pendingRequests.delete(requestId);
        reject(new Error('Parse cache request timed out'));
      }, 5000);

      pendingRequests.set(requestId, { resolve, reject, timeout });

      workerRef.current!.postMessage({
        type: 'PARSE_CACHE',
        payload: { requestId, cacheString, todayDateString }
      });
    });
  }, []);

  /**
   * Transform viewport coordinates to percentage
   */
  const coordinateTransform = useCallback(async (transformParams: any): Promise<{ x: number; y: number } | null> => {
    if (!workerRef.current) {
      console.warn('[useCollectionWorker] Worker not available');
      return null;
    }

    const requestId = ++requestIdCounter;

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        pendingRequests.delete(requestId);
        reject(new Error('Coordinate transform request timed out'));
      }, 3000);

      pendingRequests.set(requestId, { resolve, reject, timeout });

      workerRef.current!.postMessage({
        type: 'COORDINATE_TRANSFORM',
        payload: { requestId, transformParams }
      });
    });
  }, []);

  /**
   * Batch coordinate transformations
   */
  const batchCoordinateTransform = useCallback(async (transformations: any[], sharedParams: any): Promise<any[]> => {
    if (!workerRef.current) {
      console.warn('[useCollectionWorker] Worker not available');
      return [];
    }

    const requestId = ++requestIdCounter;

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        pendingRequests.delete(requestId);
        reject(new Error('Batch coordinate transform request timed out'));
      }, 10000);

      pendingRequests.set(requestId, { resolve, reject, timeout });

      workerRef.current!.postMessage({
        type: 'BATCH_COORDINATE_TRANSFORM',
        payload: { requestId, transformations, sharedParams }
      });
    });
  }, []);

  /**
   * Aggregate participant decks
   */
  const aggregateParticipantDecks = useCallback(async (participantDecksArray: Deck[][]): Promise<Deck[]> => {
    if (!workerRef.current) {
      console.warn('[useCollectionWorker] Worker not available, using fallback');
      return aggregateParticipantDecksFallback(participantDecksArray);
    }

    const requestId = ++requestIdCounter;

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        pendingRequests.delete(requestId);
        reject(new Error('Aggregate participant decks request timed out'));
      }, 10000);

      pendingRequests.set(requestId, { resolve, reject, timeout });

      workerRef.current!.postMessage({
        type: 'AGGREGATE_PARTICIPANT_DECKS',
        payload: { requestId, participantDecksArray }
      });
    });
  }, []);

  /**
   * Filter participants by criteria
   */
  const filterParticipants = useCallback(async (participants: any[], criteria: any): Promise<any[]> => {
    if (!workerRef.current) {
      console.warn('[useCollectionWorker] Worker not available');
      return participants;
    }

    const requestId = ++requestIdCounter;

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        pendingRequests.delete(requestId);
        reject(new Error('Filter participants request timed out'));
      }, 5000);

      pendingRequests.set(requestId, { resolve, reject, timeout });

      workerRef.current!.postMessage({
        type: 'FILTER_PARTICIPANTS',
        payload: { requestId, participants, criteria }
      });
    });
  }, []);

  /**
   * Sort participants
   */
  const sortParticipants = useCallback(async (participants: any[], sortBy: string = 'name'): Promise<any[]> => {
    if (!workerRef.current) {
      console.warn('[useCollectionWorker] Worker not available');
      return participants;
    }

    const requestId = ++requestIdCounter;

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        pendingRequests.delete(requestId);
        reject(new Error('Sort participants request timed out'));
      }, 5000);

      pendingRequests.set(requestId, { resolve, reject, timeout });

      workerRef.current!.postMessage({
        type: 'SORT_PARTICIPANTS',
        payload: { requestId, participants, sortBy }
      });
    });
  }, []);

  // Initialize worker
  useEffect(() => {
    try {
      workerRef.current = new Worker('/collection-worker.js');

      workerRef.current.onmessage = (event) => {
        const { type, payload } = event.data;

        switch (type) {
          case 'SORT_DECKS_COMPLETE': {
            const request = pendingRequests.get(payload.requestId);
            if (request) {
              clearTimeout(request.timeout);
              request.resolve(payload.sortedDecks);
              pendingRequests.delete(payload.requestId);
            }
            break;
          }

          case 'PROCESS_DECK_COLLECTION_COMPLETE': {
            const request = pendingRequests.get(payload.requestId);
            if (request) {
              clearTimeout(request.timeout);
              request.resolve(payload.processedDecks);
              pendingRequests.delete(payload.requestId);
            }
            break;
          }

          case 'PARSE_CACHE_COMPLETE': {
            const request = pendingRequests.get(payload.requestId);
            if (request) {
              clearTimeout(request.timeout);
              request.resolve({
                validCache: payload.validCache,
                cacheString: payload.cacheString
              });
              pendingRequests.delete(payload.requestId);
            }
            break;
          }

          case 'COORDINATE_TRANSFORM_COMPLETE': {
            const request = pendingRequests.get(payload.requestId);
            if (request) {
              clearTimeout(request.timeout);
              request.resolve(payload.coordinates);
              pendingRequests.delete(payload.requestId);
            }
            break;
          }

          case 'BATCH_COORDINATE_TRANSFORM_COMPLETE': {
            const request = pendingRequests.get(payload.requestId);
            if (request) {
              clearTimeout(request.timeout);
              request.resolve(payload.coordinateResults);
              pendingRequests.delete(payload.requestId);
            }
            break;
          }

          case 'AGGREGATE_PARTICIPANT_DECKS_COMPLETE': {
            const request = pendingRequests.get(payload.requestId);
            if (request) {
              clearTimeout(request.timeout);
              request.resolve(payload.aggregatedDecks);
              pendingRequests.delete(payload.requestId);
            }
            break;
          }

          case 'FILTER_PARTICIPANTS_COMPLETE': {
            const request = pendingRequests.get(payload.requestId);
            if (request) {
              clearTimeout(request.timeout);
              request.resolve(payload.filteredParticipants);
              pendingRequests.delete(payload.requestId);
            }
            break;
          }

          case 'SORT_PARTICIPANTS_COMPLETE': {
            const request = pendingRequests.get(payload.requestId);
            if (request) {
              clearTimeout(request.timeout);
              request.resolve(payload.sortedParticipants);
              pendingRequests.delete(payload.requestId);
            }
            break;
          }

          case 'ERROR': {
            console.error('[useCollectionWorker] Worker error:', payload.error);
            break;
          }

          default:
            console.warn('[useCollectionWorker] Unknown message type:', type);
        }
      };

      workerRef.current.onerror = (error) => {
        console.error('[useCollectionWorker] Worker error:', error);
      };

      console.log('[useCollectionWorker] Worker initialized successfully');
    } catch (error) {
      console.error('[useCollectionWorker] Failed to create worker:', error);
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
    sortDecks,
    processDeckCollection,
    parseCache,
    coordinateTransform,
    batchCoordinateTransform,
    aggregateParticipantDecks,
    filterParticipants,
    sortParticipants,
    isWorkerAvailable: () => workerRef.current !== null
  }), [sortDecks, processDeckCollection, parseCache, coordinateTransform, batchCoordinateTransform, aggregateParticipantDecks, filterParticipants, sortParticipants]);
};

// Fallback functions (synchronous)
function sortDecksFallback(decks: Deck[]): Deck[] {
  return [...decks].sort((a, b) => (a.title || '').localeCompare(b.title || ''));
}

function processDeckCollectionFallback(decks: Deck[]): Deck[] {
  const deckMap = new Map<string, Deck>();
  decks.forEach(deck => {
    if (deck.id && !deckMap.has(deck.id)) {
      deckMap.set(deck.id, deck);
    }
  });
  const deduplicated = Array.from(deckMap.values());
  return sortDecksFallback(deduplicated);
}

function parseCacheFallback(cacheString: string, todayDateString: string): any {
  if (!cacheString) {
    return { validCache: {}, cacheString: '{}' };
  }

  try {
    const parsedCache = JSON.parse(cacheString);
    const validCache: any = {};

    Object.entries(parsedCache).forEach(([category, data]: [string, any]) => {
      if (data && data.date === todayDateString) {
        validCache[category] = data;
      }
    });

    return {
      validCache,
      cacheString: JSON.stringify(validCache)
    };
  } catch (error) {
    console.error('Error parsing cache:', error);
    return { validCache: {}, cacheString: '{}' };
  }
}

function aggregateParticipantDecksFallback(participantDecksArray: Deck[][]): Deck[] {
  const allDecks = participantDecksArray.flat();
  return processDeckCollectionFallback(allDecks);
}
