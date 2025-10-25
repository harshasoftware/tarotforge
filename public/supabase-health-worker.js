/**
 * Supabase Database Worker
 *
 * This worker runs independently of the main thread and handles:
 * 1. Supabase connection health monitoring
 * 2. Database updates (writes)
 * 3. Update queue management
 *
 * It's not throttled when the tab is hidden, making it more reliable
 * than main thread code for handling updates and reconnection.
 */

let supabaseUrl = null;
let supabaseKey = null;
let sessionId = null;
let isReady = true;
let healthCheckInterval = null;
let lastVisibilityState = 'visible';

// Queue for pending database updates
let updateQueue = [];
let isProcessingQueue = false;
let updateRequestId = 0;

// Listen for messages from main thread
self.addEventListener('message', async (event) => {
  const { type, payload } = event.data;

  console.log('[Worker] Received message:', type, payload);

  switch (type) {
    case 'INIT':
      supabaseUrl = payload.supabaseUrl;
      supabaseKey = payload.supabaseKey;
      sessionId = payload.sessionId;
      console.log('[Worker] Initialized with session:', sessionId);

      // Start periodic health checks
      startHealthChecks();
      break;

    case 'VISIBILITY_CHANGE':
      handleVisibilityChange(payload.isHidden);
      break;

    case 'CHECK_READY':
      // Immediately respond with current ready state
      self.postMessage({
        type: 'READY_STATUS',
        payload: { isReady }
      });
      break;

    case 'SESSION_UPDATE':
      sessionId = payload.sessionId;
      console.log('[Worker] Session updated to:', sessionId);
      break;

    case 'DATABASE_UPDATE':
      // Handle database update request from main thread
      handleDatabaseUpdate(payload);
      break;

    case 'STOP':
      stopHealthChecks();
      updateQueue = []; // Clear any pending updates
      break;

    default:
      console.warn('[Worker] Unknown message type:', type);
  }
});

function handleVisibilityChange(isHidden) {
  const newState = isHidden ? 'hidden' : 'visible';
  console.log('[Worker] Visibility changed:', lastVisibilityState, '->', newState);

  lastVisibilityState = newState;

  if (isHidden) {
    // Tab became hidden - mark as not ready
    console.log('[Worker] Tab hidden - marking as not ready');
    isReady = false;

    self.postMessage({
      type: 'READY_STATUS',
      payload: { isReady: false }
    });
  } else {
    // Tab became visible - perform immediate health check
    console.log('[Worker] Tab visible - performing immediate health check');
    performHealthCheck(true); // true = immediate check, bypass interval
  }
}

async function performHealthCheck(isImmediate = false) {
  if (!supabaseUrl || !supabaseKey || !sessionId) {
    console.log('[Worker] Health check skipped - not initialized');
    return;
  }

  try {
    console.log('[Worker] Starting health check for session:', sessionId);

    // Small delay on immediate checks to let browser settle
    if (isImmediate) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Perform a lightweight database query to test connection
    const response = await fetch(
      `${supabaseUrl}/rest/v1/reading_sessions?select=id&id=eq.${sessionId}&limit=1`,
      {
        method: 'GET',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        }
      }
    );

    if (response.ok) {
      console.log('[Worker] ✅ Health check passed - connection is healthy');

      if (!isReady) {
        isReady = true;
        self.postMessage({
          type: 'READY_STATUS',
          payload: { isReady: true }
        });
      }
    } else {
      console.error('[Worker] ❌ Health check failed - HTTP', response.status);

      // Retry after a delay if this was an immediate check
      if (isImmediate) {
        console.log('[Worker] Retrying health check in 2 seconds...');
        await new Promise(resolve => setTimeout(resolve, 2000));
        await performHealthCheck(true);
      } else {
        isReady = false;
        self.postMessage({
          type: 'READY_STATUS',
          payload: { isReady: false }
        });
      }
    }
  } catch (error) {
    console.error('[Worker] Health check exception:', error);

    // Retry on exception if immediate
    if (isImmediate) {
      console.log('[Worker] Retrying health check after exception in 2 seconds...');
      await new Promise(resolve => setTimeout(resolve, 2000));
      await performHealthCheck(true);
    } else {
      isReady = false;
      self.postMessage({
        type: 'READY_STATUS',
        payload: { isReady: false }
      });
    }
  }
}

function startHealthChecks() {
  // Clear any existing interval
  stopHealthChecks();

  // Perform initial check
  performHealthCheck();

  // Then check every 30 seconds
  healthCheckInterval = setInterval(() => {
    performHealthCheck();
  }, 30000);

  console.log('[Worker] Started periodic health checks (every 30s)');
}

function stopHealthChecks() {
  if (healthCheckInterval) {
    clearInterval(healthCheckInterval);
    healthCheckInterval = null;
    console.log('[Worker] Stopped health checks');
  }
}

/**
 * Handle database update request from main thread
 */
