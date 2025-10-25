/**
 * Collection Worker
 *
 * Handles CPU-intensive collection operations:
 * 1. Deck collection sorting and deduplication
 * 2. Question cache JSON parsing and cleanup
 * 3. Coordinate transformations for card placement
 * 4. Participant data aggregation
 *
 * This worker prevents UI blocking during data-heavy operations.
 */

console.log('[CollectionWorker] Collection Worker initialized');

/**
 * Sort decks alphabetically by title
 * Uses locale-aware string comparison
 */
function sortDecks(decks) {
  if (!Array.isArray(decks)) {
    return [];
  }

  return [...decks].sort((a, b) => {
    const titleA = a.title || '';
    const titleB = b.title || '';
    return titleA.localeCompare(titleB);
  });
}

/**
 * Deduplicate deck collection using Map
 * Keeps first occurrence of each unique deck ID
 */
function deduplicateDecks(decks) {
  if (!Array.isArray(decks)) {
    return [];
  }

  const deckMap = new Map();
  decks.forEach(deck => {
    if (deck.id && !deckMap.has(deck.id)) {
      deckMap.set(deck.id, deck);
    }
  });

  return Array.from(deckMap.values());
}

/**
 * Sort and deduplicate decks in one operation
 * More efficient than two separate passes
 */
function processDeckCollection(decks) {
  const deduplicated = deduplicateDecks(decks);
  const sorted = sortDecks(deduplicated);
  return sorted;
}

/**
 * Parse and clean question cache
 * Validates dates and removes stale entries
 */
function parseAndCleanCache(cacheString, todayDateString) {
  if (!cacheString || typeof cacheString !== 'string') {
    return {};
  }

  try {
    const parsedCache = JSON.parse(cacheString);
    const validCache = {};

    // Filter out stale cache entries
    Object.entries(parsedCache).forEach(([category, data]) => {
      if (data && data.date === todayDateString) {
        validCache[category] = data;
      }
    });

    return validCache;
  } catch (error) {
    console.error('[CollectionWorker] Error parsing cache:', error);
    return {};
  }
}

/**
 * Viewport to percentage coordinate transformation
 * Complex geometric calculation for card placement in free-layout
 */
function viewportToPercentage(params) {
  const {
    viewportX,
    viewportY,
    containerRect,
    currentZoomLevel,
    currentPanOffset,
    currentZoomFocus
  } = params;

  if (!containerRect || currentZoomLevel === 0) {
    console.error('[CollectionWorker] Invalid viewportToPercentage args');
    return null;
  }

  const relativeX = viewportX - containerRect.left;
  const relativeY = viewportY - containerRect.top;
  const xAfterZoomAndOriginOffset = relativeX - currentPanOffset.x;
  const yAfterZoomAndOriginOffset = relativeY - currentPanOffset.y;
  const originalContainerWidth = containerRect.width / currentZoomLevel;
  const originalContainerHeight = containerRect.height / currentZoomLevel;

  if (originalContainerWidth === 0 || originalContainerHeight === 0) {
    console.error('[CollectionWorker] Original container dimension is zero');
    return null;
  }

  let originX_px = originalContainerWidth / 2;
  let originY_px = originalContainerHeight / 2;

  if (currentZoomFocus) {
    originX_px = (currentZoomFocus.x / 100) * originalContainerWidth;
    originY_px = (currentZoomFocus.y / 100) * originalContainerHeight;
  }

  const originalContentX = originX_px + (xAfterZoomAndOriginOffset - originX_px) / currentZoomLevel;
  const originalContentY = originY_px + (yAfterZoomAndOriginOffset - originY_px) / currentZoomLevel;

  let percX = (originalContentX / originalContainerWidth) * 100;
  let percY = (originalContentY / originalContainerHeight) * 100;

  // Apply constraints
  percX = Math.max(5, Math.min(95, percX));
  percY = Math.max(5, Math.min(95, percY));

  return { x: percX, y: percY };
}

/**
 * Batch coordinate transformations
 * Process multiple card placements in one go
 */
function batchCoordinateTransformations(transformations, sharedParams) {
  return transformations.map(({ viewportX, viewportY }) => {
    return viewportToPercentage({
      viewportX,
      viewportY,
      ...sharedParams
    });
  });
}

/**
 * Aggregate participant decks
 * Combines decks from multiple participants and deduplicates
 */
function aggregateParticipantDecks(participantDecksArray) {
  if (!Array.isArray(participantDecksArray)) {
    return [];
  }

  // Flatten all deck arrays into one
  const allDecks = participantDecksArray.flat();

  // Process collection (deduplicate and sort)
  return processDeckCollection(allDecks);
}

/**
 * Filter participants by criteria
 */
function filterParticipants(participants, criteria) {
  if (!Array.isArray(participants)) {
    return [];
  }

  return participants.filter(participant => {
    if (criteria.isActive !== undefined && participant.is_active !== criteria.isActive) {
      return false;
    }
    if (criteria.hasUserId !== undefined) {
      const hasUserId = !!participant.userId || !!participant.user_id;
      if (hasUserId !== criteria.hasUserId) {
        return false;
      }
    }
    if (criteria.role && participant.role !== criteria.role) {
      return false;
    }
    return true;
  });
}

/**
 * Sort participants by various criteria
 */
function sortParticipants(participants, sortBy = 'name') {
  if (!Array.isArray(participants)) {
    return [];
  }

  return [...participants].sort((a, b) => {
    switch (sortBy) {
      case 'name':
        return (a.name || '').localeCompare(b.name || '');
      case 'joinedAt':
        return new Date(a.created_at || 0) - new Date(b.created_at || 0);
      case 'lastSeen':
        return new Date(b.last_seen_at || 0) - new Date(a.last_seen_at || 0);
      default:
        return 0;
    }
  });
}

