/**
 * Card Operations Worker
 *
 * Handles CPU-intensive card operations:
 * 1. Fisher-Yates shuffle algorithm
 * 2. Card signature generation (mapping, sorting, joining)
 * 3. Card array transformations
 *
 * This worker runs independently of the main thread, preventing
 * UI stuttering during shuffle and card processing operations.
 */

console.log('[CardOpsWorker] Card Operations Worker initialized');

/**
 * Fisher-Yates shuffle algorithm (Durstenfeld modern implementation)
 * Optimized for web worker - operates on serialized card data
 */
function fisherYatesShuffle(array) {
  const shuffled = [...array]; // Create a copy to avoid mutating the original

  // Start from the last element and work backwards
  for (let i = shuffled.length - 1; i > 0; i--) {
    // Pick a random index from 0 to i (inclusive)
    const j = Math.floor(Math.random() * (i + 1));

    // Swap elements at positions i and j
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return shuffled;
}

/**
 * Generate card signature for comparison
 * Creates a unique string representation of a card array
 */
function generateCardSignature(cards) {
  if (!Array.isArray(cards) || cards.length === 0) {
    return '';
  }

  const signature = cards
    .map(card => `${card.name}-${card.position || 'none'}-${card.isReversed || false}`)
    .sort()
    .join('|');

  return signature;
}

/**
 * Transform cards to revealed state
 * Creates new card objects with revealed flag
 */
function transformToRevealed(cards) {
  return cards.map(card => ({
    ...card,
    revealed: true
  }));
}

/**
 * Format cards for interpretation
 * Extracts only necessary fields for AI processing
 */
function formatCardsForInterpretation(cards) {
  return cards.map(card => ({
    name: card.name,
    position: card.position || null,
    isReversed: card.isReversed || false
  }));
}

/**
 * Combined transformation: reveal + format
 * More efficient than two separate operations
 */
function revealAndFormat(cards) {
  return cards.map(card => ({
    name: card.name,
    position: card.position || null,
    isReversed: card.isReversed || false,
    revealed: true
  }));
}

// Listen for messages from main thread
self.addEventListener('message', (event) => {
  const { type, payload } = event.data;

  console.log('[CardOpsWorker] Received message:', type);

  try {
    switch (type) {
      case 'SHUFFLE': {
        const { requestId, cards } = payload;
        console.log('[CardOpsWorker] Shuffling', cards.length, 'cards');

        const startTime = performance.now();
        const shuffled = fisherYatesShuffle(cards);
        const duration = performance.now() - startTime;

        console.log('[CardOpsWorker] Shuffle completed in', duration.toFixed(2), 'ms');

        self.postMessage({
          type: 'SHUFFLE_COMPLETE',
          payload: {
            requestId,
            shuffledCards: shuffled,
            duration
          }
        });
        break;
      }

      case 'GENERATE_SIGNATURE': {
        const { requestId, cards } = payload;
        console.log('[CardOpsWorker] Generating signature for', cards.length, 'cards');

        const startTime = performance.now();
        const signature = generateCardSignature(cards);
        const duration = performance.now() - startTime;

        console.log('[CardOpsWorker] Signature generated in', duration.toFixed(2), 'ms');

        self.postMessage({
          type: 'SIGNATURE_COMPLETE',
          payload: {
            requestId,
            signature,
            duration
          }
        });
        break;
      }

      case 'REVEAL_AND_FORMAT': {
        const { requestId, cards } = payload;
        console.log('[CardOpsWorker] Revealing and formatting', cards.length, 'cards');

        const startTime = performance.now();
        const formatted = revealAndFormat(cards);
        const duration = performance.now() - startTime;

        console.log('[CardOpsWorker] Cards processed in', duration.toFixed(2), 'ms');

        self.postMessage({
          type: 'REVEAL_AND_FORMAT_COMPLETE',
          payload: {
            requestId,
            formattedCards: formatted,
            duration
          }
        });
        break;
      }

      case 'BATCH_OPERATIONS': {
        // Handle multiple operations in a single worker call
        const { requestId, operations } = payload;
        console.log('[CardOpsWorker] Processing batch of', operations.length, 'operations');

        const results = {};
        const startTime = performance.now();

        operations.forEach(op => {
          switch (op.operation) {
            case 'shuffle':
              results[op.key] = fisherYatesShuffle(op.cards);
              break;
            case 'signature':
              results[op.key] = generateCardSignature(op.cards);
              break;
            case 'revealAndFormat':
              results[op.key] = revealAndFormat(op.cards);
              break;
            default:
              console.warn('[CardOpsWorker] Unknown batch operation:', op.operation);
          }
        });

        const duration = performance.now() - startTime;
        console.log('[CardOpsWorker] Batch completed in', duration.toFixed(2), 'ms');

        self.postMessage({
          type: 'BATCH_OPERATIONS_COMPLETE',
          payload: {
            requestId,
            results,
            duration
          }
        });
        break;
      }

      case 'STOP':
        console.log('[CardOpsWorker] Stopping worker');
        self.close();
        break;

      default:
        console.warn('[CardOpsWorker] Unknown message type:', type);
        self.postMessage({
          type: 'ERROR',
          payload: {
            error: `Unknown message type: ${type}`
          }
        });
    }
  } catch (error) {
    console.error('[CardOpsWorker] Error processing message:', error);
    self.postMessage({
      type: 'ERROR',
      payload: {
        error: error.message,
        stack: error.stack
      }
    });
  }
});

console.log('[CardOpsWorker] Ready to process card operations');
