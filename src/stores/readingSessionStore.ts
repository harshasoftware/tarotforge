import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { supabase } from '../lib/supabase';
import { useAuthStore, type User } from './authStorePrivy';
import { ReadingLayout, Card } from '../types';
import { RealtimeChannel } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import { getPersistentBrowserId } from '../utils/browserFingerprint';

export interface ReadingSessionState {
  id: string;
  hostUserId: string | null;
  deckId: string;
  selectedLayout: ReadingLayout | null;
  question: string;
  readingStep: 'setup' | 'ask-question' | 'drawing' | 'interpretation';
  selectedCards: (Card & { position: string; isReversed: boolean; x?: number; y?: number; customPosition?: string })[];
  shuffledDeck: Card[];
  interpretation: string;
  zoomLevel: number;
  panOffset: { x: number; y: number };
  zoomFocus: { x: number; y: number } | null;
  activeCardIndex: number | null;
  sharedModalState: {
    isOpen: boolean;
    cardIndex: number | null;
    showDescription: boolean;
    triggeredBy: string | null; // participant ID who triggered the modal
  } | null;
  videoCallState: {
    isActive: boolean;
    sessionId: string | null;
    hostParticipantId: string | null;
    participants: string[]; // participant IDs in the video call
  } | null;
  loadingStates?: {
    isShuffling: boolean;
    isGeneratingInterpretation: boolean;
    triggeredBy: string | null; // participant ID who triggered the action
  } | null;
  deckSelectionState?: {
    isOpen: boolean;
    activeTab: 'collection' | 'marketplace';
    selectedMarketplaceDeck: string | null; // deck ID
    triggeredBy: string | null; // participant ID who opened the modal
  } | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SessionParticipant {
  id: string;
  sessionId: string;
  userId: string | null;
  anonymousId: string | null;
  name: string | null;
  isActive: boolean;
  joinedAt: string;
  lastSeenAt?: string;
}

interface ReadingSessionStore {
  sessionState: ReadingSessionState | null;
  participants: SessionParticipant[];
  isHost: boolean;
  isLoading: boolean;
  error: string | null;
  initialSessionId: string | null;
  deckId: string;
  channel: RealtimeChannel | null;
  participantId: string | null;
  presenceInterval: NodeJS.Timeout | null;
  anonymousId: string | null;
  isOfflineMode: boolean;
  pendingSyncData: Partial<ReadingSessionState> | null;
  _justRestoredFromPreservedState: boolean;

