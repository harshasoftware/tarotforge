import { useState, useEffect, useRef, useCallback, useMemo, memo } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { ArrowLeft, HelpCircle, Share2, Shuffle, Save, XCircle, Video, Zap, Copy, Check, ChevronLeft, ChevronRight, Info, ZoomIn, ZoomOut, RotateCcw, Menu, Users, UserPlus, UserMinus, Package, ShoppingBag, Plus, Home, Sparkles, Wand, Eye, EyeOff, X, ArrowUp, ArrowDown, FileText, UserCheck, UserX, LogIn, Keyboard, Navigation, BookOpen, Lightbulb, Sun, Moon, DoorOpen, ScanSearch, Music } from 'lucide-react';
import { Deck, Card, ReadingLayout } from '../../types';
import { useAuthStore } from '../../stores/authStore';
import { useSubscription } from '../../stores/subscriptionStore';
import { useReadingSessionStore, getIsGuest } from '../../stores/readingSessionStore';
import { fetchDeckById, fetchCardsByDeckId, fetchUserOwnedDecks } from '../../lib/deck-utils';
import { getReadingInterpretation, generateInspiredQuestions } from '../../lib/gemini-ai';
import VideoBubbles from '../../components/video/VideoBubbles';
import { useVideoCall } from '../../hooks/useVideoCall';
import TarotLogo from '../../components/ui/TarotLogo';
import TarotCardBack from '../../components/ui/TarotCardBack';
import GuestAccountUpgrade from '../../components/ui/GuestAccountUpgrade';
import ParticipantsDropdown from '../../components/ui/ParticipantsDropdown';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import SignInModal from '../../components/auth/SignInModal';
import Tooltip from '../../components/ui/Tooltip';
import { showParticipantNotification, showErrorToast, showSuccessToast } from '../../utils/toast';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../../lib/supabase';
import { readingLayouts, getThreeCardPositions } from './constants/layouts'; 
import { questionCategories } from './constants/questionCategories';
import { cardAnimationConfig, zoomAnimationConfig, cardFlipConfig } from './utils/animationConfigs';
import { getPlatformShortcut, KEY_CODES, KEY_VALUES } from './constants/shortcuts'; 
import { fisherYatesShuffle, cleanMarkdownText, getTransform } from './utils/cardHelpers';
import { getDefaultZoomLevel } from './utils/layoutHelpers'; 
import { generateShareableLink, getTodayDateString, isCacheValid, copyRoomLink as copyRoomLinkHelper } from './utils/sessionHelpers'; // Updated import
import { useDeviceAndOrientationDetection } from './hooks/useDeviceAndOrientationDetection';
import { debounce } from 'lodash';
import { useTheme } from '../../hooks/useTheme'; 
import { useGuestUpgrade } from './hooks/useGuestUpgrade';
import { useHelpModal } from './hooks/useHelpModal';
import Div100vh from 'react-div-100vh';
import { useReadingRoomKeyboardShortcuts } from './hooks/useReadingRoomKeyboardShortcuts'; // Added import
import { useBroadcastHandler } from './hooks/useBroadcastHandler'; // Added import
import { useParticipantNotificationHandler } from './hooks/useParticipantNotificationHandler'; // <<< ADD THIS LINE
import { useTouchInteractions } from './hooks/useTouchInteractions'; 
import { useDocumentMouseListeners } from './hooks/useDocumentMouseListeners'; // <<< ADD THIS LINE
import { useSoundManager } from '../../hooks/useSoundManager'; // Added SoundManager