async function handleDatabaseUpdate(payload) {
  const { requestId, sessionId: targetSessionId, updates, userInfo } = payload;

  console.log('[Worker] Received database update request:', {
    requestId,
    sessionId: targetSessionId,
    updates,
    userInfo
  });

  // Add to queue
  updateQueue.push({
    requestId,
    sessionId: targetSessionId,
    updates,
    userInfo,
    retries: 0,
    timestamp: Date.now()
  });

  // Process queue if not already processing
  if (!isProcessingQueue) {
    processUpdateQueue();
  }
}

/**
 * Process queued database updates
 */
async function processUpdateQueue() {
  if (isProcessingQueue || updateQueue.length === 0) {
    return;
  }

  isProcessingQueue = true;
  console.log('[Worker] Starting queue processing, queue length:', updateQueue.length);

  while (updateQueue.length > 0) {
    const updateRequest = updateQueue[0]; // Peek at first item

    try {
      // Wait for connection to be ready before processing
      if (!isReady) {
        console.log('[Worker] Waiting for connection to be ready before processing update...');
        await waitForReady(10000); // 10 second timeout
      }

      // Perform the database update
      const success = await performDatabaseUpdate(updateRequest);

      if (success) {
        // Remove from queue on success
        updateQueue.shift();
        console.log('[Worker] Update successful, removed from queue. Remaining:', updateQueue.length);
      } else {
        // Retry logic
        updateRequest.retries++;

        if (updateRequest.retries >= 3) {
          // Max retries reached, remove from queue and report failure
          updateQueue.shift();
          console.error('[Worker] Update failed after 3 retries, removing from queue');

          self.postMessage({
            type: 'DATABASE_UPDATE_FAILED',
            payload: {
              requestId: updateRequest.requestId,
              error: 'Max retries exceeded'
            }
          });
        } else {
          // Wait before retry
          const delay = 1000 * updateRequest.retries; // 1s, 2s, 3s
          console.log(`[Worker] Update failed, retrying in ${delay}ms (attempt ${updateRequest.retries}/3)...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    } catch (error) {
      console.error('[Worker] Error processing update:', error);
      updateQueue.shift(); // Remove problematic update

      self.postMessage({
        type: 'DATABASE_UPDATE_FAILED',
        payload: {
          requestId: updateRequest.requestId,
          error: error.message
        }
      });
    }
  }

  isProcessingQueue = false;
  console.log('[Worker] Queue processing complete');
}

/**
 * Wait for Supabase to be ready
 */
async function waitForReady(timeout = 10000) {
  const startTime = Date.now();

  while (!isReady) {
    if (Date.now() - startTime > timeout) {
      throw new Error('Timeout waiting for Supabase to be ready');
    }
    await new Promise(resolve => setTimeout(resolve, 500));
  }
}

/**
 * Perform actual database update
 */
async function performDatabaseUpdate(updateRequest) {
  const { requestId, sessionId: targetSessionId, updates, userInfo } = updateRequest;

  console.log('[Worker] Performing database update for session:', targetSessionId);

  try {
    // Convert updates to database format
    const updateData = {};
    if (updates.selectedLayout !== undefined) updateData.selected_layout = updates.selectedLayout;
    if (updates.question !== undefined) updateData.question = updates.question;
    if (updates.readingStep !== undefined) updateData.reading_step = updates.readingStep;
    if (updates.selectedCards !== undefined) updateData.selected_cards = updates.selectedCards;
    if (updates.shuffledDeck !== undefined) updateData.shuffled_deck = updates.shuffledDeck;
    if (updates.interpretation !== undefined) updateData.interpretation = updates.interpretation;
    if (updates.zoomLevel !== undefined) updateData.zoom_level = updates.zoomLevel;
    if (updates.panOffset !== undefined) updateData.pan_offset = updates.panOffset;
    if (updates.zoomFocus !== undefined) updateData.zoom_focus = updates.zoomFocus;
    if (updates.activeCardIndex !== undefined) updateData.active_card_index = updates.activeCardIndex;
    if (updates.sharedModalState !== undefined) updateData.shared_modal_state = updates.sharedModalState;
    if (updates.videoCallState !== undefined) updateData.video_call_state = updates.videoCallState;
    if (updates.loadingStates !== undefined) updateData.loading_states = updates.loadingStates;
    if (updates.deckSelectionState !== undefined) updateData.deck_selection_state = updates.deckSelectionState;

    console.log('[Worker] Update data prepared:', updateData);

    // Perform update with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    const response = await fetch(
      `${supabaseUrl}/rest/v1/reading_sessions?id=eq.${targetSessionId}`,
      {
        method: 'PATCH',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify(updateData),
        signal: controller.signal
      }
    );

    clearTimeout(timeoutId);

    if (response.ok) {
      console.log('[Worker] ✅ Database update successful');

      // Notify main thread of success
      self.postMessage({
        type: 'DATABASE_UPDATE_SUCCESS',
        payload: {
          requestId,
          updates
        }
      });

      return true;
    } else {
      const errorText = await response.text();
      console.error('[Worker] Database update failed:', response.status, errorText);
      return false;
    }
  } catch (error) {
    if (error.name === 'AbortError') {
      console.error('[Worker] Database update timed out');
    } else {
      console.error('[Worker] Database update error:', error);
    }
    return false;
  }
}

console.log('[Worker] Supabase Database Worker initialized');