  // Actions
  setSessionState: (sessionState: ReadingSessionState | null) => void;
  setParticipants: (participants: SessionParticipant[]) => void;
  setIsHost: (isHost: boolean) => void;
  setIsLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  setInitialSessionId: (sessionId: string | null) => void;
  setDeckId: (deckId: string) => void;
  createSession: () => Promise<string | null>;
  createLocalSession: () => string;
  joinSession: (sessionId: string, accessMethod?: 'invite' | 'direct') => Promise<string | null>;
  updateSession: (updates: Partial<ReadingSessionState>) => Promise<void>;
  updateLocalSession: (updates: Partial<ReadingSessionState>) => void;
  syncLocalSessionToDatabase: () => Promise<boolean>;
  loadLocalSession: (sessionId: string) => ReadingSessionState | null;
  saveLocalSession: (sessionState: ReadingSessionState) => void;
  updatePresence: () => Promise<void>;
  leaveSession: () => Promise<void>;
  upgradeGuestAccount: (newUserId: string) => Promise<boolean>;
  setGuestName: (name: string) => Promise<boolean>;
  initializeSession: () => Promise<void>;
  setupRealtimeSubscriptions: () => void;
  syncCompleteSessionState: (sessionId: string) => Promise<boolean>;
  cleanup: () => void;
  // Video call management
  startVideoCall: () => Promise<string | null>;
  joinVideoCall: (videoSessionId: string) => Promise<boolean>;
  leaveVideoCall: () => Promise<void>;
  updateVideoCallParticipants: (participants: string[]) => Promise<void>;
  // Guest actions via broadcast
  broadcastGuestAction: (action: string, data: any) => Promise<void>;
  // Subscribe to broadcast events
  subscribeToBroadcast: (callback: (action: string, data: any, participantId: string) => void) => () => void;
  // Session cleanup
  cleanupInactiveSessions: () => Promise<void>;
  checkSessionExpiry: () => Promise<boolean>;
}

// Helper function to wait for auth state determination
const waitForAuthDetermination = async (get: () => ReadingSessionStore, set: (partial: Partial<ReadingSessionStore> | ((state: ReadingSessionStore) => Partial<ReadingSessionStore>)) => void): Promise<boolean> => {
  let authDetermined = useAuthStore.getState().authStateDetermined;
  let authLoading = useAuthStore.getState().loading;
  let waitAttempts = 0;
  const maxWaitAttempts = 60; // Max ~6 seconds wait (60 * 100ms)

  const isLoadingFromSelfInitially = get().isLoading;
  const isLoadingFromAuthInitially = useAuthStore.getState().loading;

  while ((!authDetermined || authLoading) && waitAttempts < maxWaitAttempts) {
    if (waitAttempts === 0 && (isLoadingFromSelfInitially || isLoadingFromAuthInitially)) {
      if (!get().isLoading) set({ isLoading: true });
    }
    console.log(`[waitForAuthDetermination] Waiting for auth (Determined: ${authDetermined}, Loading: ${authLoading}). Attempt: ${waitAttempts + 1}`);
    await new Promise(resolve => setTimeout(resolve, 100));
    authDetermined = useAuthStore.getState().authStateDetermined;
    authLoading = useAuthStore.getState().loading;
    waitAttempts++;
  }

  if (!authDetermined) {
    console.error('[waitForAuthDetermination] Auth state not determined after waiting.');
    set({ error: 'Authentication status could not be determined.', isLoading: false });
    return false;
  }
  if (authLoading && !authDetermined) { // Should be caught by !authDetermined mostly
     console.error('[waitForAuthDetermination] Auth stopped loading but state still not determined.');
     set({ error: 'Authentication status unclear after loading.', isLoading: false });
     return false;
  }
  console.log('[waitForAuthDetermination] Auth state determined, proceeding.');
  return true;
};

// Helper function to ensure participant record exists and is up-to-date
const _ensureParticipantRecord = async (
  sessionId: string, 
  userArgument: User | null, // User from useAuthStore passed as argument
  isHost: boolean, 
  get: () => ReadingSessionStore, 
  set: (partial: Partial<ReadingSessionStore> | ((state: ReadingSessionStore) => Partial<ReadingSessionStore>)) => void
): Promise<string | null> => {
  const { user: currentUserFromAuth } = useAuthStore.getState();

  let participantQuery = supabase
    .from('session_participants')
    .select('*')
    .eq('session_id', sessionId)
    .eq('is_active', true);

  let determinedAnonymousId: string | null = null;

  if (currentUserFromAuth && currentUserFromAuth.email) {
    participantQuery = participantQuery.eq('user_id', currentUserFromAuth.id);
  } else if (currentUserFromAuth && !currentUserFromAuth.email && currentUserFromAuth.id) {
    determinedAnonymousId = currentUserFromAuth.id;
    participantQuery = participantQuery.eq('anonymous_id', currentUserFromAuth.id);
    if (!get().anonymousId) set({ anonymousId: currentUserFromAuth.id });
  } else {
    // If currentUserFromAuth is null, we have no Supabase identity (auth or anon) to work with.
    // Fingerprinting is removed as per user request.
    console.error("[_ensureParticipantRecord] No user (neither authenticated nor Supabase anonymous) found in authStore. Cannot ensure participant record without a Supabase-managed identity.");
    set({ error: "User identity not available from authentication service. Please ensure you are signed in, at least anonymously.", isLoading: false });
    return null; // Cannot proceed without a Supabase-backed user identity.
  }

  const { data: existingParticipantData, error: fetchError } = await participantQuery.maybeSingle();
  const existingParticipant = existingParticipantData as SessionParticipant | null;

  if (fetchError && fetchError.code !== 'PGRST116') { 
    console.error("[_ensureParticipantRecord] Error fetching existing participant:", fetchError);
    set({ error: "Failed to check for existing participant.", isLoading: false });
    return null;
  }

  if (existingParticipant) {
    console.log('[_ensureParticipantRecord] Found existing participant:', existingParticipant.id, 'Current Name:', existingParticipant.name);
    let updatePayload: Partial<SessionParticipant> = { lastSeenAt: new Date().toISOString(), isActive: true };

    if (currentUserFromAuth && currentUserFromAuth.email) { 
        const newAuthName = currentUserFromAuth.username || currentUserFromAuth.email.split('@')[0] || `User (${currentUserFromAuth.id.substring(0, 6)})`;
        if ( existingParticipant.anonymousId || 
            (!existingParticipant.userId && (existingParticipant.name?.startsWith('Guest') || existingParticipant.name?.startsWith('Anonymous') || existingParticipant.name === 'Host')) || 
            (existingParticipant.name !== newAuthName && (existingParticipant.name?.startsWith('Guest') || existingParticipant.name?.startsWith('Anonymous')))
           ) {
            console.log(`[_ensureParticipantRecord] Updating name for authenticated user ${currentUserFromAuth.id}. Old name: ${existingParticipant.name}, New name: ${newAuthName}`);
            updatePayload.name = newAuthName;
        }
        if (existingParticipant.userId !== currentUserFromAuth.id || existingParticipant.anonymousId) {
            updatePayload.userId = currentUserFromAuth.id;
            updatePayload.anonymousId = null;
        }
    } else if (currentUserFromAuth && !currentUserFromAuth.email && currentUserFromAuth.id) { 
        if (existingParticipant.userId && !existingParticipant.anonymousId) {
            console.warn(`[_ensureParticipantRecord] Participant ${existingParticipant.id} was authenticated, now identified as anonymous ${currentUserFromAuth.id}. Updating IDs.`);
            updatePayload.userId = null;
            updatePayload.anonymousId = currentUserFromAuth.id;
            if (existingParticipant.name && (existingParticipant.name.startsWith('User (') || existingParticipant.name === 'Host')) {
                updatePayload.name = `Guest (${currentUserFromAuth.id.substring(0, 6)})`;
            }
        } else if (existingParticipant.anonymousId !== currentUserFromAuth.id) {
            updatePayload.anonymousId = currentUserFromAuth.id;
            updatePayload.userId = null; 
            if (!existingParticipant.name || existingParticipant.name === 'Guest' || existingParticipant.name === 'Anonymous Host' || existingParticipant.name.startsWith('User (')) {
                updatePayload.name = `Guest (${currentUserFromAuth.id.substring(0, 6)})`;
            }
        } else if (!existingParticipant.userId && existingParticipant.anonymousId === currentUserFromAuth.id) {
            if (!existingParticipant.name || existingParticipant.name === 'Guest' || existingParticipant.name === 'Anonymous Host') {
                 updatePayload.name = `Guest (${currentUserFromAuth.id.substring(0, 6)})`;
            }
        }
    } else if (!currentUserFromAuth && determinedAnonymousId) { 
        if (existingParticipant.userId) {
            console.warn(`[_ensureParticipantRecord] Existing participant ${existingParticipant.id} was authenticated, but current identification is by fingerprint ${determinedAnonymousId}. Not changing name or primary ID type.`);
        } else if (existingParticipant.anonymousId !== determinedAnonymousId) {
            updatePayload.anonymousId = determinedAnonymousId;
            if (!existingParticipant.name || existingParticipant.name === 'Guest' || existingParticipant.name === 'Anonymous Host') {
                updatePayload.name = `Guest (${determinedAnonymousId.substring(0, 6)})`;
            }
        } else if (!existingParticipant.name || existingParticipant.name === 'Guest' || existingParticipant.name === 'Anonymous Host') {
            updatePayload.name = `Guest (${determinedAnonymousId.substring(0, 6)})`;
        }
    }

    const dbUpdatePayload: any = {};
    if (updatePayload.lastSeenAt !== undefined) dbUpdatePayload.last_seen_at = updatePayload.lastSeenAt; // Corrected: No .toISOString()
    if (updatePayload.isActive !== undefined) dbUpdatePayload.is_active = updatePayload.isActive;
    if (updatePayload.name !== undefined) dbUpdatePayload.name = updatePayload.name;
    if (updatePayload.userId !== undefined) dbUpdatePayload.user_id = updatePayload.userId;
    if (updatePayload.anonymousId !== undefined) dbUpdatePayload.anonymous_id = updatePayload.anonymousId;
    // if anonymousId is being set to null explicitly
    if (updatePayload.hasOwnProperty('anonymousId') && updatePayload.anonymousId === null) {
      dbUpdatePayload.anonymous_id = null;
    }

    if (Object.keys(dbUpdatePayload).length > 2) { // If more than just last_seen_at and is_active changed (default ones)
        await supabase.from('session_participants').update(dbUpdatePayload).eq('id', existingParticipant.id);
        console.log('[_ensureParticipantRecord] Updated participant record with DB payload:', dbUpdatePayload);
    } else if (Object.keys(dbUpdatePayload).length > 0) { // ensure there is something to update (at least last_seen_at and is_active)
        await supabase.from('session_participants').update(dbUpdatePayload).eq('id', existingParticipant.id);
    } else {
        // This case should ideally not happen if lastSeenAt and isActive are always in updatePayload
        // but as a safeguard if updatePayload was empty for some reason.
        await supabase.from('session_participants').update({ last_seen_at: new Date().toISOString(), is_active: true }).eq('id', existingParticipant.id);
    }
    return existingParticipant.id;

  } else { 
    console.log('[_ensureParticipantRecord] No existing participant found, creating new one...');
    let participantNameToSet: string;

    if (currentUserFromAuth && currentUserFromAuth.email) { 
      participantNameToSet = currentUserFromAuth.username || currentUserFromAuth.email.split('@')[0] || `User (${currentUserFromAuth.id.substring(0, 6)})`;
    } else if (currentUserFromAuth && !currentUserFromAuth.email && currentUserFromAuth.id) { // This is a Supabase anonymous user
      determinedAnonymousId = currentUserFromAuth.id; // Ensure determinedAnonymousId is set from Supabase anon user
      participantNameToSet = `Guest (${currentUserFromAuth.id.substring(0, 6)})`; 
    // The case for determinedAnonymousId coming from fingerprint is now removed.
    // If currentUserFromAuth was null, we would have returned early.
    } else {
      // This fallback should ideally not be reached if currentUserFromAuth is always present (auth or anon)
      console.warn("[_ensureParticipantRecord] Unexpected state: currentUserFromAuth is null or invalid when trying to set new participant name.");
      participantNameToSet = isHost ? 'Host (Error)' : 'Guest (Error)'; 
    }
    
    const newParticipantDataForDB: any = {
      session_id: sessionId,
      name: participantNameToSet,
      is_active: true,
      role: isHost ? 'host' : 'participant',
    };

    if (currentUserFromAuth && currentUserFromAuth.email) {
      newParticipantDataForDB.user_id = currentUserFromAuth.id;
    } else if (determinedAnonymousId) { // This will now only be from a Supabase anonymous user
      newParticipantDataForDB.anonymous_id = determinedAnonymousId;
    } else {
      // This path should not be taken if the early return for null currentUserFromAuth works.
      console.error('[_ensureParticipantRecord] Critical error: Creating new participant without user_id or determinedAnonymousId from Supabase.');
      // To prevent inserting a record without any identifier, though this indicates a logic flaw upstream.
      set({ error: "Failed to create participant due to missing identifier.", isLoading: false });
      return null; 
    }
    
    console.log('[_ensureParticipantRecord] Inserting new participant with DB data:', newParticipantDataForDB);
    const { data: newParticipant, error: insertError } = await supabase
      .from('session_participants')
      .insert(newParticipantDataForDB)
      .select('id')
      .single();

    if (insertError) {
      console.error('[_ensureParticipantRecord] Failed to create participant:', insertError);
      set({ error: "Failed to create participant record.", isLoading: false });
      return null;
    }
    if (newParticipant) {
        console.log('[_ensureParticipantRecord] New participant created successfully:', newParticipant.id);
        return newParticipant.id;
    }
    return null; // Should not happen if insert was successful
  }
};

// Helper function to restore session state from localStorage if available
const _restorePreservedSessionContext = async (
  sessionId: string,
  user: User | null, // User from useAuthStore
  initialStoreState: ReadingSessionStore, // Initial state of the store
  finalParticipantId: string | null, // Established participantId
  get: () => ReadingSessionStore,
  set: (partial: Partial<ReadingSessionStore> | ((state: ReadingSessionStore) => Partial<ReadingSessionStore>)) => void
) => {
  try {
    const restoredContextRaw = localStorage.getItem('session_context_restored');
    if (restoredContextRaw) {
      const restoredContext = JSON.parse(restoredContextRaw);
      console.log('[_restorePreservedCtx] Found session_context_restored:', restoredContext);

      if (
        restoredContext.sessionId === sessionId &&
        restoredContext.migrationComplete &&
        restoredContext.preserveState
      ) {
        const preservedStateRaw = localStorage.getItem('preserved_session_state');
        if (preservedStateRaw) {
          const preservedState = JSON.parse(preservedStateRaw);
          console.log('[_restorePreservedCtx] Applying preserved_session_state:', preservedState);

          const currentSessionInStore = get().sessionState; // Get current session state from DB before overriding
          const updatedSessionData = {
            ...currentSessionInStore, // Base on what was fetched from DB
            ...preservedState,        // Override with preserved parts
            id: sessionId,            // Ensure session ID is correct
            hostUserId: currentSessionInStore?.hostUserId || preservedState.hostUserId, // Prioritize DB host, then preserved
            deckId: preservedState.deckId || currentSessionInStore?.deckId || initialStoreState.deckId,
            // Ensure fields not in preservedState but existing in currentSessionInStore are kept
            createdAt: currentSessionInStore?.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString(), // Always update this
            isActive: currentSessionInStore?.isActive !== undefined ? currentSessionInStore.isActive : true,
          };

          set(state => ({
            sessionState: updatedSessionData as ReadingSessionState,
            isHost: (user ? updatedSessionData.hostUserId === user.id : updatedSessionData.hostUserId === null) || state.isHost,
            _justRestoredFromPreservedState: true,
          }));

          setTimeout(() => {
            set({ _justRestoredFromPreservedState: false });
            console.log('[_restorePreservedCtx] _justRestoredFromPreservedState flag cleared.');
          }, 3000);

          if (restoredContext.participantId && finalParticipantId && restoredContext.participantId !== finalParticipantId) {
            console.warn(`[_restorePreservedCtx] Restored participantId (${restoredContext.participantId}) differs from established one (${finalParticipantId}). Using established one.`);
          }

          localStorage.removeItem('preserved_session_state');
          localStorage.removeItem('session_context_restored');
          console.log('[_restorePreservedCtx] ✅ Preserved session state applied and localStorage cleaned.');
        } else {
          console.log('[_restorePreservedCtx] session_context_restored found, but no preserved_session_state item.');
          localStorage.removeItem('session_context_restored');
        }
      } else {
        console.log('[_restorePreservedCtx] session_context_restored not applicable or migration not complete. SessionId match:', restoredContext.sessionId === sessionId);
        if (restoredContext.sessionId !== sessionId || Date.now() - (restoredContext.timestamp || 0) > 300000) {
          localStorage.removeItem('session_context_restored');
        }
      }
    }
  } catch (e) {
    console.error('[_restorePreservedCtx] Error processing preserved session state:', e);
    localStorage.removeItem('session_context_restored');
    localStorage.removeItem('preserved_session_state');
  }
};

// --- Realtime Subscription Helper Functions ---

const _handlePostgresSessionUpdate = (
  payload: any, // Supabase PostgresChangeEventPayload<any>
  get: () => ReadingSessionStore,
  set: (partial: Partial<ReadingSessionStore> | ((state: ReadingSessionStore) => Partial<ReadingSessionStore>)) => void
) => {
  console.log('[_handlePostgresSessionUpdate] Real-time session update received:', payload);
  const newSession = payload.new as Partial<ReadingSessionState>; // Cast to Partial, as not all fields might be present
  const currentState = get().sessionState;
  const justRestored = get()._justRestoredFromPreservedState;

  if (currentState) {
    const localStateAge = Date.now() - new Date(currentState.updatedAt).getTime();
    const isRecentLocalUpdate = localStateAge < 2000; // 2 seconds threshold
    const incomingCards = newSession.selectedCards || [];
    const currentCards = currentState.selectedCards || [];
    const wouldReduceCards = incomingCards.length < currentCards.length;
    // Preserve local cards if local update was recent AND incoming update would reduce card count AND we have cards
    const shouldPreserveLocalCards = isRecentLocalUpdate && wouldReduceCards && currentCards.length > 0;

    const stepOrder = ['setup', 'ask-question', 'drawing', 'interpretation'];
    const currentStepIndex = stepOrder.indexOf(currentState.readingStep);
    const incomingStepIndex = newSession.readingStep ? stepOrder.indexOf(newSession.readingStep) : -1;

    console.log('[_handlePostgresSessionUpdate] Real-time update analysis:', {
      localStateAge,
      isRecentLocalUpdate,
      currentSelectedCards: currentCards.length,
      incomingSelectedCards: incomingCards.length,
      wouldReduceCards,
      shouldPreserveLocalCards,
      justRestoredFromPreserved: justRestored,
      currentReadingStep: currentState.readingStep,
      incomingReadingStep: newSession.readingStep,
      currentStepIndex,
      incomingStepIndex,
      currentShuffledDeckLength: currentState.shuffledDeck?.length,
      incomingShuffledDeckLength: newSession.shuffledDeck?.length,
      currentQuestion: currentState.question,
      incomingQuestion: newSession.question,
      currentLayoutId: currentState.selectedLayout?.id,
      incomingLayoutId: newSession.selectedLayout?.id,
    });

    let finalShuffledDeck = newSession.shuffledDeck ?? currentState.shuffledDeck ?? [];
    if (justRestored && currentState.shuffledDeck && newSession.shuffledDeck && newSession.shuffledDeck.length > currentState.shuffledDeck.length) {
      console.log('[_handlePostgresSessionUpdate] [RT PRESERVE] ShuffledDeck: Using local (more cards removed).');
      finalShuffledDeck = currentState.shuffledDeck;
    }

    let finalReadingStep = newSession.readingStep ?? currentState.readingStep;
    if (justRestored && incomingStepIndex !== -1 && incomingStepIndex < currentStepIndex) {
      console.log('[_handlePostgresSessionUpdate] [RT PRESERVE] ReadingStep: Using local (more advanced).');
      finalReadingStep = currentState.readingStep;
    }

    let finalSelectedLayout = newSession.selectedLayout ?? currentState.selectedLayout;
    if (justRestored && currentState.selectedLayout && !newSession.selectedLayout) {
      console.log('[_handlePostgresSessionUpdate] [RT PRESERVE] SelectedLayout: Using local (incoming is null).');
      finalSelectedLayout = currentState.selectedLayout;
    }
    
    let finalQuestion = newSession.question ?? currentState.question;
    if (justRestored && currentState.question && newSession.question === undefined) { // Check specifically for undefined, empty string is valid
      console.log('[_handlePostgresSessionUpdate] [RT PRESERVE] Question: Using local (incoming is undefined).');
      finalQuestion = currentState.question;
    }

    set({
      sessionState: {
        ...currentState, // Base on current state
        ...newSession,   // Apply incoming changes
        // Apply preserved/defaulted values
        shuffledDeck: finalShuffledDeck,
        readingStep: finalReadingStep,
        selectedLayout: finalSelectedLayout,
        question: finalQuestion,
        selectedCards: shouldPreserveLocalCards ? currentCards : (newSession.selectedCards || currentState.selectedCards || []),
        updatedAt: newSession.updatedAt || currentState.updatedAt || new Date().toISOString(),
        deckId: newSession.deckId || currentState.deckId, // Ensure deckId is preserved
      }
    });
  } else {
    // If no current state, just set the new state (should be rare for an update event)
    set({ sessionState: newSession as ReadingSessionState });
  }
};

const _handlePostgresParticipantChange = async (
  sessionId: string, 
  get: () => ReadingSessionStore,
  set: (partial: Partial<ReadingSessionStore> | ((state: ReadingSessionStore) => Partial<ReadingSessionStore>)) => void
) => {
  console.log('[_handlePostgresParticipantChange] Participant change detected for session:', sessionId);
  try {
    const { data } = await supabase
      .from('session_participants')
      .select('*')
      .eq('session_id', sessionId)
      .eq('is_active', true);
    
    if (data) {
      set({ participants: data as SessionParticipant[] });
    } else {
      console.warn('[_handlePostgresParticipantChange] No participant data returned after change notification.');
    }
  } catch (error) {
    console.error('[_handlePostgresParticipantChange] Error refetching participants:', error);
  }
};

const _handleBroadcastedGuestAction = (
  payload: any, // SupabaseBroadcastMessage<any>
  get: () => ReadingSessionStore,
  set: (partial: Partial<ReadingSessionStore> | ((state: ReadingSessionStore) => Partial<ReadingSessionStore>)) => void
) => {
  console.log('[_handleBroadcastedGuestAction] Received guest action:', payload);
  const { action, data, participantId: senderParticipantId } = payload.payload;
  const currentStoreState = get();
  
  if (senderParticipantId === currentStoreState.participantId) {
    console.log('[_handleBroadcastedGuestAction] Ignoring own broadcasted action.');
    return;
  }

  console.log('[_handleBroadcastedGuestAction] Processing action:', { action, data, fromHost: action === 'hostUpdate' });
  
  switch (action) {
    case 'updateSession':
      // Guest update - only process if we're the host
      if (currentStoreState.isHost) {
        console.log('[_handleBroadcastedGuestAction] Processing guest updateSession as host');
        currentStoreState.updateSession(data); // Call the store's updateSession method
      } else {
        console.log('[_handleBroadcastedGuestAction] Non-host received updateSession broadcast, might apply locally if non-critical.');
        // Non-hosts might still apply non-critical UI updates directly for responsiveness,
        // but critical state should come from postgres_changes or hostUpdate.
        // Example: if (data.someSpecificNonCriticalField) set({ sessionState: { ...get().sessionState, ...data }});
      }
      break;
      
    case 'hostUpdate':
      // Host update - all participants should apply this
      console.log('[_handleBroadcastedGuestAction] Processing hostUpdate as participant');
      const currentSession = currentStoreState.sessionState;
      if (currentSession) {
        set({
          sessionState: {
            ...currentSession,
            ...data, // Apply updates from host
            updatedAt: new Date().toISOString() // Ensure updatedAt is fresh
          }
        });
      }
      break;
      
    case 'cardSelection':
      // Example: Handle card selection from guest (if host needs to validate/process)
      if (currentStoreState.isHost && data.selectedCards) {
        console.log('[_handleBroadcastedGuestAction] Host processing cardSelection from guest.');
        currentStoreState.updateSession({ selectedCards: data.selectedCards });
      }
      break;
      
    // Add more cases for other specific guest actions as needed
    // e.g., 'shuffleDeck', 'resetCards', 'resetReading', 'resetPan'
    case 'shuffleDeck':
    case 'resetCards':
    case 'resetReading':
    case 'resetPan':
        // These actions might primarily affect the local UI for the sender,
        // but other participants might need to react or sync. If the action
        // implies a DB change (like shuffledDeck), hostUpdate or session update is better.
        // For purely visual/local state on other clients, you might do something here.
        console.log(`[_handleBroadcastedGuestAction] Received action '${action}', data:`, data);
        // Potentially update local store state for other clients based on these actions
        // Example: if (action === 'shuffleDeck' && data.shuffledDeck) {
        //   set(state => ({ sessionState: { ...state.sessionState, shuffledDeck: data.shuffledDeck }}));
        // }
        break;

    default:
      console.log('[_handleBroadcastedGuestAction] Unknown guest action:', action);
  }
};

const _managePresenceAndExpiryInterval = (
  get: () => ReadingSessionStore,
  set: (partial: Partial<ReadingSessionStore> | ((state: ReadingSessionStore) => Partial<ReadingSessionStore>)) => void
): NodeJS.Timeout => {
  console.log('[_managePresenceAndExpiryInterval] Setting up presence and expiry interval.');
  const intervalId = setInterval(async () => {
    get().updatePresence();
    
    const now = Date.now();
    const lastExpiryCheck = (get() as any)._lastExpiryCheckTimestamp || 0;
    if (now - lastExpiryCheck > 5 * 60 * 1000) { // 5 minutes
      const isExpired = await get().checkSessionExpiry();
      if (isExpired) {
        console.log('[_managePresenceAndExpiryInterval] Current session has expired, cleaning up...');
        get().cleanup();
        if (typeof window !== 'undefined') window.location.href = '/';
      }
      set({ _lastExpiryCheckTimestamp: now } as any); // Store the last check time, acknowledge any type
    }
  }, 30000); // Every 30 seconds
  return intervalId;
};

// Helper function to merge fetched session data with local state, applying preservation logic
const _mergeFetchedSessionWithLocalState = (
  fetchedSessionData: any, // Raw data from Supabase
  currentLocalSessionState: ReadingSessionState | null,
  isCurrentUserHost: boolean, // isHost from the store for the current user
  currentUser: User | null // User from useAuthStore
): ReadingSessionState => {
  // Convert fetched data to local format
  const syncedState: ReadingSessionState = {
    id: fetchedSessionData.id,
    hostUserId: fetchedSessionData.host_user_id,
    deckId: fetchedSessionData.deck_id,
    selectedLayout: fetchedSessionData.selected_layout,
    question: fetchedSessionData.question || '',
    readingStep: fetchedSessionData.reading_step,
    selectedCards: fetchedSessionData.selected_cards || [],
    shuffledDeck: fetchedSessionData.shuffled_deck ?? [],
    interpretation: fetchedSessionData.interpretation || '',
    zoomLevel: fetchedSessionData.zoom_level || 1.0,
    panOffset: fetchedSessionData.pan_offset || { x: 0, y: 0 },
    zoomFocus: fetchedSessionData.zoom_focus || null,
    activeCardIndex: fetchedSessionData.active_card_index,
    sharedModalState: fetchedSessionData.shared_modal_state || null,
    videoCallState: fetchedSessionData.video_call_state || null,
    loadingStates: fetchedSessionData.loading_states || null,
    deckSelectionState: fetchedSessionData.deck_selection_state || null,
    isActive: fetchedSessionData.is_active,
    createdAt: fetchedSessionData.created_at,
    updatedAt: fetchedSessionData.updated_at
  };

  if (!currentLocalSessionState) {
    console.log('[_mergeFetchedSession] No current local state, using fetched state as is.');
    return syncedState;
  }

  const isSessionCreator = isCurrentUserHost || 
    (syncedState.hostUserId === null && !currentUser) || // Guest session creator
    (syncedState.hostUserId === currentUser?.id); // Authenticated session creator
        
  const localStateAge = Date.now() - new Date(currentLocalSessionState.updatedAt).getTime();
  const isRecentLocalUpdate = localStateAge < 10000; // 10 seconds
        
  const currentStepOrder = ['setup', 'ask-question', 'drawing', 'interpretation'];
  const localStepIndex = currentStepOrder.indexOf(currentLocalSessionState.readingStep);
  const syncedStepIndex = currentStepOrder.indexOf(syncedState.readingStep);
        
  console.log('[_mergeFetchedSession] Session sync merge check:', {
    isCurrentUserHost,
    isSessionCreator,
    isRecentLocalUpdate,
    localStateAge,
    localStep: currentLocalSessionState.readingStep,
    syncedStep: syncedState.readingStep,
    localStepIndex,
    syncedStepIndex,
    hostUserIdFromSynced: syncedState.hostUserId,
    currentAuthUserId: currentUser?.id
  });
        
  const shouldPreserveLocal = 
    (isSessionCreator && localStepIndex > syncedStepIndex) ||
    isRecentLocalUpdate;
          
  if (shouldPreserveLocal) {
    console.log('[_mergeFetchedSession] Preserving some local state attributes:', {
      reason: isRecentLocalUpdate ? 'recent local update' : 'session creator with more advanced progress',
      preserving: {
        readingStep: currentLocalSessionState.readingStep,
        selectedLayoutId: currentLocalSessionState.selectedLayout?.id,
        question: currentLocalSessionState.question,
        selectedCardsCount: currentLocalSessionState.selectedCards.length,
        interpretationExists: !!currentLocalSessionState.interpretation,
        activeCardIndex: currentLocalSessionState.activeCardIndex
      }
    });
    
    return {
      ...syncedState, // Base with synced state
      readingStep: currentLocalSessionState.readingStep, // Preserve more advanced step
      selectedLayout: currentLocalSessionState.selectedLayout || syncedState.selectedLayout,
      question: currentLocalSessionState.question || syncedState.question,
      // For selectedCards, if local is more advanced, it often means cards were placed.
      // However, the primary driver should be the readingStep. If local step is drawing/interpretation
      // and synced is setup, local cards are more relevant.
      selectedCards: (localStepIndex >= currentStepOrder.indexOf('drawing') && localStepIndex > syncedStepIndex) 
                     ? currentLocalSessionState.selectedCards 
                     : syncedState.selectedCards,
      interpretation: currentLocalSessionState.interpretation || syncedState.interpretation,
      activeCardIndex: currentLocalSessionState.activeCardIndex ?? syncedState.activeCardIndex,
      // Preserve UI-related states if local state was recent, otherwise take synced (e.g. from host)
      zoomLevel: isRecentLocalUpdate ? currentLocalSessionState.zoomLevel : syncedState.zoomLevel,
      panOffset: isRecentLocalUpdate ? currentLocalSessionState.panOffset : syncedState.panOffset,
      zoomFocus: isRecentLocalUpdate ? currentLocalSessionState.zoomFocus : syncedState.zoomFocus,
      sharedModalState: isRecentLocalUpdate ? currentLocalSessionState.sharedModalState : syncedState.sharedModalState,
      deckSelectionState: isRecentLocalUpdate ? currentLocalSessionState.deckSelectionState : syncedState.deckSelectionState,
      updatedAt: new Date().toISOString(), // Mark as updated now due to merge
    };
  } else {
    console.log('[_mergeFetchedSession] Using fetched state as primary, no specific local preservation needed based on rules.');
    return {
        ...syncedState,
        updatedAt: new Date().toISOString(), // Mark as updated now due to merge/sync
    };
  }
};

// --- updateSession Helper Functions ---

const _handleOfflineSessionUpdate = (
  updates: Partial<ReadingSessionState>,
  get: () => ReadingSessionStore,
  // set is not directly used here if updateLocalSession handles its own state setting via get()
) => {
  console.log('[_handleOfflineSessionUpdate] Updating local/offline session.');
  get().updateLocalSession(updates);
};

const _handleGuestBroadcastUpdate = async (
  updates: Partial<ReadingSessionState>,
  get: () => ReadingSessionStore,
  set: (partial: Partial<ReadingSessionStore> | ((state: ReadingSessionStore) => Partial<ReadingSessionStore>)) => void
) => {
  console.log('[_handleGuestBroadcastUpdate] Guest (non-host) broadcasting action.');
  await get().broadcastGuestAction('updateSession', updates);
  const currentSessionState = get().sessionState;
  if (currentSessionState) {
    set({
      sessionState: {
        ...currentSessionState,
        ...updates,
        updatedAt: new Date().toISOString(),
      },
    });
  }
};

const _performDatabaseSessionUpdate = async (
  updates: Partial<ReadingSessionState>,
  sessionState: ReadingSessionState, // Assumed non-null by caller
  user: User | null,
  isHost: boolean,
  participantId: string | null,
  anonymousId: string | null,
  get: () => ReadingSessionStore, // For broadcast fallback
  set: (partial: Partial<ReadingSessionStore> | ((state: ReadingSessionStore) => Partial<ReadingSessionStore>)) => void
) => {
  console.log('[_performDatabaseSessionUpdate] Attempting direct database update.');
  try {
    const updateData: any = {};
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

    console.log('[_performDatabaseSessionUpdate] Updating session with data:', updateData);
    console.log('[_performDatabaseSessionUpdate] Session ID:', sessionState.id);
    console.log('[_performDatabaseSessionUpdate] User info:', { userId: user?.id, participantId, anonymousId, isHost, isAnonymous: !user });

    if (!user && isHost && anonymousId) {
      console.log('[_performDatabaseSessionUpdate] Anonymous host RLS check.');
      const { data: hostCheck } = await supabase
        .from('session_participants')
        .select('id')
        .eq('session_id', sessionState.id)
        .eq('anonymous_id', anonymousId)
        .order('joined_at', { ascending: true })
        .limit(1)
        .single();
      if (!hostCheck) throw new Error('Anonymous host RLS verification failed');
      console.log('[_performDatabaseSessionUpdate] Anonymous host RLS verified.');
    }

    const { error } = await supabase
      .from('reading_sessions')
      .update(updateData)
      .eq('id', sessionState.id);

    if (error) throw error; // Let the catch block handle it

    set({
      sessionState: {
        ...sessionState,
        ...updates,
        updatedAt: new Date().toISOString(),
      },
    });
    console.log('[_performDatabaseSessionUpdate] Database update successful.');

  } catch (err: any) {
    console.error('[_performDatabaseSessionUpdate] Error during database update:', err);
    if (!user && isHost && (err.message?.includes('permission') || err.message?.includes('policy') || err.message?.includes('insufficient_privilege') || err.code === '42501' || err.code === 'PGRST301')) {
      console.warn('[_performDatabaseSessionUpdate] Anonymous host DB update failed (RLS), falling back to broadcast.');
      await get().broadcastGuestAction('hostUpdate', updates); // Use get() to call broadcastGuestAction
      // Optimistically update local state for the host
      set({
        sessionState: {
          ...sessionState,
          ...updates,
          updatedAt: new Date().toISOString(),
        },
      });
    } else if (!user && !isHost && (err.message?.includes('permission') || err.message?.includes('policy'))) {
      console.warn('[_performDatabaseSessionUpdate] Guest DB update failed as expected (RLS).');
      // Local state was already updated optimistically for guests, or should be via broadcast that was sent.
    } else {
      console.error('[_performDatabaseSessionUpdate] Unexpected database error:', err);
      set({ error: err.message });
    }
  }
};

// --- upgradeGuestAccount Helper Functions ---

const _updateParticipantForGuestUpgrade = async (participantId: string, newUserId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('session_participants')
      .update({ user_id: newUserId, anonymous_id: null })
      .eq('id', participantId);
    if (error) throw error;
    console.log('[_updateParticipantForGuestUpgrade] Participant record updated for guest upgrade.');
    return true;
  } catch (err) {
    console.error('[_updateParticipantForGuestUpgrade] Error updating participant record:', err);
    return false;
  }
};