// Coordinate transformation helper
const viewportToPercentage = (
  viewportX: number,
  viewportY: number,
  containerRect: DOMRect | undefined | null, 
  currentZoomLevel: number,
  currentPanOffset: { x: number; y: number },
  currentZoomFocus: { x: number; y: number } | null 
): { x: number; y: number } | null => {
  if (!containerRect || currentZoomLevel === 0) { 
    console.error('[viewportToPercentage] Invalid args:', { containerRect, currentZoomLevel });
    return null; 
  }

  const relativeX = viewportX - containerRect.left;
  const relativeY = viewportY - containerRect.top;
  const xAfterZoomAndOriginOffset = relativeX - currentPanOffset.x;
  const yAfterZoomAndOriginOffset = relativeY - currentPanOffset.y;
  const originalContainerWidth = containerRect.width / currentZoomLevel;
  const originalContainerHeight = containerRect.height / currentZoomLevel;

  if (originalContainerWidth === 0 || originalContainerHeight === 0) {
    console.error('[viewportToPercentage] Original container dimension is zero.');
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

  // Logging before constraint
  // console.log('[vTP] Before constraint PercX/Y:', { percX, percY });

  percX = Math.max(5, Math.min(95, percX));
  percY = Math.max(5, Math.min(95, percY));

  console.log('[vTP] Inputs:', { viewportX, viewportY, cL:containerRect.left, cT:containerRect.top, cW:containerRect.width, cH:containerRect.height, zoom:currentZoomLevel, pan:currentPanOffset, focus:currentZoomFocus });
  console.log('[vTP] relativeX/Y:', { relativeX, relativeY });
  console.log('[vTP] xAfterZoomAndOriginOffset:', { xCoord: xAfterZoomAndOriginOffset, yCoord: yAfterZoomAndOriginOffset });
  console.log('[vTP] originPx:', {originX_px, originY_px});
  console.log('[vTP] originalContentX/Y:', { originalContentX, originalContentY });
  console.log('[vTP] originalContainer W/H:', { originalContainerWidth, originalContainerHeight });
  console.log('[vTP] Final PercX/Y (constrained):', { percX, percY });

  return { x: percX, y: percY };
};

const ReadingRoom = () => {
  const { deckId } = useParams<{ deckId: string }>();
  const { user, setShowSignInModal, showSignInModal, isAnonymous, signInAnonymously } = useAuthStore();
  const { isSubscribed } = useSubscription();
  const navigate = useNavigate();
  const location = useLocation();
  
  const {
    isMuted,
    volume,
    playAmbientSound,
    pauseAmbientSound,
    toggleMute,
    setGlobalVolume,
    playSoundEffect,
  } = useSoundManager();
  
  // Get join session ID and access method from URL params
  const urlParams = new URLSearchParams(location.search);
  const joinSessionId = urlParams.get('join');
  const shouldCreateSession = urlParams.get('create') === 'true';
  const isInviteAccess = urlParams.get('invite') === 'true';
  
  // Initialize reading session store
  const {
    sessionState,
    participants,
    isHost,
    isLoading: sessionLoading,
    error: sessionError,
    updateSession,
    upgradeGuestAccount,
    setGuestName,
    setInitialSessionId,
    setDeckId,
    initializeSession,
    createSession,
    isOfflineMode,
    syncLocalSessionToDatabase,
    syncCompleteSessionState,
    cleanup,
    participantId,
    anonymousId,
    startVideoCall,
    broadcastGuestAction
  } = useReadingSessionStore();
  
  // Initialize video call store
  const { 
    isInCall, 
    connectionStatus, 
    initializeVideoCall, 
    cleanup: cleanupVideoCall, 
    endCall, 
    startCall,
    participants: videoParticipants 
  } = useVideoCall();
  
  // Use the new hook for device and orientation detection first
  const { isMobile, isTablet, isLandscape } = useDeviceAndOrientationDetection(); // Changed from useMobileDetection
  const { darkMode, toggleTheme } = useTheme();

  // Filter layouts for mobile - only show single-card and three-card spreads
  const availableLayouts = useMemo(() => {
    if (isMobile) {
      return readingLayouts.filter(layout =>
        layout.id === 'single-card' || layout.id === 'three-card'
      );
    }
    return readingLayouts;
  }, [isMobile]);
  const { 
    showGuestUpgrade, 
    setShowGuestUpgrade, 
  } = useGuestUpgrade();
  const { 
    showHelpModal, 
    setShowHelpModal,
    toggleHelpModal
  } = useHelpModal();
  
  // Properly detect guest users - anonymous users should be treated as guests
  const isGuest = !user || isAnonymous();
  
  // Handle successful authentication from SignInModal - moved before early returns to fix hooks order
  const handleSignInSuccess = useCallback(() => {
    // Close the modal - user is now authenticated and can use features
    setShowSignInModal(false);
    // Clear the stored path since we're already in the right place
    localStorage.removeItem('auth_return_path');
  }, [setShowSignInModal]);
  
  // Initialize session on mount
  useEffect(() => {
    playAmbientSound(); // Play ambient sound on mount
    const initSession = async () => {
      const auth = useAuthStore.getState(); // Get initial auth state

      if (!auth.user) { // If no user at all initially from store
        console.log('🎭 No authenticated user found, ensuring anonymous session...');
        try {
          const result = await signInAnonymously(); // This updates authStore internally

          if (result.error) {
            console.error('❌ Failed to ensure anonymous user:', result.error);
            setError('Failed to authenticate. Please refresh the page and try again.');
            return;
          }
          // After signInAnonymously, authStore.user should be the anonymous user.
          // A small delay can help ensure store propagation if needed, though Zustand is often synchronous.
          await new Promise(resolve => setTimeout(resolve, 50)); // Allow store to update
          const updatedAuthUser = useAuthStore.getState().user;
          if (updatedAuthUser && !updatedAuthUser.email) {
               console.log('✅ Anonymous user session ensured/retrieved. ID:', updatedAuthUser.id);
          } else if (updatedAuthUser) {
              console.log('User is authenticated, not anonymous:', updatedAuthUser.id);
          } else {
              console.warn('⚠️ Anonymous user ID not found in auth store even after signInAnonymously call.');
              setError('Authentication failed. Please refresh the page and try again.');
              return;
          }
        } catch (error) {
          console.error('❌ Error in signInAnonymously sequence:', error);
          setError('Authentication failed. Please refresh the page and try again.');
          return;
        }
      } else if (auth.user && !auth.user.email) { // Already an anonymous user in store
          console.log('🎭 Existing anonymous user in auth store. ID:', auth.user.id);
      } else { // Already an authenticated user in store
          console.log('👤 Existing authenticated user in auth store. ID:', auth.user.id);
      }
      
      if (shouldCreateSession) {
        // Create a new session and update URL
        try {
          const newSessionId = await createSession();
          if (newSessionId) {
            // Update URL to remove create flag and add session ID while preserving deck ID
            const currentPath = window.location.pathname;
            const newUrl = deckId && currentPath.includes(deckId)
              ? `/reading-room/${deckId}?join=${newSessionId}`
              : `/reading-room?join=${newSessionId}`;
            window.history.replaceState({}, '', newUrl);
            setInitialSessionId(newSessionId);
          } else {
            // Session creation failed, show error
            setError('Failed to create reading room session. Please try again.');
            return;
          }
        } catch (error) {
          console.error('Error creating session:', error);
          setError('Failed to create reading room session. Please try again.');
          return;
        }
      } else {
        setInitialSessionId(joinSessionId);
      }
      
      setDeckId(deckId || 'rider-waite-classic');
      // By now, useAuthStore().user should be stable (either anon or real).
      // initializeSession in useReadingSessionStore will use this stable user.
      await initializeSession();
    };
    
    initSession().catch(error => {
      console.error('Error initializing session:', error);
      setError('Failed to initialize session. Please try again.');
    });
    
    // Set up periodic sync for offline sessions and state synchronization
    const syncInterval = setInterval(async () => {
      if (isOfflineMode && sessionState?.id?.startsWith('local_')) {
        console.log('Attempting periodic sync of local session...');
        const synced = await syncLocalSessionToDatabase();
        if (synced) {
          console.log('Periodic sync successful');
          clearInterval(syncInterval);
        }
      } else if (sessionState?.id && !isHost && !sessionState.id.startsWith('local_')) {
        // For non-host participants, periodically sync state to ensure consistency
        console.log('Syncing session state for participant...');
        await syncCompleteSessionState(sessionState.id);
      }
    }, 30000); // Try every 30 seconds
    
    // Load question cache from localStorage
    try {
      const savedCache = localStorage.getItem('tarot_question_cache');
      if (savedCache) {
        const parsedCache = JSON.parse(savedCache);
        // Clean up expired cache entries (older than today)
        const today = getTodayDateString();
        const validCache: {[key: string]: {questions: string[], date: string}} = {};
        
        Object.entries(parsedCache).forEach(([category, data]: [string, any]) => {
          if (data.date === today) {
            validCache[category] = data;
          }
        });
        
        setQuestionCache(validCache);
        
        // Save cleaned cache back to localStorage
        if (Object.keys(validCache).length !== Object.keys(parsedCache).length) {
          localStorage.setItem('tarot_question_cache', JSON.stringify(validCache));
        }
      }
    } catch (error) {
      console.error('Error loading question cache:', error);
      localStorage.removeItem('tarot_question_cache');
    }
    
    // Handle browser navigation away from reading room
    const handleBeforeUnload = () => {
      if (isInCall) {
        console.log('Ending video call before page unload...');
        endCall();
      }
    };

    // Add event listener for page unload
    window.addEventListener('beforeunload', handleBeforeUnload);

    // Cleanup on unmount
    return () => {
      pauseAmbientSound(); // Pause ambient sound on unmount
      // End video call if user is in one before leaving
      if (isInCall) {
        console.log('Ending video call before leaving reading room...');
        endCall();
      }
      
      // Remove event listener
      window.removeEventListener('beforeunload', handleBeforeUnload);
      
      cleanup();
      cleanupVideoCall();
      clearInterval(syncInterval);
    };
  }, [joinSessionId, deckId, shouldCreateSession, user, setInitialSessionId, setDeckId, initializeSession, createSession, signInAnonymously, cleanup, cleanupVideoCall, syncCompleteSessionState, isHost, playAmbientSound, pauseAmbientSound]); // Added user and shouldCreateSession

  // Initialize video call when session is ready
  useEffect(() => {
    if (sessionState?.id && participantId) {
      console.log('Initializing video call for session:', sessionState.id, 'participant:', participantId);
      initializeVideoCall(sessionState.id, participantId);
    }
  }, [sessionState?.id, participantId,
    anonymousId, initializeVideoCall]);

  // Ensure complete state sync when joining via shared link
  useEffect(() => {
    if (joinSessionId && sessionState?.id && !isHost && !sessionLoading) {
      console.log('Performing immediate state sync for shared link join...');
      setIsSyncing(true);
      syncCompleteSessionState(sessionState.id).finally(() => {
        setIsSyncing(false);
      });
    }
  }, [joinSessionId, sessionState?.id, isHost, sessionLoading, syncCompleteSessionState]);
  
  // Watch for successful sync from offline to online
  useEffect(() => {
    const wasOffline = localStorage.getItem('was_offline_mode');
    if (wasOffline === 'true' && !isOfflineMode && sessionState?.id && !sessionState.id.startsWith('local_')) {
      setRecentlySynced(true);
      localStorage.removeItem('was_offline_mode');
      setTimeout(() => setRecentlySynced(false), 5000); // Show synced state for 5 seconds
    }
    
    // Track offline mode state
    if (isOfflineMode) {
      localStorage.setItem('was_offline_mode', 'true');
    }
  }, [isOfflineMode, sessionState?.id]);
  
  const [deck, setDeck] = useState<Deck | null>(null);
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [shuffledDeck, setShuffledDeck] = useState<Card[]>([]);
  const [isGeneratingInterpretation, setIsGeneratingInterpretation] = useState(false);
  
  // UI State
  const [showShareModal, setShowShareModal] = useState(false);
  const [showCopied, setShowCopied] = useState(false);
  const [showMobileInterpretation, setShowMobileInterpretation] = useState(false);
  
  // Pinch zoom hint state
  const [showPinchHint, setShowPinchHint] = useState(false);
  const [hasShownInitialHint, setHasShownInitialHint] = useState(false);
  
  // Sync state
  const [isSyncing, setIsSyncing] = useState(false);
  
  // Save functionality state

  
  // Shuffling state
  const [isShuffling, setIsShuffling] = useState(false);
  
  // Drag and Drop State
  const [draggedCard, setDraggedCard] = useState<Card | null>(null);
  const [draggedCardIndex, setDraggedCardIndex] = useState<number | null>(null);
  const [dragPosition, setDragPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [hoveredPosition, setHoveredPosition] = useState<number | null>(null);
  const [freeDropPosition, setFreeDropPosition] = useState<{ x: number; y: number } | null>(null);
  
  // Pinch to Zoom State
  const readingAreaRef = useRef<HTMLDivElement>(null);
  
  // Double tap zoom state
  const [lastTapTime, setLastTapTime] = useState(0);
  const [tapCount, setTapCount] = useState(0);
  
  // Pan state for drag-to-pan functionality - now synchronized via session state
  const [isPanning, setIsPanning] = useState(false);
  const [panStartPos, setPanStartPos] = useState({ x: 0, y: 0 });
  const [panStartOffset, setPanStartOffset] = useState({ x: 0, y: 0 });
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  
  // Sound UI State
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const volumeSliderTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Exit modal state
  const [showExitModal, setShowExitModal] = useState(false);
  
  // Follow functionality state
  const [isFollowing, setIsFollowing] = useState(false);
  const [showFollowNotification, setShowFollowNotification] = useState(false);
  
  
  // Follow functionality
  const toggleFollow = useCallback(() => {
    setIsFollowing(!isFollowing);
    if (!isFollowing) {
      setShowFollowNotification(true);
      setTimeout(() => setShowFollowNotification(false), 3000);
    }
  }, [isFollowing]);

  // Auto-follow host's view when following is enabled
  useEffect(() => {
    if (isFollowing && !isHost && sessionState) {
      // When following, don't allow local pan/zoom updates
      // The session state will automatically update from the host's actions
    }
  }, [isFollowing, isHost, sessionState]);
  
  // Double click state for desktop
  const [lastClickTime, setLastClickTime] = useState(0);
  const [clickCount, setClickCount] = useState(0);
  
  // Layout dropdown state
  const [showLayoutDropdown, setShowLayoutDropdown] = useState(false);
  const [highlightedLayoutIndex, setHighlightedLayoutIndex] = useState(0);
  const [highlightedSetupLayoutIndex, setHighlightedSetupLayoutIndex] = useState(0);

  // Carousel navigation state for mobile action bar
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const actionBarRef = useRef<HTMLDivElement>(null);
  
  // Video chat state
  const [showVideoChat, setShowVideoChat] = useState(false);
  const [isVideoConnecting, setIsVideoConnecting] = useState(false);
  
  // Track previous participants for notifications
  const [previousParticipants, setPreviousParticipants] = useState<typeof participants>([]);
  
  // Dragged placed card state (for moving cards in free layout)
  const [draggedPlacedCard, setDraggedPlacedCard] = useState<any>(null);
  const [draggedPlacedCardIndex, setDraggedPlacedCardIndex] = useState<number | null>(null);
  const [isDraggingPlacedCard, setIsDraggingPlacedCard] = useState(false);
  
  // Use session state instead of local state
  const selectedLayout = sessionState?.selectedLayout;
  const selectedCards = sessionState?.selectedCards || [];
  const question = sessionState?.question || '';
  const readingStep = sessionState?.readingStep || 'setup';
  const interpretation = sessionState?.interpretation || '';
  const zoomLevel = sessionState?.zoomLevel || 1;
  const panOffset = sessionState?.panOffset || { x: 0, y: 0 };
  const zoomFocus = sessionState?.zoomFocus || null;
  const activeCardIndex = sessionState?.activeCardIndex;
  const sharedModalState = sessionState?.sharedModalState;
  const sessionId = sessionState?.id;
  
  // Use shuffledDeck from session state, fallback to local state for initialization
  const sessionShuffledDeck = sessionState?.shuffledDeck || [];
  const shouldUseSessionDeck = sessionShuffledDeck.length > 0;
  
  // Use loading states from session state, fallback to local state
  const sessionLoadingStates = sessionState?.loadingStates;
  const sessionIsShuffling = sessionLoadingStates?.isShuffling || false;
  const sessionIsGeneratingInterpretation = sessionLoadingStates?.isGeneratingInterpretation || false;

  // Sync shuffledDeck with session state when session state changes
  useEffect(() => {
    if (shouldUseSessionDeck) {
      console.log('Syncing shuffled deck from session state:', sessionShuffledDeck.length, 'cards');
      setShuffledDeck(sessionShuffledDeck);
    }
  }, [sessionShuffledDeck, shouldUseSessionDeck]);

  // Sync loading states with session state when session state changes
  useEffect(() => {
    if (sessionLoadingStates) {
      console.log('Syncing loading states from session state:', sessionLoadingStates);
      setIsShuffling(sessionIsShuffling);
      setIsGeneratingInterpretation(sessionIsGeneratingInterpretation);
    }
  }, [sessionLoadingStates, sessionIsShuffling, sessionIsGeneratingInterpretation]);

  // Deck selection state
  const [userOwnedDecks, setUserOwnedDecks] = useState<Deck[]>([]);
  const [selectedDeckId, setSelectedDeckId] = useState<string | null>(null);
  const [deckSelectionLoading, setDeckSelectionLoading] = useState(false);
  
  // Add state to track if we're changing decks mid-session
  const [isChangingDeckMidSession, setIsChangingDeckMidSession] = useState(false);
  
  // Use synchronized deck selection state from session
  const sessionDeckSelectionState = sessionState?.deckSelectionState;
  const deckSelectionTab = sessionDeckSelectionState?.activeTab || 'collection';
  const isDeckSelectionOpen = sessionDeckSelectionState?.isOpen || false;
  const selectedMarketplaceDeckId = sessionDeckSelectionState?.selectedMarketplaceDeck;
  
  // Add state for marketplace decks
  const [marketplaceDecks, setMarketplaceDecks] = useState<Deck[]>([]);
  const [loadingMarketplace, setLoadingMarketplace] = useState(false);
  
  // Add state for marketplace deck details view - now synchronized
  const [selectedMarketplaceDeck, setSelectedMarketplaceDeck] = useState<Deck | null>(null);
  
  // Sync selectedMarketplaceDeck with session state
  useEffect(() => {
    if (selectedMarketplaceDeckId && marketplaceDecks.length > 0) {
      const deck = marketplaceDecks.find(d => d.id === selectedMarketplaceDeckId);
      if (deck && deck !== selectedMarketplaceDeck) {
        setSelectedMarketplaceDeck(deck);
      }
    } else if (!selectedMarketplaceDeckId && selectedMarketplaceDeck) {
      setSelectedMarketplaceDeck(null);
    }
  }, [selectedMarketplaceDeckId, marketplaceDecks, selectedMarketplaceDeck]);

  const [addingToCollection, setAddingToCollection] = useState(false);

  const [showSubscriptionRequired, setShowSubscriptionRequired] = useState(false);
  
  // Ask Question step state
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [generatedQuestions, setGeneratedQuestions] = useState<string[]>([]);
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(false);
  const [showCustomQuestionInput, setShowCustomQuestionInput] = useState(false);
  const [highlightedCategoryIndex, setHighlightedCategoryIndex] = useState(0);
  const [highlightedQuestionIndex, setHighlightedQuestionIndex] = useState(0);
  const [isQuestionHighlightingActive, setIsQuestionHighlightingActive] = useState(true);
  const [isCategoryHighlightingActive, setIsCategoryHighlightingActive] = useState(true);
  
  
  // Track cards used for current interpretation to prevent regeneration
  const [interpretationCards, setInterpretationCards] = useState<any[]>([]);
  
  // Cache for inspiration questions with daily expiration
  const [questionCache, setQuestionCache] = useState<{[key: string]: {questions: string[], date: string}}>({});
  
  // Deck refresh key to force visual re-render when deck is reset
  const [deckRefreshKey, setDeckRefreshKey] = useState(0);
  
  // Track recently synced state
  const [recentlySynced, setRecentlySynced] = useState(false);
  
  // Card gallery state - now synchronized
  const showCardGallery = sharedModalState?.isOpen || false;
  const galleryCardIndex = sharedModalState?.cardIndex ?? null;
  const showCardDescription = sharedModalState?.showDescription || false;
  

  const [gallerySwipeStart, setGallerySwipeStart] = useState<{ x: number; y: number } | null>(null);
  const [cardDescription, setCardDescription] = useState<string>('');
  const [loadingDescription, setLoadingDescription] = useState(false);
  
  
  // Memoized computed values to prevent unnecessary recalculations
  const cardCounts = useMemo(() => {
    const placedCards = selectedCards.filter(card => card).length;
    const totalRequired = selectedLayout?.card_count === 999 ? '∞' : selectedLayout?.card_count || 0;
    return { placedCards, totalRequired };
  }, [selectedCards, selectedLayout?.card_count]);
  
  const isReadingComplete = useMemo(() => {
    if (!selectedLayout) return false;
    if (selectedLayout.id === 'free-layout') return selectedCards.length > 0;
    return selectedCards.filter(card => card).length === selectedLayout.card_count;
  }, [selectedLayout, selectedCards]);
  
  const participantNames = useMemo(() => 
    participants.map(p => p.name || 'Anonymous').join(', ')
  , [participants]);

  // Determine collection tab label based on number of logged-in participants
  const collectionTabLabel = useMemo(() => {
    const loggedInParticipants = participants.filter(p => p.userId);
    // Include current user if logged in and not already in participants list
    const totalLoggedIn = user?.id && !loggedInParticipants.find(p => p.userId === user.id) 
      ? loggedInParticipants.length + 1 
      : loggedInParticipants.length;
    
    return totalLoggedIn > 1 ? 'Our Collection' : 'My Collection';
  }, [participants, user?.id]);

  // Get names of participants contributing to the collection
  const collectionContributors = useMemo(() => {
    const loggedInParticipants = participants.filter(p => p.userId);
    const names = loggedInParticipants.map(p => p.name || 'Anonymous');
    
    // Include current user if logged in and not already in participants list
    if (user?.id && !loggedInParticipants.find(p => p.userId === user.id)) {
      names.unshift('You');
    }
    
    return names;
  }, [participants, user?.id]);
  
  // Optimized mobile layout classes
  const mobileLayoutClasses = useMemo(() => ({
    topControls: isMobile
      ? 'top-0 left-0 right-0' // Mobile: Full width at top for two-row layout
      : 'top-4 left-4 right-4 flex justify-between items-start',
    mainPadding: isMobile
      ? (isLandscape ? 'px-6 pt-24 pb-4' : 'px-4 pt-28 pb-4') // Increased padding for two rows
      : 'p-4 pt-24',
    cardSize: isMobile ? 'w-20 h-30' : 'w-20 h-30 md:w-24 md:h-36',
    buttonSize: isMobile ? 'p-1.5' : 'p-2'
  }), [isMobile, isLandscape]);


  // Show pinch zoom hint when entering drawing step on mobile
  useEffect(() => {
    if (isMobile && readingStep === 'drawing' && !hasShownInitialHint) {
      setShowPinchHint(true);
      // setHasShownInitialHint(true);
      
      // Auto-hide after 2 seconds (faster fade)
      const timer = setTimeout(() => {
        setShowPinchHint(false);
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, [isMobile, readingStep, hasShownInitialHint]);


  // Function to hide hint manually
  const hideHint = useCallback(() => {
    setShowPinchHint(false);
  }, []);

  // Check scroll position for carousel navigation
  const checkScrollPosition = useCallback(() => {
    if (!actionBarRef.current) return;

    const { scrollLeft, scrollWidth, clientWidth } = actionBarRef.current;
    setCanScrollLeft(scrollLeft > 0);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 1);
  }, []);

  // Handle carousel navigation
  const scrollActionBar = useCallback((direction: 'left' | 'right') => {
    if (!actionBarRef.current) return;

    const scrollAmount = 200; // Scroll by 200px
    const currentScroll = actionBarRef.current.scrollLeft;

    actionBarRef.current.scrollTo({
      left: direction === 'left' ? currentScroll - scrollAmount : currentScroll + scrollAmount,
      behavior: 'smooth'
    });

    // Check scroll position after animation
    setTimeout(checkScrollPosition, 300);
  }, [checkScrollPosition]);

  // Monitor scroll changes
  useEffect(() => {
    const element = actionBarRef.current;
    if (!element || !isMobile) return;

    checkScrollPosition();
    element.addEventListener('scroll', checkScrollPosition);
    window.addEventListener('resize', checkScrollPosition);

    return () => {
      element.removeEventListener('scroll', checkScrollPosition);
      window.removeEventListener('resize', checkScrollPosition);
    };
  }, [checkScrollPosition, isMobile]);

  // Update session wrappers for state changes (moved before touch handlers)
  const setZoomLevelWrapped = useCallback((newZoomLevel: number) => {
    updateSession({ zoomLevel: newZoomLevel });
  }, [updateSession]);

  const setPanOffsetWrapped = useCallback((newPanOffset: { x: number; y: number }) => {
    if (!isFollowing) { // Only update if not following someone else
      updateSession({ panOffset: newPanOffset });
    }
  }, [updateSession, isFollowing]);

  const setZoomFocusWrapped = useCallback((newZoomFocus: { x: number; y: number } | null) => {
    if (!isFollowing) { // Only update if not following someone else
      updateSession({ zoomFocus: newZoomFocus });
    }
  }, [updateSession, isFollowing]);

  const setActiveCardIndexWrapped = useCallback((index: number | null) => {
    updateSession({ activeCardIndex: index });
  }, [updateSession]);

  const setReadingStepWrapped = useCallback((step: 'setup' | 'drawing' | 'interpretation') => {
    updateSession({ readingStep: step });
  }, [updateSession]);

  // Listen for shuffled deck updates from other participants
  useBroadcastHandler({
      sessionId: sessionState?.id,
      participantId,
      setShuffledDeck,
      setIsShuffling,
      setIsGeneratingInterpretation,
      setPanOffsetWrapped,
      setDeckRefreshKey,
      setShowMobileInterpretation,
      setInterpretationCards,
    });
  
  // Track participant changes for notifications with debouncing
  useParticipantNotificationHandler({
      sessionState,
      sessionLoading,
      participants,
      currentUser: user, // Pass the user from authStore as currentUser
      currentParticipantId: participantId, // This is participantId from readingSessionStore
      // currentAnonymousId is handled internally by the hook
  });  

  // Modal synchronization wrapper
  const updateSharedModalState = useCallback((modalState: {
    isOpen: boolean;
    cardIndex: number | null;
    showDescription: boolean;
    triggeredBy: string | null;
  } | null | undefined) => { // Allow undefined
    updateSession({ sharedModalState: modalState });
  }, [updateSession]);

  // Deck selection synchronization wrapper
  const updateDeckSelectionState = useCallback((deckSelectionState: {
    isOpen: boolean;
    activeTab: 'collection' | 'marketplace';
    selectedMarketplaceDeck: string | null;
    triggeredBy: string | null;
  } | null) => {
    updateSession({ deckSelectionState: deckSelectionState });
  }, [updateSession]);

  // Helper function to update deck selection tab
  const setDeckSelectionTab = useCallback((tab: 'collection' | 'marketplace') => {
    updateDeckSelectionState({
      isOpen: isDeckSelectionOpen,
      activeTab: tab,
      selectedMarketplaceDeck: selectedMarketplaceDeckId || null,
      triggeredBy: participantId || null
    });
  }, [updateDeckSelectionState, isDeckSelectionOpen, selectedMarketplaceDeckId, participantId]);

  // Helper function to open deck selection modal
  const openDeckSelection = useCallback(() => {
    // If there's already a deck selected, enter deck change mode (don't use session state)
    if (deck) {
      setIsChangingDeckMidSession(true);
      setDeck(null);
      setCards([]);
      setShuffledDeck([]);
      setSelectedDeckId(null);
      return; // Exit early, don't update session state
    }
    
    // Only update session state if no deck is selected (initial setup)
    updateDeckSelectionState({
      isOpen: true,
      activeTab: deckSelectionTab,
      selectedMarketplaceDeck: selectedMarketplaceDeckId || null,
      triggeredBy: participantId || null
    });
  }, [updateDeckSelectionState, deckSelectionTab, selectedMarketplaceDeckId, participantId,
    anonymousId, deck, setDeck, setCards, setShuffledDeck, setSelectedDeckId, setIsChangingDeckMidSession]);

  // Helper function to close deck selection modal
  const closeDeckSelection = useCallback(() => {
    updateDeckSelectionState(null);
  }, [updateDeckSelectionState]);

  // Helper function to select marketplace deck
  const selectMarketplaceDeck = useCallback((deckId: string | null) => {
    updateDeckSelectionState({
      isOpen: isDeckSelectionOpen,
      activeTab: deckSelectionTab,
      selectedMarketplaceDeck: deckId,
      triggeredBy: participantId || null
    });
  }, [updateDeckSelectionState, isDeckSelectionOpen, deckSelectionTab, participantId]);

    // Fetch combined collection from all logged-in participants
  const fetchCombinedCollection = useCallback(async () => {
    try {
      const allDecks = new Map<string, Deck>();
      
      // Get all logged-in participants (those with user_id)
      const loggedInParticipants = participants.filter(p => p.userId);
      
      // If current user is logged in, include them even if not in participants list yet
      if (user?.id && !loggedInParticipants.find(p => p.userId === user.id)) {
        loggedInParticipants.push({
          id: 'current-user',
          sessionId: sessionState?.id || '',
          userId: user.id,
          anonymousId: null,
          name: user.email?.split('@')[0] || 'You',
          isActive: true,
          joinedAt: new Date().toISOString()
        });
      }
      
      console.log('Fetching combined collection for participants:', loggedInParticipants.map(p => ({ userId: p.userId, name: p.name })));
      console.log('Current user:', user?.id ? { id: user.id, email: user.email } : 'No user (guest)');
      
      // If no logged-in participants, fetch free decks for guests
      if (loggedInParticipants.length === 0) {
        console.log('No logged-in participants, fetching free decks for guest access');
        const freeDecks = await fetchUserOwnedDecks(); // Call without userId for guest access
        setUserOwnedDecks(freeDecks);
        return;
      }
      
      // Fetch decks for each logged-in participant
      for (const participant of loggedInParticipants) {
        if (participant.userId) {
          try {
            const participantDecks = await fetchUserOwnedDecks(participant.userId);
            participantDecks.forEach(deck => {
              // Use Map to automatically deduplicate by deck ID
              allDecks.set(deck.id, deck);
            });
          } catch (error) {
            console.error(`Error fetching decks for participant ${participant.name}:`, error);
          }
        }
      }
      
      // Convert Map back to array and sort by title
      const combinedDecks = Array.from(allDecks.values()).sort((a, b) => a.title.localeCompare(b.title));
      
      console.log(`Combined collection: ${combinedDecks.length} unique decks from ${loggedInParticipants.length} participants`);
      console.log('Combined decks:', combinedDecks.map(d => ({ id: d.id, title: d.title })));
      
      // If no decks found, ensure we at least have the Rider-Waite deck
      if (combinedDecks.length === 0) {
        console.log('No decks found, adding Rider-Waite deck as fallback');
        const freeDecks = await fetchUserOwnedDecks(); // Call without userId for guest access
        setUserOwnedDecks(freeDecks);
      } else {
        setUserOwnedDecks(combinedDecks);
      }
      
    } catch (error) {
      console.error('Error fetching combined collection:', error);
      // Fallback to free decks for all users
      console.log('Error fallback: fetching free decks');
      const fallbackDecks = await fetchUserOwnedDecks(user?.id);
      setUserOwnedDecks(fallbackDecks);
    }
  }, [participants, user?.id, sessionState?.id]);

  // Refetch combined collection when participants change or when user changes
  useEffect(() => {
    // Always fetch collection if we have a user or participants
    if (user?.id || participants.length > 0) {
      fetchCombinedCollection();
    }
  }, [participants, fetchCombinedCollection, user?.id]);

  // Auto-show video chat when user is in a video call or when participants are detected
  useEffect(() => {
    // Only show video chat UI when user is actively in a video call
    // Remove auto-show when participants are detected - video should only start when explicitly requested
    if (isInCall && !showVideoChat && (readingStep === 'drawing' || readingStep === 'interpretation')) {
      console.log('Showing video chat UI - user is in video call:', {
        isInCall,
        readingStep
      });
      setShowVideoChat(true);
    }
    
    // Hide video chat UI when user leaves video call or exits drawing/interpretation steps
    if (showVideoChat && (!isInCall || (readingStep !== 'drawing' && readingStep !== 'interpretation'))) {
      console.log('Hiding video chat UI - user left video call or exited drawing/interpretation step:', {
        isInCall,
        readingStep
      });
      setShowVideoChat(false);
    }
  }, [isInCall, showVideoChat, readingStep]);



  // Fisher-Yates shuffle algorithm (Durstenfeld modern implementation)

  const handleLayoutSelect = useCallback((layout: ReadingLayout) => {
    try {
      console.log('Layout selected:', layout);
      playSoundEffect('pop');
      
      // Determine the appropriate reading step based on current state
      // If user is already in a reading session (past setup), skip question step
      const targetReadingStep = (readingStep && readingStep !== 'setup') ? 'drawing' : 'ask-question';
      
      // Prepare the base update object
      const updateData: any = {
        selectedLayout: layout,
        selectedCards: [],
        readingStep: targetReadingStep,
        interpretation: '',
        activeCardIndex: null,
        zoomLevel: isMobile
          ? isLandscape // Mobile Landscape
            ? layout.id === 'celtic-cross'
              ? 0.8 // Celtic Cross mobile landscape
              : 1.0 // All other layouts (including three-card, single-card) mobile landscape
            : // Mobile Portrait
              layout.id === 'celtic-cross'
              ? 0.6 // Celtic Cross mobile portrait
              : 0.8 // All other layouts (including three-card, single-card) mobile portrait
          : // Desktop
            layout.id === 'celtic-cross'
            ? 1.0 // Celtic Cross desktop
            : layout.id === 'three-card' || layout.id === 'single-card'
            ? 2.0 // Three-card & Single-card desktop
            : 1.6 // All other layouts desktop
      };
      
      // Only shuffle if cards are loaded and not already in session state
      if (cards && cards.length > 0 && !shouldUseSessionDeck) {
        const newShuffledDeck = fisherYatesShuffle(cards);
        setShuffledDeck(newShuffledDeck);
        // Include shuffled deck in the same update to prevent multiple database calls
        updateData.shuffledDeck = newShuffledDeck;
      }
      
      // Single update session call to prevent flickering
      updateSession(updateData);
      
      // Trigger deck visual refresh animation
      setDeckRefreshKey(prev => prev + 1);
    } catch (error) {
      console.error('Error selecting layout:', error);
      setError('Failed to select layout. Please try again.');
    }
  }, [updateSession, cards, isMobile, isLandscape, fisherYatesShuffle, readingStep, shouldUseSessionDeck, playSoundEffect]);

  const handleQuestionChange = useCallback((newQuestion: string) => {
    updateSession({ question: newQuestion });
  }, [updateSession]);
  
  // Ask Question handlers
  const handleCategorySelect = useCallback(async (category: string | null) => {
    if (category === null) { // Handle deselection
      setSelectedCategory(null);
      setGeneratedQuestions([]);
      setHighlightedQuestionIndex(0); // Reset question highlighting
      setIsQuestionHighlightingActive(true); // Re-enable highlighting on keyboard use
      return;
    }
    playSoundEffect('pop');
    setSelectedCategory(category);
    setHighlightedQuestionIndex(0); // Reset question highlighting when selecting new category
    
    // Check if we have valid cached questions for this category
    if (isCacheValid(category, questionCache)) { // Pass questionCache here
      const cachedQuestions = questionCache[category].questions;
      setGeneratedQuestions(cachedQuestions);
      return;
    }
    
    setIsLoadingQuestions(true);
    
    try {
      const questions = await generateInspiredQuestions(category, 4);
      setGeneratedQuestions(questions);
      
      // Cache the questions with today's date
      const today = getTodayDateString();
      const newCache = {
        ...questionCache,
        [category]: {
          questions,
          date: today
        }
      };
      
      setQuestionCache(newCache);
      
      // Save to localStorage
      try {
        localStorage.setItem('tarot_question_cache', JSON.stringify(newCache));
      } catch (error) {
        console.error('Error saving question cache:', error);
      }
      
    } catch (error) {
      console.error('Error generating questions:', error);
      // Set fallback questions
      const fallbackQuestions = [
        "What guidance do I need right now?",
        "What should I focus on in this area of my life?",
        "What obstacles should I be aware of?",
        "What opportunities await me?"
      ];
      setGeneratedQuestions(fallbackQuestions);
      
      // Cache fallback questions too
      const today = getTodayDateString();
      const newCache = {
        ...questionCache,
        [category]: {
          questions: fallbackQuestions,
          date: today
        }
      };
      
      setQuestionCache(newCache);
      
      try {
        localStorage.setItem('tarot_question_cache', JSON.stringify(newCache));
      } catch (error) {
        console.error('Error saving fallback question cache:', error);
      }
    } finally {
      setIsLoadingQuestions(false);
    }
  }, [questionCache, isCacheValid, getTodayDateString, playSoundEffect]); // Add isCacheValid and getTodayDateString to dependencies
  
  const handleQuestionSelect = useCallback((selectedQuestion: string) => {
    playSoundEffect('pop');
    updateSession({ question: selectedQuestion, readingStep: 'drawing' });
  }, [updateSession, playSoundEffect]);
  
  const handleSkipQuestion = useCallback(() => {
    updateSession({ readingStep: 'drawing' });
  }, [updateSession]);
  
  const handleCustomQuestion = useCallback((customQuestion: string) => {
    updateSession({ question: customQuestion, readingStep: 'drawing' });
  }, [updateSession]);
  
  // Handle deck selection
  const handleDeckSelect = useCallback(async (deck: Deck) => {
    try {
      await fetchAndSetDeck(deck.id);
      // Update URL to reflect selected deck while preserving session ID
      const currentParams = new URLSearchParams(location.search);
      const sessionParam = currentParams.get('join');
      const newUrl = sessionParam 
        ? `/reading-room/${deck.id}?join=${sessionParam}`
        : `/reading-room/${deck.id}`;
      window.history.replaceState({}, '', newUrl);
      // Trigger deck visual refresh animation
      setDeckRefreshKey(prev => prev + 1);
    } catch (error) {
      console.error('Error selecting deck:', error);
      setError('Failed to select deck. Please try again.');
    }
  }, [location.search]);
  
  // Handle deck change during reading (preserve session state)
  const handleDeckChange = useCallback(async (deck: Deck) => {
    try {
      // When changing decks mid-session, preserve current state
      const preservedState = {
        selectedLayout,
        question,
        readingStep,
        zoomLevel,
        // Only reset cards if we're in drawing step
        selectedCards: readingStep === 'drawing' ? [] : selectedCards,
        // Reset interpretation if it exists since it's deck-specific
        interpretation: '',
        activeCardIndex: null
      };
      
      updateSession(preservedState);
      
      await fetchAndSetDeck(deck.id);
      // Update URL to reflect new deck while preserving session ID
      const currentParams = new URLSearchParams(location.search);
      const sessionParam = currentParams.get('join');
      const newUrl = sessionParam 
        ? `/reading-room/${deck.id}?join=${sessionParam}`
        : `/reading-room/${deck.id}`;
      window.history.replaceState({}, '', newUrl);
      
      // Trigger deck visual refresh animation
      setDeckRefreshKey(prev => prev + 1);
      
      // Close deck selection and return to current state
      setIsChangingDeckMidSession(false);
    } catch (error) {
      console.error('Error changing deck:', error);
      setError('Failed to change deck. Please try again.');
    }
  }, [updateSession, selectedLayout, question, readingStep, zoomLevel, selectedCards, location.search]);
  
  
  // Debounced pan and zoom handlers for better performance
  const debouncedPanMove = useMemo(
    () => debounce((clientX: number, clientY: number) => {
      if (!isPanning || zoomLevel <= 1) return;
      
      const deltaX = clientX - panStartPos.x;
      const deltaY = clientY - panStartPos.y;
      
      // Apply sensitivity and constraints
      const sensitivity = 1;
      const maxPan = 200; // Maximum pan distance in pixels
      
      const newPanX = Math.max(-maxPan, Math.min(maxPan, panStartOffset.x + deltaX * sensitivity));
      const newPanY = Math.max(-maxPan, Math.min(maxPan, panStartOffset.y + deltaY * sensitivity));
      
      setPanOffsetWrapped({ x: newPanX, y: newPanY });
    }, 8), // Reduced to ~120fps for smoother movement
    [isPanning, zoomLevel, panStartPos.x, panStartPos.y, panStartOffset.x, panStartOffset.y]
  );
  
  const debouncedZoomUpdate = useMemo(
    () => debounce((scale: number) => {
      setZoomLevelWrapped(Math.max(0.5, Math.min(2, scale)));
    }, 8), // Reduced to ~120fps for smoother zooming
    [setZoomLevelWrapped]
  );
  
  // Close layout dropdown when clicking outside
  useEffect(() => {
    if (!showLayoutDropdown) return;
    
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.layout-dropdown-container')) {
        setShowLayoutDropdown(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showLayoutDropdown]);
  
  // Fetch deck and cards data
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Fetch combined collection from all logged-in participants
        console.log('Initial data fetch - calling fetchCombinedCollection');
        await fetchCombinedCollection();
        
        // If there's a deckId in the URL, use that deck
        if (deckId) {
          await fetchAndSetDeck(deckId);
        } else {
          // No deck specified, keep on loading screen until deck is selected
          setLoading(false);
        }
      } catch (error: any) {
        console.error('Error fetching initial data:', error);
        setError(error.message || "An error occurred loading the reading room. Please try again.");
        setLoading(false);
      }
    };
    
    fetchInitialData();
  }, [deckId, user?.id]);
  
  // Function to fetch and set a specific deck
  const fetchAndSetDeck = async (targetDeckId: string) => {
    try {
      setDeckSelectionLoading(true);
      
      const deckData = await fetchDeckById(targetDeckId);
      
      if (deckData) {
        setDeck(deckData);
        setSelectedDeckId(targetDeckId);
        
        // Fetch cards for this deck
        const cardsData = await fetchCardsByDeckId(targetDeckId);
        
        if (cardsData && cardsData.length > 0) {
          setCards(cardsData);
          const newShuffledDeck = fisherYatesShuffle(cardsData);
          setShuffledDeck(newShuffledDeck);
          
          // Update session state with new shuffled deck
          updateSession({ shuffledDeck: newShuffledDeck });
          
          // Preload card images
          cardsData.forEach(card => {
            if (card.image_url) {
              const img = new Image();
              img.src = card.image_url;
            }
          });
          
          // Trigger deck visual refresh animation when new deck is loaded
          setDeckRefreshKey(prev => prev + 1);
        } else {
          throw new Error("No cards found for this deck");
        }
        
        // Move to setup step if not already in a reading or changing decks mid-session
        if ((!readingStep || readingStep === 'setup') && !isChangingDeckMidSession) {
          setReadingStepWrapped('setup');
        }
      } else {
        throw new Error("Deck not found");
      }
    } catch (error: any) {
      console.error('Error fetching deck data:', error);
      setError(error.message || "An error occurred loading the deck. Please try again.");
    } finally {
      setDeckSelectionLoading(false);
      setLoading(false);
    }
  };
  
  const shuffleDeck = useCallback(() => {
    setIsShuffling(true);
    playSoundEffect('shuffle');
    
    // Update session state to show shuffling for all participants
    updateSession({ 
      loadingStates: { 
        isShuffling: true, 
        isGeneratingInterpretation: false,
        triggeredBy: participantId 
      } 
    });
    
    // Add a delay to show the shuffling animation
    setTimeout(() => {
      const currentDeck = shouldUseSessionDeck ? sessionShuffledDeck : shuffledDeck;
      const newShuffledDeck = fisherYatesShuffle(currentDeck);
      setShuffledDeck(newShuffledDeck);
      setIsShuffling(false);
      setDeckRefreshKey(prev => prev + 1); // Force deck visual refresh
      
      // Update session state with new shuffled deck and clear loading state
      updateSession({ 
        shuffledDeck: newShuffledDeck,
        loadingStates: null
      });
      
      // Broadcast shuffle action to other participants
      broadcastGuestAction('shuffleDeck', { 
        shuffledDeck: newShuffledDeck 
      });
    }, 1000); // 1 second delay for shuffling animation
  }, [fisherYatesShuffle, shuffledDeck, sessionShuffledDeck, shouldUseSessionDeck, updateSession, broadcastGuestAction, participantId, playSoundEffect]);

  // Handle placed card drag start
  const handlePlacedCardDragStart = useCallback((cardIndex: number) => { // <<< MUST ACCEPT cardIndex
    setIsDraggingPlacedCard(true);
    setDraggedPlacedCardIndex(cardIndex); // Use the passed cardIndex
  }, [setIsDraggingPlacedCard, setDraggedPlacedCardIndex]); // Dependencies are correct
  
  // Handle placed card drag end
  const handlePlacedCardDragEnd = useCallback((event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo, cardIndex: number) => {
    // ... (setIsDraggingPlacedCard, checks) ...
    const finalViewportX = info.point.x;
    const finalViewportY = info.point.y;
    // ... (logs) ...
    const percentagePos = viewportToPercentage(
      finalViewportX,
      finalViewportY,
      readingAreaRef.current?.getBoundingClientRect(),
      zoomLevel, 
      panOffset, 
      zoomFocus // Pass zoomFocus
    );
    // ... (rest of function) ...
  }, [selectedLayout?.id, selectedCards, updateSession, zoomLevel, panOffset, zoomFocus]); // Added zoomFocus to dependencies
  
  const zoomIn = useCallback(() => {
    setZoomLevelWrapped(Math.min(zoomLevel + 0.2, 2));
  }, [setZoomLevelWrapped, zoomLevel]);
  
  const zoomOut = useCallback(() => {
    setZoomLevelWrapped(Math.max(zoomLevel - 0.2, 0.5));
  }, [setZoomLevelWrapped, zoomLevel]);
  
  const resetZoom = useCallback(() => {
    setZoomLevelWrapped(1);
    setZoomFocusWrapped(null);
    setPanOffsetWrapped({ x: 0, y: 0 });
  }, [setZoomLevelWrapped, setZoomFocusWrapped, setPanOffsetWrapped]);
  
  // Reset pan to center
  const resetPan = useCallback(() => {
    setPanOffsetWrapped({ x: 0, y: 0 });
    
    // Broadcast reset pan action to other participants
    broadcastGuestAction('resetPan', { 
      panOffset: { x: 0, y: 0 }
    });
  }, [setPanOffsetWrapped, broadcastGuestAction]);
  
  // Directional panning functions
  const panDirection = useCallback((direction: 'up' | 'down' | 'left' | 'right') => {
    const panStep = 50; // pixels to move per step
    const maxPan = 200; // maximum pan distance
    
    let newX = panOffset.x;
    let newY = panOffset.y;
    
    switch (direction) {
      case 'up':
        newY = Math.min(maxPan, panOffset.y + panStep);
        break;
      case 'down':
        newY = Math.max(-maxPan, panOffset.y - panStep);
        break;
      case 'left':
        newX = Math.min(maxPan, panOffset.x + panStep);
        break;
      case 'right':
        newX = Math.max(-maxPan, panOffset.x - panStep);
        break;
    }
    
    setPanOffsetWrapped({ x: newX, y: newY });
  }, [panOffset, setPanOffsetWrapped]);
  
  const resetReading = useCallback(() => {
    let newShuffledDeck: Card[] = [];
    if (cards.length > 0) {
      newShuffledDeck = fisherYatesShuffle(cards);
      setShuffledDeck(newShuffledDeck);
    }
    
    updateSession({
      readingStep: 'setup',
      selectedLayout: null,
      selectedCards: [],
      interpretation: '',
      activeCardIndex: null,
      zoomLevel: 1, // Reset to 1 when no layout is selected
      shuffledDeck: newShuffledDeck
    });
    
    setShowMobileInterpretation(false);
    setInterpretationCards([]); // Clear interpretation cards tracking
    
    // Broadcast reset reading action to other participants
    broadcastGuestAction('resetReading', { 
      shuffledDeck: newShuffledDeck,
      resetType: 'full'
    });
  }, [updateSession, cards, fisherYatesShuffle, broadcastGuestAction, user, participants, participantId,
    anonymousId, getDefaultZoomLevel, selectedLayout, isMobile]);
  
  const resetCards = useCallback(() => {
    // Shuffle and restore all cards to create a fresh deck
    let freshlyShuffled: Card[] = [];
    if (cards.length > 0) {
      // Force a fresh shuffle by creating a new shuffled array
      freshlyShuffled = fisherYatesShuffle([...cards]);
      setShuffledDeck(freshlyShuffled);
    }
    
    // Return cards to deck and go back to drawing step, but keep layout and question
    updateSession({
      selectedCards: [],
      interpretation: '',
      activeCardIndex: null,
      readingStep: 'drawing',
      zoomLevel: getDefaultZoomLevel(selectedLayout, isMobile, isLandscape),
      shuffledDeck: freshlyShuffled
    });
    
    setShowMobileInterpretation(false);
    setZoomFocusWrapped(null);
    setPanOffsetWrapped({ x: 0, y: 0 });
    setInterpretationCards([]); // Clear interpretation cards tracking
    setDeckRefreshKey(prev => prev + 1); // Force deck visual refresh
    
    // Broadcast reset cards action to other participants
    broadcastGuestAction('resetCards', { 
      shuffledDeck: freshlyShuffled,
      resetType: 'cards',
      participantName: user?.email?.split('@')[0] || participants.find(p => p.id === participantId)?.name || 'Anonymous',
      isAnonymous: !user
    });
  }, [updateSession, cards, fisherYatesShuffle, broadcastGuestAction, user, participants, participantId,
    anonymousId, getDefaultZoomLevel, selectedLayout, isMobile]);
  
  // Drag and Drop Functions
  const handleDragStart = (card: Card, index: number, e: any) => {
    setDraggedCard(card);
    setDraggedCardIndex(index);
    setIsDragging(true);
    
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    setDragPosition({ x: clientX, y: clientY });
    
    if ('dataTransfer' in e) {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', '');
    }
  };
  
  const handleDragMove = (e: any) => {
    if (!isDragging) return;
    
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    setDragPosition({ x: clientX, y: clientY });
  };
  
  const handleDragEnd = () => {
    setIsDragging(false);
    setDraggedCard(null);
    setDraggedCardIndex(null);
    setHoveredPosition(null);
  };
  
  // Function to draw the next available card to a position (for mobile tap)
  const drawCardToPosition = (positionIndex: number) => {
    console.log('[DrawCard] Attempting to draw card to position:', positionIndex);

    if (!selectedLayout) {
      console.log('[DrawCard] No layout selected');
      return;
    }

    if (selectedCards[positionIndex]) {
      console.log('[DrawCard] Position already filled');
      return;
    }

    // Find the first available card from the deck
    const availableDeck = shouldUseSessionDeck ? sessionShuffledDeck : shuffledDeck;
    console.log('[DrawCard] Available deck size:', availableDeck.length);

    const usedCardIds = selectedCards.filter(Boolean).map(c => c.id);
    console.log('[DrawCard] Used card IDs:', usedCardIds);

    const nextCard = availableDeck.find(card => !usedCardIds.includes(card.id));

    if (!nextCard) {
      console.log('[DrawCard] No more cards available');
      return;
    }

    console.log('[DrawCard] Drawing card:', nextCard.name, 'to position:', positionIndex);

    // Place the card in the position
    const newSelectedCards = [...selectedCards];
    newSelectedCards[positionIndex] = nextCard;

    // Update session state using updateSession
    updateSession({ selectedCards: newSelectedCards });

    // Play sound if not muted
    if (!isMuted) {
      playSoundEffect('pop');
    }
  };

  const handleCardDrop = (positionIndex?: number, freePosition?: { x: number; y: number }) => {
    if (!draggedCard || !selectedLayout) {
      handleDragEnd(); // Ensure drag state is reset even if no action is taken
      return;
    }

    let newCardForArray: any;
    let cardPlacedSuccessfully = false;
    const currentLocalShuffledDeck = shouldUseSessionDeck ? sessionShuffledDeck : shuffledDeck;
    let newSelectedCardsArray = [...selectedCards]; 
    let newShuffledDeckArray = [...currentLocalShuffledDeck];

    if (selectedLayout.id === 'free-layout' && freePosition) {
      const isReversed = Math.random() < 0.2;
      newCardForArray = {
        ...draggedCard,
        position: `Card ${newSelectedCardsArray.length + 1}`,
        customPosition: `Custom Position ${newSelectedCardsArray.length + 1}`,
        isReversed,
        revealed: false, 
        x: freePosition.x,
        y: freePosition.y
      };
      newSelectedCardsArray.push(newCardForArray);
      cardPlacedSuccessfully = true;
    } else if (positionIndex !== undefined && selectedLayout.positions && selectedLayout.positions[positionIndex]) {
      const position = selectedLayout.positions[positionIndex];
      const isReversed = Math.random() < 0.2;
      newCardForArray = {
        ...draggedCard,
        position: position.name,
        isReversed,
        revealed: false
      };
      if (newSelectedCardsArray.length <= positionIndex) {
          newSelectedCardsArray.length = positionIndex + 1; 
      }
      newSelectedCardsArray[positionIndex] = newCardForArray;
      cardPlacedSuccessfully = true;
    }

    const updatesForSession: any = {}; // Type changed to any, or define a local Partial type if preferred

    if (cardPlacedSuccessfully) {
      updatesForSession.selectedCards = newSelectedCardsArray;
      playSoundEffect('pop');

      if (draggedCardIndex !== null) {
        newShuffledDeckArray = newShuffledDeckArray.filter((_: any, index: number) => index !== draggedCardIndex);
        updatesForSession.shuffledDeck = newShuffledDeckArray;
        
        broadcastGuestAction('updateShuffledDeck', { 
          shuffledDeck: newShuffledDeckArray, 
          removedCardIndex: draggedCardIndex 
        });
      }
    } else {
      handleDragEnd();
      return;
    }

    if (Object.keys(updatesForSession).length > 0) {
      updateSession(updatesForSession);
    }
    
    handleDragEnd();
  };

  const handleFreeLayoutDrop = (e: any) => {
    if (!draggedCard || !readingAreaRef.current) { 
      handleDragEnd(); 
      return;
    }

    // Only perform drop logic if it is actually free-layout mode
    if (selectedLayout?.id === 'free-layout') {
      const rect = readingAreaRef.current.getBoundingClientRect();
      const clientX = 'touches' in e ? (e.touches[0]?.clientX ?? e.changedTouches?.[0]?.clientX) : e.clientX;
      const clientY = 'touches' in e ? (e.touches[0]?.clientY ?? e.changedTouches?.[0]?.clientY) : e.clientY;

      if (clientX === undefined || clientY === undefined) {
          console.warn('[handleFreeLayoutDrop] Could not determine drop coordinates.');
          handleDragEnd();
          return;
      }
      
      const x = ((clientX - rect.left) / rect.width) * 100;
      const y = ((clientY - rect.top) / rect.height) * 100;
      
      if (x >= 0 && x <= 100 && y >= 0 && y <= 100) {
        handleCardDrop(undefined, { x, y }); // This will call handleDragEnd internally
      } else {
        handleDragEnd(); // Dropped outside bounds for free-layout
      }
    }
    // If not 'free-layout', this function now does nothing further,
    // allowing dropzone-specific onTouchEnd handlers to manage the drop.
  };
  
  const generateInterpretation = async (cards = selectedCards) => {
    if (!deck || !cards.length) return;
    
    // Check if interpretation already exists for the same set of cards
    const cardsSignature = cards.map((card: any) => `${card.name}-${card.position}-${card.isReversed}`).sort().join('|');
    const existingSignature = interpretationCards.map((card: any) => `${card.name}-${card.position}-${card.isReversed}`).sort().join('|');
    
    if (interpretation && cardsSignature === existingSignature) {
      // Same cards, just go to interpretation view without regenerating
      updateSession({ readingStep: 'interpretation' });
      
      // Auto-show mobile interpretation on mobile portrait mode
      if (isMobile && !isLandscape) {
        setShowMobileInterpretation(true);
      }
      return;
    }
    
    // Check if user is a guest and prompt for account upgrade
    if (isGuest) {
      // Store current reading room path for post-auth redirect with session ID
      const currentPath = window.location.pathname;
      const sessionParam = sessionId ? `?join=${sessionId}` : window.location.search;
      const fullPath = currentPath + sessionParam;
      console.log('Storing auth_return_path for interpretation:', {
        currentPath,
        sessionId,
        sessionParam,
        fullPath,
        windowSearch: window.location.search
      });
      localStorage.setItem('auth_return_path', fullPath);
      setShowGuestUpgrade(true);
      return;
    }
    
    try {
      setIsGeneratingInterpretation(true);
      
      // Update session state to show interpretation generation for all participants
      updateSession({ 
        loadingStates: { 
          isShuffling: false, 
          isGeneratingInterpretation: true,
          triggeredBy: participantId 
        } 
      });
      
      // Reveal all cards before generating interpretation
      const revealedCards = cards.map((card: any) => ({
        ...card,
        revealed: true
      }));
      
      // Update session with revealed cards
      updateSession({ selectedCards: revealedCards });
      
      const formattedCards = revealedCards.map((card: any) => ({
        name: card.name,
        position: card.position,
        isReversed: card.isReversed
      }));
      
      const result = await getReadingInterpretation(
        question || 'General life guidance',
        formattedCards,
        deck.theme
      );
      
      // Store the cards used for this interpretation
      setInterpretationCards([...revealedCards]);
      
      updateSession({
        interpretation: result,
        readingStep: 'interpretation',
        loadingStates: null
      });
      
      // Auto-show mobile interpretation on mobile portrait mode
      if (isMobile && !isLandscape) {
        setShowMobileInterpretation(true);
      }
    } catch (error) {
      console.error('Error generating interpretation:', error);
      updateSession({
        interpretation: 'Unable to generate an interpretation at this time. Please try again later.',
        readingStep: 'interpretation',
        loadingStates: null
      });
      
      // Auto-show mobile interpretation even for errors on mobile portrait mode
      if (isMobile && !isLandscape) {
        setShowMobileInterpretation(true);
      }
    } finally {
      setIsGeneratingInterpretation(false);
    }
  };
  
  const initiateVideoChat = async () => {
    // Check if we're in the drawing or interpretation step
    if (readingStep !== 'drawing' && readingStep !== 'interpretation') {
      setError('Video chat is only available during the drawing and interpretation steps of your reading.');
      return;
    }

    // Check if user is authenticated
    if (!user) {
      // Store current reading room path for post-auth redirect with session ID
      const currentPath = window.location.pathname;
      const sessionParam = sessionId ? `?join=${sessionId}` : window.location.search;
      const fullPath = currentPath + sessionParam;
      console.log('Storing auth_return_path for video chat:', fullPath);
      localStorage.setItem('auth_return_path', fullPath);
      setShowGuestUpgrade(true);
      return;
    }
    
    setIsVideoConnecting(true);
    
    try {
      // Start video call in the session store first
      console.log('Auto-starting video call for sharing...');
      await startCall();
      console.log('Video call started successfully');
      setShowVideoChat(true);
    } catch (err) {
      console.error('Error starting video call:', err);
      setError('Failed to start video call. Please try again.');
    } finally {
      setIsVideoConnecting(false);
    }
  };
  
  // Pan functionality for dragging the view (works at any zoom level, like Figma)
  const handlePanStart = (clientX: number, clientY: number) => {
    setIsPanning(true);
    setPanStartPos({ x: clientX, y: clientY });
    setPanStartOffset({ ...panOffset });
  };
  
  const handlePanMove = (clientX: number, clientY: number) => {
    const deltaX = clientX - panStartPos.x;
    const deltaY = clientY - panStartPos.y;
    
    // Apply sensitivity and constraints based on zoom level
    const sensitivity = 1;
    // Increase max pan distance when zoomed in, allow more movement when zoomed out
    const maxPan = zoomLevel > 1 ? 400 : 800;
    
    const newPanX = Math.max(-maxPan, Math.min(maxPan, panStartOffset.x + deltaX * sensitivity));
    const newPanY = Math.max(-maxPan, Math.min(maxPan, panStartOffset.y + deltaY * sensitivity));
    
    setPanOffsetWrapped({ x: newPanX, y: newPanY });
  };
  
  const handlePanEnd = () => {
    setIsPanning(false);
  };
  
  // Double tap zoom functionality for mobile
  const handleCardDoubleTap = (cardIndex: number, event: React.TouchEvent) => {
    if (!isMobile || !readingAreaRef.current) return;
    
    event.preventDefault();
    event.stopPropagation();
    
    const now = Date.now();
    const timeDiff = now - lastTapTime;
    
    if (timeDiff < 300 && tapCount === 1) {
      // Double tap detected
      const selectedCard = selectedCards[cardIndex];
      if (!selectedCard) return;
      
      // If card is revealed, open gallery instead of zooming
      if ((selectedCard as any)?.revealed) {
        openCardGallery(cardIndex);
      }
      
      // Reset tap count
      setTapCount(0);
    } else {
      // First tap or outside double-tap window - handle single tap
      setTapCount(1);
      
      // Set a timer to handle single tap after double-tap window expires
      setTimeout(() => {
        if (tapCount === 1) {
          // This was a single tap - handle card flip or activation
          const selectedCard = selectedCards[cardIndex];
          if ((selectedCard as any)?.revealed) {
            setActiveCardIndexWrapped(cardIndex);
          } else {
            handleCardFlip(cardIndex);
          }
          setTapCount(0);
        }
      }, 300);
    }
    
    setLastTapTime(now);
  };
  
  // Handle single tap (existing card flip functionality)
  const handleCardSingleTap = (cardIndex: number) => {
    if (!isMobile) return;
    
    const selectedCard = selectedCards[cardIndex];
    if ((selectedCard as any)?.revealed) {
      setActiveCardIndexWrapped(cardIndex);
    } else {
      handleCardFlip(cardIndex);
    }
  };
  
  // Handle double click for desktop card activation
  const handleCardDoubleClick = (cardIndex: number, event: React.MouseEvent) => {
    if (isMobile) return;
    
    event.preventDefault();
    event.stopPropagation();
    
    const now = Date.now();
    const timeDiff = now - lastClickTime;
    
    if (timeDiff < 300 && clickCount === 1) {
      // Double click detected - open gallery if card is revealed
      const selectedCard = selectedCards[cardIndex];
      if ((selectedCard as any)?.revealed) {
        openCardGallery(cardIndex);
      }
      setClickCount(0);
    } else {
      // First click or outside double-click window
      setClickCount(1);
    }
    
    setLastClickTime(now);
  };
  
  // Handle card flip when clicked
  const handleCardFlip = useCallback((cardIndex: number) => {
    const newSelectedCards = [...selectedCards];
    if (newSelectedCards[cardIndex]) {
      const cardIsBeingRevealed = !(newSelectedCards[cardIndex] as any).revealed;
      newSelectedCards[cardIndex] = {
        ...newSelectedCards[cardIndex],
        revealed: !(newSelectedCards[cardIndex] as any).revealed
      } as any;
      updateSession({ selectedCards: newSelectedCards });
      if (cardIsBeingRevealed) {
        playSoundEffect('flip');
      }
    }
  }, [selectedCards, updateSession, playSoundEffect]);
  
  // Handle opening card gallery - now synchronized
  const openCardGallery = useCallback((cardIndex: number) => {
  const selectedCard = selectedCards[cardIndex];
    if ((selectedCard as any)?.revealed) {
      updateSharedModalState({
        isOpen: true,
        cardIndex: cardIndex,
        showDescription: false,
        triggeredBy: participantId || 'unknown'
      });
    }
  }, [selectedCards, updateSharedModalState, participantId]);
  
  // Handle gallery navigation - now synchronized
  const navigateGallery = useCallback((direction: 'prev' | 'next') => {
    if (galleryCardIndex === null || !sharedModalState) return;
    
    const revealedCards = selectedCards
      .map((card, index) => ({ card, index }))
      .filter(({ card }) => (card as any)?.revealed);
    
    const currentRevealedIndex = revealedCards.findIndex(({ index }) => index === galleryCardIndex);
    
    if (direction === 'prev') {
      const newIndex = currentRevealedIndex > 0 ? currentRevealedIndex - 1 : revealedCards.length - 1;
      updateSharedModalState({
        ...sharedModalState,
        cardIndex: revealedCards[newIndex].index,
        triggeredBy: participantId
      });
    } else {
      const newIndex = currentRevealedIndex < revealedCards.length - 1 ? currentRevealedIndex + 1 : 0;
      updateSharedModalState({
        ...sharedModalState,
        cardIndex: revealedCards[newIndex].index,
        triggeredBy: participantId
      });
    }
  }, [galleryCardIndex, selectedCards, sharedModalState, updateSharedModalState, participantId]);
  
  // Close gallery - now synchronized
  const closeCardGallery = useCallback(() => {
    updateSharedModalState(null);
    setGallerySwipeStart(null);
    setCardDescription('');
  }, [updateSharedModalState]);

  // Reveal all cards at once
  const revealAllCards = useCallback(() => {
    const updatedCards = selectedCards.map((card: any) => {
      if (card && !card.revealed) {
        return { ...card, revealed: true };
      }
      return card;
    });
    updateSession({ selectedCards: updatedCards });
  }, [selectedCards, updateSession]);
  
  // Fetch card description from API/database
  const fetchCardDescription = useCallback(async (card: any) => {
    if (!card || !deck) return;
    
    setLoadingDescription(true);
    
    try {
      // For Rider-Waite deck, use the existing description
      if (deck.id === 'rider-waite-classic' || deck.id === 'rider-waite') {
        setCardDescription(card.description || 'No description available for this card.');
        if (sharedModalState) {
          updateSharedModalState({
            ...sharedModalState,
            showDescription: true,
            triggeredBy: participantId
          });
        }
        return;
      }
      
      // For custom decks, fetch from API
      // This would be replaced with actual API call
      const response = await fetch(`/api/cards/${card.id}/description`);
      
      if (response.ok) {
        const data = await response.json();
        setCardDescription(data.description || 'No description available for this card.');
      } else {
        // Fallback to card's existing description if API fails
        setCardDescription(card.description || 'No description available for this card.');
      }
      
      if (sharedModalState) {
        updateSharedModalState({
          ...sharedModalState,
          showDescription: true,
          triggeredBy: participantId
        });
      }
    } catch (error) {
      console.error('Error fetching card description:', error);
      // Fallback to existing description
      setCardDescription(card.description || 'No description available for this card.');
      if (sharedModalState) {
        updateSharedModalState({
          ...sharedModalState,
          showDescription: true,
          triggeredBy: participantId
        });
      }
    } finally {
      setLoadingDescription(false);
    }
  }, [deck, sharedModalState, updateSharedModalState, participantId]);
  
  // Add touch event listeners for pinch-to-zoom - optimized
  useTouchInteractions({
    readingAreaRef,
    isMobile,
    currentZoomLevel: zoomLevel, // Pass the zoomLevel state
    isCardDragging: isDragging,  // Pass the isDragging state
    onPanStart: handlePanStart,  // Pass the existing handlePanStart callback
    onPanMove: handlePanMove,    // Pass the existing handlePanMove callback
    onPanEnd: handlePanEnd,      // Pass the existing handlePanEnd callback
    onZoomChange: setZoomLevelWrapped, // Pass the setZoomLevelWrapped callback
  });

  // Add mouse move handler to document for dragging - optimized
  useDocumentMouseListeners({
    isDraggingCard: isDragging, // isDragging state from ReadingRoom (for cards from deck)
    isPanningView: isPanning,   // isPanning state from ReadingRoom
    isDraggingPlacedCard: isDraggingPlacedCard, // isDraggingPlacedCard state from ReadingRoom
    onDragMove: setDragPosition, // Pass the setDragPosition setter
    onPanMove: handlePanMove,    // Pass the handlePanMove callback
    onDragEnd: handleDragEnd,    // Pass the handleDragEnd callback (for cards from deck)
    onPanEnd: handlePanEnd,      // Pass the handlePanEnd callback
  });
  
  // Keyboard navigation for gallery and panning
  useReadingRoomKeyboardShortcuts({
    showCardGallery,
    showCardDescription,
    isMobile,
    readingStep,
    zoomLevel,
    selectedLayout,
    deckId,
    user,
    selectedCards,
    showShareModal,
    showHelpModal,
    showExitModal,
    showSignInModal,
    showGuestUpgrade,
    isChangingDeckMidSession,
    showLayoutDropdown,
    highlightedLayoutIndex,
    highlightedSetupLayoutIndex,
    selectedCategory,
    highlightedCategoryIndex,
    generatedQuestions,
    isLoadingQuestions,
    highlightedQuestionIndex,
    showCustomQuestionInput,
    isQuestionHighlightingActive,
    isCategoryHighlightingActive,
    sharedModalState,
    participantId,
    isMuted, // Pass isMuted
    toggleMute, // Pass toggleMute
    closeCardGallery,
    navigateGallery,
    panDirection,
    resetPan,
    shuffleDeck,
    toggleHelpModal,
    toggleTheme,
    setZoomLevelWrapped,
    getDefaultZoomLevel,
    setZoomFocusWrapped,
    openDeckSelection,
    setShowShareModal,
    setShowHelpModal,
    setShowExitModal,
    setShowSignInModal,
    setShowGuestUpgrade,
    setIsChangingDeckMidSession,
    fetchAndSetDeck,
    revealAllCards,
    resetCards,
    openCardGallery,
    setShowLayoutDropdown,
    setHighlightedLayoutIndex,
    setHighlightedSetupLayoutIndex,
    handleLayoutSelect,
    availableLayouts,
    handleCategorySelect,
    questionCategories,
    handleQuestionSelect,
    setGeneratedQuestions,
    updateSharedModalState,
    setIsSpacePressed,
    setSelectedCategory,
    setHighlightedCategoryIndex,
    setHighlightedQuestionIndex,
  });
  
  // Handle gallery swipe gestures
  const handleGalleryTouchStart = useCallback((e: React.TouchEvent) => {
    if (!isMobile || !showCardGallery) return;
    const touch = e.touches[0];
    setGallerySwipeStart({ x: touch.clientX, y: touch.clientY });
  }, [isMobile, showCardGallery]);
  
  const handleGalleryTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!isMobile || !showCardGallery || !gallerySwipeStart) return;
    
    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - gallerySwipeStart.x;
    const deltaY = touch.clientY - gallerySwipeStart.y;
    
    // Only trigger swipe if horizontal movement is greater than vertical
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) {
      if (deltaX > 0) {
        navigateGallery('prev');
      } else {
        navigateGallery('next');
      }
    }
    
    setGallerySwipeStart(null);
  }, [isMobile, showCardGallery, gallerySwipeStart, navigateGallery]);

  // State for invite dropdown modal
  const [showInviteDropdown, setShowInviteDropdown] = useState(false);

  // Handle sharing with native share API on mobile or modal on desktop
  const handleShare = async () => {
    if (!sessionId) return;

    // Check if user is a guest and prompt for account upgrade
    if (isGuest) {
      // Store current reading room path for post-auth redirect with session ID
      const currentPath = window.location.pathname;
      const sessionParam = sessionId ? `?join=${sessionId}` : window.location.search;
      const fullPath = currentPath + sessionParam;
      console.log('Storing auth_return_path for sharing:', {
        currentPath,
        sessionId,
        sessionParam,
        fullPath,
        windowSearch: window.location.search
      });
      localStorage.setItem('auth_return_path', fullPath);
      setShowGuestUpgrade(true);
      return;
    }

    // Ensure session state is up to date before sharing
    if (sessionState?.id && isHost) {
      console.log('Updating session state before sharing...');
      await updateSession({
        selectedLayout,
        question,
        readingStep,
        selectedCards,
        interpretation,
        zoomLevel,
        activeCardIndex
      });
    }

    // Show invite dropdown instead of auto-starting video
    setShowInviteDropdown(true);
  };

  // Handle guest account upgrade
  const handleGuestUpgrade = async (userId: string) => {
    if (upgradeGuestAccount) {
      const success = await upgradeGuestAccount(userId);
      if (success) {
        setShowGuestUpgrade(false);
        // The useAuth hook will automatically update the user state
      }
    }
  };

  // Handle closing guest upgrade modal (allow continuing as guest)
  const handleCloseGuestUpgrade = () => {
    setShowGuestUpgrade(false);
    // User can continue as guest - no forced upgrade
  };

  // Handle guest name setting
  const handleGuestNameSet = async (name: string) => {
    if (setGuestName) {
      const success = await setGuestName(name);
      if (success) {
        setShowGuestUpgrade(false);
      }
    }
  };

  // Handle Guest badge click - show options to set name or sign in
  const handleGuestBadgeClick = () => {
    setShowGuestUpgrade(true);
  };
  
  // Handle invite keyboard shortcut (I key)
  useEffect(() => {
    const handleInviteKeyDown = (event: KeyboardEvent) => {
      if (event.key === KEY_VALUES.I_LOWER) { // Handles 'i' and 'I' implicitly
        // Only trigger if not typing in an input/textarea
        if (event.target instanceof HTMLElement && 
            (event.target.tagName === 'INPUT' || 
             event.target.tagName === 'TEXTAREA' || 
             event.target.contentEditable === 'true')) {
          return;
        }
        
        event.preventDefault();
        handleShare();
      }
    };

    document.addEventListener('keydown', handleInviteKeyDown);
    return () => {
      document.removeEventListener('keydown', handleInviteKeyDown);
    };
  }, [handleShare]);

  
  // Function to fetch marketplace decks
  const fetchMarketplaceDecks = useCallback(async () => {
    if (marketplaceDecks.length > 0) return; // Already loaded
    
    try {
      setLoadingMarketplace(true);
      
      // For now, create some mock marketplace decks
      // In production, this would be an API call
      const mockMarketplaceDecks: Deck[] = [
        {
          id: 'cosmic-tarot',
          title: 'Cosmic Wisdom Tarot',
          description: 'Journey through the cosmos with this mystical deck featuring stunning celestial artwork.',
          creator_id: 'system',
          creator_name: 'Mystical Arts Studio',
          cover_image: '/api/placeholder/300/450',
          is_public: true,
          is_free: false,
          price: 9.99,
          theme: 'cosmic, mystical, celestial',
          style: 'digital art, mystical',
          card_count: 78,
          sample_images: ['/api/placeholder/300/450'],
          purchase_count: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: 'nature-spirits',
          title: 'Nature Spirits Oracle',
          description: 'Connect with the wisdom of nature through beautiful botanical and animal spirit guides.',
          creator_id: 'system',
          creator_name: 'Earth Mystic',
          cover_image: '/api/placeholder/300/450',
          is_public: true,
          is_free: true,
          price: 0,
          theme: 'nature, spirits, animals',
          style: 'watercolor, botanical',
          card_count: 44,
          sample_images: ['/api/placeholder/300/450'],
          purchase_count: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: 'shadow-work',
          title: 'Shadow Work Tarot',
          description: 'Dive deep into your unconscious with this powerful deck for shadow work and inner healing.',
          creator_id: 'system',
          creator_name: 'Deep Wisdom Press',
          cover_image: '/api/placeholder/300/450',
          is_public: true,
          is_free: false,
          price: 12.99,
          theme: 'shadow work, psychology, healing',
          style: 'dark art, introspective',
          card_count: 78,
          sample_images: ['/api/placeholder/300/450'],
          purchase_count: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ];
      
      setMarketplaceDecks(mockMarketplaceDecks);
    } catch (error) {
      console.error('Error fetching marketplace decks:', error);
    } finally {
      setLoadingMarketplace(false);
    }
  }, [marketplaceDecks.length]);
  
  // Fetch marketplace decks when switching to marketplace tab
  useEffect(() => {
    if (deckSelectionTab === 'marketplace') {
      fetchMarketplaceDecks();
    }
  }, [deckSelectionTab, fetchMarketplaceDecks]);
  
  // Handle marketplace deck selection for details
  const handleMarketplaceDeckSelect = useCallback((deck: Deck) => {
    selectMarketplaceDeck(deck.id);
  }, [selectMarketplaceDeck]);
  
  // Handle adding marketplace deck to collection
  const handleAddToCollection = useCallback(async (deck: Deck) => {
    try {
      setAddingToCollection(true);
      
      // Check if user is subscribed using the actual subscription status
      if (!isSubscribed && !deck.is_free) {
        // Show subscription required message
        setShowSubscriptionRequired(true);
        setTimeout(() => setShowSubscriptionRequired(false), 4000);
        return;
      }
      
      // Simulate API call to add deck to collection
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Add deck to userOwnedDecks state
      setUserOwnedDecks(prev => {
        // Check if deck is already in collection
        if (prev.find(d => d.id === deck.id)) {
          return prev;
        }
        return [...prev, deck];
      });
      
      // Show success feedback
      showSuccessToast('Deck added to your collection successfully!');
      setTimeout(() => {
        selectMarketplaceDeck(null); // Close details view
      }, 2000);
      
    } catch (error) {
      console.error('Error adding deck to collection:', error);
              showErrorToast('Failed to add deck to collection. Please try again.');
    } finally {
      setAddingToCollection(false);
    }
  }, [isSubscribed]);
  
  if (loading || sessionLoading) {
    let message = '';
    let subMessage: string | null = null;

    // Determine the most relevant loading message
    if (loading) { // Initial data loading is in progress (e.g., deck data)
      message = shouldCreateSession 
        ? 'Weaving the Veil: Your Sacred Space Emerges...' 
        : 'The Oracle Awakens: Aligning the Astral Plane...';
      if (shouldCreateSession) {
        subMessage = 'The loom of fate spins your connection...';
      } else {
        subMessage = 'The energies gather...'; // Optional sub-message for preparing
      }
    } else { // Implies loading is false, but sessionLoading is true (e.g., connecting to session)
      message = shouldCreateSession 
        ? 'The Stars Align: Consecrating Your Chamber...' 
        : 'Stepping Through the Portal: The Reading Room Beckons...';
      if (shouldCreateSession) {
        subMessage = 'Whispers from beyond grow clearer...';
      } else {
        subMessage = 'The connection deepens...'; // Optional sub-message for connecting
      }
    }
      
    return (
      <div className="h-screen flex items-center justify-center p-4">
        <div className="text-center bg-card border border-border rounded-xl shadow-lg p-6 max-w-md">
          <LoadingSpinner size="lg" className="mx-auto mb-4" />
          <p className="text-lg font-medium text-foreground">
            {message}
          </p>
          {subMessage && (
            <p className="text-sm text-muted-foreground mt-2">
              {subMessage}
            </p>
          )}
          <p className="text-xs text-muted-foreground mt-6">
            If this is taking longer than expected, you can try to:
          </p>
          <button
            onClick={() => window.location.reload()}
            className="btn btn-secondary mt-3 px-6 py-2 text-sm"
          >
            Refresh Page
          </button>
        </div>
      </div>
    );
  }
  
  else if (error || sessionError) { // Changed to else if
    const isSessionCreationError = error?.includes('Failed to create reading room session');
    
    return (
      <div className="h-screen flex flex-col items-center justify-center p-4">
        <div className="text-center max-w-md mx-auto p-6 bg-card border border-border rounded-xl">
          <HelpCircle className="h-16 w-16 text-warning mx-auto mb-4" />
          <h2 className="text-xl md:text-2xl font-serif font-bold mb-4">
            {isSessionCreationError ? 'Failed to Create Reading Room' : 'Something Went Wrong'}
          </h2>
          <p className="text-muted-foreground mb-6 text-sm md:text-base">
            {sessionError || error}
          </p>
          <div className="flex flex-col gap-4 justify-center">
            {isSessionCreationError && (
              <button 
                onClick={() => {
                  setError(null);
                  window.location.reload();
                }}
                className="btn btn-primary px-6 py-2"
              >
                Try Again
              </button>
            )}
            {user ? (
              <>
                <Link to="/collection" className="btn btn-secondary px-6 py-2">
                  My Collection
                </Link>
                <Link to="/marketplace" className="btn btn-primary px-6 py-2">
                  Browse Marketplace
                </Link>
              </>
            ) : (
              <>
                <Link to="/" className="btn btn-secondary px-6 py-2">
                  Home
                </Link>
                <Link to="/marketplace" className="btn btn-primary px-6 py-2">
                  Browse Marketplace
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <Div100vh 
      className={`flex flex-col ${!isMobile ? 'h-screen overflow-hidden' : 'overflow-hidden'}`}
      style={isMobile ? { 
        width: '100vw',
        position: 'relative',
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)',
        paddingLeft: 'env(safe-area-inset-left)',
        paddingRight: 'env(safe-area-inset-right)'
      } : undefined}
    >
      {/* Main content - full screen with floating controls */}
      <main className="flex-1 overflow-hidden relative">
        {/* Mobile Help Hint Alert - positioned at top right below controls */}
        <AnimatePresence>
          {isMobile && showPinchHint && (
            <motion.div 
              className="absolute top-16 right-4 bg-primary/95 text-primary-foreground px-4 py-3 rounded-lg text-sm z-[60] shadow-xl max-w-72 border border-primary/20"
              initial={{ opacity: 0, y: -20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.9 }}
              transition={{ duration: 0.3, exit: { duration: 0.2 } }}
              onClick={hideHint}
            >
              <div className="flex items-start gap-3">
                <div className="flex-1">
                  <div className="font-medium mb-1">💡 Quick Tips</div>
                  <div className="text-xs opacity-90">
                    Tap cards • Pinch to zoom • Drag to move
                  </div>
                </div>
                <button 
                  onClick={hideHint}
                  className="text-primary-foreground/70 hover:text-primary-foreground transition-colors"
                >
                  <XCircle className="h-4 w-4" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        


        {/* Follow Notification */}
        <AnimatePresence>
          {showFollowNotification && (
            <motion.div 
              className={`absolute ${isMobile ? 'top-28 left-4 right-4' : 'top-28 left-1/2 transform -translate-x-1/2'} bg-primary/95 text-primary-foreground px-4 py-3 rounded-lg text-sm z-[60] shadow-xl border border-primary/20`}
              initial={{ opacity: 0, y: -20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.9 }}
              transition={{ duration: 0.3, exit: { duration: 0.2 } }}
            >
              <div className="flex items-center gap-3">
                <UserCheck className="h-5 w-5 text-primary-foreground" />
                <div className="flex-1">
                  <div className="font-medium">Following Host's View</div>
                  <div className="text-xs opacity-90">
                    Your view will sync with the host's pan and zoom
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Floating controls - redesigned mobile layout */}
        <div className={`absolute z-50 ${mobileLayoutClasses.topControls} ${isMobile ? 'w-full' : ''}`}>
          {/* Mobile: Two-row layout */}
          {isMobile ? (
            <div className="flex flex-col w-full bg-card/95 backdrop-blur-md border-b border-border shadow-lg">
              {/* First row: Back, Title/Layout, Context buttons */}
              <div className="flex items-center justify-between w-full px-3 py-2 min-h-[48px]">
                {/* Left: Back button */}
                <div className="flex items-center gap-2">
                  {isMobile && showMobileInterpretation ? (
                    <button
                      onClick={() => setShowMobileInterpretation(false)}
                      className="btn btn-ghost p-2 flex items-center text-muted-foreground hover:text-foreground touch-manipulation"
                      style={{ minWidth: '40px', minHeight: '40px' }}
                    >
                      <ArrowLeft className="h-5 w-5" />
                    </button>
                  ) : isMobile && readingStep === 'ask-question' ? (
                    <button
                      onClick={() => updateSession({ readingStep: 'setup' })}
                      className="btn btn-ghost p-2 flex items-center text-muted-foreground hover:text-foreground touch-manipulation"
                      style={{ minWidth: '40px', minHeight: '40px' }}
                    >
                      <ArrowLeft className="h-5 w-5" />
                    </button>
                  ) : isMobile && readingStep === 'interpretation' ? (
                    <button
                      onClick={() => setReadingStepWrapped('drawing')}
                      className="btn btn-ghost p-2 flex items-center text-muted-foreground hover:text-foreground touch-manipulation"
                      style={{ minWidth: '40px', minHeight: '40px' }}
                    >
                      <ArrowLeft className="h-5 w-5" />
                    </button>
                  ) : (
                    <button
                      onClick={() => setShowExitModal(true)}
                      className="btn btn-ghost p-2 flex items-center text-muted-foreground hover:text-foreground touch-manipulation"
                      style={{ minWidth: '40px', minHeight: '40px' }}
                    >
                      <ArrowLeft className="h-5 w-5" />
                    </button>
                  )}
                </div>

                {/* Center: Title/Layout display */}
                <div className={`relative flex-1 max-w-sm mx-2 ${!(selectedLayout) ? 'hidden' : ''}`}>
                  <button
                    onClick={() => setShowLayoutDropdown(!showLayoutDropdown)}
                    className="w-full bg-muted/50 border border-border rounded-lg px-3 py-2 flex items-center justify-between gap-2 touch-manipulation"
                    style={{ minHeight: '40px' }}
                  >
                    <span className="text-sm font-medium truncate">{selectedLayout?.name || ''}</span>
                    <div className="flex items-center gap-1">
                      {readingStep === 'drawing' && selectedLayout && (
                        <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full font-medium whitespace-nowrap">
                          {selectedCards.filter(card => card).length}/{selectedLayout.card_count === 999 ? '∞' : selectedLayout.card_count}
                        </span>
                      )}
                      <ChevronRight className={`h-4 w-4 transition-transform flex-shrink-0 ${showLayoutDropdown ? 'rotate-90' : ''}`} />
                    </div>
                  </button>

                  {/* Layout dropdown */}
                  <AnimatePresence>
                    {showLayoutDropdown && (
                      <motion.div
                        initial={{ opacity: 0, y: -10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto"
                      >
                        {availableLayouts.map((layout, index) => (
                          <button
                            key={layout.id}
                            onClick={() => {
                              handleLayoutSelect(layout);
                              setShowLayoutDropdown(false);
                            }}
                            onMouseEnter={() => setHighlightedLayoutIndex(index)}
                            className={`w-full text-left p-3 hover:bg-muted transition-colors ${
                              selectedLayout?.id === layout.id ? 'bg-primary/10 text-primary' : ''
                            } ${
                              index === highlightedLayoutIndex ? 'bg-accent/20 ring-1 ring-accent' : ''
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm font-medium">{layout.name}</span>
                              <span className="text-xs bg-muted px-2 py-0.5 rounded-full">
                                {layout.card_count === 999 ? 'Free' : `${layout.card_count}`}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground">{layout.description}</p>
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Right: Context buttons */}
                <div className="flex items-center gap-1">
                  {deck && (
                    <div className="bg-muted/50 px-2 py-1 rounded-md">
                      <ParticipantsDropdown
                        participants={participants.map(p => ({
                          id: p.id,
                          name: p.name ?? undefined,
                          userId: p.userId,
                          anonymousId: p.anonymousId,
                          isHost: (p.userId && p.userId === sessionState?.hostUserId) || (!sessionState?.hostUserId && p.anonymousId && isHost && !p.userId) ? true : false
                        }))}
                        currentUserId={user?.id || null}
                        currentAnonymousId={anonymousId}
                        disabled={isOfflineMode}
                      />
                    </div>
                  )}
                  {isGuest && (
                    <button
                      onClick={handleGuestBadgeClick}
                      className="text-xs bg-accent/80 px-2 py-1 rounded-full hover:bg-accent transition-colors flex items-center gap-1"
                    >
                      <UserCheck className="h-3 w-3" />
                      Guest
                    </button>
                  )}
                </div>
              </div>

              {/* Second row: Horizontally scrollable action buttons */}
              <div className="relative flex items-center w-full border-t border-border/50">
                {/* Left scroll button */}
                {canScrollLeft && (
                  <button
                    onClick={() => scrollActionBar('left')}
                    className="absolute left-0 z-10 bg-gradient-to-r from-card via-card to-transparent pl-1 pr-3 py-2 touch-manipulation"
                    style={{ minHeight: '52px' }}
                  >
                    <ChevronLeft className="h-5 w-5 text-muted-foreground hover:text-foreground" />
                  </button>
                )}

                {/* Scrollable action buttons container */}
                <div
                  ref={actionBarRef}
                  className="flex items-center w-full overflow-x-auto scrollbar-hide scroll-smooth"
                  onScroll={checkScrollPosition}
                >
                  <div className="flex items-center gap-2 px-3 py-2 min-w-max">
                  {/* Primary Actions Group */}
                  {readingStep === 'drawing' && selectedCards.some((card: any) => card) && (
                    <>
                      {/* Show Reveal All button if there are unrevealed cards */}
                      {selectedCards.some((card: any) => card && !card.revealed) && (
                        <button
                          onClick={revealAllCards}
                          className="btn btn-primary bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 text-sm font-medium flex items-center gap-2 rounded-lg touch-manipulation whitespace-nowrap"
                          style={{ minHeight: '36px' }}
                        >
                          <EyeOff className="h-4 w-4" />
                          <span>Reveal</span>
                        </button>
                      )}

                      {/* Show View Cards button if all cards are revealed */}
                      {selectedCards.every((card: any) => !card || card.revealed) && selectedCards.some((card: any) => card?.revealed) && (
                        <button
                          onClick={() => {
                            const firstRevealedIndex = selectedCards.findIndex((card: any) => card?.revealed);
                            if (firstRevealedIndex !== -1) {
                              openCardGallery(firstRevealedIndex);
                            }
                          }}
                          className="btn btn-ghost bg-muted/50 hover:bg-muted text-foreground px-4 py-2 text-sm font-medium flex items-center gap-2 rounded-lg touch-manipulation whitespace-nowrap"
                          style={{ minHeight: '36px' }}
                        >
                          <ScanSearch className="h-4 w-4" />
                          <span>View</span>
                        </button>
                      )}
                    </>
                  )}

                  {/* Generate Interpretation Button */}
                  {readingStep === 'drawing' && !isGeneratingInterpretation && (
                    (selectedLayout?.id === 'free-layout' && selectedCards.length > 0) ||
                    (selectedLayout?.id !== 'free-layout' && selectedCards.filter((card: any) => card).length === selectedLayout?.card_count)
                  ) && (
                    <button
                      onClick={() => {
                        console.log('Mobile Read button clicked (top bar):', {
                          selectedCards: selectedCards.length,
                          isGeneratingInterpretation,
                          readingStep,
                          isMobile
                        });
                        generateInterpretation();
                      }}
                      onTouchStart={(e) => {
                        console.log('Mobile Read button touch start (top bar)');
                        e.stopPropagation();
                      }}
                      className="btn btn-primary bg-accent hover:bg-accent/90 text-white dark:text-black px-4 py-2 text-sm font-medium flex items-center gap-2 rounded-lg touch-manipulation whitespace-nowrap"
                      style={{ minHeight: '36px' }}
                    >
                      <Sparkles className="h-4 w-4" />
                      <span>
                        {selectedLayout?.id === 'free-layout'
                          ? `Read (${selectedCards.length})`
                          : 'Read'
                        }
                      </span>
                    </button>
                  )}

                  {/* Divider */}
                  {(readingStep === 'drawing' && (selectedCards.some((card: any) => card) || ((selectedLayout?.id === 'free-layout' && selectedCards.length > 0) || (selectedLayout?.id !== 'free-layout' && selectedCards.filter((card: any) => card).length === selectedLayout?.card_count)))) && (
                    <div className="w-px h-6 bg-border/50 mx-1" />
                  )}

                  {/* Utility Actions Group */}
                  {/* Offline mode indicator and sync button */}
                  {(isOfflineMode || recentlySynced) && (
                    <button
                      onClick={async () => {
                        if (!recentlySynced) {
                          const synced = await syncLocalSessionToDatabase();
                          if (synced) {
                            setRecentlySynced(true);
                            setTimeout(() => setRecentlySynced(false), 5000);
                          } else {
                            console.log('Sync failed, will retry later');
                          }
                        }
                      }}
                      className={`btn ${
                        recentlySynced
                          ? 'bg-success/20 text-success border-success/50'
                          : 'bg-warning/20 text-warning border-warning/50'
                      } px-3 py-2 text-sm flex items-center gap-2 rounded-lg touch-manipulation whitespace-nowrap ${
                        recentlySynced ? '' : 'animate-pulse'
                      }`}
                      style={{ minHeight: '36px' }}
                      disabled={recentlySynced}
                    >
                      {recentlySynced ? (
                        <RotateCcw className="h-4 w-4" />
                      ) : (
                        <Zap className="h-4 w-4" />
                      )}
                      <span>{recentlySynced ? 'Synced' : 'Offline'}</span>
                    </button>
                  )}

                  {/* Sync indicator for real-time updates */}
                  {isSyncing && (
                    <div className="btn btn-ghost bg-muted/50 px-3 py-2 text-sm flex items-center gap-2 rounded-lg animate-pulse whitespace-nowrap" style={{ minHeight: '36px' }}>
                      <LoadingSpinner size="sm" />
                      <span>Syncing</span>
                    </div>
                  )}

                  {/* Deck change button */}
                  {deck && (
                    <button
                      onClick={() => {
                        setIsChangingDeckMidSession(true);
                        setDeck(null);
                        setCards([]);
                        setShuffledDeck([]);
                        setSelectedDeckId(null);
                      }}
                      className="btn btn-ghost bg-muted/50 hover:bg-muted px-3 py-2 text-sm flex items-center gap-2 rounded-lg touch-manipulation whitespace-nowrap"
                      style={{ minHeight: '36px' }}
                    >
                      <Package className="h-4 w-4" />
                      <span>Deck</span>
                    </button>
                  )}

                  {/* Invite button */}
                  <button
                    onClick={() => handleShare()}
                    className="btn btn-ghost bg-muted/50 hover:bg-muted px-3 py-2 text-sm flex items-center gap-2 rounded-lg touch-manipulation whitespace-nowrap"
                    style={{ minHeight: '36px' }}
                    disabled={!sessionId}
                  >
                    <UserPlus className="h-4 w-4" />
                    <span>Invite</span>
                  </button>

                  {/* Theme toggle */}
                  <button
                    onClick={toggleTheme}
                    className="btn btn-ghost bg-muted/50 hover:bg-muted px-3 py-2 text-sm flex items-center gap-2 rounded-lg touch-manipulation whitespace-nowrap"
                    style={{ minHeight: '36px' }}
                  >
                    {darkMode ? (
                      <Sun className="h-4 w-4" />
                    ) : (
                      <Moon className="h-4 w-4" />
                    )}
                    <span>Theme</span>
                  </button>

                  {/* Guest sign in button */}
                  {isGuest && (
                    <button
                      onClick={() => setShowGuestUpgrade(true)}
                      className="btn btn-primary px-3 py-2 text-sm flex items-center gap-2 rounded-lg touch-manipulation whitespace-nowrap"
                      style={{ minHeight: '36px' }}
                    >
                      <LogIn className="h-4 w-4" />
                      <span>Sign In</span>
                    </button>
                  )}
                  </div>
                </div>

                {/* Right scroll button */}
                {canScrollRight && (
                  <button
                    onClick={() => scrollActionBar('right')}
                    className="absolute right-0 z-10 bg-gradient-to-l from-card via-card to-transparent pr-1 pl-3 py-2 touch-manipulation"
                    style={{ minHeight: '52px' }}
                  >
                    <ChevronRight className="h-5 w-5 text-muted-foreground hover:text-foreground" />
                  </button>
                )}
              </div>
            </div>
          ) : (
            /* Desktop Layout - Single Row */
            <div className="flex items-center justify-between gap-2">
              {/* Left section: Back button and session info */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowExitModal(true)}
                  className="btn btn-ghost bg-card/80 backdrop-blur-sm border border-border p-2 text-sm flex items-center text-muted-foreground hover:text-foreground"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>

                {/* Layout selector for desktop */}
                <Tooltip content="Change reading layout (L)" position="bottom" disabled={isMobile}>
                <div className={`bg-card/80 backdrop-blur-sm border border-border rounded-lg px-3 py-2 relative layout-dropdown-container ${!selectedLayout ? 'hidden' : ''}`}>
                  <button
                    onClick={() => setShowLayoutDropdown(!showLayoutDropdown)}
                    className="flex items-center gap-2 text-sm font-medium"
                  >
                    <span className="truncate max-w-32">{selectedLayout?.name || ''}</span>
                    {readingStep === 'drawing' && selectedLayout && (
                      <span className="text-xs bg-muted px-1.5 py-0.5 rounded-full whitespace-nowrap">
                        {selectedCards.filter(card => card).length}/{selectedLayout.card_count === 999 ? '∞' : selectedLayout.card_count}
                      </span>
                    )}
                    <ChevronRight className={`h-3 w-3 transition-transform ${showLayoutDropdown ? 'rotate-90' : ''}`} />
                  </button>
                  
                  {/* Desktop Layout dropdown */}
                  <AnimatePresence>
                    {showLayoutDropdown && (
                      <motion.div
                        initial={{ opacity: 0, y: -10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        className="absolute top-full left-0 mt-1 bg-card border border-border rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto min-w-80"
                      >
                        {availableLayouts.map((layout, index) => (
                          <button
                            key={layout.id}
                            onClick={() => {
                              handleLayoutSelect(layout);
                              setShowLayoutDropdown(false);
                            }}
                            onMouseEnter={() => setHighlightedLayoutIndex(index)}
                            className={`w-full text-left p-3 hover:bg-muted transition-colors ${
                              selectedLayout?.id === layout.id ? 'bg-primary/10 text-primary' : ''
                            } ${
                              index === highlightedLayoutIndex ? 'bg-accent/20 ring-1 ring-accent' : ''
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm font-medium">{layout.name}</span>
                              <span className="text-xs bg-muted px-2 py-0.5 rounded-full">
                                {layout.card_count === 999 ? 'Free' : `${layout.card_count} cards`}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground">{layout.description}</p>
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </Tooltip>
              
              {/* Session info */}
              <div className="bg-card/80 backdrop-blur-sm border border-border rounded-lg px-3 py-2">
                <div className="flex items-center gap-2">
                  <h1 className="text-sm font-serif font-bold">Reading Room</h1>
                  {isGuest && (
                    <button onClick={handleGuestBadgeClick} className="text-xs bg-accent px-2 py-0.5 rounded-full hover:bg-accent/80 transition-colors cursor-pointer flex items-center gap-1" ><UserCheck className="h-3 w-3" />Guest</button>
                  )}
                  <ParticipantsDropdown participants={participants.map(p => ({ id: p.id, name: p.name ?? undefined, userId: p.userId, anonymousId: p.anonymousId, isHost: (p.userId && p.userId === sessionState?.hostUserId) || (!sessionState?.hostUserId && p.anonymousId && isHost && !p.userId) ? true : false }))} currentUserId={user?.id || null} currentAnonymousId={anonymousId} disabled={isOfflineMode} />                </div>
                {deck && (
                  <p className="text-xs text-muted-foreground truncate max-w-48">
                    {deck.title} by {deck.creator_name}
                  </p>
                )}
              </div>
            </div>

            {/* Right side - Action buttons for desktop */}
            <div className="flex items-center gap-1 md:gap-2">
              {/* Desktop: Generate Interpretation Button - show when ready */}
              {readingStep === 'drawing' && !isGeneratingInterpretation && (
                (selectedLayout?.id === 'free-layout' && selectedCards.length > 0) ||
                (selectedLayout?.id !== 'free-layout' && selectedCards.filter((card: any) => card).length === selectedLayout?.card_count)
              ) && (
                <Tooltip content={selectedLayout?.id === 'free-layout' ? `Generate interpretation for ${selectedCards.length} cards` : "Generate reading interpretation"} position="bottom">
                  <button
                    onClick={() => generateInterpretation()}
                    className="btn btn-secondary bg-accent/80 backdrop-blur-sm border border-accent p-2 text-sm flex items-center text-white dark:text-black"
                  >
                    <Wand className="h-4 w-4" />
                    {!isTablet && (
                      <span className="ml-1 text-xs">
                        {selectedLayout?.id === 'free-layout'
                          ? `Interpret (${selectedCards.length})`
                          : 'See Interpretation'
                        }
                      </span>
                    )}
                  </button>
                </Tooltip>
              )}

              {/* Desktop: Reveal All / View Cards Button - show when cards are placed - moved to front */}
              {selectedCards.some((card: any) => card) && (
                <>
                  {/* Show Reveal All button if there are unrevealed cards */}
                  {selectedCards.some((card: any) => card && !card.revealed) && (
                    <Tooltip content="Reveal all cards (R)" position="bottom">
                      <button
                        onClick={revealAllCards}
                        className="btn btn-secondary bg-card/80 backdrop-blur-sm border border-border p-2 text-sm flex items-center"
                      >
                        <EyeOff className="h-4 w-4" />
                        {!isTablet && <span className="ml-1 text-xs">Reveal All</span>}
                      </button>
                    </Tooltip>
                  )}

                  {/* Show View Cards button if all cards are revealed */}
                  {selectedCards.every((card: any) => !card || card.revealed) && selectedCards.some((card: any) => card?.revealed) && (
                    <Tooltip content="View cards in detail (V)" position="bottom">
                      <button
                        onClick={() => {
                          const firstRevealedIndex = selectedCards.findIndex((card: any) => card?.revealed);
                          if (firstRevealedIndex !== -1) {
                            openCardGallery(firstRevealedIndex);
                          }
                        }}
                        className="btn btn-ghost bg-card/80 backdrop-blur-sm border border-border p-2 text-sm flex items-center"
                      >
                        <ScanSearch className="h-4 w-4" />
                        {!isTablet && <span className="ml-1 text-xs">View Detail</span>}
                      </button>
                    </Tooltip>
                  )}
                </>
              )}

              {/* Offline mode indicator and sync button */}
              {(isOfflineMode || recentlySynced) && (
                <Tooltip
                  content={
                    recentlySynced
                      ? "Session synced to cloud"
                      : "Working offline - click to sync to cloud"
                  }
                  position="bottom"
                  disabled={isMobile}
                >
                  <button
                    onClick={async () => {
                      if (!recentlySynced) {
                        const synced = await syncLocalSessionToDatabase();
                        if (synced) {
                          setRecentlySynced(true);
                          setTimeout(() => setRecentlySynced(false), 5000);
                        } else {
                          console.log('Sync failed, will retry later');
                        }
                      }
                    }}
                    className={`btn ${
                      recentlySynced
                        ? 'btn-success bg-success/80 border-success/50'
                        : 'btn-warning bg-warning/80 border-warning/50'
                    } backdrop-blur-sm p-2 text-sm flex items-center gap-1 ${
                      recentlySynced ? '' : 'animate-pulse'
                    }`}
                    disabled={recentlySynced}
                  >
                    {recentlySynced ? (
                      <RotateCcw className="h-4 w-4" />
                    ) : (
                      <Zap className="h-4 w-4" />
                    )}
                    {!isTablet && (
                      <span className="text-xs">
                        {recentlySynced ? 'Synced' : 'Offline'}
                      </span>
                    )}
                  </button>
                </Tooltip>
              )}

              {/* Sync indicator for real-time updates */}
              {isSyncing && (
                <Tooltip content="Synchronizing session state..." position="bottom" disabled={isMobile}>
                  <div className="btn btn-ghost bg-card/80 backdrop-blur-sm border border-border p-2 text-sm flex items-center gap-1 animate-pulse">
                    <LoadingSpinner size="sm" />
                    {!isTablet && <span className="text-xs">Syncing</span>}
                  </div>
                </Tooltip>
              )}

              {/* Deck change button - show when deck is selected */}
              {deck && (
                <Tooltip content="Change deck (D)" position="bottom" disabled={isMobile}>
                  <button
                    onClick={() => {
                      setIsChangingDeckMidSession(true);
                      setDeck(null);
                      setCards([]);
                      setShuffledDeck([]);
                      setSelectedDeckId(null);
                    }}
                    className="btn btn-ghost bg-card/80 backdrop-blur-sm border border-border p-2 text-sm flex items-center gap-1"
                  >
                    <Package className="h-4 w-4" />
                    {!isTablet && <span className="text-xs">Deck</span>}
                  </button>
                </Tooltip>
              )}

              <Tooltip content="Add people to session" position="bottom" disabled={isMobile}>
                <button
                  onClick={() => handleShare()}
                  className="btn btn-ghost bg-card/80 backdrop-blur-sm border border-border p-2 text-sm flex items-center gap-1"
                  disabled={!sessionId}
                >
                  <UserPlus className="h-4 w-4" />
                  {!isTablet && <span className="text-xs">Invite</span>}
                </button>
              </Tooltip>

              <Tooltip content="Toggle theme (T)" position="bottom" disabled={isMobile}>
                <button
                  onClick={toggleTheme}
                  className="btn btn-ghost bg-card/80 backdrop-blur-sm border border-border p-2 text-sm flex items-center gap-1"
                >
                  {darkMode ? (
                    <Sun className="h-4 w-4" />
                  ) : (
                    <Moon className="h-4 w-4" />
                  )}
                  {!isTablet && <span className="text-xs">Theme</span>}
                </button>
              </Tooltip>

              {/* Guest sign in button - moved to end */}
              {isGuest && (
                <Tooltip content="Create account to save your progress" position="bottom" disabled={isMobile}>
                  <button
                    onClick={() => setShowGuestUpgrade(true)}
                    className="btn btn-primary p-2 text-sm flex items-center gap-1"
                  >
                    <LogIn className="h-4 w-4" />
                    {!isTablet && <span className="text-xs">Sign In</span>}
                  </button>
                </Tooltip>
              )}
            </div>
          </div>
          )}
        </div>

        {/* Reading table */}
        <div className={`h-full relative ${darkMode ? 'bg-gradient-to-b from-slate-900 to-slate-800 dark:from-background dark:to-background/80' : 'bg-gradient-to-r from-primary/10 to-accent/10'}`}>
          {/* Step 0: Deck Selection Screen */}
          {(!deck && !deckSelectionLoading) && (
            <div 
              className={`absolute inset-0 z-[100] bg-black/50 flex items-center justify-center ${mobileLayoutClasses.mainPadding}`}
              onClick={isChangingDeckMidSession ? () => {
                // Cancel deck change and restore previous deck when clicking outside
                setIsChangingDeckMidSession(false);
                fetchAndSetDeck(deckId || 'rider-waite-classic');
              } : undefined}
            >
              <div 
                className={`w-full ${isMobile ? 'max-w-4xl max-h-full overflow-y-auto' : 'max-w-5xl'} ${isMobile ? 'p-3' : 'p-4 md:p-6'} bg-card border border-border rounded-xl shadow-lg`}
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header with title and Create Deck button */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <h2 className={`${isMobile ? 'text-lg' : 'text-xl md:text-2xl'} font-serif font-bold`}>
                      {isChangingDeckMidSession ? 'Change Your Deck' : 'Choose Your Deck'}
                    </h2>
                    {isChangingDeckMidSession && (
                      <button
                        onClick={() => {
                          // Cancel deck change and restore previous deck
                          setIsChangingDeckMidSession(false);
                          fetchAndSetDeck(deckId || 'rider-waite-classic');
                        }}
                        className="btn btn-ghost p-2 text-muted-foreground hover:text-foreground"
                      >
                        <XCircle className="h-5 w-5" />
                      </button>
                    )}
                  </div>
                  {/* Create Deck button in top right */}
                  <Link 
                    to="/" 
                    className="btn btn-primary px-4 py-2 text-sm flex items-center gap-2 hover:scale-105 transition-transform"
                  >
                    <Plus className="h-4 w-4" />
                    <span className={isMobile ? 'hidden sm:inline' : ''}>Create Deck</span>
                  </Link>
                </div>

                {/* Subtitle */}
                <div className="text-center mb-6">
                  <p className="text-muted-foreground text-sm md:text-base">
                    {isChangingDeckMidSession 
                      ? `Select a different deck to continue your ${selectedLayout?.name || 'reading'}`
                      : 'Select a tarot deck to begin your reading'
                    }
                  </p>
                  {isChangingDeckMidSession && selectedLayout && (
                    <div className="mt-2 p-2 bg-muted/30 rounded-lg text-sm">
                      <span className="text-accent">Current layout:</span> {selectedLayout.name}
                      {question && <div className="text-xs text-muted-foreground mt-1">"{question}"</div>}
                    </div>
                  )}
                </div>
                
                {/* Tab Navigation */}
                <div className="flex flex-col sm:flex-row gap-1 mb-6 bg-muted/30 p-1 rounded-lg">
                  <button
                    onClick={() => setDeckSelectionTab('collection')}
                    className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all duration-200 flex items-center justify-center gap-2 ${
                      deckSelectionTab === 'collection'
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
                    }`}
                  >
                    <Package className="h-4 w-4" />
                    {collectionTabLabel}
                    {userOwnedDecks.length > 0 && (
                      <span className="text-xs bg-primary/20 text-primary px-1.5 py-0.5 rounded-full">
                        {userOwnedDecks.length}
                      </span>
                    )}
                  </button>
                  <button
                    onClick={() => setDeckSelectionTab('marketplace')}
                    className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all duration-200 flex items-center justify-center gap-2 ${
                      deckSelectionTab === 'marketplace'
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
                    }`}
                  >
                    <ShoppingBag className="h-4 w-4" />
                    Marketplace
                    {loadingMarketplace && (
                      <LoadingSpinner size="sm" />
                    )}
                  </button>
                </div>

                {/* Tab Content */}
                <div className="min-h-[400px]">
                  {/* My Collection Tab */}
                  {deckSelectionTab === 'collection' && (
                    <div>
                      {/* Collection contributors info for shared collections */}
                      {collectionTabLabel === 'Our Collection' && collectionContributors.length > 1 && (
                        <div className="mb-4 p-3 bg-muted/30 rounded-lg text-sm">
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Users className="h-4 w-4" />
                            <span>
                              Combined collection from: {collectionContributors.join(', ')}
                            </span>
                          </div>
                        </div>
                      )}
                {userOwnedDecks.length === 0 ? (
                        <div className="text-center py-12">
                    <Package className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                          <h3 className="text-lg font-medium mb-2">No Decks in Collection</h3>
                          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                            {collectionTabLabel === 'Our Collection' 
                              ? "Your group doesn't have any decks in the collection yet. Browse the marketplace or create your own deck to get started."
                              : "You don't have any decks in your collection yet. Browse the marketplace or create your own deck to get started."
                            }
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                            <button
                              onClick={() => setDeckSelectionTab('marketplace')}
                              className="btn btn-primary px-6 py-2 flex items-center gap-2"
                            >
                              <ShoppingBag className="h-4 w-4" />
                        Browse Marketplace
                            </button>
                            <Link to="/" className="btn btn-secondary px-6 py-2 flex items-center gap-2">
                              <Plus className="h-4 w-4" />
                              Create Your Own
                      </Link>
                    </div>
                  </div>
                ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                      {userOwnedDecks.map((ownedDeck) => (
                        <motion.div
                          key={ownedDeck.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                              transition={{ duration: 0.3 }}
                              className="bg-card border border-border rounded-lg overflow-hidden hover:shadow-lg hover:border-primary/50 transition-all duration-200 cursor-pointer group"
                          onClick={() => isChangingDeckMidSession ? handleDeckChange(ownedDeck) : handleDeckSelect(ownedDeck)}
                        >
                              <div className="aspect-[3/4] bg-primary/10 overflow-hidden relative">
                            {ownedDeck.cover_image ? (
                              <img 
                                src={ownedDeck.cover_image} 
                                alt={ownedDeck.title}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <TarotLogo className="h-12 w-12 text-primary/50" />
                              </div>
                            )}
                                {ownedDeck.is_free && (
                                  <div className="absolute top-2 right-2 bg-primary/90 text-primary-foreground px-2 py-1 rounded-full text-xs font-medium">
                                    Free
                                  </div>
                                )}
                          </div>
                          <div className="p-3">
                                <h3 className="font-medium text-sm mb-1 truncate group-hover:text-primary transition-colors">
                                  {ownedDeck.title}
                                </h3>
                            <p className="text-xs text-muted-foreground mb-2">by {ownedDeck.creator_name}</p>
                            <p className="text-xs text-muted-foreground line-clamp-2">{ownedDeck.description}</p>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                      )}
                    </div>
                  )}

                  {/* Marketplace Tab */}
                  {deckSelectionTab === 'marketplace' && (
                    <div>
                      {loadingMarketplace ? (
                        <div className="text-center py-12">
                          <LoadingSpinner size="lg" className="mx-auto mb-4" />
                          <p className="text-muted-foreground">Loading marketplace decks...</p>
                        </div>
                      ) : marketplaceDecks.length === 0 ? (
                        <div className="text-center py-12">
                          <ShoppingBag className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                          <h3 className="text-lg font-medium mb-2">No Marketplace Decks</h3>
                          <p className="text-muted-foreground mb-6">
                            No decks available in the marketplace at the moment.
                          </p>
                      </div>
                      ) : selectedMarketplaceDeck ? (
                        /* Deck Details View */
                        <div className="space-y-6">
                          {/* Back button and title */}
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => selectMarketplaceDeck(null)}
                              className="btn btn-ghost p-2 hover:bg-muted rounded-md"
                            >
                              <ArrowLeft className="h-4 w-4" />
                            </button>
                            <h3 className="text-lg font-medium">Deck Details</h3>
                    </div>

                          {/* Deck detailed information */}
                          <div className="bg-muted/30 rounded-lg p-4 space-y-4">
                            <div className="flex gap-4">
                              {/* Large deck image */}
                              <div className="flex-shrink-0">
                                <div className="w-32 h-48 rounded-lg overflow-hidden bg-primary/10">
                                  {selectedMarketplaceDeck.cover_image ? (
                                    <img
                                      src={selectedMarketplaceDeck.cover_image}
                                      alt={selectedMarketplaceDeck.title}
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                      <TarotLogo className="h-16 w-16 text-primary/50" />
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Deck info */}
                              <div className="flex-1 space-y-3">
                                <div>
                                  <h2 className="text-xl font-bold mb-1">{selectedMarketplaceDeck.title}</h2>
                                  <p className="text-muted-foreground">by {selectedMarketplaceDeck.creator_name}</p>
                                </div>

                                <div className="flex items-center gap-4">
                                  <div className="flex items-center gap-2">
                                    {selectedMarketplaceDeck.is_free ? (
                                      <span className="bg-green-500/20 text-green-600 px-3 py-1 rounded-full text-sm font-medium">
                                        Free
                                      </span>
                                    ) : (
                                      <span className="bg-primary/20 text-primary px-3 py-1 rounded-full text-sm font-medium">
                                        ${selectedMarketplaceDeck.price}
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-sm text-muted-foreground">
                                    {selectedMarketplaceDeck.card_count} cards
                                  </span>
                                </div>

                                <div>
                                  <h4 className="font-medium mb-1">Theme & Style</h4>
                                  <p className="text-sm text-muted-foreground">{selectedMarketplaceDeck.theme}</p>
                                  <p className="text-sm text-muted-foreground">{selectedMarketplaceDeck.style}</p>
                                </div>
                              </div>
                            </div>

                            {/* Description */}
                            <div>
                              <h4 className="font-medium mb-2">Description</h4>
                              <p className="text-sm text-muted-foreground leading-relaxed">
                                {selectedMarketplaceDeck.description}
                              </p>
                            </div>

                            {/* Sample images */}
                            {selectedMarketplaceDeck.sample_images && selectedMarketplaceDeck.sample_images.length > 0 && (
                              <div>
                                <h4 className="font-medium mb-2">Sample Cards</h4>
                                <div className="flex gap-2 overflow-x-auto">
                                  {selectedMarketplaceDeck.sample_images.map((image, index) => (
                                    <div key={index} className="flex-shrink-0 w-16 h-24 rounded-md overflow-hidden bg-primary/10">
                                      <img
                                        src={image}
                                        alt={`Sample card ${index + 1}`}
                                        className="w-full h-full object-cover"
                                      />
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Purchase count */}
                            {selectedMarketplaceDeck.purchase_count > 0 && (
                              <div className="text-sm text-muted-foreground">
                                {selectedMarketplaceDeck.purchase_count} users have added this deck
                              </div>
                            )}
                          </div>

                          {/* Action buttons */}
                          <div className="space-y-4">
                            {/* Subscription required notification */}
                            {showSubscriptionRequired && (
                              <div className="p-3 bg-warning/10 border border-warning/20 rounded-lg">
                                <div className="flex items-center gap-2 text-warning">
                                  <Zap className="h-4 w-4" />
                                  <span className="text-sm font-medium">Subscription Required</span>
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">
                                  A premium subscription is required to add paid decks to your collection. Please upgrade your account.
                                </p>
                              </div>
                            )}
                            
                            <div className="flex gap-3">
                              {/* Check if deck is already in collection */}
                              {userOwnedDecks.find(d => d.id === selectedMarketplaceDeck.id) ? (
                                <button className="btn btn-secondary flex-1 py-3" disabled>
                                  <Check className="h-4 w-4 mr-2" />
                                  Already in Collection
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleAddToCollection(selectedMarketplaceDeck)}
                                  disabled={addingToCollection}
                                  className="btn btn-primary flex-1 py-3"
                                >
                                  {addingToCollection ? (
                                    <>
                                      <LoadingSpinner size="sm" className="mr-2" />
                                      Adding to Collection...
                                    </>
                                  ) : selectedMarketplaceDeck.is_free ? (
                                    <>
                                      <Plus className="h-4 w-4 mr-2" />
                                      Add to Collection
                                    </>
                                  ) : (
                                    <>
                                      <ShoppingBag className="h-4 w-4 mr-2" />
                                      Add for ${selectedMarketplaceDeck.price}
                                    </>
                                  )}
                                </button>
                              )}
                              
                              {/* Use this deck button if already in collection */}
                              {userOwnedDecks.find(d => d.id === selectedMarketplaceDeck.id) && (
                                <button
                                  onClick={() => {
                                    const ownedDeck = userOwnedDecks.find(d => d.id === selectedMarketplaceDeck.id);
                                    if (ownedDeck) {
                                      isChangingDeckMidSession ? handleDeckChange(ownedDeck) : handleDeckSelect(ownedDeck);
                                    }
                                  }}
                                  className="btn btn-secondary px-6 py-3"
                                >
                                  Use This Deck
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-6">
                          {/* Featured/Promoted section */}
                          <div>
                            <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                              <Sparkles className="h-4 w-4" />
                              Featured Decks
                            </h3>
                            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                              {marketplaceDecks.map((marketplaceDeck) => (
                                <motion.div
                                  key={marketplaceDeck.id}
                                  initial={{ opacity: 0, y: 20 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  transition={{ duration: 0.3 }}
                                  className="bg-card border border-border rounded-lg overflow-hidden hover:shadow-lg hover:border-primary/50 transition-all duration-200 cursor-pointer group relative"
                                  onClick={() => handleMarketplaceDeckSelect(marketplaceDeck)}
                                >
                                  <div className="aspect-[3/4] bg-primary/10 overflow-hidden relative">
                                    {marketplaceDeck.cover_image ? (
                                      <img 
                                        src={marketplaceDeck.cover_image} 
                                        alt={marketplaceDeck.title}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                                      />
                                    ) : (
                                      <div className="w-full h-full flex items-center justify-center">
                                        <TarotLogo className="h-12 w-12 text-primary/50" />
                                      </div>
                                    )}
                                    {marketplaceDeck.is_free ? (
                                      <div className="absolute top-2 right-2 bg-green-500/90 text-white px-2 py-1 rounded-full text-xs font-medium">
                                        Free
                                      </div>
                                    ) : (
                                      <div className="absolute top-2 right-2 bg-primary/90 text-primary-foreground px-2 py-1 rounded-full text-xs font-medium">
                                        ${marketplaceDeck.price}
                                      </div>
                                    )}
                                    
                                    {/* Already owned indicator */}
                                    {userOwnedDecks.find(d => d.id === marketplaceDeck.id) && (
                                      <div className="absolute top-2 left-2 bg-green-500/90 text-white px-2 py-1 rounded-full text-xs font-medium">
                                        <Check className="h-3 w-3" />
                                      </div>
                                    )}
                                  </div>
                                  <div className="p-3">
                                    <h3 className="font-medium text-sm mb-1 truncate group-hover:text-primary transition-colors">
                                      {marketplaceDeck.title}
                                    </h3>
                                    <p className="text-xs text-muted-foreground mb-2">by {marketplaceDeck.creator_name}</p>
                                    <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{marketplaceDeck.description}</p>
                                    <div className="text-xs text-muted-foreground">
                                      Click to view details
                                    </div>
                                  </div>
                                </motion.div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
          
          {/* Deck selection loading */}
          {deckSelectionLoading && (
            <div className="absolute inset-0 z-[100] bg-black/50 flex items-center justify-center">
              <div className="text-center bg-card p-6 rounded-xl shadow-lg">
                <LoadingSpinner size="lg" className="mx-auto mb-4" />
                <p className="text-muted-foreground">
                  Loading deck...
                </p>
              </div>
            </div>
          )}
          
          {/* Step 1: Setup Screen */}
          {readingStep === 'setup' && deck && (
            <div className={`absolute inset-0 flex items-center justify-center ${mobileLayoutClasses.mainPadding}`}>
              <div className={`w-full ${isMobile ? 'max-w-2xl max-h-full overflow-y-auto' : 'max-w-md'} ${isMobile ? 'p-3' : 'p-4 md:p-6'} bg-card border border-border rounded-xl shadow-lg`}>
                {/* Deck info */}
                <div className="flex items-center gap-3 mb-4 p-3 bg-muted/30 rounded-lg">
                  <div className="w-10 h-14 rounded-md overflow-hidden bg-primary/10 shrink-0">
                    {deck.cover_image ? (
                      <img 
                        src={deck.cover_image} 
                        alt={deck.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <TarotLogo className="h-4 w-4 text-primary/50" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-medium text-sm truncate">{deck.title}</h3>
                    <p className="text-xs text-muted-foreground">by {deck.creator_name || 'Unknown Creator'}</p>
                  </div>
                </div>
                
                <h2 className={`${isMobile ? 'text-lg' : 'text-lg md:text-xl'} font-serif font-bold ${isMobile ? 'mb-3' : 'mb-4'}`}>Select a Layout</h2>
                
                <div className={`space-y-2 ${isMobile ? 'mb-3' : 'mb-4'}`}>
                  {availableLayouts.map((layout, index) => (
                    <div 
                      key={layout.id}
                      className={`border rounded-lg ${isMobile ? 'p-2' : 'p-3'} cursor-pointer transition-colors hover:border-accent/50 active:bg-accent/5 ${
                        index === highlightedSetupLayoutIndex ? 'bg-accent/20 ring-2 ring-accent border-accent' : ''
                      }`}
                      onClick={() => handleLayoutSelect(layout)}
                      onMouseEnter={() => setHighlightedSetupLayoutIndex(index)}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <h4 className={`font-medium ${isMobile ? 'text-sm' : 'text-sm md:text-base'}`}>{layout.name}</h4>
                        <span className="text-xs bg-muted px-2 py-0.5 rounded-full">
                          {layout.card_count === 999 ? 'Free' : `${layout.card_count} ${layout.card_count === 1 ? 'card' : 'cards'}`}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">{layout.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          
          {/* Step 1.5: Ask a Question (Optional) */}
          {readingStep === 'ask-question' && deck && selectedLayout && (
            <div className={`absolute inset-0 flex items-center justify-center ${mobileLayoutClasses.mainPadding}`}>
              <div className={`w-full ${isMobile ? 'max-w-2xl max-h-full overflow-y-auto' : 'max-w-lg'} ${isMobile ? 'p-3' : 'p-4 md:p-6'} bg-card border border-border rounded-xl shadow-lg`}>
                {/* Header */}
                <div className="text-center mb-6">
                  <h2 className={`${isMobile ? 'text-lg' : 'text-xl'} font-serif font-bold mb-2`}>🔮 Inspired Questions</h2>
                  <p className="text-sm text-muted-foreground">
                    Choose a life area for personalized questions, or skip to draw cards with your current question.
                  </p>
                </div>

                {/* Current Question Display */}
                {question && (
                  <div className="mb-4 p-3 bg-muted/30 rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">Current question:</p>
                    <p className="text-sm font-medium">"{question}"</p>
                  </div>
                )}

                {/* Life Areas Categories */}
                {!selectedCategory && (
                  <div className="grid grid-cols-2 gap-3 mb-6">
                    {questionCategories.map((category, index) => (
                      <button
                        key={category.id}
                        onClick={() => handleCategorySelect(category.id)}
                        onMouseEnter={() => {
                          setHighlightedCategoryIndex(index);
                          setIsCategoryHighlightingActive(true); // Re-enable highlighting on hover
                        }}
                        className={`p-3 text-left border rounded-lg transition-colors ${
                          isCategoryHighlightingActive && highlightedCategoryIndex === index 
                            ? 'border-accent bg-accent/10 ring-2 ring-accent' 
                            : 'border-border hover:border-accent/50 hover:bg-accent/5'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-lg">{category.icon}</span>
                          <h3 className="font-medium text-sm">{category.name}</h3>
                        </div>
                        <p className="text-xs text-muted-foreground">{category.desc}</p>
                      </button>
                    ))}
                  </div>
                )}

                {/* Generated Questions */}
                {selectedCategory && (
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-medium text-sm">
                        {selectedCategory === 'love' && '💕 Love Questions'}
                        {selectedCategory === 'career' && '🎯 Career Questions'}
                        {selectedCategory === 'finance' && '💰 Finance Questions'}
                        {selectedCategory === 'relationships' && '👥 Relationship Questions'}
                        {selectedCategory === 'spiritual-growth' && '⭐ Spiritual Growth Questions'}
                        {selectedCategory === 'past-lives' && '♾️ Past Lives Questions'}
                      </h3>
                      <button
                        onClick={() => {
                          setSelectedCategory(null);
                          setGeneratedQuestions([]);
                        }}
                        className="text-xs text-muted-foreground hover:text-foreground"
                      >
                        Back
                      </button>
                    </div>

                    {isLoadingQuestions ? (
                      <div className="text-center py-8">
                        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                        <p className="text-sm text-muted-foreground">Generating personalized questions...</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {generatedQuestions.map((q, index) => (
                          <button
                            key={index}
                            onClick={() => handleQuestionSelect(q)}
                            onMouseEnter={() => {
                              setHighlightedQuestionIndex(index);
                              setIsQuestionHighlightingActive(true); // Re-enable highlighting on hover
                            }}
                            className={`w-full p-3 text-left border rounded-lg transition-colors ${
                              isQuestionHighlightingActive && highlightedQuestionIndex === index 
                                ? 'border-accent bg-accent/10 ring-2 ring-accent' 
                                : 'border-border hover:border-accent/50 hover:bg-accent/5'
                            }`}
                          >
                            <p className="text-sm">{q}</p>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Custom Question Input */}
                {showCustomQuestionInput && (
                  <div className="mb-6">
                    <label htmlFor="customQuestionInput" className="block text-sm font-medium mb-2">Write your own question</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="What would you like guidance on?"
                        className="flex-1 p-2 text-sm rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                        id="customQuestionInput" 
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            const input = e.target as HTMLInputElement;
                            if (input.value.trim()) {
                              handleCustomQuestion(input.value.trim());
                              setShowCustomQuestionInput(false); 
                            }
                          }
                        }}
                        autoFocus
                      />
                      <button
                        onClick={() => {
                          const input = document.getElementById('customQuestionInput') as HTMLInputElement;
                          if (input && input.value.trim()) {
                            playSoundEffect('pop'); // Play sound effect
                            handleCustomQuestion(input.value.trim());
                            // Always close the input after clicking the button if question was submitted
                            setShowCustomQuestionInput(false); 
                            setIsQuestionHighlightingActive(true); 
                            setIsCategoryHighlightingActive(true); 
                          } else {
                            showErrorToast("Please type your question or select an inspired question. You can also skip this step.");
                            // Do not hide input, keep it focused for typing
                            input?.focus(); 
                          }
                        }}
                        className="btn btn-primary px-3 py-2 text-sm"
                      >
                        Ask Question
                      </button>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-2 justify-center">
                  {!showCustomQuestionInput && (
                    <button
                      onClick={() => {
                        setShowCustomQuestionInput(true);
                        setIsQuestionHighlightingActive(false); // Disable question highlighting when typing
                        setIsCategoryHighlightingActive(false); // Disable category highlighting when typing
                      }}
                      className="btn btn-secondary px-4 py-2 text-sm"
                    >
                      ✍️ Write Your Own
                    </button>
                  )}
                  
                  <button
                    onClick={handleSkipQuestion}
                    className="btn btn-ghost px-4 py-2 text-sm border border-input"
                  >
                    Skip & Draw Cards
                  </button>
                </div>
              </div>
            </div>
          )}
          
          {/* Step 2: Drawing Cards */}
          {readingStep === 'drawing' && selectedLayout && (
            <div className={`absolute inset-0 flex flex-col ${isMobile ? (isLandscape ? 'pt-24' : 'pt-28') : 'pt-20'}`}>
              {/* Reading table with mobile-friendly zoom controls */}
              <div 
                className="flex-1 relative" 
                ref={readingAreaRef}
                onDrop={selectedLayout?.id === 'free-layout' ? handleFreeLayoutDrop : undefined}
                onDragOver={(e) => {
                  if (selectedLayout?.id === 'free-layout') {
                    e.preventDefault();
                  }
                }}
                onClick={(e) => {
                  if (isDragging && draggedCard && selectedLayout?.id === 'free-layout') {
                    handleFreeLayoutDrop(e);
                  }
                }}
                onMouseDown={(e) => {
                  // Only allow panning with space key to avoid conflicts with card dragging
                  if (!isMobile && !isDragging && !isDraggingPlacedCard && isSpacePressed) {
                    e.preventDefault();
                    e.stopPropagation();
                    handlePanStart(e.clientX, e.clientY);
                  }
                }}
                onWheel={(e) => {
                  // Desktop scroll wheel zoom
                  if (!isMobile && (e.ctrlKey || e.metaKey)) {
                    e.preventDefault();
                    const delta = e.deltaY;
                    const zoomFactor = delta > 0 ? 0.9 : 1.1;
                    const newZoom = Math.max(0.5, Math.min(2, zoomLevel * zoomFactor));
                    setZoomLevelWrapped(newZoom);
                  }
                }}
                style={{
                  cursor: !isMobile && !isDragging && !isDraggingPlacedCard ? (isPanning ? 'grabbing' : (isSpacePressed ? 'grab' : 'default')) : 'default'
                }}
              >
                {/* Zoom controls with shuffle button - repositioned for mobile */}
                <div className={`zoom-controls absolute ${
                  isMobile
                    ? 'left-2 top-1/2 transform -translate-y-1/2 flex-col' // Always left side vertical on mobile
                    : 'top-4 left-4 flex-col'
                } flex gap-1 md:gap-2 bg-card/90 backdrop-blur-sm p-2 rounded-md z-40 items-center`}>
                  {/* Hide zoom controls on mobile */}
                  {!isMobile && (
                    <>
                      <Tooltip content="Zoom in (+ / =)" position="right" disabled={isMobile}>
                        <button onClick={zoomIn} className="p-1.5 hover:bg-muted rounded-sm flex items-center justify-center">
                          <ZoomIn className="h-4 w-4" />
                        </button>
                      </Tooltip>

                      <Tooltip content="Reset zoom (Z)" position="right" disabled={isMobile}>
                        <button onClick={resetZoom} className="p-1.5 hover:bg-muted rounded-sm flex items-center justify-center">
                          <RotateCcw className="h-4 w-4" />
                        </button>
                      </Tooltip>

                      <Tooltip content="Zoom out (- / _)" position="right" disabled={isMobile}>
                        <button onClick={zoomOut} className="p-1.5 hover:bg-muted rounded-sm flex items-center justify-center">
                          <ZoomOut className="h-4 w-4" />
                        </button>
                      </Tooltip>
                    </>
                  )}

                  
                  {/* Desktop Directional Joypad */}
                  {!isMobile && (
                    <>
                      <div className="w-full h-px bg-border my-2"></div>
                      <div className="relative w-16 h-16 flex-shrink-0 mx-auto">
                        {/* Up */}
                        <Tooltip content="Pan up (↑)" position="right" wrapperClassName="absolute top-0 left-1/2 transform -translate-x-1/2">
                          <button 
                            onClick={() => panDirection('up')}
                            className="w-5 h-5 hover:bg-muted rounded-sm flex items-center justify-center"
                          >
                            <ArrowUp className="h-3 w-3" />
                          </button>
                        </Tooltip>
                        
                        {/* Left */}
                        <Tooltip content="Pan left (←)" position="right" wrapperClassName="absolute left-0 top-1/2 transform -translate-y-1/2">
                          <button 
                            onClick={() => panDirection('left')}
                            className="w-5 h-5 hover:bg-muted rounded-sm flex items-center justify-center"
                          >
                            <ChevronLeft className="h-3 w-3" />
                          </button>
                        </Tooltip>
                        
                        {/* Center button */}
                        <Tooltip content="Reset pan to center (C / Enter)" position="right" wrapperClassName="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                          <button 
                            onClick={resetPan}
                            className="w-5 h-5 bg-muted hover:bg-muted-foreground/20 rounded-full flex items-center justify-center transition-colors"
                          >
                            <div className="w-1.5 h-1.5 bg-muted-foreground rounded-full"></div>
                          </button>
                        </Tooltip>
                        
                        {/* Right */}
                        <Tooltip content="Pan right (→)" position="right" wrapperClassName="absolute right-0 top-1/2 transform -translate-y-1/2">
                          <button 
                            onClick={() => panDirection('right')}
                            className="w-5 h-5 hover:bg-muted rounded-sm flex items-center justify-center"
                          >
                            <ChevronRight className="h-3 w-3" />
                          </button>
                        </Tooltip>
                        
                        {/* Down */}
                        <Tooltip content="Pan down (↓)" position="right" wrapperClassName="absolute bottom-0 left-1/2 transform -translate-x-1/2">
                          <button 
                            onClick={() => panDirection('down')}
                            className="w-5 h-5 hover:bg-muted rounded-sm flex items-center justify-center"
                          >
                            <ArrowDown className="h-3 w-3" />
                          </button>
                        </Tooltip>
                      </div>
                      <div className="w-full h-px bg-border my-2"></div>
                    </>
                  )}
                  
                  {/* Shuffle button - always visible */}
                  <Tooltip content="Shuffle deck (Left Shift)" position="right" disabled={isMobile}>
                    <button onClick={shuffleDeck} className="p-1.5 hover:bg-muted rounded-sm flex items-center justify-center">
                      <Shuffle className="h-4 w-4" />
                    </button>
                  </Tooltip>

                  {/* Clear/Reset button - always visible */}
                  <Tooltip content={`Reset cards (${getPlatformShortcut('reset', true)})`} position="right" disabled={isMobile}>
                    <button onClick={resetCards} className="p-1.5 hover:bg-muted rounded-sm text-red-500 hover:text-red-600 flex items-center justify-center">
                      <XCircle className="h-4 w-4" />
                    </button>
                  </Tooltip>

                  {/* Hide other buttons on mobile */}
                  {!isMobile && (
                    <>
                      <Tooltip content={`Show help (${getPlatformShortcut('help')})`} position="right" disabled={isMobile}>
                        <button onClick={toggleHelpModal} className="p-1.5 hover:bg-muted rounded-sm flex items-center justify-center">
                          <HelpCircle className="h-4 w-4" />
                        </button>
                      </Tooltip>
                      <Tooltip content={isMuted ? "Unmute (M)" : "Mute (M)"} position="right" disabled={isMobile}>
                        <div
                          onMouseEnter={() => {
                            if (volumeSliderTimeoutRef.current) clearTimeout(volumeSliderTimeoutRef.current);
                            setShowVolumeSlider(true);
                          }}
                          onMouseLeave={() => {
                            volumeSliderTimeoutRef.current = setTimeout(() => setShowVolumeSlider(false), 1500);
                          }}
                          className="relative p-1.5 hover:bg-muted rounded-sm flex items-center justify-center"
                        >
                          <button onClick={toggleMute}>
                            <Music className={`h-4 w-4 ${isMuted ? 'text-red-500' : ''}`} />
                          </button>
                          {showVolumeSlider && (
                            <motion.div
                              initial={{ opacity: 0, y: -5 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -5 }}
                              className="absolute left-full ml-2 top-1/2 transform -translate-y-1/2 bg-card border border-border p-2 rounded-md shadow-lg z-50"
                              onMouseEnter={() => {
                                if (volumeSliderTimeoutRef.current) clearTimeout(volumeSliderTimeoutRef.current);
                              }}
                              onMouseLeave={() => {
                                volumeSliderTimeoutRef.current = setTimeout(() => setShowVolumeSlider(false), 1500);
                              }}
                            >
                              <input
                                type="range"
                                min="0"
                                max="1"
                                step="0.01"
                                value={volume}
                                onChange={(e) => setGlobalVolume(parseFloat(e.target.value))}
                                className="w-20 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary"
                              />
                            </motion.div>
                          )}
                        </div>
                      </Tooltip>
                    </>
                  )}
                </div>

                {/* Layout visualization with mobile-responsive card sizes */}
                <div 
                  className="reading-content absolute inset-0 transition-transform duration-300 ease-in-out"
                  style={{
                    ...getTransform(zoomLevel, zoomFocus, panOffset),
                    // Additional optimizations for smooth performance
                    contain: 'layout style paint',
                  }}
                >
                  {/* TarotForge Watermark */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
                    <div className="flex items-center gap-3 opacity-15 transform scale-150">
                      <TarotLogo className="w-12 h-12 text-foreground" />
                      <span className="font-serif text-4xl font-bold tracking-wider text-foreground">TarotForge</span>
                    </div>
                  </div>
                  {/* Free layout cards */}
                  {selectedLayout?.id === 'free-layout' && selectedCards.map((selectedCard: any, index: number) => (
                    <motion.div
                      key={`free-${index}`}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.5 }}
                      className="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-move"
                      data-card-element="true"
                      style={{ 
                        left: `${selectedCard.x}%`, 
                        top: `${selectedCard.y}%`,
                        zIndex: activeCardIndex === index ? 20 : 10 + index
                      }}
                      drag
                      dragMomentum={false}
                      dragElastic={0}
                      onDragStart={(event, info) => handlePlacedCardDragStart(index)}
                      onDragEnd={(event, info) => handlePlacedCardDragEnd(event, info, index)}
                      whileHover={{ scale: 1.05 }}
                      whileDrag={{ scale: 1.1, zIndex: 50 }}
                      onDoubleClick={(e) => {
                        if (!isMobile && (selectedCard as any).revealed) {
                          handleCardDoubleClick(index, e);
                        }
                      }}
                      onTouchEnd={(e) => {
                        if (isMobile) {
                          e.preventDefault();
                          handleCardDoubleTap(index, e);
                        }
                      }}
                    >
                      <motion.div 
                        className={`${isMobile ? 'w-20 h-30' : 'w-20 h-30 md:w-24 md:h-36'} shadow-lg cursor-pointer transition-shadow p-0.5 rounded-md ${
                          activeCardIndex === index ? 'ring-2 ring-primary shadow-xl' : ''
                        }`}
                        animate={{ 
                          rotateY: (selectedCard as any).revealed ? 0 : 180 
                        }}
                        transition={cardAnimationConfig}
                        onClick={() => {
                          if ((selectedCard as any).revealed) {
                            // Open card detail modal for revealed cards
                            updateSharedModalState({
                              isOpen: true,
                              cardIndex: index,
                              showDescription: false,
                              triggeredBy: participantId || null
                            });
                          } else {
                            handleCardFlip(index);
                          }
                        }}
                      >
                        {(selectedCard as any).revealed ? (
                          <img 
                            src={selectedCard.image_url} 
                            alt={selectedCard.name} 
                            className={`w-full h-full object-cover rounded-md ${(selectedCard as any).isReversed ? 'rotate-180' : ''}`}
                          />
                        ) : (
                          <TarotCardBack />
                        )}
                      </motion.div>
                      <div 
                        className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 whitespace-nowrap bg-card/80 backdrop-blur-sm px-1 md:px-2 py-0.5 rounded-full text-xs cursor-move"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {selectedCard.position} {(selectedCard as any).revealed && (selectedCard as any).isReversed && '(R)'}
                      </div>
                    </motion.div>
                  ))}

                  {/* Predefined layout cards */}
                  {selectedLayout?.id !== 'free-layout' && selectedLayout?.positions && selectedLayout.positions.map((position: any, index: number) => {
                    const selectedCard = selectedCards[index];
                    const isHovered = hoveredPosition === index && isDragging;

                    // Special handling for Celtic Cross Present (0) and Challenge (1) positions
                    const isCelticCross = selectedLayout?.id === 'celtic-cross';
                    const isPresentPosition = isCelticCross && index === 0;
                    const isChallengePosition = isCelticCross && index === 1;
                    const presentCard = isCelticCross ? selectedCards[0] : null;
                    const challengeCard = isCelticCross ? selectedCards[1] : null;

                    // For Celtic Cross, adjust positioning for drop zones only
                    let adjustedPosition = { ...position };

                    // Apply mobile-specific three-card spacing
                    if (isMobile && selectedLayout?.id === 'three-card') {
                      const mobilePositions = getThreeCardPositions(true);
                      adjustedPosition = mobilePositions[index] || position;
                    }
                    if (isCelticCross && (isPresentPosition || isChallengePosition)) {
                      // For drop zones: offset Challenge position slightly when both positions are empty
                      // or when only Present card is placed, so users can distinguish between the two drop areas
                      if (isChallengePosition && !challengeCard) {
                        adjustedPosition = { ...position, x: position.x + 5, y: position.y + 5 };
                      }
                      // When both cards are placed, adjust positioning for proper cross formation
                      else if (presentCard && challengeCard) {
                        if (isPresentPosition) {
                          // Present card: no offset, stays in center (horizontal)
                          adjustedPosition = { ...position };
                        } else if (isChallengePosition) {
                          // Challenge card: no offset, stays in center (vertical due to 90° rotation)
                          adjustedPosition = { ...position };
                        }
                      }
                      // When only one card is placed, use original position
                      else if (selectedCard) {
                        adjustedPosition = { ...position };
                      }
                    }
                    
                    let displayX = adjustedPosition.x;
                    if (isMobile && selectedLayout?.id === 'three-card') {
                      if (index === 0) displayX = 25; // Original Past X for mobile
                      else if (index === 1) displayX = 50; // Original Present X for mobile
                      else if (index === 2) displayX = 75; // Original Future X for mobile
                    }
                    
                    return (
                      <div 
                        key={position.id}
                        className="absolute transform -translate-x-1/2 -translate-y-1/2"
                        style={{ 
                          left: `${displayX}%`, 
                          top: `${adjustedPosition.y}%`,
                          zIndex: selectedCard ? (10 + index) : (index === 1 ? 2 : 1) // Equal z-index for both cards when placed
                        }}
                        onDragOver={(e) => {
                          e.preventDefault();
                          setHoveredPosition(index);
                        }}
                        onDragLeave={() => setHoveredPosition(null)}
                        onDrop={(e) => {
                          e.preventDefault();
                          if (draggedCard && !selectedCard) {
                            handleCardDrop(index);
                          }
                        }}
                        onClick={() => {
                          console.log('[Click] Position clicked:', index, 'isDragging:', isDragging, 'selectedCard:', !!selectedCard);
                          // Desktop click or mobile tap (as fallback)
                          if (isDragging && draggedCard && !selectedCard) {
                            handleCardDrop(index);
                          } else if (!selectedCard && !isDragging) {
                            // Allow clicking/tapping empty positions to draw cards
                            drawCardToPosition(index);
                          }
                        }}
                        onTouchStart={(e) => {
                          console.log('[TouchStart] Position:', index, 'isMobile:', isMobile, 'selectedCard:', !!selectedCard);
                          // Track touch start for tap detection
                          if (!selectedCard && !isDragging) {
                            e.currentTarget.dataset.touchStartTime = Date.now().toString();
                          }
                        }}
                        onTouchEnd={(e) => {
                          console.log('[TouchEnd] Position:', index, 'isMobile:', isMobile, 'isDragging:', isDragging);

                          const touchStartTime = parseInt(e.currentTarget.dataset.touchStartTime || '0');
                          const touchDuration = Date.now() - touchStartTime;
                          console.log('[TouchEnd] Duration:', touchDuration, 'ms');

                          if (isDragging && draggedCard && !selectedCard) {
                            // Handle card drop from drag
                            console.log('[TouchEnd] Dropping dragged card');
                            e.preventDefault();
                            e.stopPropagation();
                            handleCardDrop(index);
                          } else if (!isDragging && !selectedCard && touchDuration < 500) {
                            // Handle tap (quick touch) to draw card
                            console.log('[TouchEnd] Drawing card via tap');
                            e.preventDefault();
                            e.stopPropagation();
                            drawCardToPosition(index);
                          }
                        }}
                      >
                        {/* Card position indicator - responsive size */}
                        {!selectedCard && (
                          <div 
                            data-dropzone-index={index} // Added data attribute
                            className={`${isMobile ? 'w-20 h-30' : 'w-20 h-30 md:w-24 md:h-36'} border-2 border-dashed ${
                              isHovered ? 'border-primary bg-primary/10' : 'border-muted-foreground/30'
                            } rounded-md flex flex-col items-center justify-center transition-colors ${
                              isMobile ? 'active:bg-primary/20 active:border-primary cursor-pointer' : ''
                            }`}
                            style={{
                              transform: adjustedPosition.rotation ? `rotate(${adjustedPosition.rotation}deg)` : 'none',
                              transformOrigin: 'center center'
                            }}
                          >
                            <span className={`text-xs text-center px-1 ${isHovered ? 'text-primary' : 'text-muted-foreground'}`}>
                              {position.name}
                            </span>
                            {isHovered && !isMobile && (
                              <span className="text-xs text-primary mt-1">Drop here</span>
                            )}
                            {isMobile && !isHovered && (
                              <span className="text-xs text-muted-foreground/70 mt-1">Tap to draw</span>
                            )}
                          </div>
                        )}
                        
                        {/* Selected card - responsive size */}
                        {selectedCard && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ 
                              opacity: 1, 
                              scale: activeCardIndex === index ? 1.1 : 1 
                            }}
                            transition={cardAnimationConfig}
                            className={`relative ${
                              adjustedPosition.rotation === 90
                                ? (isMobile ? 'w-30 h-20' : 'w-30 h-20 md:h-24 md:w-36') // Swap dimensions for rotated cards
                                : (isMobile ? 'w-20 h-30' : 'w-20 h-30 md:w-24 md:h-36') // Normal dimensions
                            }`}
                            data-card-element="true"
                            onTouchEnd={(e) => {
                              if (isMobile) {
                                e.preventDefault();
                                handleCardDoubleTap(index, e);
                              }
                            }}
                            whileHover={{ scale: 1.05 }}
                          >
                            <motion.div 
                              className={`${isMobile ? 'w-20 h-30' : 'w-20 h-30 md:w-24 md:h-36'} shadow-lg cursor-pointer p-0.5 rounded-md`} // Added rounded-md
                              style={{ 
                                transformOrigin: 'center center'
                              }}
                              animate={{ 
                                rotateY: (selectedCard as any).revealed ? 0 : 180,
                                rotateZ: adjustedPosition.rotation || 0
                              }}
                              transition={cardAnimationConfig}
                              onClick={() => {
                                if ((selectedCard as any).revealed) {
                                  // Open card detail modal for revealed cards
                                  updateSharedModalState({
                                    isOpen: true,
                                    cardIndex: index,
                                    showDescription: false,
                                    triggeredBy: participantId || null
                                  });
                                } else {
                                  handleCardFlip(index);
                                }
                              }}
                            >
                              {(selectedCard as any).revealed ? (
                                <img 
                                  src={selectedCard.image_url} 
                                  alt={selectedCard.name} 
                                  className={`w-full h-full object-cover rounded-md ${(selectedCard as any).isReversed ? 'rotate-180' : ''}`}
                                />
                              ) : (
                                <TarotCardBack />
                              )}
                            </motion.div>
                            <div 
                              className={`absolute whitespace-nowrap bg-card/80 backdrop-blur-sm px-1 md:px-2 py-0.5 rounded-full text-xs cursor-move ${
                                adjustedPosition.rotation === 90
                                  ? '-right-16 top-1/2 transform -translate-y-1/2' // Position to the right for rotated cards
                                  : '-bottom-6 left-1/2 transform -translate-x-1/2' // Position below for normal cards
                              }`}
                              onClick={(e) => e.stopPropagation()}
                            >
                              {isMobile ? position.name.slice(0, 8) + (position.name.length > 8 ? '...' : '') : position.name} {(selectedCard as any).revealed && (selectedCard as any).isReversed && '(R)'}
                            </div>
                          </motion.div>
                        )}
                      </div>
                    );
                  })}

                  {/* Free layout drop zone indicator */}
                  {selectedLayout?.id === 'free-layout' && isDragging && (
                    <div className="absolute inset-0 border-2 border-dashed border-primary/30 bg-primary/5 rounded-lg flex items-center justify-center">
                      <div className="text-center">
                        <div className="text-primary mb-2">
                          <svg className="w-8 h-8 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                          </svg>
                        </div>
                        <p className="text-sm text-primary font-medium">Drop anywhere to place card</p>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Deck pile - show cards that can be dragged */}
                {(shouldUseSessionDeck ? sessionShuffledDeck : shuffledDeck).length > 0 && (
                  <motion.div 
                    key={`deck-pile-${deckRefreshKey}`} 
                    className={`deck-pile absolute ${isMobile ? 'bottom-4 left-0 right-0' : 'bottom-8 left-1/2 transform -translate-x-1/2'} z-20`}
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                  >
                    {isMobile ? (
                      /* Mobile: Full deck with horizontal panning - all 78 cards */
                      <div className="relative w-full h-28 overflow-x-auto flex justify-center">
                        <div 
                          className="relative h-28 flex items-end justify-center"
                          style={{ 
                            width: `${shuffledDeck.length * 8}px`,
                            minWidth: '100%'
                          }}
                        >
                          {(shouldUseSessionDeck ? sessionShuffledDeck : shuffledDeck).map((card: Card, index: number) => {
                            const totalCards = (shouldUseSessionDeck ? sessionShuffledDeck : shuffledDeck).length;
                            const angle = (index - (totalCards - 1) / 2) * 1.2; // 1.2 degrees between cards for mobile shallow arc
                            const radius = 200; // Radius for mobile arc
                            const x = Math.sin((angle * Math.PI) / 180) * radius; // Remove the offset that was pushing right
                            const y = -Math.cos((angle * Math.PI) / 180) * radius * 0.12; // Very shallow curve for mobile
                            
                            return (
                              <motion.div
                                key={`deck-mobile-${index}`}
                                className="absolute w-10 h-16 cursor-grab active:cursor-grabbing"
                                style={{
                                  left: '50%',
                                  bottom: '0',
                                  transformOrigin: 'bottom center'
                                }}
                                initial={{
                                  transform: `translateX(-50%) translateX(${x}px) translateY(${y}px) rotate(${angle}deg)`,
                                  zIndex: totalCards - index,
                                }}
                                whileHover={{
                                  transform: `translateX(-50%) translateX(${x}px) translateY(${y - 12}px) rotate(${angle}deg) scale(1.15)`,
                                  zIndex: 100,
                                  transition: { duration: 0.2 }
                                }}
                                whileTap={{
                                  scale: 0.9,
                                  transition: { duration: 0.1 }
                                }}
                                draggable={true}
                                onDragStart={(e) => handleDragStart(card, index, e)}
                                onMouseDown={(e) => handleDragStart(card, index, e)}
                                onTouchStart={(e) => handleDragStart(card, index, e)}
                                onMouseMove={handleDragMove}
                                onTouchMove={handleDragMove}
                                onTouchEnd={(e) => {
                                  // Rigorous check for mobile drag state
                                  if (isMobile && isDragging && draggedCard) {
                                    e.preventDefault(); // Prevent default touch behavior like scrolling
                                    e.stopPropagation(); // Prevent this event from bubbling to document listeners

                                    if (selectedLayout?.id === 'free-layout') {
                                      handleFreeLayoutDrop(e); // This function calls handleDragEnd internally
                                    } else {
                                      // Predefined layout on mobile: Card performs hit-testing on touchend
                                      const touch = e.changedTouches[0];
                                      if (touch) {
                                        const { clientX, clientY } = touch;
                                        const dropzones = document.querySelectorAll('[data-dropzone-index]');
                                        let droppedSuccessfully = false;

                                        for (let i = 0; i < dropzones.length; i++) {
                                          const dzElement = dropzones[i] as HTMLElement; // Cast to HTMLElement
                                          const rect = dzElement.getBoundingClientRect();

                                          if (
                                            clientX >= rect.left &&
                                            clientX <= rect.right &&
                                            clientY >= rect.top &&
                                            clientY <= rect.bottom
                                          ) {
                                            const dropzoneIndexStr = dzElement.getAttribute('data-dropzone-index');
                                            if (dropzoneIndexStr) {
                                              const dropzoneIndex = parseInt(dropzoneIndexStr, 10);
                                              // Check if the dropzoneIndex is valid and the slot is empty
                                              if (!isNaN(dropzoneIndex) && 
                                                  (selectedCards[dropzoneIndex] === undefined || selectedCards[dropzoneIndex] === null)) {
                                                handleCardDrop(dropzoneIndex); // This calls handleDragEnd internally
                                                droppedSuccessfully = true;
                                                break; // Exit loop once dropped
                                              }
                                            }
                                          }
                                        }

                                        if (!droppedSuccessfully) {
                                          handleDragEnd(); // No valid, empty dropzone was hit
                                        }
                                      } else {
                                        handleDragEnd(); // No touch data from event
                                      }
                                    }
                                  } else if (isMobile && isDragging) {
                                    // Fallback: isDragging was true, but draggedCard was null or other conditions failed.
                                    // This prevents a stuck dragging state.
                                    handleDragEnd();
                                  }
                                  // If not a mobile drag event fitting the conditions, this handler does nothing.
                                }}
                              >
                                <TarotCardBack className="w-full h-full rounded-md shadow-lg hover:shadow-xl transition-shadow">
                                  {/* Drag text overlay */}
                                  <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2 z-10">
                                    <span className="text-xs font-serif tracking-wider" style={{ color: 'rgb(139 92 246 / 0.7)' }}>
                                      {index < 5 ? 'Drag' : ''}
                                    </span>
                                  </div>
                                </TarotCardBack>
                                  {index === Math.floor(totalCards / 2) && (
                                    <div className="absolute -top-2 -right-1 bg-accent text-accent-foreground rounded-full w-4 h-4 text-xs flex items-center justify-center shadow-md z-[300]">
                                      {(shouldUseSessionDeck ? sessionShuffledDeck : shuffledDeck).length}
                                    </div>
                                  )}
                                </motion.div>
                              );
                            })}
                        </div>
                        
                        {/* Mobile navigation hints */}
                        <div className="absolute top-0 left-1/2 transform -translate-x-1/2 bg-muted/80 backdrop-blur-sm px-3 py-1 rounded-full text-xs text-muted-foreground">
                          ← Swipe to browse all {(shouldUseSessionDeck ? sessionShuffledDeck : shuffledDeck).length} cards →
                        </div>
                        

                      </div>
                    ) : (
                      /* Desktop: Wide fan spread showing all cards - larger and more readable */
                      <div className="relative w-full h-36">
                        {(shouldUseSessionDeck ? sessionShuffledDeck : shuffledDeck).map((card: Card, index: number) => {
                          const totalCards = (shouldUseSessionDeck ? sessionShuffledDeck : shuffledDeck).length;
                          const angle = (index - (totalCards - 1) / 2) * 2.2; // 2.2 degrees between cards for wider spread
                          const radius = 600; // Larger radius for gentler curve
                          const x = Math.sin((angle * Math.PI) / 180) * radius;
                          const y = -Math.cos((angle * Math.PI) / 180) * radius * 0.08; // Very gentle curve
                          
                          return (
                            <motion.div
                              key={`deck-desktop-${index}`}
                              className="absolute w-16 h-24 cursor-grab active:cursor-grabbing"
                              style={{
                                left: '50%',
                                bottom: '0',
                                transformOrigin: 'bottom center'
                              }}
                              initial={{
                                transform: `translateX(-50%) translateX(${x}px) translateY(${y}px) rotate(${angle}deg)`,
                                zIndex: totalCards - index,
                              }}
                              whileHover={{
                                transform: `translateX(-50%) translateX(${x}px) translateY(${y - 25}px) rotate(${angle}deg) scale(1.15)`,
                                zIndex: 200,
                                transition: { duration: 0.2, ease: "easeOut" }
                              }}
                              whileTap={{
                                scale: 0.95,
                                transition: { duration: 0.1 }
                              }}
                              draggable={true}
                              onDragStart={(e) => handleDragStart(card, index, e)}
                              onMouseDown={(e) => handleDragStart(card, index, e)}
                              onTouchStart={(e) => handleDragStart(card, index, e)}
                              onMouseMove={handleDragMove}
                              onTouchMove={handleDragMove}
                              onTouchEnd={(e) => {
                                if (isDragging) {
                                  e.preventDefault();
                                  handleFreeLayoutDrop(e);
                                }
                              }}
                            >
                                                          <TarotCardBack className="w-full h-full rounded-lg shadow-lg hover:shadow-xl transition-shadow">
                              {/* Drag text overlay */}
                              <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2 z-10">
                                <span className="text-xs font-serif tracking-wider" style={{ color: 'rgb(139 92 246 / 0.7)' }}>
                                  {index < 20 ? 'Drag' : ''}
                                </span>
                              </div>
                            </TarotCardBack>
                            </motion.div>
                          );
                        })}

                        {/* Card count indicator */}
                        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-accent text-accent-foreground rounded-full w-8 h-8 text-sm flex items-center justify-center shadow-lg z-[300]">
                          {(shouldUseSessionDeck ? sessionShuffledDeck : shuffledDeck).length}
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}
                

                
                {/* Loading indicator for interpretation */}
                {(isGeneratingInterpretation || sessionIsGeneratingInterpretation) && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center backdrop-blur-sm">
                    <div className="bg-card p-4 md:p-6 rounded-xl shadow-lg text-center mx-4">
                      <LoadingSpinner size="lg" className="mx-auto mb-4" />
                      <p className="text-muted-foreground text-sm md:text-base">
                        {sessionLoadingStates?.triggeredBy && sessionLoadingStates.triggeredBy !== participantId
                          ? 'Another participant is generating interpretation...'
                          : 'Generating interpretation...'
                        }
                      </p>
                    </div>
                  </div>
                )}
                
                {/* Loading indicator for shuffling */}
                {(isShuffling || sessionIsShuffling) && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center backdrop-blur-sm">
                    <div className="bg-card p-4 md:p-6 rounded-xl shadow-lg text-center mx-4">
                      <LoadingSpinner size="lg" className="mx-auto mb-4" />
                      <p className="text-muted-foreground text-sm md:text-base">
                        {sessionLoadingStates?.triggeredBy && sessionLoadingStates.triggeredBy !== participantId
                          ? 'Another participant is shuffling cards...'
                          : 'Shuffling cards...'
                        }
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Step 3: Interpretation - mobile responsive layout */}
          {readingStep === 'interpretation' && (
            <div className={`absolute inset-0 ${isMobile ? (isLandscape && !showMobileInterpretation ? 'flex pt-24' : 'flex-col pt-28') : 'pt-20'}`}> {/* Desktop: No longer flex, pt-20 for header */}
              {/* Card Display Area & Fixed Controls Container */}
              <div className={`relative h-full ${isMobile ? (isLandscape && !showMobileInterpretation ? 'w-3/5' : (showMobileInterpretation ? 'hidden' : 'flex-1 w-full')) : 'w-full'}`}> 
                
                {/* Zoom Controls: Positioned absolutely relative to this container, fixed during pan/zoom of canvas */}
                <div className={`zoom-controls absolute ${
                  isMobile
                    ? 'left-2 top-1/2 transform -translate-y-1/2 flex-col'
                    : 'top-4 left-4 flex-col'
                } flex gap-1 md:gap-2 bg-card/90 backdrop-blur-sm p-2 rounded-md z-40 items-center`}>
                  {/* Hide zoom controls on mobile */}
                  {!isMobile && (
                    <>
                      <Tooltip content="Zoom out (- / _)" position="right" disabled={isMobile}><button onClick={zoomOut} className="p-1.5 hover:bg-muted rounded-sm flex items-center justify-center"><ZoomOut className="h-4 w-4" /></button></Tooltip>
                      <Tooltip content="Reset zoom (Z)" position="right" disabled={isMobile}><button onClick={resetZoom} className="p-1.5 hover:bg-muted rounded-sm flex items-center justify-center"><RotateCcw className="h-4 w-4" /></button></Tooltip>
                      <Tooltip content="Zoom in (+ / =)" position="right" disabled={isMobile}><button onClick={zoomIn} className="p-1.5 hover:bg-muted rounded-sm flex items-center justify-center"><ZoomIn className="h-4 w-4" /></button></Tooltip>
                    </>
                  )}
                  {!isMobile && (
                    <>
                      <div className="w-full h-px bg-border my-2"></div>
                      <div className="relative w-16 h-16 flex-shrink-0 mx-auto">
                        <Tooltip content="Pan up (↑)" position="right" wrapperClassName="absolute top-0 left-1/2 transform -translate-x-1/2"><button onClick={() => panDirection('up')} className="w-5 h-5 hover:bg-muted rounded-sm flex items-center justify-center"><ArrowUp className="h-3 w-3" /></button></Tooltip>
                        <Tooltip content="Pan left (←)" position="right" wrapperClassName="absolute left-0 top-1/2 transform -translate-y-1/2"><button onClick={() => panDirection('left')} className="w-5 h-5 hover:bg-muted rounded-sm flex items-center justify-center"><ChevronLeft className="h-3 w-3" /></button></Tooltip>
                        <Tooltip content="Reset pan to center (C / Enter)" position="right" wrapperClassName="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"><button onClick={resetPan} className="w-5 h-5 bg-muted hover:bg-muted-foreground/20 rounded-full flex items-center justify-center transition-colors"><div className="w-1.5 h-1.5 bg-muted-foreground rounded-full"></div></button></Tooltip>
                        <Tooltip content="Pan right (→)" position="right" wrapperClassName="absolute right-0 top-1/2 transform -translate-y-1/2"><button onClick={() => panDirection('right')} className="w-5 h-5 hover:bg-muted rounded-sm flex items-center justify-center"><ChevronRight className="h-3 w-3" /></button></Tooltip>
                        <Tooltip content="Pan down (↓)" position="right" wrapperClassName="absolute bottom-0 left-1/2 transform -translate-x-1/2"><button onClick={() => panDirection('down')} className="w-5 h-5 hover:bg-muted rounded-sm flex items-center justify-center"><ArrowDown className="h-3 w-3" /></button></Tooltip>
                      </div>
                      <div className="w-full h-px bg-border my-2"></div>
                    </>
                  )}
                  <Tooltip content="Shuffle deck (Left Shift)" position="right" disabled={isMobile}><button onClick={shuffleDeck} className="p-1.5 hover:bg-muted rounded-sm flex items-center justify-center"><Shuffle className="h-4 w-4" /></button></Tooltip>
                  <Tooltip content={`Show help (${getPlatformShortcut('help')})`} position="right" disabled={isMobile}><button onClick={toggleHelpModal} className="p-1.5 hover:bg-muted rounded-sm flex items-center justify-center"><HelpCircle className="h-4 w-4" /></button></Tooltip>
                  <Tooltip content={`Reset cards (${getPlatformShortcut('reset', true)})`} position="right" disabled={isMobile}><button onClick={resetCards} className="p-1.5 hover:bg-muted rounded-sm text-red-500 hover:text-red-600 flex items-center justify-center"><XCircle className="h-4 w-4" /></button></Tooltip>
                  <Tooltip content={isMuted ? "Unmute (M)" : "Mute (M)"} position="right" disabled={isMobile}>
                     <div onMouseEnter={() => { if (volumeSliderTimeoutRef.current) clearTimeout(volumeSliderTimeoutRef.current); setShowVolumeSlider(true); }} onMouseLeave={() => { volumeSliderTimeoutRef.current = setTimeout(() => setShowVolumeSlider(false), 1500);}} className="relative p-1.5 hover:bg-muted rounded-sm flex items-center justify-center">
                      <button onClick={toggleMute}><Music className={`h-4 w-4 ${isMuted ? 'text-red-500' : ''}`} /></button>
                      {showVolumeSlider && (<motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} className="absolute left-full ml-2 top-1/2 transform -translate-y-1/2 bg-card border border-border p-2 rounded-md shadow-lg z-50" onMouseEnter={() => { if (volumeSliderTimeoutRef.current) clearTimeout(volumeSliderTimeoutRef.current);}} onMouseLeave={() => { volumeSliderTimeoutRef.current = setTimeout(() => setShowVolumeSlider(false), 1500);}}><input type="range" min="0" max="1" step="0.01" value={volume} onChange={(e) => setGlobalVolume(parseFloat(e.target.value))} className="w-20 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary" /></motion.div>)}
                    </div>
                  </Tooltip>
                </div>
                
                {/* Transformed Card Canvas */}
                <div 
                  className="absolute inset-0" 
                  onMouseDown={(e) => {
                    if (!isMobile && !isDragging && !isDraggingPlacedCard && isSpacePressed) {
                      e.preventDefault(); e.stopPropagation(); handlePanStart(e.clientX, e.clientY);
                    }
                  }}
                  onWheel={(e) => {
                    if (!isMobile && (e.ctrlKey || e.metaKey)) {
                      e.preventDefault(); const delta = e.deltaY; const zoomFactor = delta > 0 ? 0.9 : 1.1;
                      const newZoom = Math.max(0.5, Math.min(2, zoomLevel * zoomFactor)); setZoomLevelWrapped(newZoom);
                    }
                  }}
                  style={{
                    ...(getTransform(zoomLevel, zoomFocus, panOffset) || {}),
                    contain: 'layout style paint',
                    cursor: !isMobile && !isDragging && !isDraggingPlacedCard ? (isPanning ? 'grabbing' : (isSpacePressed ? 'grab' : 'default')) : 'default'
                  }}
                >
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
                    <div className="flex items-center gap-3 opacity-15 transform scale-150">
                      <TarotLogo className="w-12 h-12 text-foreground" />
                      <span className="font-serif text-4xl font-bold tracking-wider text-foreground">TarotForge</span>
                    </div>
                  </div>
                  {selectedLayout?.id === 'free-layout' && selectedCards.map((cardData: any, index: number) => {
                    return (
                    <motion.div key={`free-interp-${index}`} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: activeCardIndex === index ? 1.1 : 1 }} transition={cardAnimationConfig}
                      className="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-move" data-card-element="true"
                      style={{ left: `${cardData.x}%`, top: `${cardData.y}%`, zIndex: activeCardIndex === index ? 20 : 10 + index }}
                      drag dragMomentum={false} dragElastic={0} onDragStart={(event, info) => handlePlacedCardDragStart(index)} onDragEnd={(event, info) => handlePlacedCardDragEnd(event, info, index)}
                      whileHover={{ scale: 1.05 }} whileDrag={{ scale: 1.1, zIndex: 50 }}
                      onClick={() => { if (cardData.revealed) { updateSharedModalState({ isOpen: true, cardIndex: index, showDescription: false, triggeredBy: participantId || null }); } else { handleCardFlip(index); } }}
                      onDoubleClick={(e) => { if (!isMobile && cardData.revealed) { handleCardDoubleClick(index, e); } }}
                      onTouchEnd={(e) => { if (isMobile) { e.preventDefault(); handleCardDoubleTap(index, e); } }}
                    >
                      <motion.div className={`${isMobile ? 'w-20 h-30' : 'w-20 h-30 md:w-24 md:h-36'} rounded-md overflow-hidden shadow-lg cursor-pointer transition-shadow ${activeCardIndex === index ? 'ring-2 ring-primary shadow-xl' : ''}`} animate={{ rotateY: cardData.revealed ? 0 : 180 }} transition={cardAnimationConfig}>
                        {cardData.revealed ? <img src={cardData.image_url} alt={cardData.name} className={`w-full h-full object-cover rounded-md ${cardData.isReversed ? 'rotate-180' : ''}`} /> : <TarotCardBack />}
                      </motion.div>
                      <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 whitespace-nowrap bg-card/80 backdrop-blur-sm px-1 md:px-2 py-0.5 rounded-full text-xs cursor-move" onClick={(e) => e.stopPropagation()}>
                        {cardData.position} {cardData.revealed && cardData.isReversed && '(R)'}
                      </div>
                    </motion.div>
                  );}) 
                  }
                  {selectedLayout?.id !== 'free-layout' && selectedLayout && selectedLayout.positions.map((position: any, index: number) => {
                    const cardData = selectedCards[index] as any;
                    if (!cardData) return null;
                    const isCelticCross = selectedLayout?.id === 'celtic-cross'; const isChallengePosition = isCelticCross && index === 1;
                    // Use dynamic positions for three-card layout on mobile
                    let adjustedPosition = { ...position };
                    if (isMobile && selectedLayout?.id === 'three-card') {
                      const mobilePositions = getThreeCardPositions(true);
                      adjustedPosition = mobilePositions[index] || position;
                    }
                    let displayX = adjustedPosition.x;
                    return (
                      <div key={position.id} className="absolute transform -translate-x-1/2 -translate-y-1/2" style={{ left: `${displayX}%`, top: `${adjustedPosition.y}%`, zIndex: activeCardIndex === index ? 20 : (isChallengePosition ? 12 : 10 + index) }}>
                        <motion.div className="relative" data-card-element="true" onTouchEnd={(e) => { if (isMobile) { e.preventDefault(); handleCardDoubleTap(index, e); } }} whileHover={{ scale: 1.05 }} animate={activeCardIndex === index ? { scale: 1.1 } : { scale: 1 }}>
                          <motion.div className={`${isMobile ? 'w-20 h-30' : 'w-20 h-30 md:w-24 md:h-36'} rounded-md overflow-hidden shadow-lg cursor-pointer`} style={{ transform: adjustedPosition.rotation ? `rotate(${adjustedPosition.rotation}deg)` : 'none' }} animate={{ rotateY: cardData.revealed ? 0 : 180 }} transition={cardAnimationConfig}
                            onClick={() => { if (cardData.revealed) { updateSharedModalState({ isOpen: true, cardIndex: index, showDescription: false, triggeredBy: participantId || null }); } else { handleCardFlip(index); } }}
                          >
                            {cardData.revealed ? <img src={cardData.image_url} alt={cardData.name} className={`w-full h-full object-cover rounded-md ${cardData.isReversed ? 'rotate-180' : ''}`} /> : <TarotCardBack />}
                          </motion.div>
                          <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 whitespace-nowrap bg-card/80 backdrop-blur-sm px-1 md:px-2 py-0.5 rounded-full text-xs cursor-move" onClick={(e) => e.stopPropagation()}>
                            {isMobile ? position.name.slice(0, 8) + (position.name.length > 8 ? '...' : '') : position.name} {cardData.revealed && cardData.isReversed && '(R)'}
                          </div>
                        </motion.div>
                      </div>
                    );
                  })}
                </div>
                
                {/* Reading controls (Back to Table, New Reading) */}
                <div className={`absolute ${isMobile ? 'top-2 right-2' : 'bottom-6 right-6'} flex gap-1 md:gap-3 z-40`}>
                  <Tooltip content="View interpretation" position="left" disabled={isMobile}><button onClick={() => setShowMobileInterpretation(true)} className={`btn btn-primary px-2 py-1 text-xs mobile-interpretation-button ${!(isMobile && !isLandscape && !showMobileInterpretation) ? 'hidden' : ''}`}><Info className="h-4 w-4" /></button></Tooltip>
                  <Tooltip content="Return to card table" position="left" disabled={isMobile}><button onClick={() => setReadingStepWrapped('drawing')} className={`btn btn-secondary ${isMobile ? 'px-2 py-1 text-xs' : 'px-3 md:px-4 py-1.5 md:py-2 text-sm'}`}>{isMobile ? 'Back' : 'Back to Table'}</button></Tooltip>
                  <Tooltip content="Start a new reading" position="left" disabled={isMobile}><button onClick={resetReading} className={`btn btn-ghost border border-input ${isMobile ? 'px-2 py-1 text-xs' : 'px-3 md:px-4 py-1.5 md:py-2 text-sm'}`}>{isMobile ? 'New' : 'New Reading'}</button></Tooltip>
                </div>
              </div> 
              
              {/* Interpretation panel - overlay on desktop */}
              <div className={`
                ${isMobile 
                  ? (isLandscape && !showMobileInterpretation ? 'w-2/5 border-l' : (showMobileInterpretation ? 'flex-1 w-full' : 'hidden')) 
                  : 'absolute top-20 right-0 bottom-0 w-2/5 max-w-md bg-card border-l border-border shadow-xl flex flex-col z-50' /* Desktop: Absolute overlay styling, max-width added */
                }
                 bg-card border-border flex flex-col h-auto transition-transform duration-300 ease-in-out
                 ${isMobile && showMobileInterpretation ? 'translate-x-0' : ''}
                 ${isMobile && !showMobileInterpretation && readingStep === 'interpretation' ? 'translate-x-full' : ''}
              `}>
                <div className={`${isMobile ? 'p-2' : 'p-3 md:p-4'} border-b border-border bg-primary/5 flex justify-between items-center`}>
                  <div className="flex items-center">
                    <TarotLogo className={`${isMobile ? 'h-3 w-3' : 'h-4 w-4 md:h-5 md:w-5'} text-primary mr-2`} />
                    <h3 className={`font-medium ${isMobile ? 'text-xs' : 'text-sm md:text-base'}`}>Reading Interpretation</h3>
                  </div>
                  <Tooltip content="Back to table" position="left" disabled={isMobile}><button onClick={() => setReadingStepWrapped('drawing')} className={`text-muted-foreground hover:text-foreground ${isMobile ? 'hidden' : ''}`}><XCircle className="h-4 w-4" /></button></Tooltip>
                </div>
                <div className={`flex-1 ${isMobile ? 'p-2' : 'p-3 md:p-4'} overflow-y-auto`}>
                  {activeCardIndex !== null && activeCardIndex !== undefined && selectedCards[activeCardIndex] && (
                    <div className={`${isMobile ? 'mb-3 p-2' : 'mb-4 md:mb-6 p-2 md:p-3'} bg-muted/30 border border-border rounded-lg`}>
                      <div className={`flex ${isMobile ? 'gap-1' : 'gap-2 md:gap-3'}`}>
                        <div className={`shrink-0 ${isMobile ? 'w-8 h-12' : 'w-10 h-15 md:w-12 md:h-18'} p-0.5`}>
                          <img src={(selectedCards[activeCardIndex] as Card).image_url} alt={(selectedCards[activeCardIndex] as Card).name} className={`w-full h-full object-cover rounded-md ${(selectedCards[activeCardIndex] as any).isReversed ? 'rotate-180' : ''}`} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className={`font-medium ${isMobile ? 'text-xs' : 'text-sm md:text-base'}`}>{(selectedCards[activeCardIndex] as Card).name} {(selectedCards[activeCardIndex] as any).isReversed && '(Reversed)'}</h4>
                          <p className="text-xs text-accent mb-1">{(selectedCards[activeCardIndex] as Card).position}</p>
                          <p className="text-xs text-muted-foreground">{(selectedCards[activeCardIndex] as Card).description}</p>
                        </div>
                      </div>
                    </div>
                  )}
                  <div className="space-y-2">
                    {cleanMarkdownText(interpretation).map((line, i: number) => (
                      <div key={i}>
                        {line.isHeader ? <h4 className={`font-semibold text-primary ${isMobile ? 'text-sm' : 'text-base'} mb-2`}>{line.content}</h4>
                        : line.isBullet ? <div className={`flex items-start gap-2 ${isMobile ? 'text-xs' : 'text-sm'} text-muted-foreground ml-2`}><span className="text-primary mt-1">•</span><span>{line.content}</span></div>
                        : <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-foreground leading-relaxed`}>{line.content}</p>}
                      </div>
                    ))}
                  </div>
                </div>
                {selectedCards.length > 1 && (
                  <div className={`${isMobile ? 'p-1' : 'p-2 md:p-3'} border-t border-border flex justify-between items-center`}>
                    <Tooltip content="Previous card" position="top" disabled={isMobile}>
                      <button onClick={() => { const currentIndex = activeCardIndex !== null && activeCardIndex !== undefined ? activeCardIndex : 0; const newIndex = currentIndex > 0 ? currentIndex - 1 : selectedCards.length - 1; setActiveCardIndexWrapped(newIndex); }} className={`btn btn-ghost ${isMobile ? 'p-0.5' : 'p-1'}`}><ChevronLeft className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'}`} /></button>
                    </Tooltip>
                    <div className={`${isMobile ? 'text-xs' : 'text-sm'} text-muted-foreground`}>{(activeCardIndex !== null && activeCardIndex !== undefined ? activeCardIndex : 0) + 1} of {selectedCards.length} cards</div>
                    <Tooltip content="Next card" position="top" disabled={isMobile}>
                      <button onClick={() => { const currentIndex = activeCardIndex !== null && activeCardIndex !== undefined ? activeCardIndex : 0; const newIndex = currentIndex < selectedCards.length - 1 ? currentIndex + 1 : 0; setActiveCardIndexWrapped(newIndex); }} className={`btn btn-ghost ${isMobile ? 'p-0.5' : 'p-1'}`}><ChevronRight className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'}`} /></button>
                    </Tooltip>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
      
      {/* Help Modal - Desktop */}
      <AnimatePresence>
        {showHelpModal && (
          <div 
            className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
            onClick={() => setShowHelpModal(false)} // Explicit close
          >
            <motion.div 
              className="relative bg-card max-w-4xl w-full max-h-[90vh] rounded-xl overflow-hidden"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ duration: 0.3 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between bg-primary/10 p-4 border-b border-border">
                <h3 className="font-serif font-bold text-xl">TarotForge Reading Room Guide</h3>
                <button 
                  onClick={() => setShowHelpModal(false)} // Explicit close
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              
              <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
                <div className="grid md:grid-cols-2 gap-8">
                  {/* Keyboard Shortcuts */}
                  <div>
                    <h4 className="font-semibold text-lg mb-4 flex items-center gap-2">
                      <Keyboard className="h-5 w-5 text-primary" />
                      Keyboard Shortcuts
                    </h4>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Pan view</span>
                        <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono">Space + Drag</kbd>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Pan up</span>
                        <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono">↑</kbd>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Pan down</span>
                        <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono">↓</kbd>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Pan left</span>
                        <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono">←</kbd>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Pan right</span>
                        <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono">→</kbd>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Navigate categories</span>
                        <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono">↑ ↓ ← →</kbd>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Navigate questions</span>
                        <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono">↑ ↓</kbd>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Select category/layout/question</span>
                        <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono">Enter</kbd>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Pan to center</span>
                        <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono">C</kbd>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Shuffle deck</span>
                        <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono">Left Shift</kbd>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Zoom in</span>
                        <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono">+ / =</kbd>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Zoom out</span>
                        <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono">- / _</kbd>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Reset zoom</span>
                        <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono">Z</kbd>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Zoom (mouse)</span>
                        <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono">{navigator.platform.toLowerCase().includes('mac') ? 'Cmd' : 'Ctrl'} + Scroll</kbd>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Navigate gallery</span>
                        <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono">← →</kbd>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Close gallery</span>
                        <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono">Esc</kbd>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Show help</span>
                        <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono">{navigator.platform.toLowerCase().includes('mac') ? 'H' : 'F1'}</kbd>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Toggle theme</span>
                        <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono">T</kbd>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Change deck</span>
                        <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono">D</kbd>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Select layout</span>
                        <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono">L</kbd>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Invite others</span>
                        <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono">I</kbd>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Reveal all cards</span>
                        <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono">R</kbd>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Reset cards</span>
                        <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono">{navigator.platform.toLowerCase().includes('mac') ? 'Cmd' : 'Ctrl'} + R</kbd>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">View card details</span>
                        <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono">V</kbd>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Exit / Close modals</span>
                        <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono">Esc</kbd>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Toggle Mute</span>
                        <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono">M</kbd>
                      </div>
                    </div>
                  </div>

                  {/* Navigation & Controls */}
                  <div>
                    <h4 className="font-semibold text-lg mb-4 flex items-center gap-2">
                      <Navigation className="h-5 w-5 text-primary" />
                      Navigation & Controls
                    </h4>
                    <div className="space-y-4">
                      <div className="bg-muted/30 p-3 rounded-lg">
                        <div className="font-medium text-sm mb-1">Zoom Controls</div>
                        <div className="text-xs text-muted-foreground">Use the zoom buttons or {navigator.platform.toLowerCase().includes('mac') ? 'Cmd' : 'Ctrl'}+Scroll to zoom in/out. Pan with Space+Drag or arrow keys.</div>
                      </div>
                      <div className="bg-muted/30 p-3 rounded-lg">
                        <div className="font-medium text-sm mb-1">Card Interaction</div>
                        <div className="text-xs text-muted-foreground">Drag cards from the deck to positions. Click to flip cards. Double-click revealed cards for detailed view.</div>
                      </div>
                      <div className="bg-muted/30 p-3 rounded-lg">
                        <div className="font-medium text-sm mb-1">Free Layout</div>
                        <div className="text-xs text-muted-foreground">Drop cards anywhere on the board. Drag placed cards to reposition them.</div>
                      </div>
                      <div className="bg-muted/30 p-3 rounded-lg">
                        <div className="font-medium text-sm mb-1">Directional Joypad</div>
                        <div className="text-xs text-muted-foreground">Use the mini joystick in zoom controls for precise panning.</div>
                      </div>
                    </div>
                  </div>

                  {/* Collaborative Features */}
                  <div>
                    <h4 className="font-semibold text-lg mb-4 flex items-center gap-2">
                      <Users className="h-5 w-5 text-primary" />
                      Collaborative Features
                    </h4>
                    <div className="space-y-4">
                      <div className="bg-muted/30 p-3 rounded-lg">
                        <div className="font-medium text-sm mb-1">Real-time Sync</div>
                        <div className="text-xs text-muted-foreground">All participants see changes instantly - card placements, flips, zoom, and pan.</div>
                      </div>
                      <div className="bg-muted/30 p-3 rounded-lg">
                        <div className="font-medium text-sm mb-1">Video Chat</div>
                        <div className="text-xs text-muted-foreground">Click the video button to start/join video calls with other participants.</div>
                      </div>
                      <div className="bg-muted/30 p-3 rounded-lg">
                        <div className="font-medium text-sm mb-1">Shared Deck</div>
                        <div className="text-xs text-muted-foreground">All logged-in participants' deck collections are combined and available to everyone.</div>
                      </div>
                      <div className="bg-muted/30 p-3 rounded-lg">
                        <div className="font-medium text-sm mb-1">Guest Access</div>
                        <div className="text-xs text-muted-foreground">Guests can join and participate but have limited deck access. Upgrade to unlock full features.</div>
                      </div>
                      <div className="bg-muted/30 p-3 rounded-lg">
                        <div className="font-medium text-sm mb-1">Invite Others</div>
                        <div className="text-xs text-muted-foreground">Use the share button to generate invitation links for your reading room.</div>
                      </div>
                    </div>
                  </div>

                  {/* Reading Process */}
                  <div>
                    <h4 className="font-semibold text-lg mb-4 flex items-center gap-2">
                      <BookOpen className="h-5 w-5 text-primary" />
                      Reading Process
                    </h4>
                    <div className="space-y-4">
                      <div className="bg-muted/30 p-3 rounded-lg">
                        <div className="font-medium text-sm mb-1">1. Setup</div>
                        <div className="text-xs text-muted-foreground">Choose your deck and layout. Ask your question.</div>
                      </div>
                      <div className="bg-muted/30 p-3 rounded-lg">
                        <div className="font-medium text-sm mb-1">2. Drawing</div>
                        <div className="text-xs text-muted-foreground">Drag cards from the deck to positions. Cards start face-down.</div>
                      </div>
                      <div className="bg-muted/30 p-3 rounded-lg">
                        <div className="font-medium text-sm mb-1">3. Reveal</div>
                        <div className="text-xs text-muted-foreground">Click cards to flip them. Use "Reveal All" for quick reveal.</div>
                      </div>
                      <div className="bg-muted/30 p-3 rounded-lg">
                        <div className="font-medium text-sm mb-1">4. Interpret</div>
                        <div className="text-xs text-muted-foreground">Click "See Interpretation" to generate AI-powered insights based on your cards and question.</div>
                      </div>
                      <div className="bg-muted/30 p-3 rounded-lg">
                        <div className="font-medium text-sm mb-1">Card Details</div>
                        <div className="text-xs text-muted-foreground">Double-click any revealed card to see its full description and meaning.</div>
                      </div>
                    </div>
                  </div>

                  {/* Tips & Tricks */}
                  <div className="md:col-span-2">
                    <h4 className="font-semibold text-lg mb-4 flex items-center gap-2">
                      <Lightbulb className="h-5 w-5 text-primary" />
                      Tips & Tricks
                    </h4>
                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <div className="bg-muted/20 p-3 rounded-lg">
                          <div className="font-medium text-sm mb-1">Space+Drag</div>
                          <div className="text-xs text-muted-foreground">Pan from anywhere, even over cards and UI elements</div>
                        </div>
                        <div className="bg-muted/20 p-3 rounded-lg">
                          <div className="font-medium text-sm mb-1">Zoom Focus</div>
                          <div className="text-xs text-muted-foreground">Zoom centers on your mouse cursor position</div>
                        </div>
                        <div className="bg-muted/20 p-3 rounded-lg">
                          <div className="font-medium text-sm mb-1">Mobile</div>
                          <div className="text-xs text-muted-foreground">Pinch to zoom, two-finger drag to pan</div>
                        </div>
                        <div className="bg-muted/20 p-3 rounded-lg">
                          <div className="font-medium text-sm mb-1">Card Gallery</div>
                          <div className="text-xs text-muted-foreground">Swipe or use arrow keys to navigate between revealed cards</div>
                        </div>
                      </div>
                      <div className="space-y-3">
                        <div className="bg-muted/20 p-3 rounded-lg">
                          <div className="font-medium text-sm mb-1">Collaborative</div>
                          <div className="text-xs text-muted-foreground">Changes sync in real-time across all participants</div>
                        </div>
                        <div className="bg-muted/20 p-3 rounded-lg">
                          <div className="font-medium text-sm mb-1">Deck Switching</div>
                          <div className="text-xs text-muted-foreground">Change decks mid-reading without losing card positions</div>
                        </div>
                        <div className="bg-muted/20 p-3 rounded-lg">
                          <div className="font-medium text-sm mb-1">Session Persistence</div>
                          <div className="text-xs text-muted-foreground">Your reading room stays active for others to join</div>
                        </div>
                        <div className="bg-muted/20 p-3 rounded-lg">
                          <div className="font-medium text-sm mb-1">Guest Mode</div>
                          <div className="text-xs text-muted-foreground">Try the app without signing up, upgrade anytime</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="mt-8 pt-6 border-t border-border text-center">
                  <p className="text-sm text-muted-foreground">
                    Need more help? Visit our documentation or contact support.
                  </p>
                  <button
                    onClick={() => setShowHelpModal(false)} // Explicit close
                    className="btn btn-primary px-6 py-2 mt-4"
                  >
                    Got it!
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      
      {/* Guest Account Upgrade Modal */}
      <AnimatePresence>
        {showGuestUpgrade && isGuest && (
          <GuestAccountUpgrade
            onUpgradeSuccess={handleGuestUpgrade}
            onClose={handleCloseGuestUpgrade}
            participantCount={participants.length}
            isInviteJoin={!!joinSessionId} // Pass boolean directly
            onGuestNameSet={handleGuestNameSet}
          />
        )}
      </AnimatePresence>

      {/* Exit Confirmation Modal */}
      <AnimatePresence>
        {showExitModal && (
          <motion.div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setShowExitModal(false)}
          >
            <motion.div
              className={`bg-card border border-border rounded-lg shadow-lg ${isMobile ? 'w-full max-w-sm' : 'w-full max-w-md'} p-6`}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-destructive/10 rounded-full">
                  <DoorOpen className="h-5 w-5 text-destructive" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Exit Reading Room</h3>
                  <p className="text-sm text-muted-foreground">Are you sure you want to leave?</p>
                </div>
              </div>
              
              <div className="space-y-3 mb-6">
                <p className="text-sm text-muted-foreground">
                  {selectedCards.some((card: any) => card) ? (
                    <>Your reading progress will be saved and you can return to this session later.</>
                  ) : (
                    <>You haven't started your reading yet. You can always come back to continue.</>
                  )}
                </p>
                {participants.length > 1 && (
                  <p className="text-sm text-muted-foreground">
                    Other participants will remain in the session and can continue without you.
                  </p>
                )}
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={() => setShowExitModal(false)}
                  className="flex-1 px-4 py-2 text-sm font-medium border border-border rounded-lg hover:bg-muted transition-colors"
                >
                  Stay in Session
                </button>
                <Link
                  to={user ? "/collection" : "/"}
                  className="flex-1 px-4 py-2 text-sm font-medium bg-destructive text-destructive-foreground rounded-lg hover:bg-destructive/90 transition-colors text-center"
                  onClick={() => {
                    // End video call if user is in one before leaving
                    if (isInCall) {
                      console.log('Ending video call before exiting reading room...');
                      endCall();
                    }
                  }}
                >
                  Exit Reading Room
                </Link>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Card Gallery - Full Screen on Mobile, Modal on Desktop */}
      <AnimatePresence>
        {showCardGallery && galleryCardIndex !== null && selectedCards[galleryCardIndex] && (
          <div 
            className={`fixed inset-0 z-[100] ${isMobile ? 'bg-black' : 'bg-black/80'} flex items-center justify-center`}
            onClick={!isMobile ? closeCardGallery : undefined}
          >
            <motion.div 
              className={`relative ${isMobile ? 'w-full h-full' : 'max-w-4xl max-h-[90vh] w-full mx-4'} ${!isMobile ? 'bg-card rounded-xl overflow-hidden shadow-2xl' : ''}`}
              initial={{ opacity: 0, scale: isMobile ? 1 : 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: isMobile ? 1 : 0.9 }}
              transition={{ duration: 0.3 }}
              onTouchStart={handleGalleryTouchStart}
              onTouchEnd={handleGalleryTouchEnd}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Gallery Header */}
              <div className={`${isMobile ? 'absolute top-0 left-0 right-0 z-10 bg-black/50 backdrop-blur-sm' : 'bg-primary/10 border-b border-border'} p-4 flex items-center justify-between`}>
                <div className="flex items-center gap-3">
                  <h3 className={`font-medium ${isMobile ? 'text-white' : 'text-foreground'}`}>
                    {selectedCards[galleryCardIndex].name}
                    {(selectedCards[galleryCardIndex] as any).isReversed && ' (Reversed)'}
                  </h3>
                  <span className={`text-sm px-2 py-1 rounded-full ${isMobile ? 'bg-white/20 text-white' : 'bg-muted text-muted-foreground'}`}>
                    {selectedCards[galleryCardIndex].position}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {/* Description Button */}
                  <button 
                    onClick={() => fetchCardDescription(selectedCards[galleryCardIndex])}
                    disabled={loadingDescription}
                    className={`p-2 rounded-full transition-colors ${
                            isMobile
                        ? 'text-white hover:bg-white/20 disabled:opacity-50' 
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-50'
                    }`}
                    title="View card description"
                  >
                    {loadingDescription ? (
                      <LoadingSpinner size="sm" />
                    ) : (
                      <FileText className="h-5 w-5" />
                    )}
                  </button>
                  
                  {/* Close Button */}
                  <button 
                    onClick={closeCardGallery}
                    className={`p-2 rounded-full transition-colors ${isMobile ? 'text-white hover:bg-white/20' : 'text-muted-foreground hover:text-foreground hover:bg-muted'}`}
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Gallery Content */}
              <div className={`${isMobile ? 'h-full pt-16 pb-20' : 'p-6'} flex flex-col items-center justify-center relative`}>
                {/* Navigation Arrows - Positioned at Modal Edges */}
                {(() => {
                  const revealedCards = selectedCards.filter((card: any) => card?.revealed);
                  const hasMultipleCards = revealedCards.length > 1;
                  
                  if (!hasMultipleCards) return null;
                  
                  return (
                    <>
                      {/* Left Arrow */}
                      <button
                        onClick={() => navigateGallery('prev')}
                        className={`absolute left-4 top-1/2 transform -translate-y-1/2 z-20 p-3 rounded-full transition-all duration-200 ${
                          isMobile 
                            ? 'bg-black/50 text-white hover:bg-black/70' 
                            : 'bg-black/40 text-white hover:bg-black/60 opacity-70 hover:opacity-100'
                        } backdrop-blur-sm`}
                        title="Previous card"
                      >
                        <ChevronLeft className="h-6 w-6" />
                      </button>
                      
                      {/* Right Arrow */}
                      <button
                        onClick={() => navigateGallery('next')}
                        className={`absolute right-4 top-1/2 transform -translate-y-1/2 z-20 p-3 rounded-full transition-all duration-200 ${
                          isMobile 
                            ? 'bg-black/50 text-white hover:bg-black/70' 
                            : 'bg-black/40 text-white hover:bg-black/60 opacity-70 hover:opacity-100'
                        } backdrop-blur-sm`}
                        title="Next card"
                      >
                        <ChevronRight className="h-6 w-6" />
                      </button>
                    </>
                  );
                })()}

                {/* Card Image */}
                <div className={`relative ${isMobile ? 'w-full max-w-sm h-full max-h-96' : 'w-80 h-[480px]'} mb-4`}>
                  <motion.img 
                    key={galleryCardIndex}
                    src={selectedCards[galleryCardIndex].image_url} 
                    alt={selectedCards[galleryCardIndex].name}
                    className={`w-full h-full object-contain rounded-lg shadow-lg ${(selectedCards[galleryCardIndex] as any).isReversed ? 'rotate-180' : ''}`}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3 }}
                  />
                </div>

                {/* Basic Card Info (always visible) */}
                {!showCardDescription && (
                  <div className={`${isMobile ? 'px-4' : 'max-w-2xl'} text-center`}>
                    <p className={`${isMobile ? 'text-white/90 text-sm' : 'text-muted-foreground'} leading-relaxed`}>
                      {selectedCards[galleryCardIndex].description}
                    </p>
                    <p className={`${isMobile ? 'text-white/60 text-xs' : 'text-muted-foreground/60 text-sm'} mt-2`}>
                      Tap the description button above for detailed card meaning
                    </p>
                  </div>
                )}

                {/* Detailed Description Overlay */}
                <AnimatePresence>
                  {showCardDescription && (
                    <motion.div
                      className={`absolute inset-0 ${isMobile ? 'bg-black/90' : 'bg-card/95'} backdrop-blur-sm rounded-lg flex flex-col`}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      {/* Description Header */}
                      <div className={`${isMobile ? 'p-4 border-b border-white/20' : 'p-4 border-b border-border'} flex items-center justify-between`}>
                        <h4 className={`font-medium ${isMobile ? 'text-white' : 'text-foreground'}`}>
                          Card Meaning
                        </h4>
                        <button
                          onClick={() => {
                            if (sharedModalState) {
                              updateSharedModalState({
                                ...sharedModalState,
                                showDescription: false,
                                triggeredBy: participantId
                              });
                            }
                          }}
                          className={`p-1 rounded-full transition-colors ${
                            isMobile 
                              ? 'text-white/80 hover:text-white hover:bg-white/20' 
                              : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                          }`}
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>

                      {/* Description Content */}
                      <div className="flex-1 overflow-y-auto p-4">
                        <div className={`${isMobile ? 'text-white/90 text-sm' : 'text-foreground text-sm'} leading-relaxed space-y-3`}>
                          {cardDescription.split('\n').map((paragraph, index) => (
                            <p key={index} className="text-left">
                              {paragraph}
                            </p>
                          ))}
                        </div>
                      </div>

                      {/* Description Footer */}
                      <div className={`${isMobile ? 'p-4 border-t border-white/20' : 'p-4 border-t border-border'} text-center`}>
                        <p className={`text-xs ${isMobile ? 'text-white/60' : 'text-muted-foreground'}`}>
                          {deck?.id === 'rider-waite-classic' || deck?.id === 'rider-waite' 
                            ? 'Traditional Rider-Waite interpretation'
                            : `Custom description from ${deck?.title || 'this deck'}`
                          }
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Gallery Navigation */}
              <div className={`${isMobile ? 'absolute bottom-0 left-0 right-0 bg-black/50 backdrop-blur-sm' : 'border-t border-border bg-muted/30'} p-4 flex items-center justify-between`}>
                {/* Previous Button */}
                <button 
                  onClick={() => navigateGallery('prev')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                    isMobile 
                      ? 'bg-white/20 text-white hover:bg-white/30' 
                      : 'bg-background border border-border hover:bg-muted'
                  }`}
                >
                  <ChevronLeft className="h-4 w-4" />
                  <span className="text-sm">Previous</span>
                </button>

                {/* Card Counter */}
                <div className={`text-sm ${isMobile ? 'text-white/80' : 'text-muted-foreground'}`}>
                  {(() => {
                    const revealedCards = selectedCards.filter((card: any) => card?.revealed);
                    const currentIndex = selectedCards
                      .map((card, index) => ({ card, index }))
                      .filter(({ card }) => (card as any)?.revealed)
                      .findIndex(({ index }) => index === galleryCardIndex);
                    return `${currentIndex + 1} of ${revealedCards.length}`;
                  })()}
                </div>

                {/* Next Button */}
                <button 
                  onClick={() => navigateGallery('next')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                    isMobile 
                      ? 'bg-white/20 text-white hover:bg-white/30' 
                      : 'bg-background border border-border hover:bg-muted'
                  }`}
                >
                  <span className="text-sm">Next</span>
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>

              {/* Mobile Swipe Indicators */}
              {isMobile && (
                <div className="absolute left-0 top-1/2 transform -translate-y-1/2 p-4">
                  <div className="w-8 h-16 bg-white/10 rounded-full flex items-center justify-center">
                    <ChevronLeft className="h-6 w-6 text-white/60" />
                  </div>
                </div>
              )}
              {isMobile && (
                <div className="absolute right-0 top-1/2 transform -translate-y-1/2 p-4">
                  <div className="w-8 h-16 bg-white/10 rounded-full flex items-center justify-center">
                    <ChevronRight className="h-6 w-6 text-white/60" />
                  </div>
                </div>
              )}

              {/* Mobile Touch Areas for Navigation */}
              {isMobile && (
                <>
                  <div 
                    className="absolute left-0 top-16 bottom-20 w-1/3 z-20"
                    onClick={() => navigateGallery('prev')}
                  />
                  <div 
                    className="absolute right-0 top-16 bottom-20 w-1/3 z-20"
                    onClick={() => navigateGallery('next')}
                  />
                </>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Sign In Modal */}
      <SignInModal 
        isOpen={showSignInModal}
        onClose={() => setShowSignInModal(false)}
        onSuccess={handleSignInSuccess}
      />

      {/* Invite Dropdown Modal */}
      <AnimatePresence>
        {showInviteDropdown && (
          <motion.div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setShowInviteDropdown(false)}
          >
            <motion.div
              className={`bg-card border border-border rounded-lg shadow-lg ${isMobile ? 'w-full max-w-sm' : 'w-full max-w-md'} p-6`}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-primary/10 rounded-full">
                  <UserPlus className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Invite Others</h3>
                  <p className="text-sm text-muted-foreground">
                    Choose how to invite people to your reading
                  </p>
                </div>
              </div>
              
              {/* Current session info */}
              <div className="bg-muted/30 rounded-lg p-3 mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  <span className="text-sm font-medium">Active Session</span>
                </div>
                <div className="text-xs text-muted-foreground space-y-1">
                  <div>Layout: {selectedLayout?.name || 'Custom'}</div>
                  {question && <div>Question: "{question}"</div>}
                  <div>Step: {readingStep}</div>
                  {participants.length > 0 && (
                    <div>Participants: {participants.length + 1} people</div>
                  )}
                  {showVideoChat && (
                    <div className="text-green-600">✓ Video chat active</div>
                  )}
                </div>
              </div>
              
              <div className="space-y-3 mb-6">
                {/* Video call option - only show during drawing/interpretation */}
                {(readingStep === 'drawing' || readingStep === 'interpretation') && (
                  <button
                    onClick={async () => {
                      // Start video call first if not already active
                      if (!showVideoChat && !isVideoConnecting) {
                        console.log('Starting video call for sharing...');
                        setIsVideoConnecting(true);
                        
                        try {
                          await startCall();
                          console.log('Video call started successfully');
                          setTimeout(() => {
                            setIsVideoConnecting(false);
                            setShowVideoChat(true);
                          }, 500);
                        } catch (error) {
                          console.error('Failed to start video call:', error);
                          setIsVideoConnecting(false);
                        }
                      }
                      
                      // Then proceed with sharing
                      setShowInviteDropdown(false);
                      setShowShareModal(true);
                    }}
                    disabled={isVideoConnecting}
                    className="w-full p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors text-left"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-full">
                        <Video className="h-5 w-5 text-green-600" />
                      </div>
                      <div className="flex-1">
                        <div className="font-medium">
                          {showVideoChat ? 'Share with Video Chat' : 'Start Video Chat & Share'}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {showVideoChat 
                            ? 'Video chat is active. Share link with video enabled.'
                            : 'Start video call and share invitation link'
                          }
                        </div>
                      </div>
                      {isVideoConnecting && (
                        <div className="w-4 h-4 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />
                      )}
                    </div>
                      </button>
                )}
                
                {/* Regular share option */}
                <button
                  onClick={() => {
                    setShowInviteDropdown(false);
                    setShowShareModal(true);
                  }}
                  className="w-full p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-full">
                      <Share2 className="h-5 w-5 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">Share Reading Room</div>
                      <div className="text-sm text-muted-foreground">
                        Share invitation link without video chat
                      </div>
                    </div>
                  </div>
                </button>
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={() => setShowInviteDropdown(false)}
                  className="flex-1 px-4 py-2 text-sm font-medium border border-border rounded-lg hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    // Handle invitee submission
                    setShowInviteDropdown(false);
                  }}
                  className="flex-1 px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                >
                  Send Invitations
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </Div100vh>
  );
};



export default memo(ReadingRoom);