// Listen for messages from main thread
self.addEventListener('message', (event) => {
  const { type, payload } = event.data;

  console.log('[CollectionWorker] Received message:', type);

  try {
    switch (type) {
      case 'SORT_DECKS': {
        const { requestId, decks } = payload;
        console.log('[CollectionWorker] Sorting', decks.length, 'decks');

        const startTime = performance.now();
        const sorted = sortDecks(decks);
        const duration = performance.now() - startTime;

        console.log('[CollectionWorker] Decks sorted in', duration.toFixed(2), 'ms');

        self.postMessage({
          type: 'SORT_DECKS_COMPLETE',
          payload: {
            requestId,
            sortedDecks: sorted,
            duration
          }
        });
        break;
      }

      case 'PROCESS_DECK_COLLECTION': {
        const { requestId, decks } = payload;
        console.log('[CollectionWorker] Processing deck collection:', decks.length, 'decks');

        const startTime = performance.now();
        const processed = processDeckCollection(decks);
        const duration = performance.now() - startTime;

        console.log('[CollectionWorker] Collection processed in', duration.toFixed(2), 'ms');

        self.postMessage({
          type: 'PROCESS_DECK_COLLECTION_COMPLETE',
          payload: {
            requestId,
            processedDecks: processed,
            originalCount: decks.length,
            processedCount: processed.length,
            duration
          }
        });
        break;
      }

      case 'PARSE_CACHE': {
        const { requestId, cacheString, todayDateString } = payload;
        console.log('[CollectionWorker] Parsing cache');

        const startTime = performance.now();
        const validCache = parseAndCleanCache(cacheString, todayDateString);
        const duration = performance.now() - startTime;

        console.log('[CollectionWorker] Cache parsed in', duration.toFixed(2), 'ms');

        self.postMessage({
          type: 'PARSE_CACHE_COMPLETE',
          payload: {
            requestId,
            validCache,
            cacheString: JSON.stringify(validCache), // Ready to save back to localStorage
            duration
          }
        });
        break;
      }

      case 'COORDINATE_TRANSFORM': {
        const { requestId, transformParams } = payload;
        console.log('[CollectionWorker] Transforming coordinates');

        const startTime = performance.now();
        const result = viewportToPercentage(transformParams);
        const duration = performance.now() - startTime;

        console.log('[CollectionWorker] Transform completed in', duration.toFixed(2), 'ms');

        self.postMessage({
          type: 'COORDINATE_TRANSFORM_COMPLETE',
          payload: {
            requestId,
            coordinates: result,
            duration
          }
        });
        break;
      }

      case 'BATCH_COORDINATE_TRANSFORM': {
        const { requestId, transformations, sharedParams } = payload;
        console.log('[CollectionWorker] Batch transforming', transformations.length, 'coordinates');

        const startTime = performance.now();
        const results = batchCoordinateTransformations(transformations, sharedParams);
        const duration = performance.now() - startTime;

        console.log('[CollectionWorker] Batch transform completed in', duration.toFixed(2), 'ms');

        self.postMessage({
          type: 'BATCH_COORDINATE_TRANSFORM_COMPLETE',
          payload: {
            requestId,
            coordinateResults: results,
            duration
          }
        });
        break;
      }

      case 'AGGREGATE_PARTICIPANT_DECKS': {
        const { requestId, participantDecksArray } = payload;
        console.log('[CollectionWorker] Aggregating participant decks');

        const startTime = performance.now();
        const aggregated = aggregateParticipantDecks(participantDecksArray);
        const duration = performance.now() - startTime;

        console.log('[CollectionWorker] Aggregation completed in', duration.toFixed(2), 'ms');

        self.postMessage({
          type: 'AGGREGATE_PARTICIPANT_DECKS_COMPLETE',
          payload: {
            requestId,
            aggregatedDecks: aggregated,
            duration
          }
        });
        break;
      }

      case 'FILTER_PARTICIPANTS': {
        const { requestId, participants, criteria } = payload;
        console.log('[CollectionWorker] Filtering participants');

        const startTime = performance.now();
        const filtered = filterParticipants(participants, criteria);
        const duration = performance.now() - startTime;

        console.log('[CollectionWorker] Filtering completed in', duration.toFixed(2), 'ms');

        self.postMessage({
          type: 'FILTER_PARTICIPANTS_COMPLETE',
          payload: {
            requestId,
            filteredParticipants: filtered,
            duration
          }
        });
        break;
      }

      case 'SORT_PARTICIPANTS': {
        const { requestId, participants, sortBy } = payload;
        console.log('[CollectionWorker] Sorting participants by', sortBy);

        const startTime = performance.now();
        const sorted = sortParticipants(participants, sortBy);
        const duration = performance.now() - startTime;

        console.log('[CollectionWorker] Sorting completed in', duration.toFixed(2), 'ms');

        self.postMessage({
          type: 'SORT_PARTICIPANTS_COMPLETE',
          payload: {
            requestId,
            sortedParticipants: sorted,
            duration
          }
        });
        break;
      }

      case 'STOP':
        console.log('[CollectionWorker] Stopping worker');
        self.close();
        break;

      default:
        console.warn('[CollectionWorker] Unknown message type:', type);
        self.postMessage({
          type: 'ERROR',
          payload: {
            error: `Unknown message type: ${type}`
          }
        });
    }
  } catch (error) {
    console.error('[CollectionWorker] Error processing message:', error);
    self.postMessage({
      type: 'ERROR',
      payload: {
        error: error.message,
        stack: error.stack
      }
    });
  }
});

console.log('[CollectionWorker] Ready to process collection operations');