const _updateSessionHostForGuestUpgrade = async (sessionId: string, newUserId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('reading_sessions')
      .update({ host_user_id: newUserId })
      .eq('id', sessionId);
    if (error) throw error;
    console.log('[_updateSessionHostForGuestUpgrade] Session host updated for guest upgrade.');
    return true;
  } catch (err) {
    console.error('[_updateSessionHostForGuestUpgrade] Error updating session host:', err);
    return false;
  }
};

const _refreshParticipantsAfterUpgrade = async (
  sessionId: string, 
  set: (partial: Partial<ReadingSessionStore> | ((state: ReadingSessionStore) => Partial<ReadingSessionStore>)) => void
) => {
  try {
    const { data: updatedParticipants } = await supabase
      .from('session_participants')
      .select('*')
      .eq('session_id', sessionId)
      .eq('is_active', true);
    if (updatedParticipants) {
      set({ participants: updatedParticipants as SessionParticipant[] });
      console.log('[_refreshParticipantsAfterUpgrade] Participants list refreshed.');
    }
  } catch (participantsError) {
    console.warn('[_refreshParticipantsAfterUpgrade] Could not refresh participants list after upgrade:', participantsError);
  }
};

// --- syncLocalSessionToDatabase Helper Functions ---

// Interface for the database schema (snake_case)
interface ReadingSessionDBSchema {
  host_user_id: string | null;
  deck_id: string;
  selected_layout: ReadingLayout | null; 
  question: string;
  reading_step: 'setup' | 'ask-question' | 'drawing' | 'interpretation';
  selected_cards: (Card & { position: string; isReversed: boolean; x?: number; y?: number; customPosition?: string })[];
  interpretation: string;
  zoom_level: number;
  pan_offset: { x: number; y: number }; 
  zoom_focus: { x: number; y: number } | null; 
  active_card_index: number | null;
  shared_modal_state: ReadingSessionState['sharedModalState']; 
  video_call_state: ReadingSessionState['videoCallState']; 
  loading_states: ReadingSessionState['loadingStates']; 
  deck_selection_state: ReadingSessionState['deckSelectionState']; 
  is_active: boolean;
  // id, created_at, updated_at are typically auto-managed by Supabase
}

