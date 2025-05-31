import React, { useState, useEffect, useRef, useCallback, useMemo, memo } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { ArrowLeft, HelpCircle, Share2, Shuffle, Save, XCircle, Video, Zap, Copy, Check, ChevronLeft, ChevronRight, Info, ZoomIn, ZoomOut, RotateCcw, Menu, Users, UserPlus, UserMinus, Package, ShoppingBag, Plus, Home, Sparkles, Wand, Eye, EyeOff, X, ArrowUp, ArrowDown, FileText, UserCheck, UserX, LogIn, Keyboard, Navigation, BookOpen, Lightbulb, Sun, Moon, DoorOpen, ScanSearch } from 'lucide-react';
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
import { readingLayouts } from './constants/layouts'; 
import { questionCategories } from './constants/questionCategories';
import { cardAnimationConfig, zoomAnimationConfig, cardFlipConfig } from './utils/animationConfigs';
import { getPlatformShortcut, KEY_CODES, KEY_VALUES } from './constants/shortcuts'; 
import { fisherYatesShuffle, cleanMarkdownText, getTransform } from './utils/cardHelpers';
import { getDefaultZoomLevel } from './utils/layoutHelpers'; 
import { generateShareableLink, getTodayDateString, isCacheValid, copyRoomLink as copyRoomLinkHelper } from './utils/sessionHelpers'; // Updated import
import { useDeviceAndOrientationDetection } from './hooks/useDeviceAndOrientationDetection';
import { debounce } from 'lodash';
import { useTheme } from './hooks/useTheme'; 
import { useGuestUpgrade } from './hooks/useGuestUpgrade';
import { useHelpModal } from './hooks/useHelpModal';
import Div100vh from 'react-div-100vh';
import { useReadingRoomKeyboardShortcuts } from './hooks/useReadingRoomKeyboardShortcuts';
import { useBroadcastHandler } from './hooks/useBroadcastHandler';
import { useParticipantNotificationHandler } from './hooks/useParticipantNotificationHandler';
import { useTouchInteractions } from './hooks/useTouchInteractions'; 
import { useDocumentMouseListeners } from './hooks/useDocumentMouseListeners';
import { useAnonymousAuth } from './hooks/useAnonymousAuth';
import { useSessionManagement } from './hooks/useSessionManagement';
import { usePeriodicSessionSync } from './hooks/usePeriodicSessionSync';
import { useQuestionCacheHandler } from './hooks/useQuestionCacheHandler';
import { useBeforeUnloadVideoCleanup } from './hooks/useBeforeUnloadVideoCleanup';
import { useModalState } from './hooks/useModalState';
import DeckSelectionScreen from './components/DeckSelectionScreen';
import SetupScreen from './components/SetupScreen';
import AskQuestionScreen from './components/AskQuestionScreen';
import DrawingScreen from './components/DrawingScreen';
import InterpretationScreen from './components/InterpretationScreen'; // Import the new component
import ShareModal from './components/modals/ShareModal'; // Import the new modal
import ExitModal from './components/modals/ExitModal'; // Import the new modal
import InviteDropdownModal from './components/modals/InviteDropdownModal'; // Import
import HelpModal from './components/modals/HelpModal'; // Import the new modal
import CardGalleryModal from './components/modals/CardGalleryModal'; // Import

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
  const { deckId: deckIdFromParams } = useParams<{ deckId: string }>();
  const { user, setShowSignInModal, showSignInModal, isAnonymous, signInAnonymously } = useAuthStore();
  const { isSubscribed } = useSubscription();
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState<string | null>(null);
  const [questionCache, setQuestionCache] = useState<{[key: string]: {questions: string[], date: string}}>({});
  
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
  const { 
    showGuestUpgrade, 
    setShowGuestUpgrade, 
  } = useGuestUpgrade();
  const { 
    showHelpModal, 
    setShowHelpModal, // Re-enable for keyboard shortcuts hook
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
  
  // Refactored Initial Setup Hooks
  const { isReady: isAnonymousAuthReady, error: anonymousAuthError } = useAnonymousAuth({
    onAuthError: setError, // Pass setError to handle auth errors
  });

  const { isSessionReady } = useSessionManagement({
    shouldCreateSession,
    joinSessionId,
    deckIdFromParams,
    onSessionError: setError, // Pass setError for session errors
    isAnonymousAuthReady,
  });

  usePeriodicSessionSync({ isSessionReady });
  useQuestionCacheHandler({ setQuestionCache });
  useBeforeUnloadVideoCleanup();

  // Combined cleanup for ReadingRoom unmount
  useEffect(() => {
    return () => {
      if (isInCall) {
        console.log('ReadingRoom: Ending video call before component unmount...');
        endCall();
      }
      cleanup(); // from useReadingSessionStore
      cleanupVideoCall(); // from useVideoCall
    };
  }, [isInCall, endCall, cleanup, cleanupVideoCall]);

  // Update main error state if anonymous auth fails
  useEffect(() => {
    if (anonymousAuthError) {
      setError(anonymousAuthError);
    }
  }, [anonymousAuthError]);

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
  
  const [shuffledDeck, setShuffledDeck] = useState<Card[]>([]);
  const [isGeneratingInterpretation, setIsGeneratingInterpretation] = useState(false);
  
  // UI State - Refactoring with useModalState
  // const [showShareModal, setShowShareModal] = useState(false);
  const shareModal = useModalState();
  const [showCopied, setShowCopied] = useState(false); // Specific to share modal content, keep separate
  // const [showMobileInterpretation, setShowMobileInterpretation] = useState(false);
  const mobileInterpretationModal = useModalState();
  
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
  
  // Exit modal state - Refactoring with useModalState
  // const [showExitModal, setShowExitModal] = useState(false);
  const exitModal = useModalState();
  
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
  
  // Add state to track if we're changing decks mid-session - Refactoring with useModalState
  // const [isChangingDeckMidSession, setIsChangingDeckMidSession] = useState(false);
  const deckChangeMode = useModalState(); 
  
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
      ? (isLandscape 
          ? 'top-1 left-2 right-2 flex justify-between items-center' 
          : 'top-2 left-2 right-2 flex justify-between items-center')
      : 'top-4 left-4 right-4 flex justify-between items-start',
    mainPadding: isMobile ? (isLandscape ? 'px-6 pt-12 pb-4' : 'px-4 pt-16 pb-4') : 'p-4 pt-24',
    cardSize: isMobile ? 'w-16 h-24' : 'w-20 h-30 md:w-24 md:h-36',
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
      setShowMobileInterpretation: (show: boolean) => mobileInterpretationModal.setModal(show),
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
      deckChangeMode.openModal();
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
    anonymousId, deck, setDeck, setCards, setShuffledDeck, setSelectedDeckId, deckChangeMode]);

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
        zoomLevel: isMobile ? (isLandscape ? (layout.id === 'celtic-cross' ? 0.8 : 1) : (layout.id === 'celtic-cross' ? 0.6 : 0.8)) : (layout.id === 'celtic-cross' ? 1.0 : 1.6)
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
  }, [updateSession, cards, isMobile, isLandscape, fisherYatesShuffle, readingStep, shouldUseSessionDeck]);

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
  }, [questionCache, isCacheValid, getTodayDateString]); // Add isCacheValid and getTodayDateString to dependencies
  
  const handleQuestionSelect = useCallback((selectedQuestion: string) => {
    updateSession({ question: selectedQuestion, readingStep: 'drawing' });
  }, [updateSession]);
  
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
      deckChangeMode.closeModal();
    } catch (error) {
      console.error('Error changing deck:', error);
      setError('Failed to change deck. Please try again.');
    }
  }, [updateSession, selectedLayout, question, readingStep, zoomLevel, selectedCards, location.search, deckChangeMode]);
  
  
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
        if (deckIdFromParams) {
          await fetchAndSetDeck(deckIdFromParams);
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
  }, [deckIdFromParams, user?.id]);
  
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
          
          // Trigger deck visual refresh animation when new deck is loaded
          setDeckRefreshKey(prev => prev + 1);
        } else {
          throw new Error("No cards found for this deck");
        }
        
        // Move to setup step if not already in a reading or changing decks mid-session
        if ((!readingStep || readingStep === 'setup') && !deckChangeMode.isOpen) {
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
  }, [fisherYatesShuffle, shuffledDeck, sessionShuffledDeck, shouldUseSessionDeck, updateSession, broadcastGuestAction, participantId]);

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
    
    // setShowMobileInterpretation(false);
    mobileInterpretationModal.closeModal();
    setInterpretationCards([]); // Clear interpretation cards tracking
    
    // Broadcast reset reading action to other participants
    broadcastGuestAction('resetReading', { 
      shuffledDeck: newShuffledDeck,
      resetType: 'full'
    });
  }, [updateSession, cards, fisherYatesShuffle, broadcastGuestAction, user, participants, participantId,
    anonymousId, getDefaultZoomLevel, selectedLayout, mobileInterpretationModal, setInterpretationCards]);
  
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
      zoomLevel: getDefaultZoomLevel(selectedLayout),
      shuffledDeck: freshlyShuffled
    });
    
    // setShowMobileInterpretation(false);
    mobileInterpretationModal.closeModal();
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
    anonymousId, getDefaultZoomLevel, selectedLayout, mobileInterpretationModal, setInterpretationCards]);
  
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
  
  const handleCardDrop = (positionIndex?: number, freePosition?: { x: number; y: number }) => {
    if (!draggedCard || !selectedLayout) return;
    
    let newCard: any;
    
    if (selectedLayout.id === 'free-layout' && freePosition) {
      // Free layout - place at custom position
      const isReversed = Math.random() < 0.2;
      newCard = {
        ...draggedCard,
        position: `Card ${selectedCards.length + 1}`,
        customPosition: `Custom Position ${selectedCards.length + 1}`,
        isReversed,
        revealed: false, // Card starts face-down
        x: freePosition.x,
        y: freePosition.y
      };
      
      // Add to selected cards array
      const newSelectedCards = [...selectedCards, newCard];
      updateSession({ selectedCards: newSelectedCards });
      
    } else if (positionIndex !== undefined) {
      // Predefined layout - place at specific position
      const position = selectedLayout.positions[positionIndex];
      const isReversed = Math.random() < 0.2;
      
      newCard = {
        ...draggedCard,
        position: position.name,
        isReversed,
        revealed: false // Card starts face-down
      };
      
      // Update selected cards
      const newSelectedCards = [...selectedCards];
      newSelectedCards[positionIndex] = newCard;
      updateSession({ selectedCards: newSelectedCards });
    }
    
    // Remove card from shuffled deck
    if (draggedCardIndex !== null) {
      const currentDeck = shouldUseSessionDeck ? sessionShuffledDeck : shuffledDeck;
      const newShuffledDeck = currentDeck.filter((_: any, index: number) => index !== draggedCardIndex);
      setShuffledDeck(newShuffledDeck);
      
      // Update session state with new shuffled deck
      updateSession({ shuffledDeck: newShuffledDeck });
      
      // Broadcast shuffled deck update to other participants
      broadcastGuestAction('updateShuffledDeck', { 
        shuffledDeck: newShuffledDeck,
        removedCardIndex: draggedCardIndex 
      });
    }
    
    handleDragEnd();
  };

  const handleFreeLayoutDrop = (e: any) => {
    if (!draggedCard || !readingAreaRef.current || selectedLayout?.id !== 'free-layout') return;
    
    const rect = readingAreaRef.current.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0]?.clientX || e.changedTouches?.[0]?.clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0]?.clientY || e.changedTouches?.[0]?.clientY : e.clientY;
    
    // Calculate percentage position relative to the reading area
    const x = ((clientX - rect.left) / rect.width) * 100;
    const y = ((clientY - rect.top) / rect.height) * 100;
    
    // Ensure position is within bounds
    if (x >= 0 && x <= 100 && y >= 0 && y <= 100) {
      handleCardDrop(undefined, { x, y });
    } else {
      handleDragEnd();
    }
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
        // setShowMobileInterpretation(true);
        mobileInterpretationModal.openModal();
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
        // setShowMobileInterpretation(true);
        mobileInterpretationModal.openModal();
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
        // setShowMobileInterpretation(true);
        mobileInterpretationModal.openModal();
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
      newSelectedCards[cardIndex] = {
        ...newSelectedCards[cardIndex],
        revealed: !(newSelectedCards[cardIndex] as any).revealed
      } as any;
      updateSession({ selectedCards: newSelectedCards });
    }
  }, [selectedCards, updateSession]);
  
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
    deckId: deckIdFromParams, // Corrected prop name
    user,
    selectedCards,
    showShareModal: shareModal.isOpen, // Use a local variable for clarity if preferred in hook args
    showHelpModal, // For the hook to know if it's open
    showExitModal: exitModal.isOpen, // Use a local variable for clarity if preferred in hook args
    showSignInModal,
    showGuestUpgrade,
    isChangingDeckMidSession: deckChangeMode.isOpen,
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
    setShowShareModal: shareModal.setModal, // Corrected
    setShowHelpModal, // Remains from useHelpModal
    setShowExitModal: exitModal.setModal,   // Corrected
    setShowSignInModal, // Remains from useAuthStore
    setShowGuestUpgrade, // Remains from useGuestUpgrade
    setIsChangingDeckMidSession: deckChangeMode.setModal, // Corrected
    fetchAndSetDeck,
    revealAllCards,
    resetCards,
    openCardGallery,
    setShowLayoutDropdown,
    setHighlightedLayoutIndex,
    setHighlightedSetupLayoutIndex,
    handleLayoutSelect,
    readingLayouts,
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

  // State for invite dropdown modal - Refactoring with useModalState
  // const [showInviteDropdown, setShowInviteDropdown] = useState(false);
  const inviteDropdown = useModalState();

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
      setShowGuestUpgrade(true); // This uses its own hook, so direct setShow is fine
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

    // Toggle invite dropdown instead of just opening
    inviteDropdown.toggleModal(); 
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
  
  if (loading) {
    const loadingMessage = shouldCreateSession 
      ? 'Creating your reading room...'
      : 'Preparing reading room...';
      
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size="lg" className="mx-auto mb-4" />
          <p className="text-muted-foreground">
            {loadingMessage}
          </p>
          {shouldCreateSession && (
            <p className="text-xs text-muted-foreground mt-2">
              Setting up your session...
            </p>
          )}
        </div>
      </div>
    );
  }

  // Show session loading only if deck data is also loading
  if (sessionLoading && loading) {
    const sessionLoadingMessage = shouldCreateSession 
      ? 'Creating your reading room...'
      : 'Connecting to reading room...';
      
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size="lg" className="mx-auto mb-4" />
          <p className="text-muted-foreground">
            {sessionLoadingMessage}
          </p>
          {shouldCreateSession && (
            <p className="text-xs text-muted-foreground mt-2">
              Please wait while we set up your session...
            </p>
          )}
        </div>
      </div>
    );
  }
  
  if (error || sessionError) {
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
        <div className={`absolute z-50 ${mobileLayoutClasses.topControls}`}>
          {/* Left side - Back button and title for mobile, back button and session info for desktop */}
          <div className={`flex ${isMobile ? 'items-center gap-2' : 'items-center gap-1 md:gap-2'}`}>
            <Tooltip content={
              isMobile && mobileInterpretationModal.isOpen 
                ? "Close interpretation" 
                : isMobile && readingStep === 'ask-question'
                ? "Back to setup"
                : isMobile && readingStep === 'interpretation'
                ? "Back to cards"
                : (user ? "Back to Collection (Esc)" : "Back to Home (Esc)")
            } position="bottom" disabled={isMobile}>
              {isMobile && mobileInterpretationModal.isOpen ? (
                <button 
                  onClick={() => mobileInterpretationModal.closeModal()}
                  className={`btn btn-ghost bg-card/80 backdrop-blur-sm border border-border p-1.5 flex items-center text-muted-foreground hover:text-foreground`}
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
              ) : isMobile && readingStep === 'ask-question' ? (
                <button 
                  onClick={() => updateSession({ readingStep: 'setup' })}
                  className={`btn btn-ghost bg-card/80 backdrop-blur-sm border border-border p-1.5 flex items-center text-muted-foreground hover:text-foreground`}
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
              ) : isMobile && readingStep === 'interpretation' ? (
                <button 
                  onClick={() => setReadingStepWrapped('drawing')}
                  className={`btn btn-ghost bg-card/80 backdrop-blur-sm border border-border p-1.5 flex items-center text-muted-foreground hover:text-foreground`}
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
              ) : (
                <button 
                  onClick={() => exitModal.openModal()}
                  className={`btn btn-ghost bg-card/80 backdrop-blur-sm border border-border ${isMobile ? 'p-1.5' : 'p-2'} flex items-center text-muted-foreground hover:text-foreground`}
                >
                  <ArrowLeft className="h-4 w-4" />
                  {!isMobile && <span className="ml-1 text-sm">Exit</span>}
                </button>
              )}
            </Tooltip>
            
            {/* Mobile title display */}
            <Tooltip content="Change reading layout (L)" position="bottom" disabled={isMobile}>
              <div className={`bg-card/80 backdrop-blur-sm border border-border rounded-lg px-3 py-1 relative layout-dropdown-container ${!(isMobile && selectedLayout) ? 'hidden' : ''}`}>
                <button
                  onClick={() => setShowLayoutDropdown(!showLayoutDropdown)}
                  className="flex items-center gap-2 text-sm font-medium"
                >
                  <span className="truncate">{selectedLayout?.name || ''}</span>
                  {readingStep === 'drawing' && selectedLayout && (
                    <span className="text-xs bg-muted px-1.5 py-0.5 rounded-full whitespace-nowrap">
                      {selectedCards.filter(card => card).length}/{selectedLayout.card_count === 999 ? '∞' : selectedLayout.card_count}
                    </span>
                  )}
                  <ChevronRight className={`h-3 w-3 transition-transform ${showLayoutDropdown ? 'rotate-90' : ''}`} />
                </button>
                
                {/* Layout dropdown */}
                <AnimatePresence>
                  {showLayoutDropdown && (
                    <motion.div
                      initial={{ opacity: 0, y: -10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -10, scale: 0.95 }}
                      transition={{ duration: 0.2 }}
                      className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto"
                    >
                      {readingLayouts.map((layout, index) => (
                        <button
                          key={layout.id}
                          onClick={() => {
                            handleLayoutSelect(layout);
                            setShowLayoutDropdown(false);
                          }}
                          onMouseEnter={() => setHighlightedLayoutIndex(index)}
                          className={`w-full text-left p-2 hover:bg-muted transition-colors ${
                            selectedLayout?.id === layout.id ? 'bg-primary/10 text-primary' : ''
                          } ${
                            index === highlightedLayoutIndex ? 'bg-accent/20 ring-1 ring-accent' : ''
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">{layout.name}</span>
                            <span className="text-xs bg-muted px-1.5 py-0.5 rounded-full">
                              {layout.card_count === 999 ? 'Free' : `${layout.card_count}`}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">{layout.description}</p>
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </Tooltip>
            
            {/* Desktop session info with layout selector */}
            <div className={`flex items-center gap-2 ${isMobile ? 'hidden' : ''}`}>
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
                        {readingLayouts.map((layout, index) => (
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
          </div>
          
          {/* Right side - Action buttons - horizontal for both mobile and desktop */}
          <div className={`flex ${isMobile ? 'items-center gap-1' : 'items-center gap-1 md:gap-2'}`}>
            {/* Mobile: Reveal All / View Cards Button - integrated into top bar */}
            {isMobile && readingStep === 'drawing' && selectedCards.some((card: any) => card) && (
              <>
                {/* Show Reveal All button if there are unrevealed cards */}
                {selectedCards.some((card: any) => card && !card.revealed) && (
                  <Tooltip content="Reveal all cards" position="bottom" disabled={isMobile}>
                    <button 
                      onClick={revealAllCards}
                      className="btn btn-secondary bg-blue-600/90 backdrop-blur-sm border border-blue-500 p-2 text-sm flex items-center text-white touch-manipulation"
                      style={{ touchAction: 'manipulation' }}
                    >
                      <EyeOff className="h-4 w-4" />
                      <span className="ml-1 text-xs">Reveal</span>
                    </button>
                  </Tooltip>
                )}
                
                {/* Show View Cards button if all cards are revealed */}
                {selectedCards.every((card: any) => !card || card.revealed) && selectedCards.some((card: any) => card?.revealed) && (
                  <Tooltip content="View cards in detail" position="bottom" disabled={isMobile}>
                    <button 
                      onClick={() => {
                        const firstRevealedIndex = selectedCards.findIndex((card: any) => card?.revealed);
                        if (firstRevealedIndex !== -1) {
                          openCardGallery(firstRevealedIndex);
                        }
                      }}
                      className="btn btn-ghost bg-card/90 backdrop-blur-sm border border-border p-2 text-sm flex items-center touch-manipulation"
                      style={{ touchAction: 'manipulation' }}
                    >
                      <ScanSearch className="h-4 w-4" />
                      <span className="ml-1 text-xs">Detail</span>
                    </button>
                  </Tooltip>
                )}
              </>
            )}

            {/* Mobile: Generate Interpretation Button - integrated into top bar */}
            {isMobile && readingStep === 'drawing' && !isGeneratingInterpretation && (
              (selectedLayout?.id === 'free-layout' && selectedCards.length > 0) ||
              (selectedLayout?.id !== 'free-layout' && selectedCards.filter((card: any) => card).length === selectedLayout?.card_count)
            ) && (
              <Tooltip content={selectedLayout?.id === 'free-layout' ? `Generate interpretation for ${selectedCards.length} cards` : "Generate reading interpretation"} position="bottom" disabled={isMobile}>
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
                  className="btn btn-primary bg-accent/90 backdrop-blur-sm border border-accent p-2 text-sm flex items-center text-white dark:text-black touch-manipulation"
                  style={{ touchAction: 'manipulation' }}
                >
                  <Sparkles className="h-4 w-4" />
                  <span className="ml-1 text-xs">
                    {selectedLayout?.id === 'free-layout' 
                      ? `Read (${selectedCards.length})` 
                      : 'Read'
                    }
                  </span>
                </button>
              </Tooltip>
            )}

            {/* Desktop: Generate Interpretation Button - show when ready */}
            {!isMobile && readingStep === 'drawing' && !isGeneratingInterpretation && (
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
            {!isMobile && selectedCards.some((card: any) => card) && (
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
                        setTimeout(() => setRecentlySynced(false), 5000); // Show synced state for 5 seconds
                      } else {
                        console.log('Sync failed, will retry later');
                      }
                    }
                  }}
                  className={`btn ${
                    recentlySynced 
                      ? 'btn-success bg-success/80 border-success/50' 
                      : 'btn-warning bg-warning/80 border-warning/50'
                  } backdrop-blur-sm ${isMobile ? 'p-1.5' : 'p-2'} text-sm flex items-center ${!isMobile ? 'gap-1' : ''} ${
                    recentlySynced ? '' : 'animate-pulse'
                  }`}
                  disabled={recentlySynced}
                >
                  {recentlySynced ? (
                    <RotateCcw className="h-4 w-4" />
                  ) : (
                    <Zap className="h-4 w-4" />
                  )}
                  {!isMobile && !isTablet && (
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
                <div className={`btn btn-ghost bg-card/80 backdrop-blur-sm border border-border ${isMobile ? 'p-1.5' : 'p-2'} text-sm flex items-center ${!isMobile ? 'gap-1' : ''} animate-pulse`}>
                  <LoadingSpinner size="sm" />
                  {!isMobile && !isTablet && <span className="text-xs">Syncing</span>}
                </div>
              </Tooltip>
            )}
            
            {/* Deck change button - show when deck is selected */}
            <Tooltip content="Change deck (D)" position="bottom" disabled={isMobile}>
              <button 
                onClick={() => {
                  // Enter deck change mode while preserving session state
                  deckChangeMode.openModal();
                  setDeck(null);
                  setCards([]);
                  setShuffledDeck([]);
                  setSelectedDeckId(null);
                  // Don't reset URL or session state
                }}
                className={`btn btn-ghost bg-card/80 backdrop-blur-sm border border-border ${isMobile ? 'p-1.5' : 'p-2'} text-sm flex items-center ${!isMobile ? 'gap-1' : ''} ${!deck ? 'hidden' : ''}`}
              >
                <Package className="h-4 w-4" />
                {!isMobile && !isTablet && <span className="text-xs">Deck</span>}
              </button>
            </Tooltip>
            
            <Tooltip content="Add people to session" position="bottom" disabled={isMobile}>
              <button 
                onClick={() => handleShare()}
                className={`btn btn-ghost bg-card/80 backdrop-blur-sm border border-border ${isMobile ? 'p-1.5' : 'p-2'} text-sm flex items-center ${!isMobile ? 'gap-1' : ''}`}
                disabled={!sessionId}
              >
                <UserPlus className="h-4 w-4" />
                {!isMobile && !isTablet && <span className="text-xs">Invite</span>}
              </button>
            </Tooltip>
            
            <Tooltip content="Toggle theme (T)" position="bottom" disabled={isMobile}>
              <button 
                onClick={toggleTheme}
                className={`btn btn-ghost bg-card/80 backdrop-blur-sm border border-border ${isMobile ? 'p-1.5' : 'p-2'} text-sm flex items-center ${!isMobile ? 'gap-1' : ''}`}
              >
                {darkMode ? (
                  <Sun className="h-4 w-4" />
                ) : (
                  <Moon className="h-4 w-4" />
                )}
                {!isMobile && !isTablet && <span className="text-xs">Theme</span>}
              </button>
            </Tooltip>

            
            {/* Guest sign in button - moved to end */}
            <Tooltip content="Create account to save your progress" position="bottom" disabled={isMobile}>
              <button 
                onClick={() => setShowGuestUpgrade(true)}
                className={`btn btn-primary ${isMobile ? 'p-1.5' : 'p-2'} text-sm flex items-center ${!isMobile ? 'gap-1' : ''} ${!isGuest ? 'hidden' : ''}`}
              >
                <LogIn className="h-4 w-4" />
                {!isMobile && !isTablet && <span className="text-xs">Sign In</span>}
              </button>
            </Tooltip>

          </div>
        </div>

        {/* Reading table */}
        <div className="h-full relative bg-gradient-to-b from-slate-900 to-slate-800 dark:from-background dark:to-background/80">
          {/* Step 0: Deck Selection Screen */}
          {(!deck && !deckSelectionLoading) && (
            <DeckSelectionScreen
              isMobile={isMobile}
              mobileLayoutClasses={mobileLayoutClasses}
              deckChangeMode={deckChangeMode}
              fetchAndSetDeck={fetchAndSetDeck}
              deckIdFromParams={deckIdFromParams}
              selectedLayout={selectedLayout || null} // Ensure null if undefined
              question={question}
              deckSelectionTab={deckSelectionTab} // from sessionState.deckSelectionState or local
              setDeckSelectionTab={setDeckSelectionTab} // from useCallback wrapper
              collectionTabLabel={collectionTabLabel}
              collectionContributors={collectionContributors}
              userOwnedDecks={userOwnedDecks}
              handleDeckChange={handleDeckChange}
              handleDeckSelect={handleDeckSelect}
              loadingMarketplace={loadingMarketplace}
              marketplaceDecks={marketplaceDecks}
              selectedMarketplaceDeck={selectedMarketplaceDeck} // the Deck object from local state
              selectMarketplaceDeck={selectMarketplaceDeck} // the function to update sessionState
              showSubscriptionRequired={showSubscriptionRequired}
              addingToCollection={addingToCollection}
              handleAddToCollection={handleAddToCollection}
              handleMarketplaceDeckSelect={handleMarketplaceDeckSelect} // the function to set local selectedMarketplaceDeck
            />
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
            <SetupScreen
              isMobile={isMobile}
              mobileLayoutClasses={mobileLayoutClasses}
              deck={deck} // Pass the deck object
              readingLayouts={readingLayouts} // Pass the layouts constant
              highlightedSetupLayoutIndex={highlightedSetupLayoutIndex}
              setHighlightedSetupLayoutIndex={setHighlightedSetupLayoutIndex}
              handleLayoutSelect={handleLayoutSelect}
            />
          )}
          
          {/* Step 1.5: Ask a Question (Optional) */}
          {readingStep === 'ask-question' && deck && selectedLayout && (
            <AskQuestionScreen
              isMobile={isMobile}
              mobileLayoutClasses={mobileLayoutClasses}
              question={question} // from sessionState
              questionCategories={questionCategories} // constant
              selectedCategory={selectedCategory} // local state
              setSelectedCategory={setSelectedCategory} // local state setter
              isLoadingQuestions={isLoadingQuestions} // local state
              generatedQuestions={generatedQuestions} // local state
              handleCategorySelect={handleCategorySelect} // callback
              handleQuestionSelect={handleQuestionSelect} // callback
              handleSkipQuestion={handleSkipQuestion} // callback
              handleCustomQuestion={handleCustomQuestion} // callback
              showCustomQuestionInput={showCustomQuestionInput} // local state
              setShowCustomQuestionInput={setShowCustomQuestionInput} // local state setter
              highlightedCategoryIndex={highlightedCategoryIndex} // local state
              setHighlightedCategoryIndex={setHighlightedCategoryIndex} // local state setter
              highlightedQuestionIndex={highlightedQuestionIndex} // local state
              setHighlightedQuestionIndex={setHighlightedQuestionIndex} // local state setter
              isCategoryHighlightingActive={isCategoryHighlightingActive} // local state
              setIsCategoryHighlightingActive={setIsCategoryHighlightingActive} // local state setter
              isQuestionHighlightingActive={isQuestionHighlightingActive} // local state
              setIsQuestionHighlightingActive={setIsQuestionHighlightingActive} // local state setter
            />
          )}
          
          {/* Step 2: Drawing Cards */}
          {readingStep === 'drawing' && selectedLayout && (
            <DrawingScreen
              isMobile={isMobile}
              isLandscape={isLandscape}
              readingAreaRef={readingAreaRef}
              zoomLevel={zoomLevel}
              panOffset={panOffset}
              zoomFocus={zoomFocus}
              isSpacePressed={isSpacePressed}
              selectedLayout={selectedLayout}
              selectedCards={selectedCards}
              shuffledDeck={shuffledDeck} // local state derived from cards or session
              sessionShuffledDeck={sessionShuffledDeck} // from sessionState
              shouldUseSessionDeck={shouldUseSessionDeck} // boolean flag
              deckRefreshKey={deckRefreshKey}
              draggedCard={draggedCard}
              draggedCardIndex={draggedCardIndex}
              isDragging={isDragging}
              dragPosition={dragPosition}
              hoveredPosition={hoveredPosition}
              setHoveredPosition={setHoveredPosition} // Pass the setter down
              draggedPlacedCardIndex={draggedPlacedCardIndex} // Revert to direct pass
              activeCardIndex={activeCardIndex ?? null} // Ensure null if undefined for this one
              participantId={participantId}
              isGeneratingInterpretation={isGeneratingInterpretation} // local state
              sessionIsGeneratingInterpretation={sessionIsGeneratingInterpretation} // from session loadingStates
              isShuffling={isShuffling} // local state
              sessionIsShuffling={sessionIsShuffling} // from session loadingStates
              sessionLoadingStates={sessionLoadingStates} // from sessionState
              cardAnimationConfig={cardAnimationConfig} // constant/util
              zoomIn={zoomIn} // callback
              zoomOut={zoomOut} // callback
              resetZoom={resetZoom} // callback
              panDirection={panDirection} // callback
              resetPan={resetPan} // callback
              shuffleDeck={shuffleDeck} // callback
              toggleHelpModal={toggleHelpModal} // from useHelpModal
              resetCards={resetCards} // callback
              handlePanStart={handlePanStart} // callback
              setZoomLevelWrapped={setZoomLevelWrapped} // callback wrapper for session update
              handleDragStart={handleDragStart} // callback
              handleDragMove={handleDragMove} // callback (used by useDocumentMouseListeners)
              handleDragEnd={handleDragEnd} // callback
              handleCardDrop={handleCardDrop} // callback
              handleFreeLayoutDrop={handleFreeLayoutDrop} // callback
              handlePlacedCardDragStart={handlePlacedCardDragStart} // callback
              handlePlacedCardDragEnd={handlePlacedCardDragEnd} // callback
              handleCardFlip={handleCardFlip} // callback
              handleCardDoubleClick={handleCardDoubleClick} // callback
              handleCardDoubleTap={handleCardDoubleTap} // callback
              updateSharedModalState={updateSharedModalState} // callback wrapper for session update
            />
          )}
          
          {/* Step 3: Interpretation - mobile responsive layout */}
          {readingStep === 'interpretation' && (
            <InterpretationScreen
              isMobile={isMobile}
              isLandscape={isLandscape}
              mobileInterpretationModal={mobileInterpretationModal} // from useModalState
              readingAreaRef={readingAreaRef} // ref
              zoomLevel={zoomLevel} // from sessionState
              panOffset={panOffset} // from sessionState
              zoomFocus={zoomFocus} // from sessionState
              isSpacePressed={isSpacePressed} // local state
              selectedLayout={selectedLayout || null} // from sessionState, ensure null
              selectedCards={selectedCards} // from sessionState
              activeCardIndex={activeCardIndex ?? null} // from sessionState, ensure null
              interpretation={interpretation} // from sessionState
              cardAnimationConfig={cardAnimationConfig} // constant
              participantId={participantId} // from readingSessionStore
              deck={deck} // local state, current deck object
              zoomIn={zoomIn} // callback
              zoomOut={zoomOut} // callback
              resetZoom={resetZoom} // callback
              panDirection={panDirection} // callback
              resetPan={resetPan} // callback
              shuffleDeck={shuffleDeck} // callback
              toggleHelpModal={toggleHelpModal} // from useHelpModal
              resetCards={resetCards} // callback
              resetReading={resetReading} // callback
              handlePanStart={handlePanStart} // callback
              setZoomLevelWrapped={setZoomLevelWrapped} // callback wrapper for session
              setActiveCardIndexWrapped={setActiveCardIndexWrapped} // callback wrapper for session
              setReadingStepWrapped={setReadingStepWrapped} // callback wrapper for session
              updateSharedModalState={updateSharedModalState} // callback wrapper for session
              cleanMarkdownText={cleanMarkdownText} // utility
              handleCardFlip={handleCardFlip} // callback
              handleCardDoubleClick={handleCardDoubleClick} // callback
              handleCardDoubleTap={handleCardDoubleTap} // callback
            />
          )}
        </div>
      </main>
      
      {/* Dragged card following cursor/touch */}
      {isDragging && draggedCard && (
        <div 
          className={`fixed ${isMobile ? 'w-16 h-24' : 'w-20 h-30'} pointer-events-none z-50 transition-transform`}
          style={{
            left: dragPosition.x - (isMobile ? 32 : 40),
            top: dragPosition.y - (isMobile ? 48 : 60),
            transform: 'rotate(5deg)'
          }}
        >
          <div className="w-full h-full bg-primary rounded-md border-2 border-primary-foreground shadow-xl opacity-80">
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-xs text-primary-foreground">Card</span>
            </div>
          </div>
        </div>
      )}
      
      {/* Video Chat - Floating Bubbles Interface */}
      {showVideoChat && (
        <VideoBubbles 
          onClose={() => setShowVideoChat(false)}
          readingStep={readingStep}
        />
      )}
      
      {/* Share Room Modal - mobile responsive */}
      <ShareModal
        isOpen={shareModal.isOpen}
        onClose={shareModal.closeModal}
        sessionId={sessionId || null} // Ensure null if undefined
        isMobile={isMobile}
        showCopied={showCopied}
        setShowCopied={setShowCopied}
        generateShareableLink={generateShareableLink}
        copyRoomLinkHelper={copyRoomLinkHelper} // Note: copyRoomLinkHelper was defined in ReadingRoom
        participantsCount={participants.length}
        isVideoChatActive={showVideoChat} // Assuming showVideoChat state reflects this
      />
      
      {/* Help Modal - Desktop */}
      <HelpModal 
        isOpen={showHelpModal} 
        onClose={toggleHelpModal} 
      />
      
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
      <ExitModal
        isOpen={exitModal.isOpen}
        onClose={exitModal.closeModal}
        isMobile={isMobile}
        user={user} // from useAuthStore
        selectedCards={selectedCards} // from sessionState
        participants={participants} // from readingSessionStore
        isInCall={isInCall} // from useVideoCall
        endCall={endCall} // from useVideoCall
      />
      
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
      <InviteDropdownModal
        isOpen={inviteDropdown.isOpen}
        onClose={inviteDropdown.closeModal}
        isMobile={isMobile}
        selectedLayoutName={selectedLayout?.name}
        currentQuestion={question}
        participantsCount={participants.length}
        isVideoChatActive={showVideoChat} // From local state in ReadingRoom
        readingStep={readingStep}
        isVideoConnecting={isVideoConnecting} // From local state in ReadingRoom
        startVideoCallAction={async () => { // Wrap the logic for this modal
                      if (!showVideoChat && !isVideoConnecting) {
            console.log('Starting video call from InviteDropdown...');
                        setIsVideoConnecting(true);
                        try {
              await startCall(); // from useVideoCall
              console.log('Video call started successfully from InviteDropdown');
                          setTimeout(() => {
                            setIsVideoConnecting(false);
                setShowVideoChat(true); // Update local state
                          }, 500);
                        } catch (error) {
              console.error('Failed to start video call from InviteDropdown:', error);
                          setIsVideoConnecting(false);
              // Optionally set an error message for the user here
            }
          }
        }}
        openShareModalAction={shareModal.openModal} // Pass the open function for ShareModal
      />

    </Div100vh>
  );
};



export default memo(ReadingRoom);