const _prepareLocalSessionForSync = (localSessionState: ReadingSessionState, userId: string | undefined | null): Partial<ReadingSessionDBSchema> => {
  return {
    host_user_id: userId || localSessionState.hostUserId, 
    deck_id: localSessionState.deckId,
    selected_layout: localSessionState.selectedLayout,
    question: localSessionState.question,
    reading_step: localSessionState.readingStep,
    selected_cards: localSessionState.selectedCards,
    interpretation: localSessionState.interpretation,
    zoom_level: localSessionState.zoomLevel,
    pan_offset: localSessionState.panOffset,
    zoom_focus: localSessionState.zoomFocus,
    active_card_index: localSessionState.activeCardIndex,
    shared_modal_state: localSessionState.sharedModalState,
    video_call_state: localSessionState.videoCallState,
    loading_states: localSessionState.loadingStates,
    deck_selection_state: localSessionState.deckSelectionState,
    is_active: true, 
  };
};

const _insertSessionToDatabase = async (sessionPayload: Partial<ReadingSessionDBSchema>): Promise<{ id: string } | null> => {
  try {
    const { data, error } = await supabase
      .from('reading_sessions')
      .insert(sessionPayload) // Supabase client expects an object matching DB schema
      .select('id') 
      .single();
    if (error) throw error;
    return data as { id: string }; 
  } catch (err) {
    console.error('[_insertSessionToDatabase] Error inserting session to DB:', err);
    return null;
  }
};

const _finalizeLocalSessionSync = (
  newDbId: string, 
  oldLocalSessionState: ReadingSessionState,
  get: () => ReadingSessionStore,
  set: (partial: Partial<ReadingSessionStore> | ((state: ReadingSessionStore) => Partial<ReadingSessionStore>)) => void
) => {
  const syncedSessionState: ReadingSessionState = {
    ...oldLocalSessionState,
    id: newDbId, // Update with the new ID from the database
    updatedAt: new Date().toISOString(), // Mark as updated now
    // Potentially reset fields that should not carry over from local-only state if any
  };

  localStorage.removeItem(`tarot_session_${oldLocalSessionState.id}`); // Remove old local_ session
  get().saveLocalSession(syncedSessionState); // Save the new state (with DB ID) to localStorage

  set({
    sessionState: syncedSessionState,
    isOfflineMode: false,
    pendingSyncData: null,
  });
  console.log('[_finalizeLocalSessionSync] Successfully finalized sync of local session to database:', newDbId);
};

// --- End syncLocalSessionToDatabase Helper Functions ---

// --- checkSessionExpiry Helper Functions ---

const _fetchActiveParticipantsTimestamps = async (sessionId: string): Promise<{ last_seen_at: string }[] | null> => {
  try {
    const { data, error } = await supabase
      .from('session_participants')
      .select('last_seen_at')
      .eq('session_id', sessionId)
      .eq('is_active', true);
    if (error) throw error;
    return data;
  } catch (err) {
    console.error('[_fetchActiveParticipantsTimestamps] Error fetching participants:', err);
    return null;
  }
};

const _checkIfAllParticipantsAreStale = (participantsTimestamps: { last_seen_at: string }[] | null): boolean => {
  if (!participantsTimestamps || participantsTimestamps.length === 0) {
    console.log('[_checkIfAllParticipantsAreStale] No active participants found, considering stale.');
    return true; // No active participants means session can be considered stale for cleanup purposes
  }
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const allStale = participantsTimestamps.every(p => new Date(p.last_seen_at) < oneHourAgo);
  if (allStale) {
    console.log('[_checkIfAllParticipantsAreStale] All participants stale for over 1 hour.');
  }
  return allStale;
};

const _markSessionAsInactiveInDB = async (sessionId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('reading_sessions')
      .update({ is_active: false })
      .eq('id', sessionId);
    if (error) throw error;
    console.log('[_markSessionAsInactiveInDB] Session marked as inactive in DB:', sessionId);
    return true;
  } catch (err) {
    console.error('[_markSessionAsInactiveInDB] Error marking session inactive:', err);
    return false;
  }
};

// --- End checkSessionExpiry Helper Functions ---

export const useReadingSessionStore = create<ReadingSessionStore>()(
  subscribeWithSelector((set, get) => ({
    sessionState: null,
    participants: [],
    isHost: false,
    isLoading: true,
    error: null,
    initialSessionId: null,
    deckId: 'rider-waite-classic',
    channel: null,
    participantId: null,
    presenceInterval: null,
    anonymousId: null,
    isOfflineMode: false,
    pendingSyncData: null,
    _justRestoredFromPreservedState: false,

    setSessionState: (sessionState) => set({ sessionState }),
    setParticipants: (participants) => set({ participants }),
    setIsHost: (isHost) => set({ isHost }),
    setIsLoading: (isLoading) => set({ isLoading }),
    setError: (error) => set({ error }),
    setInitialSessionId: (initialSessionId) => set({ initialSessionId }),
    setDeckId: (deckId) => set({ deckId }),

    createSession: async () => {
      const { user } = useAuthStore.getState();
      const { deckId } = get();
      
      try {
        const { data, error } = await supabase
          .from('reading_sessions')
          .insert({
            host_user_id: user?.id || null, // null for guest sessions - clear and simple
            deck_id: deckId,
            reading_step: 'setup',
            selected_cards: [],
            zoom_level: 1.0,
            pan_offset: { x: 0, y: 0 },
            zoom_focus: null,
            shared_modal_state: null,
            is_active: true
          })
          .select()
          .single();

        if (error) throw error;

        return data.id;
      } catch (err: any) {
        console.error('Error creating session:', err);
        
        // Fallback to local session if database fails
        console.log('Database failed, creating local session as fallback');
        const localSessionId = get().createLocalSession();
        set({ isOfflineMode: true });
        return localSessionId;
      }
    },

    createLocalSession: () => {
      const { user } = useAuthStore.getState();
      const { deckId } = get();
      
      const sessionId = `local_${uuidv4()}`;
      const now = new Date().toISOString();
      
      const localSession: ReadingSessionState = {
        id: sessionId,
        hostUserId: user?.id || null,
        deckId,
        selectedLayout: null,
        question: '',
        readingStep: 'setup',
        selectedCards: [],
        shuffledDeck: [],
        interpretation: '',
        zoomLevel: 1.0,
        panOffset: { x: 0, y: 0 },
        zoomFocus: null,
        activeCardIndex: null,
        sharedModalState: null,
        videoCallState: null,
        loadingStates: null,
        isActive: true,
        createdAt: now,
        updatedAt: now
      };
      
      // Save to localStorage
      get().saveLocalSession(localSession);
      
      // Set as current session
      set({ 
        sessionState: localSession,
        isHost: true,
        isOfflineMode: true
      });
      
      return sessionId;
    },

    loadLocalSession: (sessionId: string) => {
      try {
        const stored = localStorage.getItem(`tarot_session_${sessionId}`);
        if (stored) {
          return JSON.parse(stored) as ReadingSessionState;
        }
      } catch (error) {
        console.error('Error loading local session:', error);
      }
      return null;
    },

    saveLocalSession: (sessionState: ReadingSessionState) => {
      try {
        localStorage.setItem(`tarot_session_${sessionState.id}`, JSON.stringify(sessionState));
      } catch (error) {
        console.error('Error saving local session:', error);
      }
    },

    updateLocalSession: (updates: Partial<ReadingSessionState>) => {
      const { sessionState } = get();
      
      if (!sessionState) return;
      
      const updatedSession = {
        ...sessionState,
        ...updates,
        updatedAt: new Date().toISOString()
      };
      
      // Update local state
      set({ sessionState: updatedSession });
      
      // Save to localStorage
      get().saveLocalSession(updatedSession);
      
      // Store pending sync data if we're offline
      const { isOfflineMode } = get();
      if (isOfflineMode) {
        set({ pendingSyncData: { ...get().pendingSyncData, ...updates } });
      }
    },

    syncLocalSessionToDatabase: async () => {
      const { sessionState, isOfflineMode } = get();
      
      if (!sessionState || !isOfflineMode || !sessionState.id.startsWith('local_')) {
        console.warn('[syncLocalSessionToDatabase] Conditions not met for sync. Aborting.');
        return false;
      }
      
      const { user } = useAuthStore.getState();
      const sessionPayloadToSync = _prepareLocalSessionForSync(sessionState, user?.id);

      console.log('[syncLocalSessionToDatabase] Attempting to insert session to DB with payload:', sessionPayloadToSync);
      const insertionResult = await _insertSessionToDatabase(sessionPayloadToSync);

      if (insertionResult && insertionResult.id) {
        _finalizeLocalSessionSync(insertionResult.id, sessionState, get, set);
        return true;
      } else {
        console.error('[syncLocalSessionToDatabase] Failed to insert session into database or get new ID.');
        // Optionally, set an error state here if needed
        // set({ error: 'Failed to sync session with the database.' });
        return false;
      }
    },

    joinSession: async (sessionId: string, accessMethod: 'invite' | 'direct' = 'direct') => {
      const { user } = useAuthStore.getState();
      set({ isLoading: true, error: null }); // Set loading true at the start

      try {
        const { data: session, error: sessionError } = await supabase
          .from('reading_sessions')
          .select('*')
          .eq('id', sessionId)
          .eq('is_active', true)
          .single();

        if (sessionError || !session) {
          set({ error: 'Session not found or inactive', isLoading: false });
          throw new Error('Session not found or inactive');
        }

        const determinedIsHost = (user && session.host_user_id === user.id) || 
                                 (!user && session.host_user_id === null && accessMethod === 'direct');

        set({ 
          sessionState: session as ReadingSessionState,
          isHost: determinedIsHost,
          // isLoading: false, // Keep loading true until participant is resolved
          error: null,
          initialSessionId: sessionId
        });

        // Use the refactored helper to ensure participant record
        const finalParticipantId = await _ensureParticipantRecord(sessionId, user, determinedIsHost, get, set);

        if (!finalParticipantId) {
          // _ensureParticipantRecord sets isLoading to false and an error if it fails critically.
          // If we are here, it means it might have returned null without a critical error, but we can't proceed.
          if (get().isLoading) set({ isLoading: false });
          if (!get().error) set({error: "Could not establish participant for session joining."});
          return null; 
        }

        set({ participantId: finalParticipantId, isLoading: false }); // Now set loading to false
        
        // Fetch current participants list
        const { data: participantsData, error: participantsFetchError } = await supabase
          .from('session_participants')
          .select('*')
          .eq('session_id', sessionId)
          .eq('is_active', true);

        if (participantsFetchError) {
          console.warn('[joinSession] Error fetching participants list:', participantsFetchError);
          // Continue, but participant list might be stale
        }
        if (participantsData) {
          set({ participants: participantsData as SessionParticipant[] });
        }

        // Setup realtime subscriptions
        if (get().participantId) {
            get().setupRealtimeSubscriptions();
        } else {
            console.warn("[joinSession] Cannot setup realtime subscriptions without a participantId.");
        }

        console.log('Successfully joined session:', sessionId);
        return sessionId;
      } catch (err: any) {
        console.error('Error joining session:', err);
        set({ error: err.message, isLoading: false });
        return null;
      }
    },

    updateSession: async (updates: Partial<ReadingSessionState>) => {
      const { sessionState, isOfflineMode, isHost, participantId, anonymousId } = get();
      const { user } = useAuthStore.getState();
      
      if (!sessionState?.id) {
        console.warn('[updateSession] No session ID available for update. Aborting.');
        return;
      }

      if (isOfflineMode || sessionState.id.startsWith('local_')) {
        _handleOfflineSessionUpdate(updates, get);
        return;
      }

      if (!user && !isHost) { // User is a guest (not authenticated via Supabase auth) AND not the host
        await _handleGuestBroadcastUpdate(updates, get, set);
        return;
      }

      // For authenticated users OR hosts (including anonymous hosts)
      await _performDatabaseSessionUpdate(updates, sessionState, user, isHost, participantId, anonymousId, get, set);
    },

    updatePresence: async () => {
      const { participantId } = get();
      
      if (!participantId) return;

      try {
        await supabase
          .from('session_participants')
          .update({ last_seen_at: new Date().toISOString() })
          .eq('id', participantId);
      } catch (err: any) {
        console.error('Error updating presence:', err);
      }
    },

    leaveSession: async () => {
      const { participantId } = get();
      
      if (!participantId) return;

      try {
        await supabase
          .from('session_participants')
          .update({ is_active: false })
          .eq('id', participantId);
      } catch (err: any) {
        console.error('Error leaving session:', err);
      }
    },

    upgradeGuestAccount: async (newUserId: string) => {
      const { participantId, anonymousId, sessionState, isHost } = get();
      
      if (!participantId || !anonymousId) {
        console.warn('[upgradeGuestAccount] Missing participantId or anonymousId. Aborting.');
        return false;
      }

      const participantUpdated = await _updateParticipantForGuestUpgrade(participantId, newUserId);
      if (!participantUpdated) return false;

      let hostUpdated = true; // Assume success or not applicable
      if (isHost && sessionState?.id && sessionState.hostUserId === null) {
        hostUpdated = await _updateSessionHostForGuestUpgrade(sessionState.id, newUserId);
        if (hostUpdated && sessionState) {
          // Update local session state immediately for hostUserId
          set({
            sessionState: {
              ...sessionState,
              hostUserId: newUserId,
              updatedAt: new Date().toISOString()
            }
          });
        } else if (!hostUpdated) {
          console.warn('[upgradeGuestAccount] Failed to update session host, but continuing with participant upgrade.');
          // Proceed even if session host update fails, participant link is primary.
        }
      }

      set({ anonymousId: null }); // Clear local anonymousId as user is now authenticated

      if (sessionState?.id) {
        await _refreshParticipantsAfterUpgrade(sessionState.id, set);
      }

      console.log('✅ Guest account upgraded successfully in session store logic.');
      return true; // Overall success if participant record was updated
    },

    setGuestName: async (name: string) => {
      const { participantId } = get();
      
      if (!participantId) return false;

      try {
        const { error } = await supabase
          .from('session_participants')
          .update({ name: name.trim() })
          .eq('id', participantId);

        if (error) throw error;
        return true;
      } catch (err: any) {
        console.error('Error setting guest name:', err);
        return false;
      }
    },

    setupRealtimeSubscriptions: () => {
      const { sessionState, channel: currentChannel, presenceInterval: currentPresenceInterval } = get();
      
      if (!sessionState?.id) {
        console.warn('[setupRealtimeSubscriptions] No session ID, cannot set up subscriptions.');
        return;
      }

      if (currentChannel) {
        console.log('[setupRealtimeSubscriptions] Unsubscribing from existing channel.');
        currentChannel.unsubscribe();
      }
      if (currentPresenceInterval) {
        clearInterval(currentPresenceInterval);
      }

      console.log(`[setupRealtimeSubscriptions] Creating new channel for session: ${sessionState.id}`);
      const newChannel = supabase.channel(`reading-session:${sessionState.id}`, {
        config: {
          broadcast: { self: false }, // Do not receive own broadcasts
          presence: { key: get().participantId || get().anonymousId || 'guest' } // Use participantId or anonymousId for presence key
        }
      });

      newChannel
        .on('postgres_changes', 
          { event: 'UPDATE', schema: 'public', table: 'reading_sessions', filter: `id=eq.${sessionState.id}` },
          (payload) => _handlePostgresSessionUpdate(payload, get, set)
        )
        .on('postgres_changes',
          { event: '*', schema: 'public', table: 'session_participants', filter: `session_id=eq.${sessionState.id}` },
          () => _handlePostgresParticipantChange(sessionState.id, get, set) // Pass sessionId
        )
        .on('broadcast', { event: 'guest_action' }, 
          (payload) => _handleBroadcastedGuestAction(payload, get, set)
        )
        .subscribe((status, err) => {
          if (status === 'SUBSCRIBED') {
            console.log(`[setupRealtimeSubscriptions] Successfully subscribed to channel: reading-session:${sessionState.id}`);
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            console.error(`[setupRealtimeSubscriptions] Channel subscription error for session ${sessionState.id}:`, status, err);
            // Optionally, attempt to re-subscribe or notify user
          }
        });

      set({ channel: newChannel });

      const newPresenceInterval = _managePresenceAndExpiryInterval(get, set);
      set({ presenceInterval: newPresenceInterval });
    },

    syncCompleteSessionState: async (sessionId: string) => {
      try {
        console.log('Syncing complete session state for:', sessionId);
        
        const { isHost: isCurrentUserHost, sessionState: currentLocalSessionState } = get();
        const { user } = useAuthStore.getState();
        
        // Fetch the latest session data
        const { data: fetchedSessionData, error: sessionError } = await supabase
          .from('reading_sessions')
          .select('*')
          .eq('id', sessionId)
          .eq('is_active', true)
          .single();

        if (sessionError || !fetchedSessionData) {
          console.error('Failed to fetch session for sync:', sessionError);
          set({ error: sessionError?.message || 'Failed to fetch session data for sync'});
          return false;
        }

        const mergedSessionState = _mergeFetchedSessionWithLocalState(
          fetchedSessionData,
          currentLocalSessionState,
          isCurrentUserHost,
          user
        );

        set({ sessionState: mergedSessionState });

        // Also sync participants
        const { data: participantsData, error: participantsFetchError } = await supabase
          .from('session_participants')
          .select('*')
          .eq('session_id', sessionId)
          .eq('is_active', true);

        if (participantsFetchError) {
            console.warn('[syncCompleteSessionState] Error fetching participants:', participantsFetchError);
        } else if (participantsData) {
          set({ participants: participantsData as SessionParticipant[] });
        }

        console.log('Complete session state synced successfully:', mergedSessionState);
        return true;
      } catch (error: any) {
        console.error('Error syncing complete session state:', error);
        set({ error: error.message });
        return false;
      }
    },

    initializeSession: async () => {
      const { user: initialUserCheck } = useAuthStore.getState(); 
      const initialStoreState = get();
      
      if (!initialUserCheck || !initialStoreState.initialSessionId) {
        set({ isLoading: true, error: null });
      } else {
        set({ error: null }); 
      }

      // Wait for auth state to be determined
      const authReady = await waitForAuthDetermination(get, set);
      if (!authReady) {
        return; // Abort if auth determination failed
      }

      // Re-fetch user from authStore now that authState is determined
      const { user } = useAuthStore.getState();

      // Ensure isLoading is true if it wasn't set at the very start but we are now proceeding with async ops
      if (!get().isLoading) {
        set({ isLoading: true });
      }

      try {
        let sessionId = initialStoreState.initialSessionId;
        let currentIsHost = get().isHost; // Get current host status before it might change

        if (!sessionId) {
          console.log('Creating new session for user:', user?.id || 'anonymous (no auth user id yet)');
          sessionId = await get().createSession();
          if (!sessionId) {
            set({ error: 'Failed to create session', isLoading: false });
            return;
          }
          set({ isHost: true }); // If we created the session, we are the host
          currentIsHost = true; // Update for local use in this function
        }
        
        const { data: sessionData, error: sessionFetchError } = await supabase
          .from('reading_sessions')
          .select('*')
          .eq('id', sessionId)
              .single();
              
        if (sessionFetchError || !sessionData) {
          console.error('Failed to fetch session for initialization:', sessionFetchError);
          set({ error: 'Failed to load session data', isLoading: false });
          return;
        }
        
        // Determine host status based on fetched session data and current user
        const determinedHostStatus = (user ? sessionData.host_user_id === user.id : sessionData.host_user_id === null);
        set({
          sessionState: sessionData as ReadingSessionState,
          isHost: determinedHostStatus, // Set host status based on DB and current user
          initialSessionId: sessionId
        });
        currentIsHost = determinedHostStatus; // Update local var after setting in store

        // Ensure participant record
        const finalParticipantId = await _ensureParticipantRecord(sessionId, user, currentIsHost, get, set);

        if (!finalParticipantId) {
            console.error("Failed to establish participant ID in initializeSession.");
            // _ensureParticipantRecord should have set isLoading:false and error if it failed critically
            // If get().isLoading is still true here, it means _ensureParticipantRecord might have returned null
            // without a critical error that stops the flow, but we still can't proceed.
            if (get().isLoading) set({ isLoading: false }); 
            if (!get().error) set({error: "Could not establish participant for session."});
            return; 
        }
        set({ participantId: finalParticipantId });

        // --- BEGIN STATE RESTORATION LOGIC ---
        await _restorePreservedSessionContext(sessionId, user, initialStoreState, finalParticipantId, get, set);
        // --- END STATE RESTORATION LOGIC ---

        const { data: participantsDataFromDB, error: participantsError } = await supabase
                    .from('session_participants')
                    .select('*')
                    .eq('session_id', sessionId)
                    .eq('is_active', true);
                  
        if (participantsError) {
          console.warn('Failed to fetch participants list in initializeSession:', participantsError);
        } else if (participantsDataFromDB) {
          set({ participants: participantsDataFromDB as SessionParticipant[] });
        }
        
        set({ isLoading: false }); // Moved loading:false to after potential state restoration

        if (get().participantId) {
          get().setupRealtimeSubscriptions();
        } else {
          console.warn("initializeSession: Cannot setup realtime subscriptions without a participantId.");
        }

      } catch (err: any) {
        console.error('Error initializing session:', err);
        set({ error: err.message, isLoading: false });
      }
    },

    cleanup: () => {
      const state = get();
      
      // Leave session
      state.leaveSession();
      
      // Clean up channel
      if (state.channel) {
        state.channel.unsubscribe();
      }
      
      // Clean up presence interval
      if (state.presenceInterval) {
        clearInterval(state.presenceInterval);
      }
      
      // Reset state
      set({
        channel: null,
        presenceInterval: null,
        participantId: null
      });
    },

    // Video call management functions
    startVideoCall: async () => {
      const { sessionState, participantId } = get();
      
      console.log('startVideoCall called with state:', {
        sessionId: sessionState?.id,
        participantId,
        hasSession: !!sessionState,
        hasParticipantId: !!participantId
      });
      
      if (!sessionState?.id || !participantId) {
        console.error('Cannot start video call: No session or participant ID');
        console.error('Current state:', {
          sessionState: sessionState ? { id: sessionState.id } : null,
          participantId,
          allState: get()
        });
        return null;
      }

      try {
        // Generate a video session ID (could be same as reading session or separate)
        const videoSessionId = sessionState.id; // Use same ID for simplicity
        
        // Update session state to indicate video call is active
        await get().updateSession({
          videoCallState: {
            isActive: true,
            sessionId: videoSessionId,
            hostParticipantId: participantId,
            participants: [participantId]
          }
        });

        return videoSessionId;
      } catch (error) {
        console.error('Error starting video call:', error);
        return null;
      }
    },

    joinVideoCall: async (videoSessionId: string) => {
      const { sessionState, participantId } = get();
      
      console.log('joinVideoCall called with state:', {
        videoSessionId,
        sessionId: sessionState?.id,
        participantId,
        hasSession: !!sessionState,
        hasParticipantId: !!participantId
      });
      
      if (!sessionState?.id || !participantId) {
        console.error('Cannot join video call: No session or participant ID');
        console.error('Current state:', {
          sessionState: sessionState ? { id: sessionState.id } : null,
          participantId,
          allState: get()
        });
        return false;
      }

      try {
        const currentVideoState = sessionState.videoCallState;
        
        if (!currentVideoState?.isActive) {
          console.error('No active video call to join');
          return false;
        }

        // Add participant to video call
        const updatedParticipants = currentVideoState.participants.includes(participantId)
          ? currentVideoState.participants
          : [...currentVideoState.participants, participantId];

        await get().updateSession({
          videoCallState: {
            ...currentVideoState,
            participants: updatedParticipants
          }
        });

        return true;
      } catch (error) {
        console.error('Error joining video call:', error);
        return false;
      }
    },

    leaveVideoCall: async () => {
      const { sessionState, participantId } = get();
      
      console.log('leaveVideoCall called with state:', {
        sessionId: sessionState?.id,
        participantId,
        hasSession: !!sessionState,
        hasParticipantId: !!participantId
      });
      
      if (!sessionState?.id || !participantId) {
        console.error('Cannot leave video call: No session or participant ID');
        console.error('Current state:', {
          sessionState: sessionState ? { id: sessionState.id } : null,
          participantId,
          allState: get()
        });
        return;
      }

      try {
        const currentVideoState = sessionState.videoCallState;
        
        if (!currentVideoState?.isActive) {
          return; // No active video call
        }

        // Remove participant from video call
        const updatedParticipants = currentVideoState.participants.filter(p => p !== participantId);
        
        // If no participants left or if host is leaving, end the call
        if (updatedParticipants.length === 0 || currentVideoState.hostParticipantId === participantId) {
          await get().updateSession({
            videoCallState: {
              ...currentVideoState,
              isActive: false,
              participants: []
            }
          });
        } else {
          await get().updateSession({
            videoCallState: {
              ...currentVideoState,
              participants: updatedParticipants
            }
          });
        }
      } catch (error) {
        console.error('Error leaving video call:', error);
      }
    },

    updateVideoCallParticipants: async (participants: string[]) => {
      const { sessionState } = get();
      
      if (!sessionState?.id) {
        console.error('Cannot update video call participants: No session ID');
        return;
      }

      try {
        const currentVideoState = sessionState.videoCallState;
        
        if (!currentVideoState?.isActive) {
          console.error('No active video call to update');
          return;
        }

        await get().updateSession({
          videoCallState: {
            ...currentVideoState,
            participants
          }
        });
      } catch (error) {
        console.error('Error updating video call participants:', error);
      }
    },

    broadcastGuestAction: async (action: string, data: any) => {
      const { channel, participantId, sessionState } = get();
      
      if (!channel || !sessionState?.id) {
        console.error('Cannot broadcast guest action: No channel or session');
        return;
      }

      try {
        console.log('Broadcasting guest action:', { action, data, participantId });
        
        const payload = {
          action,
          data,
          participantId,
          timestamp: Date.now()
        };

        channel.send({
          type: 'broadcast',
          event: 'guest_action',
          payload
        });
      } catch (error) {
        console.error('Error broadcasting guest action:', error);
      }
    },

    subscribeToBroadcast: (callback: (action: string, data: any, participantId: string) => void) => {
      const { channel } = get();
      
      if (!channel) {
        console.warn('Cannot subscribe to broadcast: No channel available');
        return () => {}; // Return empty unsubscribe function
      }

      // Subscribe to broadcast events
      const unsubscribe = channel.on('broadcast', { event: 'guest_action' }, (payload: any) => {
        const { action, data, participantId } = payload.payload;
        callback(action, data, participantId);
      });

      // Return unsubscribe function
      return () => {
        if (unsubscribe && typeof unsubscribe.unsubscribe === 'function') {
          unsubscribe.unsubscribe();
        }
      };
    },

    cleanupInactiveSessions: async () => {
      try {
        // Call the database function to cleanup inactive sessions
        console.log('[cleanupInactiveSessions] Calling RPC to cleanup_inactive_sessions.');
        const { error } = await supabase.rpc('cleanup_inactive_sessions');
        
        if (error) {
          console.error('[cleanupInactiveSessions] Error calling RPC:', error);
        } else {
          console.log('[cleanupInactiveSessions] Successfully called RPC cleanup_inactive_sessions');
        }
      } catch (err: any) {
        console.error('[cleanupInactiveSessions] Error in RPC call:', err);
      }
    },

    checkSessionExpiry: async () => {
      const { sessionState } = get();
      if (!sessionState?.id) {
        console.warn('[checkSessionExpiry] No session ID, cannot check expiry.');
        return false;
      }

      console.log(`[checkSessionExpiry] Checking expiry for session: ${sessionState.id}`);
      const participantsTimestamps = await _fetchActiveParticipantsTimestamps(sessionState.id);

      if (_checkIfAllParticipantsAreStale(participantsTimestamps)) {
        console.log(`[checkSessionExpiry] Session ${sessionState.id} determined stale. Marking inactive.`);
        await _markSessionAsInactiveInDB(sessionState.id);
        return true; // Session is stale/expired
      }

      console.log(`[checkSessionExpiry] Session ${sessionState.id} is not stale.`);
      return false; // Session is not stale
    }
  }))
);

// Computed selectors
export const getIsGuest = () => {
  const { user, isAnonymous } = useAuthStore.getState();
  const { anonymousId } = useReadingSessionStore.getState();
  // User is a guest if they don't exist OR if they're anonymous (have user object but no email)
  return (!user && !!anonymousId) || (user && isAnonymous());
}; 