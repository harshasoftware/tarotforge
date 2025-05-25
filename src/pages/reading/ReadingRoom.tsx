import { useState, useEffect, useRef, useCallback, useMemo, memo } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, HelpCircle, Share2, Shuffle, Save, XCircle, Video, PhoneCall, Zap, Copy, Check, ChevronLeft, ChevronRight, Info, ZoomIn, ZoomOut, RotateCcw, Menu, Users, UserPlus, Package, ShoppingBag, Plus, Home, Download, Sparkles } from 'lucide-react';
import { Deck, Card, ReadingLayout } from '../../types';
import { useAuthStore } from '../../stores/authStore';
import { useSubscription } from '../../stores/subscriptionStore';
import { useReadingSessionStore, getIsGuest } from '../../stores/readingSessionStore';
import { fetchDeckById, fetchCardsByDeckId, fetchUserOwnedDecks } from '../../lib/deck-utils';
import { getReadingInterpretation, generateInspiredQuestions } from '../../lib/gemini-ai';
import VideoChat from '../../components/video/VideoChat';
import TarotLogo from '../../components/ui/TarotLogo';
import GuestAccountUpgrade from '../../components/ui/GuestAccountUpgrade';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import SignInModal from '../../components/auth/SignInModal';
import Tooltip from '../../components/ui/Tooltip';
import { v4 as uuidv4 } from 'uuid';
import html2canvas from 'html2canvas';

// Mock reading layouts - moved outside component to prevent recreation
const readingLayouts: ReadingLayout[] = [
  {
    id: 'single-card',
    name: 'Single Card',
    description: 'Quick guidance for your day or a specific question',
    card_count: 1,
    positions: [
      { id: 0, name: 'Guidance', meaning: 'Offers insight or guidance for your question', x: 50, y: 50 }
    ]
  },
  {
    id: 'three-card',
    name: 'Three Card Spread',
    description: 'Past, Present, Future reading to understand your current situation',
    card_count: 3,
    positions: [
      { id: 0, name: 'Past', meaning: 'Represents influences from the past that led to your current situation', x: 25, y: 50 },
      { id: 1, name: 'Present', meaning: 'Shows the current situation and energies surrounding your question', x: 50, y: 50 },
      { id: 2, name: 'Future', meaning: 'Potential outcome based on the current path you are on', x: 75, y: 50 }
    ]
  },
  {
    id: 'celtic-cross',
    name: 'Celtic Cross',
    description: 'Comprehensive reading that explores many aspects of your situation',
    card_count: 10,
    positions: [
      { id: 0, name: 'Present', meaning: 'Represents your current situation', x: 40, y: 45 },
      { id: 1, name: 'Challenge', meaning: 'What challenges or crosses your situation', x: 40, y: 45, rotation: 90 },
      { id: 2, name: 'Foundation', meaning: 'The foundation of your situation', x: 40, y: 75 },
      { id: 3, name: 'Recent Past', meaning: 'Events from the recent past', x: 25, y: 45 },
      { id: 4, name: 'Potential', meaning: 'Possible outcome if nothing changes', x: 40, y: 15 },
      { id: 5, name: 'Near Future', meaning: 'Events in the near future', x: 55, y: 45 },
      { id: 6, name: 'Self', meaning: 'How you view yourself', x: 75, y: 80 },
      { id: 7, name: 'Environment', meaning: 'How others view you or your environment', x: 75, y: 65 },
      { id: 8, name: 'Hopes/Fears', meaning: 'Your hopes and fears', x: 75, y: 50 },
      { id: 9, name: 'Outcome', meaning: 'The final outcome', x: 75, y: 35 }
    ]
  },
  {
    id: 'free-layout',
    name: 'Freestyle Layout',
    description: 'Create your own custom spread - drag cards anywhere on the table',
    card_count: 999, // Unlimited
    positions: [] // No predefined positions
  }
];

// Optimized debounce utility for performance
const debounce = <T extends (...args: any[]) => any>(func: T, wait: number): T => {
  let timeout: NodeJS.Timeout;
  return ((...args: any[]) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  }) as T;
};

// Performance-optimized transform utility with memoization
const getTransform = (zoomLevel: number, zoomFocus: { x: number; y: number } | null, panOffset: { x: number; y: number }) => {
  // Cache transform calculations to avoid recalculation
  const scale = `scale(${zoomLevel})`;
  const translate = zoomFocus 
    ? `translate(${50 - zoomFocus.x}%, ${50 - zoomFocus.y}%) translate(${panOffset.x}px, ${panOffset.y}px)`
    : `translate(${panOffset.x}px, ${panOffset.y}px)`;
  
  const transform = `${scale} ${translate}`;
  const transformOrigin = zoomFocus ? `${zoomFocus.x}% ${zoomFocus.y}%` : 'center center';
  
  return {
    transform,
    transformOrigin,
    willChange: 'transform', // Optimize for transforms
    // Add hardware acceleration hint
    backfaceVisibility: 'hidden' as const,
    perspective: 1000,
  };
};

// Performance-optimized animation configs
const cardAnimationConfig = {
  type: "tween",
  duration: 0.3,
  ease: "easeOut"
};

const zoomAnimationConfig = {
  type: "tween", 
  duration: 0.2,
  ease: "easeInOut"
};

const cardFlipConfig = {
  type: "tween",
  duration: 0.6, 
  ease: "easeInOut"
};

// Function to clean markdown formatting and convert to plain text
const cleanMarkdownText = (text: string): { content: string; isHeader: boolean; isBullet: boolean }[] => {
  const lines = text.split('\n');
  return lines.map(line => {
    let cleanLine = line.trim();
    let isHeader = false;
    let isBullet = false;
    
    // Remove markdown headers
    if (cleanLine.startsWith('**') && cleanLine.endsWith('**')) {
      cleanLine = cleanLine.slice(2, -2);
      isHeader = true;
    } else if (cleanLine.startsWith('# ')) {
      cleanLine = cleanLine.slice(2);
      isHeader = true;
    } else if (cleanLine.startsWith('## ')) {
      cleanLine = cleanLine.slice(3);
      isHeader = true;
    } else if (cleanLine.startsWith('### ')) {
      cleanLine = cleanLine.slice(4);
      isHeader = true;
    }
    
    // Handle bullet points
    if (cleanLine.startsWith('* ') || cleanLine.startsWith('- ')) {
      cleanLine = cleanLine.slice(2);
      isBullet = true;
    }
    
    // Remove inline markdown formatting
    cleanLine = cleanLine.replace(/\*\*(.*?)\*\*/g, '$1'); // Remove bold
    cleanLine = cleanLine.replace(/\*(.*?)\*/g, '$1'); // Remove italic
    cleanLine = cleanLine.replace(/`(.*?)`/g, '$1'); // Remove code
    
    return {
      content: cleanLine,
      isHeader,
      isBullet
    };
  }).filter(line => line.content.length > 0); // Remove empty lines
};

const ReadingRoom = () => {
  const { deckId } = useParams<{ deckId: string }>();
  const { user, setShowSignInModal, showSignInModal } = useAuthStore();
  const { isSubscribed } = useSubscription();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Get join session ID from URL params
  const urlParams = new URLSearchParams(location.search);
  const joinSessionId = urlParams.get('join');
  
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
    cleanup
  } = useReadingSessionStore();
  
  // Get isGuest from computed selector
  const isGuest = getIsGuest();
  
  // Handle successful authentication from SignInModal - moved before early returns to fix hooks order
  const handleSignInSuccess = useCallback(() => {
    // Close the modal - user is now authenticated and can use features
    setShowSignInModal(false);
    // Clear the stored path since we're already in the right place
    localStorage.removeItem('auth_return_path');
  }, [setShowSignInModal]);
  
  // Initialize session on mount
  useEffect(() => {
    setInitialSessionId(joinSessionId);
    setDeckId(deckId || 'rider-waite-classic');
    initializeSession();
    
    // Cleanup on unmount
    return cleanup;
  }, [joinSessionId, deckId, setInitialSessionId, setDeckId, initializeSession, cleanup]);
  
  const [deck, setDeck] = useState<Deck | null>(null);
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [shuffledDeck, setShuffledDeck] = useState<Card[]>([]);
  const [isGeneratingInterpretation, setIsGeneratingInterpretation] = useState(false);
  
  // UI State
  const [showShareModal, setShowShareModal] = useState(false);
  const [showCopied, setShowCopied] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isLandscape, setIsLandscape] = useState(false);
  const [showMobileInterpretation, setShowMobileInterpretation] = useState(false);
  
  // Mobile viewport height state for iOS Safari fix
  const [viewportHeight, setViewportHeight] = useState(0);
  
  // Pinch zoom hint state
  const [showPinchHint, setShowPinchHint] = useState(false);
  const [hasShownInitialHint, setHasShownInitialHint] = useState(false);
  
  // Guest upgrade state
  const [showGuestUpgrade, setShowGuestUpgrade] = useState(false);
  const [hasShownInviteUpgrade, setHasShownInviteUpgrade] = useState(false);
  
  // Save functionality state
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  
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
  const [isZooming, setIsZooming] = useState(false);
  const [lastTouchDistance, setLastTouchDistance] = useState(0);
  const readingAreaRef = useRef<HTMLDivElement>(null);
  
  // Double tap zoom state
  const [zoomFocus, setZoomFocus] = useState<{ x: number; y: number } | null>(null);
  const [lastTapTime, setLastTapTime] = useState(0);
  const [tapCount, setTapCount] = useState(0);
  
  // Pan state for drag-to-pan functionality
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStartPos, setPanStartPos] = useState({ x: 0, y: 0 });
  const [panStartOffset, setPanStartOffset] = useState({ x: 0, y: 0 });
  
  // Double click state for desktop
  const [lastClickTime, setLastClickTime] = useState(0);
  const [clickCount, setClickCount] = useState(0);
  
  // Layout dropdown state
  const [showLayoutDropdown, setShowLayoutDropdown] = useState(false);
  
  // Video chat state
  const [showVideoChat, setShowVideoChat] = useState(false);
  const [isVideoConnecting, setIsVideoConnecting] = useState(false);
  
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
  const activeCardIndex = sessionState?.activeCardIndex;
  const sessionId = sessionState?.id;

  // Deck selection state
  const [userOwnedDecks, setUserOwnedDecks] = useState<Deck[]>([]);
  const [selectedDeckId, setSelectedDeckId] = useState<string | null>(null);
  const [deckSelectionLoading, setDeckSelectionLoading] = useState(false);
  
  // Add state to track if we're changing decks mid-session
  const [isChangingDeckMidSession, setIsChangingDeckMidSession] = useState(false);
  
  // Add state for deck selection modal tabs
  const [deckSelectionTab, setDeckSelectionTab] = useState<'collection' | 'marketplace'>('collection');
  
  // Add state for marketplace decks
  const [marketplaceDecks, setMarketplaceDecks] = useState<Deck[]>([]);
  const [loadingMarketplace, setLoadingMarketplace] = useState(false);
  
  // Add state for marketplace deck details view
  const [selectedMarketplaceDeck, setSelectedMarketplaceDeck] = useState<Deck | null>(null);
  const [addingToCollection, setAddingToCollection] = useState(false);
  const [addToCollectionSuccess, setAddToCollectionSuccess] = useState(false);
  const [showSubscriptionRequired, setShowSubscriptionRequired] = useState(false);
  
  // Ask Question step state
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [generatedQuestions, setGeneratedQuestions] = useState<string[]>([]);
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(false);
  const [showCustomQuestionInput, setShowCustomQuestionInput] = useState(false);
  
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

  // Check for mobile screen size and landscape orientation
  useEffect(() => {
    const checkMobileAndOrientation = () => {
      const isMobileDevice = window.innerWidth < 768;
      const isLandscapeOrientation = window.innerWidth > window.innerHeight && isMobileDevice;
      
      setIsMobile(isMobileDevice);
      setIsLandscape(isLandscapeOrientation);
      
      // Set proper viewport height for iOS Safari fix
      if (isMobileDevice) {
        // Use the actual viewport height instead of 100vh
        const vh = window.innerHeight;
        setViewportHeight(vh);
        
        // Also set CSS custom property for other components
        document.documentElement.style.setProperty('--vh', `${vh * 0.01}px`);
        
        // Prevent scrolling on mobile
        document.body.style.overflow = 'hidden';
        document.body.style.position = 'fixed';
        document.body.style.width = '100%';
        document.body.style.height = '100%';
      } else {
        setViewportHeight(0); // Reset for desktop
        
        // Re-enable scrolling on desktop
        document.body.style.overflow = '';
        document.body.style.position = '';
        document.body.style.width = '';
        document.body.style.height = '';
      }
    };
    
    checkMobileAndOrientation();
    window.addEventListener('resize', checkMobileAndOrientation);
    window.addEventListener('orientationchange', () => {
      // Small delay to ensure viewport is updated after orientation change
      setTimeout(checkMobileAndOrientation, 100);
    });
    
    return () => {
      window.removeEventListener('resize', checkMobileAndOrientation);
      window.removeEventListener('orientationchange', checkMobileAndOrientation);
      
      // Cleanup: restore normal scrolling when component unmounts
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
      document.body.style.height = '';
    };
  }, []);

  // Auto-show guest upgrade modal for invite link joiners
  useEffect(() => {
    // Show upgrade modal if:
    // 1. User joined via invite link (joinSessionId exists)
    // 2. User is a guest (not authenticated)
    // 3. Session has loaded (not loading)
    // 4. We haven't already shown the modal
    if (joinSessionId && isGuest && !sessionLoading && !hasShownInviteUpgrade) {
      setShowGuestUpgrade(true);
      setHasShownInviteUpgrade(true);
    }
  }, [joinSessionId, isGuest, sessionLoading, hasShownInviteUpgrade]);

  // Show pinch zoom hint when entering drawing step on mobile
  useEffect(() => {
    if (isMobile && readingStep === 'drawing' && !hasShownInitialHint) {
      setShowPinchHint(true);
      setHasShownInitialHint(true);
      
      // Auto-hide after 2 seconds (faster fade)
      const timer = setTimeout(() => {
        setShowPinchHint(false);
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, [isMobile, readingStep, hasShownInitialHint]);

  // Function to show hint manually (via help button)
  const showHint = useCallback(() => {
    setShowPinchHint(true);
    
    // Auto-hide after 2 seconds (faster fade)
    setTimeout(() => {
      setShowPinchHint(false);
    }, 2000);
  }, []);

  // Function to hide hint manually
  const hideHint = useCallback(() => {
    setShowPinchHint(false);
  }, []);
  
  // Update session wrappers for state changes (moved before touch handlers)
  const setZoomLevelWrapped = useCallback((newZoomLevel: number) => {
    updateSession({ zoomLevel: newZoomLevel });
  }, [updateSession]);

  const setActiveCardIndexWrapped = useCallback((index: number | null) => {
    updateSession({ activeCardIndex: index });
  }, [updateSession]);

  const setReadingStepWrapped = useCallback((step: 'setup' | 'drawing' | 'interpretation') => {
    updateSession({ readingStep: step });
  }, [updateSession]);

  // Fisher-Yates shuffle algorithm (Durstenfeld modern implementation)
  const fisherYatesShuffle = useCallback((array: Card[]) => {
    const shuffled = [...array]; // Create a copy to avoid mutating the original
    
    // Start from the last element and work backwards
    for (let i = shuffled.length - 1; i > 0; i--) {
      // Pick a random index from 0 to i (inclusive)
      const j = Math.floor(Math.random() * (i + 1));
      
      // Swap elements at positions i and j
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    
    return shuffled;
  }, []);

  const handleLayoutSelect = useCallback((layout: ReadingLayout) => {
    try {
      console.log('Layout selected:', layout);
      updateSession({
        selectedLayout: layout,
        selectedCards: [],
        readingStep: 'ask-question',
        interpretation: '',
        activeCardIndex: null,
        zoomLevel: isMobile ? (isLandscape ? (layout.id === 'celtic-cross' ? 0.8 : 1) : (layout.id === 'celtic-cross' ? 0.6 : 0.8)) : (layout.id === 'celtic-cross' ? 0.8 : 1)
      });
      
      // Only shuffle if cards are loaded
      if (cards && cards.length > 0) {
        setShuffledDeck(fisherYatesShuffle(cards));
      }
    } catch (error) {
      console.error('Error selecting layout:', error);
      setError('Failed to select layout. Please try again.');
    }
  }, [updateSession, cards, isMobile, isLandscape, fisherYatesShuffle]);

  const handleQuestionChange = useCallback((newQuestion: string) => {
    updateSession({ question: newQuestion });
  }, [updateSession]);
  
  // Ask Question handlers
  const handleCategorySelect = useCallback(async (category: string) => {
    setSelectedCategory(category);
    setIsLoadingQuestions(true);
    
    try {
      const questions = await generateInspiredQuestions(category, 4);
      setGeneratedQuestions(questions);
    } catch (error) {
      console.error('Error generating questions:', error);
      // Set fallback questions
      setGeneratedQuestions([
        "What guidance do I need right now?",
        "What should I focus on in this area of my life?",
        "What obstacles should I be aware of?",
        "What opportunities await me?"
      ]);
    } finally {
      setIsLoadingQuestions(false);
    }
  }, []);
  
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
      // Update URL to reflect selected deck
      window.history.replaceState({}, '', `/reading-room/${deck.id}`);
    } catch (error) {
      console.error('Error selecting deck:', error);
      setError('Failed to select deck. Please try again.');
    }
  }, []);
  
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
      // Update URL to reflect new deck
      window.history.replaceState({}, '', `/reading-room/${deck.id}`);
      
      // Close deck selection and return to current state
      setIsChangingDeckMidSession(false);
    } catch (error) {
      console.error('Error changing deck:', error);
      setError('Failed to change deck. Please try again.');
    }
  }, [updateSession, selectedLayout, question, readingStep, zoomLevel, selectedCards]);
  
  // Pinch to Zoom functionality
  const getTouchDistance = (touches: TouchList) => {
    if (touches.length < 2) return 0;
    const touch1 = touches[0];
    const touch2 = touches[1];
    return Math.sqrt(
      Math.pow(touch2.clientX - touch1.clientX, 2) + 
      Math.pow(touch2.clientY - touch1.clientY, 2)
    );
  };
  
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
      
      setPanOffset({ x: newPanX, y: newPanY });
    }, 8), // Reduced to ~120fps for smoother movement
    [isPanning, zoomLevel, panStartPos.x, panStartPos.y, panStartOffset.x, panStartOffset.y]
  );
  
  const debouncedZoomUpdate = useMemo(
    () => debounce((scale: number) => {
      setZoomLevelWrapped(Math.max(0.5, Math.min(2, scale)));
    }, 8), // Reduced to ~120fps for smoother zooming
    [setZoomLevelWrapped]
  );
  
  const handleTouchStart = useCallback((e: TouchEvent) => {
    // Don't interfere with card dragging
    const target = e.target as HTMLElement;
    if (target.closest('[data-card-element="true"]') || target.closest('.deck-pile') || isDragging) {
      return;
    }
    
    if (e.touches.length === 2) {
      // Two fingers - pinch to zoom
      setIsZooming(true);
      setLastTouchDistance(getTouchDistance(e.touches));
      e.preventDefault();
      e.stopPropagation();
    } else if (e.touches.length === 1 && zoomLevel > 1) {
      // One finger when zoomed - start panning
      const touch = e.touches[0];
      handlePanStart(touch.clientX, touch.clientY);
      e.preventDefault();
    }
  }, [zoomLevel, isDragging]);
  
  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (isZooming && e.touches.length === 2) {
      // Two fingers - continue pinch to zoom
      const currentDistance = getTouchDistance(e.touches);
      const scale = currentDistance / lastTouchDistance;
      
      if (Math.abs(scale - 1) > 0.01) { // Reduced threshold for smoother zooming
        const newZoom = Math.max(0.5, Math.min(2, zoomLevel * scale));
        setZoomLevelWrapped(newZoom);
        setLastTouchDistance(currentDistance);
      }
      e.preventDefault();
      e.stopPropagation();
    } else if (isPanning && e.touches.length === 1 && !isDragging) {
      // One finger - continue panning without debouncing for smoother movement
      const touch = e.touches[0];
      handlePanMove(touch.clientX, touch.clientY);
      e.preventDefault();
      e.stopPropagation();
    }
  }, [isZooming, isPanning, lastTouchDistance, zoomLevel, setZoomLevelWrapped, isDragging]);
  
  const handleTouchEnd = useCallback((e: TouchEvent) => {
    if (e.touches.length < 2) {
      setIsZooming(false);
      setLastTouchDistance(0);
    }
    if (e.touches.length === 0) {
      handlePanEnd();
    }
  }, []);
  
  // Add touch event listeners for pinch-to-zoom - optimized
  useEffect(() => {
    const readingArea = readingAreaRef.current;
    if (!readingArea || !isMobile) return;
    
    // Use passive events where possible for better performance
    const options = { passive: false };
    const passiveOptions = { passive: true };
    
    readingArea.addEventListener('touchstart', handleTouchStart, options);
    readingArea.addEventListener('touchmove', handleTouchMove, options);
    readingArea.addEventListener('touchend', handleTouchEnd, passiveOptions);
    
    return () => {
      readingArea.removeEventListener('touchstart', handleTouchStart);
      readingArea.removeEventListener('touchmove', handleTouchMove);
      readingArea.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd, isMobile]);
  
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
        
        // First, fetch user's owned decks
        const ownedDecks = await fetchUserOwnedDecks(user?.id);
        setUserOwnedDecks(ownedDecks);
        
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
          setShuffledDeck(fisherYatesShuffle(cardsData));
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
    
    // Add a delay to show the shuffling animation
    setTimeout(() => {
      setShuffledDeck(prev => fisherYatesShuffle(prev));
      setIsShuffling(false);
    }, 1000); // 1 second delay for shuffling animation
  }, [fisherYatesShuffle]);
  
  // Handle moving placed cards in free layout
  const handlePlacedCardDrag = useCallback((cardIndex: number, event: any, info: any) => {
    if (selectedLayout?.id !== 'free-layout' || !readingAreaRef.current) return;
    
    const rect = readingAreaRef.current.getBoundingClientRect();
    const x = ((info.point.x - rect.left) / rect.width) * 100;
    const y = ((info.point.y - rect.top) / rect.height) * 100;
    
    // Ensure position is within bounds
    if (x >= 0 && x <= 100 && y >= 0 && y <= 100) {
      const newSelectedCards = [...selectedCards];
      if (newSelectedCards[cardIndex]) {
        newSelectedCards[cardIndex] = {
          ...newSelectedCards[cardIndex],
          x: Math.max(5, Math.min(95, x)), // Keep cards within bounds with margin
          y: Math.max(5, Math.min(95, y))
        };
        updateSession({ selectedCards: newSelectedCards });
      }
    }
  }, [selectedLayout?.id, selectedCards, updateSession]);
  
  // Handle placed card drag start
  const handlePlacedCardDragStart = useCallback(() => {
    setIsDraggingPlacedCard(true);
  }, []);
  
  // Handle placed card drag end
  const handlePlacedCardDragEnd = useCallback(() => {
    setIsDraggingPlacedCard(false);
  }, []);
  
  const zoomIn = useCallback(() => {
    setZoomLevelWrapped(Math.min(zoomLevel + 0.2, 2));
  }, [setZoomLevelWrapped, zoomLevel]);
  
  const zoomOut = useCallback(() => {
    setZoomLevelWrapped(Math.max(zoomLevel - 0.2, 0.5));
  }, [setZoomLevelWrapped, zoomLevel]);
  
  const resetZoom = useCallback(() => {
    setZoomLevelWrapped(1);
    setZoomFocus(null);
    setPanOffset({ x: 0, y: 0 });
  }, [setZoomLevelWrapped]);
  
  const resetReading = useCallback(() => {
    updateSession({
      readingStep: 'setup',
      selectedLayout: null,
      selectedCards: [],
      interpretation: '',
      activeCardIndex: null,
      zoomLevel: 1
    });
    if (cards.length > 0) {
      setShuffledDeck(fisherYatesShuffle(cards));
    }
    setShowMobileInterpretation(false);
  }, [updateSession, cards, fisherYatesShuffle]);
  
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
      const newShuffledDeck = shuffledDeck.filter((_: any, index: number) => index !== draggedCardIndex);
      setShuffledDeck(newShuffledDeck);
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
    
    try {
      setIsGeneratingInterpretation(true);
      
      const formattedCards = cards.map((card: any) => ({
        name: card.name,
        position: card.position,
        isReversed: card.isReversed
      }));
      
      const result = await getReadingInterpretation(
        question || 'General life guidance',
        formattedCards,
        deck.theme
      );
      
      updateSession({
        interpretation: result,
        readingStep: 'interpretation'
      });
      
      // Auto-show mobile interpretation on mobile portrait mode
      if (isMobile && !isLandscape) {
        setShowMobileInterpretation(true);
      }
    } catch (error) {
      console.error('Error generating interpretation:', error);
      updateSession({
        interpretation: 'Unable to generate an interpretation at this time. Please try again later.',
        readingStep: 'interpretation'
      });
      
      // Auto-show mobile interpretation even for errors on mobile portrait mode
      if (isMobile && !isLandscape) {
        setShowMobileInterpretation(true);
      }
    } finally {
      setIsGeneratingInterpretation(false);
    }
  };
  
  const initiateVideoChat = () => {
    // Check if user is authenticated
    if (!user) {
      // Store current reading room path for post-auth redirect
      const currentPath = window.location.pathname + window.location.search;
      localStorage.setItem('auth_return_path', currentPath);
      setShowSignInModal(true);
      return;
    }
    
    setIsVideoConnecting(true);
    
    setTimeout(() => {
      setIsVideoConnecting(false);
      setShowVideoChat(true);
    }, 500);
  };
  
  // Pan functionality for dragging the view when zoomed
  const handlePanStart = (clientX: number, clientY: number) => {
    if (zoomLevel <= 1) return; // Only allow panning when zoomed in
    
    setIsPanning(true);
    setPanStartPos({ x: clientX, y: clientY });
    setPanStartOffset({ ...panOffset });
  };
  
  const handlePanMove = (clientX: number, clientY: number) => {
    if (!isPanning || zoomLevel <= 1) return;
    
    const deltaX = clientX - panStartPos.x;
    const deltaY = clientY - panStartPos.y;
    
    // Apply sensitivity and constraints
    const sensitivity = 1;
    const maxPan = 200; // Maximum pan distance in pixels
    
    const newPanX = Math.max(-maxPan, Math.min(maxPan, panStartOffset.x + deltaX * sensitivity));
    const newPanY = Math.max(-maxPan, Math.min(maxPan, panStartOffset.y + deltaY * sensitivity));
    
    setPanOffset({ x: newPanX, y: newPanY });
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
      
      // If card is revealed, activate it and zoom to it
      if ((selectedCard as any)?.revealed) {
        setActiveCardIndexWrapped(cardIndex);
        
        let cardX: number, cardY: number;
        
        if (selectedLayout?.id === 'free-layout') {
          // For free layout, use the card's stored position
          cardX = selectedCard.x || 50;
          cardY = selectedCard.y || 50;
        } else {
          // For predefined layouts, use the position from layout
          const position = selectedLayout?.positions?.[cardIndex];
          if (position) {
            cardX = position.x;
            cardY = position.y;
          } else {
            return;
          }
        }
        
        // Set zoom focus to the card position and zoom in significantly
        setZoomFocus({ x: cardX, y: cardY });
        setZoomLevelWrapped(2.5); // High zoom for detail viewing
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
      // Double click detected - activate card if revealed
      const selectedCard = selectedCards[cardIndex];
      if ((selectedCard as any)?.revealed) {
        setActiveCardIndexWrapped(cardIndex);
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
  
  // Add mouse move handler to document for dragging - optimized
  useEffect(() => {
    let animationFrameId: number;
    
    const handleMouseMove = (e: MouseEvent) => {
      // Use requestAnimationFrame to throttle mouse movement for better performance
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
      
      animationFrameId = requestAnimationFrame(() => {
      if (isDragging) {
        setDragPosition({ x: e.clientX, y: e.clientY });
        } else if (isPanning && !isDragging && !isDraggingPlacedCard) {
        handlePanMove(e.clientX, e.clientY);
      }
      });
    };
    
    const handleMouseUp = () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
      
      if (isDragging) {
        handleDragEnd();
      } else if (isPanning) {
        handlePanEnd();
      }
    };
    
    if (isDragging || isPanning) {
      document.addEventListener('mousemove', handleMouseMove, { passive: true });
      document.addEventListener('mouseup', handleMouseUp, { passive: true });
    }
    
    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, isPanning, isDraggingPlacedCard]);
  
  // Generate shareable link using session ID
  const generateShareableLink = useCallback((id: string): string => {
    const baseUrl = window.location.origin;
    const currentPath = window.location.pathname;
    return `${baseUrl}${currentPath}?join=${id}`;
  }, []);

  // Function to copy room link to clipboard
  const copyRoomLink = useCallback(() => {
    if (sessionId) {
      const shareableLink = generateShareableLink(sessionId);
      navigator.clipboard.writeText(shareableLink);
      setShowCopied(true);
      setTimeout(() => setShowCopied(false), 3000);
    }
  }, [sessionId]);
  
  // Handle sharing with native share API on mobile or modal on desktop
  const handleShare = async () => {
    // Check if user is authenticated
    if (!user) {
      // Store current reading room path for post-auth redirect
      const currentPath = window.location.pathname + window.location.search;
      localStorage.setItem('auth_return_path', currentPath);
      setShowSignInModal(true);
      return;
    }
    
    if (!sessionId) return;
    
    const shareableLink = generateShareableLink(sessionId);
    const shareData = {
      title: 'TarotForge Reading Room',
      text: `Join my tarot reading session! ${deck ? `Using ${deck.title} deck` : 'Interactive tarot reading'} - `,
      url: shareableLink
    };
    
    // Use native share API on mobile if available
    if (isMobile && navigator.share) {
      try {
        // Check if data can be shared (fallback for browsers without canShare)
        if (!navigator.canShare || navigator.canShare(shareData)) {
          await navigator.share(shareData);
          // Successfully shared via native sharing
          return;
        }
      } catch (error) {
        // User cancelled sharing or error occurred
        if (error instanceof Error && error.name !== 'AbortError') {
          console.warn('Native sharing failed:', error);
        }
      }
    }
    
    // Fall back to modal for desktop or if native sharing not available
    setShowShareModal(true);
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
  
  // Save reading as image
  const saveReadingAsImage = async () => {
    if (!readingAreaRef.current || !selectedLayout || selectedCards.length === 0) {
      return;
    }

    try {
      setIsSaving(true);
      
      // Hide certain UI elements during capture
      const controlsToHide = [
        '.zoom-controls',
        '.mobile-interpretation-button',
        '.deck-pile',
        '.interpretation-button'
      ];
      
      const hiddenElements: HTMLElement[] = [];
      controlsToHide.forEach(selector => {
        const elements = readingAreaRef.current?.querySelectorAll(selector);
        elements?.forEach(element => {
          const htmlElement = element as HTMLElement;
          if (htmlElement.style.display !== 'none') {
            htmlElement.style.display = 'none';
            hiddenElements.push(htmlElement);
          }
        });
      });

      // Reset zoom and pan for clean screenshot
      const originalTransform = readingAreaRef.current.style.transform;
      const readingContent = readingAreaRef.current.querySelector('.reading-content') as HTMLElement;
      if (readingContent) {
        readingContent.style.transform = 'scale(1) translate(0px, 0px)';
        readingContent.style.transformOrigin = 'center center';
      }

      // Capture the reading area
      const canvas = await html2canvas(readingAreaRef.current, {
        backgroundColor: null,
        scale: 2, // Higher resolution
        useCORS: true,
        allowTaint: true,
        foreignObjectRendering: true,
        width: readingAreaRef.current.offsetWidth,
        height: readingAreaRef.current.offsetHeight,
        onclone: (clonedDoc) => {
          // Ensure all cards are visible in the clone
          const clonedCards = clonedDoc.querySelectorAll('[data-card-element="true"]');
          clonedCards.forEach(card => {
            (card as HTMLElement).style.opacity = '1';
            (card as HTMLElement).style.visibility = 'visible';
          });
        }
      });

      // Restore hidden elements
      hiddenElements.forEach(element => {
        element.style.display = '';
      });

      // Restore original transform
      if (readingContent) {
        readingContent.style.transform = originalTransform;
      }

      // Create download link
      const link = document.createElement('a');
      const now = new Date();
      const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD
      const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-'); // HH-MM-SS
      link.download = `tarot-reading-${selectedLayout.name.toLowerCase().replace(/\s+/g, '-')}-${dateStr}-${timeStr}.png`;
      link.href = canvas.toDataURL('image/png', 1.0);
      
      // Trigger download
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Show success feedback
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);

    } catch (error) {
      console.error('Error saving reading as image:', error);
      // Could add error toast here
    } finally {
      setIsSaving(false);
    }
  };
  
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
    setSelectedMarketplaceDeck(deck);
  }, []);
  
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
      setAddToCollectionSuccess(true);
      setTimeout(() => {
        setAddToCollectionSuccess(false);
        setSelectedMarketplaceDeck(null); // Close details view
      }, 2000);
      
    } catch (error) {
      console.error('Error adding deck to collection:', error);
      alert('Failed to add deck to collection. Please try again.');
    } finally {
      setAddingToCollection(false);
    }
  }, [isSubscribed]);
  
  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size="lg" className="mx-auto mb-4" />
          <p className="text-muted-foreground">
            Preparing reading room...
          </p>
        </div>
      </div>
    );
  }

  // Show session loading only if deck data is also loading
  if (sessionLoading && loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size="lg" className="mx-auto mb-4" />
          <p className="text-muted-foreground">
            Connecting to reading room...
          </p>
        </div>
      </div>
    );
  }
  
  if (error || sessionError) {
    return (
      <div className="h-screen flex flex-col items-center justify-center p-4">
        <div className="text-center max-w-md mx-auto p-6 bg-card border border-border rounded-xl">
          <HelpCircle className="h-16 w-16 text-warning mx-auto mb-4" />
          <h2 className="text-xl md:text-2xl font-serif font-bold mb-4">Something Went Wrong</h2>
          <p className="text-muted-foreground mb-6 text-sm md:text-base">
            {sessionError || error}
          </p>
          <div className="flex flex-col gap-4 justify-center">
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
    <div 
      className={`flex flex-col ${!isMobile ? 'h-screen overflow-hidden' : 'overflow-hidden'}`}
      style={isMobile ? { 
        height: viewportHeight > 0 ? `${viewportHeight}px` : '100vh',
        minHeight: '100vh' 
      } : undefined}
    >
      {/* Main content - full screen with floating controls */}
      <main className="flex-1 overflow-hidden relative">
        {/* Floating controls - redesigned mobile layout */}
        <div className={`absolute z-50 ${mobileLayoutClasses.topControls}`}>
          {/* Left side - Back button and title for mobile, back button and session info for desktop */}
          <div className={`flex ${isMobile ? 'items-center gap-2' : 'items-center gap-1 md:gap-2'}`}>
            <Tooltip content={user ? "Back to Collection" : "Back to Home"} position="bottom" disabled={isMobile}>
              <Link 
                to={user ? "/collection" : "/"} 
                className={`btn btn-ghost bg-card/80 backdrop-blur-sm border border-border ${isMobile ? 'p-1.5' : 'p-2'} flex items-center text-muted-foreground hover:text-foreground`}
              >
                <ArrowLeft className="h-4 w-4" />
                {!isMobile && <span className="ml-1 text-sm">Back</span>}
              </Link>
            </Tooltip>
            
            {/* Mobile title display */}
            <Tooltip content="Change reading layout" position="bottom" disabled={isMobile}>
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
                      {readingLayouts.map((layout) => (
                        <button
                          key={layout.id}
                          onClick={() => {
                            handleLayoutSelect(layout);
                            setShowLayoutDropdown(false);
                          }}
                          className={`w-full text-left p-2 hover:bg-muted transition-colors ${
                            selectedLayout?.id === layout.id ? 'bg-primary/10 text-primary' : ''
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
              <Tooltip content="Change reading layout" position="bottom" disabled={isMobile}>
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
                        {readingLayouts.map((layout) => (
                          <button
                            key={layout.id}
                            onClick={() => {
                              handleLayoutSelect(layout);
                              setShowLayoutDropdown(false);
                            }}
                            className={`w-full text-left p-3 hover:bg-muted transition-colors ${
                              selectedLayout?.id === layout.id ? 'bg-primary/10 text-primary' : ''
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
                  {participants.length > 0 && (
                    <div 
                      className="flex items-center gap-1 bg-muted px-2 py-0.5 rounded-full cursor-pointer"
                      title={participantNames}
                    >
                      <Users className="h-3 w-3" />
                      <span className="text-xs">{participants.length}</span>
                    </div>
                  )}
                  {!isHost && (
                    <span className="text-xs bg-accent px-2 py-0.5 rounded-full">Guest</span>
                  )}
                </div>
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
            {/* Deck change button - show when deck is selected */}
            <Tooltip content="Change deck" position="bottom" disabled={isMobile}>
              <button 
                onClick={() => {
                  // Enter deck change mode while preserving session state
                  setIsChangingDeckMidSession(true);
                  setDeck(null);
                  setCards([]);
                  setShuffledDeck([]);
                  setSelectedDeckId(null);
                  // Don't reset URL or session state
                }}
                className={`btn btn-ghost bg-card/80 backdrop-blur-sm border border-border ${isMobile ? 'p-1.5' : 'p-2'} text-sm flex items-center ${!isMobile ? 'gap-1' : ''} ${!deck ? 'hidden' : ''}`}
              >
                <Package className="h-4 w-4" />
                {!isMobile && <span className="text-xs">Deck</span>}
              </button>
            </Tooltip>
            
            {/* Guest upgrade button */}
            <Tooltip content="Create account to save your progress" position="bottom" disabled={isMobile}>
              <button 
                onClick={() => setShowGuestUpgrade(true)}
                className={`btn btn-accent bg-accent/80 backdrop-blur-sm border border-accent/50 ${isMobile ? 'p-1.5' : 'p-2'} text-sm flex items-center ${!isMobile ? 'gap-1' : ''} ${!isGuest ? 'hidden' : ''}`}
              >
                <UserPlus className="h-4 w-4" />
                {!isMobile && <span className="text-xs">Upgrade</span>}
              </button>
            </Tooltip>
            
            <Tooltip content="Share reading room" position="bottom" disabled={isMobile}>
              <button 
                onClick={() => handleShare()}
                className={`btn btn-ghost bg-card/80 backdrop-blur-sm border border-border ${isMobile ? 'p-1.5' : 'p-2'} text-sm flex items-center`}
                disabled={!sessionId}
              >
                <Share2 className="h-4 w-4" />
              </button>
            </Tooltip>
            
            <Tooltip content={showVideoChat ? "Video chat active" : "Start video chat"} position="bottom" disabled={isMobile}>
              <button 
                onClick={() => !isVideoConnecting && !showVideoChat && initiateVideoChat()}
                className={`btn ${showVideoChat ? 'btn-success' : 'btn-secondary'} bg-card/80 backdrop-blur-sm border border-border ${isMobile ? 'p-1.5' : 'p-2'} text-sm flex items-center`}
                disabled={isVideoConnecting}
              >
                {isVideoConnecting ? (
                  <LoadingSpinner size="sm" />
                ) : (
                  <PhoneCall className="h-4 w-4" />
                )}
              </button>
            </Tooltip>

            <Tooltip content={selectedCards.length === 0 ? "Add cards to save reading" : "Save reading as image"} position="bottom" disabled={isMobile}>
              <button 
                onClick={() => saveReadingAsImage()}
                className={`btn ${saveSuccess ? 'btn-success' : 'btn-primary'} bg-primary/80 backdrop-blur-sm border border-primary ${isMobile ? 'p-1.5' : 'p-2'} text-sm flex items-center`}
                disabled={isSaving || !selectedLayout || selectedCards.length === 0}
              >
                {isSaving ? (
                  <LoadingSpinner size="sm" />
                ) : saveSuccess ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
              </button>
            </Tooltip>
          </div>
        </div>

        {/* Reading table */}
        <div className="h-full relative bg-gradient-to-b from-slate-900 to-slate-800 dark:from-background dark:to-background/80">
          {/* Step 0: Deck Selection Screen */}
          {!deck && !deckSelectionLoading && (
            <div className={`absolute inset-0 z-[100] bg-black/50 flex items-center justify-center ${mobileLayoutClasses.mainPadding}`}>
              <div className={`w-full ${isMobile ? 'max-w-4xl max-h-full overflow-y-auto' : 'max-w-5xl'} ${isMobile ? 'p-3' : 'p-4 md:p-6'} bg-card border border-border rounded-xl shadow-lg`}>
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
                    My Collection
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
                {userOwnedDecks.length === 0 ? (
                        <div className="text-center py-12">
                    <Package className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                          <h3 className="text-lg font-medium mb-2">No Decks in Collection</h3>
                          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                            You don't have any decks in your collection yet. Browse the marketplace or create your own deck to get started.
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
                              onClick={() => setSelectedMarketplaceDeck(null)}
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
                              ) : addToCollectionSuccess ? (
                                <button className="btn btn-success flex-1 py-3" disabled>
                                  <Check className="h-4 w-4 mr-2" />
                                  Added Successfully!
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
                  {readingLayouts.map((layout) => (
                    <div 
                      key={layout.id}
                      className={`border rounded-lg ${isMobile ? 'p-2' : 'p-3'} cursor-pointer transition-colors hover:border-primary/50 active:bg-primary/5`}
                      onClick={() => handleLayoutSelect(layout)}
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
                
                <div className={isMobile ? 'mb-3' : 'mb-4'}>
                  <label htmlFor="question" className="block text-sm font-medium mb-1">
                    Your Question (Optional)
                  </label>
                  <input
                    id="question"
                    value={question}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleQuestionChange(e.target.value)}
                    placeholder="What would you like guidance on?"
                    className={`w-full ${isMobile ? 'p-2 text-sm' : 'p-2 text-sm'} rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary`}
                  />
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
                  <div className="flex justify-center mb-4">
                    <div className="rounded-full bg-primary/20 p-3">
                      <TarotLogo className="h-8 w-8 text-primary" />
                    </div>
                  </div>
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
                    {[
                      { id: 'love', name: 'Love', icon: '💕', desc: 'Romance, relationships, soulmates' },
                      { id: 'career', name: 'Career', icon: '🎯', desc: 'Work, business, professional growth' },
                      { id: 'finance', name: 'Finance', icon: '💰', desc: 'Money, wealth, investments' },
                      { id: 'relationships', name: 'Relationships', icon: '👥', desc: 'Family, friends, social connections' },
                      { id: 'spiritual-growth', name: 'Spiritual Growth', icon: '⭐', desc: 'Soul purpose, enlightenment' },
                      { id: 'past-lives', name: 'Past Lives', icon: '♾️', desc: 'Karma, soul history, past influences' }
                    ].map((category) => (
                      <button
                        key={category.id}
                        onClick={() => handleCategorySelect(category.id)}
                        className="p-3 text-left border rounded-lg hover:border-primary/50 hover:bg-primary/5 transition-colors"
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
                            className="w-full p-3 text-left border rounded-lg hover:border-primary/50 hover:bg-primary/5 transition-colors"
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
                    <label className="block text-sm font-medium mb-2">Write your own question</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="What would you like guidance on?"
                        className="flex-1 p-2 text-sm rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            const input = e.target as HTMLInputElement;
                            if (input.value.trim()) {
                              handleCustomQuestion(input.value.trim());
                            }
                          }
                        }}
                        autoFocus
                      />
                      <button
                        onClick={() => setShowCustomQuestionInput(false)}
                        className="px-3 py-2 text-sm text-muted-foreground hover:text-foreground"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-2 justify-center">
                  {!showCustomQuestionInput && !selectedCategory && (
                    <button
                      onClick={() => setShowCustomQuestionInput(true)}
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
                  
                  <button
                    onClick={() => updateSession({ readingStep: 'setup' })}
                    className="btn btn-ghost px-4 py-2 text-sm text-muted-foreground hover:text-foreground"
                  >
                    ← Back to Setup
                  </button>
                </div>
              </div>
            </div>
          )}
          
          {/* Step 2: Drawing Cards */}
          {readingStep === 'drawing' && selectedLayout && (
            <div className={`absolute inset-0 flex flex-col ${isMobile ? (isLandscape ? 'pt-8' : 'pt-12') : 'pt-20'}`}>
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
                  // Only start panning if not on mobile, zoomed in, clicking on empty space, and not dragging cards
                  if (!isMobile && zoomLevel > 1 && !isDragging && !isDraggingPlacedCard && e.target === e.currentTarget) {
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
                  cursor: zoomLevel > 1 && !isDragging && !isDraggingPlacedCard ? (isPanning ? 'grabbing' : 'grab') : 'default'
                }}
              >
                {/* Zoom controls with shuffle button - repositioned for mobile */}
                <div className={`zoom-controls absolute ${
                  isMobile 
                    ? 'left-2 top-1/2 transform -translate-y-1/2 flex-col' // Always left side vertical on mobile
                    : 'top-4 left-4 flex-col'
                } flex gap-1 md:gap-2 bg-card/90 backdrop-blur-sm p-1 rounded-md z-40`}>
                  <Tooltip content="Zoom in" position="right" disabled={isMobile}>
                    <button onClick={zoomIn} className="p-1 hover:bg-muted rounded-sm">
                      <ZoomIn className="h-4 w-4" />
                    </button>
                  </Tooltip>
                  <Tooltip content="Reset zoom" position="right" disabled={isMobile}>
                    <button onClick={resetZoom} className="p-1 hover:bg-muted rounded-sm">
                      <RotateCcw className="h-4 w-4" />
                    </button>
                  </Tooltip>
                  <Tooltip content="Zoom out" position="right" disabled={isMobile}>
                    <button onClick={zoomOut} className="p-1 hover:bg-muted rounded-sm">
                      <ZoomOut className="h-4 w-4" />
                    </button>
                  </Tooltip>
                  <Tooltip content="Shuffle deck" position="right" disabled={isMobile}>
                    <button onClick={shuffleDeck} className={`p-1 hover:bg-muted rounded-sm ${!isMobile ? 'hidden' : ''}`}>
                      <Shuffle className="h-4 w-4" />
                    </button>
                  </Tooltip>
                  <Tooltip content="Show help" position="right" disabled={isMobile}>
                    <button onClick={showHint} className={`p-1 hover:bg-muted rounded-sm ${!isMobile ? 'hidden' : ''}`}>
                      <HelpCircle className="h-4 w-4" />
                    </button>
                  </Tooltip>
                  <Tooltip content="Shuffle deck" position="right" disabled={isMobile}>
                    <button onClick={shuffleDeck} className={`p-1 hover:bg-muted rounded-sm ${isMobile ? 'hidden' : ''}`}>
                      <Shuffle className="h-4 w-4" />
                    </button>
                  </Tooltip>
                </div>
                
                {/* Animated pinch zoom hint for mobile */}
                <AnimatePresence>
                  {isMobile && showPinchHint && (
                    <motion.div 
                      className="absolute left-16 top-1/2 transform -translate-y-1/2 bg-primary/90 text-primary-foreground px-3 py-2 rounded-lg text-xs z-50 shadow-lg max-w-48"
                      initial={{ opacity: 0, x: -10, scale: 0.9 }}
                      animate={{ opacity: 1, x: 0, scale: 1 }}
                      exit={{ opacity: 0, x: -10, scale: 0.9 }}
                      transition={{ duration: 0.2, exit: { duration: 0.15 } }}
                      onClick={hideHint}
                    >
                      <div className="flex items-center gap-2">
                        <span>
                          Tap cards • Pinch to zoom • Drag to move
                        </span>
                        <XCircle className="h-3 w-3 cursor-pointer hover:opacity-80 flex-shrink-0" />
                      </div>
                      {/* Arrow pointing to help button */}
                      <div className="absolute left-0 top-1/2 transform -translate-x-1 -translate-y-1/2 w-0 h-0 border-t-4 border-b-4 border-r-4 border-transparent border-r-primary/90"></div>
                    </motion.div>
                  )}
                </AnimatePresence>
              
                {/* Layout visualization with mobile-responsive card sizes */}
                <div 
                  className="reading-content absolute inset-0 transition-transform duration-300 ease-in-out"
                  style={{
                    ...getTransform(zoomLevel, zoomFocus, panOffset),
                    // Additional optimizations for smooth performance
                    contain: 'layout style paint',
                  }}
                >
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
                      onDragStart={handlePlacedCardDragStart}
                      onDrag={(event, info) => handlePlacedCardDrag(index, event, info)}
                      onDragEnd={handlePlacedCardDragEnd}
                      whileHover={{ scale: 1.05 }}
                      whileDrag={{ scale: 1.1, zIndex: 50 }}
                      onClick={() => {
                        if (!(selectedCard as any).revealed) {
                          handleCardFlip(index);
                        }
                      }}
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
                        className={`${isMobile ? 'w-16 h-24' : 'w-20 h-30 md:w-24 md:h-36'} rounded-md overflow-hidden shadow-lg cursor-pointer transition-shadow ${
                          activeCardIndex === index ? 'ring-2 ring-primary shadow-xl' : ''
                        }`}
                        animate={{ 
                          rotateY: (selectedCard as any).revealed ? 0 : 180 
                        }}
                        transition={cardAnimationConfig}
                      >
                        {(selectedCard as any).revealed ? (
                          <img 
                            src={selectedCard.image_url} 
                            alt={selectedCard.name} 
                            className={`w-full h-full object-cover ${(selectedCard as any).isReversed ? 'rotate-180' : ''}`}
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center border border-primary-foreground">
                            <div 
                              className="text-center"
                            >
                              <div className="w-6 h-6 md:w-8 md:h-8 mx-auto mb-1 opacity-50">
                                <svg viewBox="0 0 24 24" fill="currentColor" className="text-primary-foreground">
                                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15h2v-6h-2v6zm1-8c.83 0 1.5-.67 1.5-1.5S12.83 6 12 6s-1.5.67-1.5 1.5S11.17 9 12 9z"/>
                                </svg>
                              </div>
                            </div>
                          </div>
                        )}
                      </motion.div>
                      <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 whitespace-nowrap bg-card/80 backdrop-blur-sm px-1 md:px-2 py-0.5 rounded-full text-xs">
                        {selectedCard.position} {(selectedCard as any).revealed && (selectedCard as any).isReversed && '(R)'}
                      </div>
                    </motion.div>
                  ))}

                  {/* Predefined layout cards */}
                  {selectedLayout?.id !== 'free-layout' && selectedLayout?.positions && selectedLayout.positions.map((position: any, index: number) => {
                    const selectedCard = selectedCards[index];
                    const isHovered = hoveredPosition === index && isDragging;
                    
                    return (
                      <div 
                        key={position.id}
                        className="absolute transform -translate-x-1/2 -translate-y-1/2"
                        style={{ 
                          left: `${position.x}%`, 
                          top: `${position.y}%`,
                          zIndex: selectedCard ? 10 + index : 1
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
                          if (isDragging && draggedCard && !selectedCard) {
                            handleCardDrop(index);
                          }
                        }}
                        onTouchEnd={(e) => {
                          if (isMobile && isDragging && draggedCard && !selectedCard) {
                            e.preventDefault();
                            handleCardDrop(index);
                          }
                        }}
                      >
                        {/* Card position indicator - responsive size */}
                        {!selectedCard && (
                          <div 
                            className={`${isMobile ? 'w-16 h-24' : 'w-20 h-30 md:w-24 md:h-36'} border-2 border-dashed ${
                              isHovered ? 'border-primary bg-primary/10' : 'border-muted-foreground/30'
                            } rounded-md flex flex-col items-center justify-center transition-colors`}
                            style={{ transform: position.rotation ? `rotate(${position.rotation}deg)` : 'none' }}
                          >
                            <span className={`text-xs text-center px-1 ${isHovered ? 'text-primary' : 'text-muted-foreground'}`}>
                              {position.name}
                            </span>
                            {isHovered && (
                              <span className="text-xs text-primary mt-1">Drop here</span>
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
                            className="relative"
                            data-card-element="true"
                            onClick={() => {
                              if ((selectedCard as any).revealed) {
                                setActiveCardIndexWrapped(index);
                              } else {
                                handleCardFlip(index);
                              }
                            }}
                            onTouchEnd={(e) => {
                              if (isMobile) {
                                e.preventDefault();
                                handleCardDoubleTap(index, e);
                              }
                            }}
                            whileHover={{ scale: 1.05 }}
                          >
                            <motion.div 
                              className={`${isMobile ? 'w-16 h-24' : 'w-20 h-30 md:w-24 md:h-36'} rounded-md overflow-hidden shadow-lg cursor-pointer`}
                              animate={{ 
                                rotateY: (selectedCard as any).revealed ? 0 : 180 
                              }}
                              transition={cardAnimationConfig}
                            >
                              {(selectedCard as any).revealed ? (
                                <img 
                                  src={selectedCard.image_url} 
                                  alt={selectedCard.name} 
                                  className={`w-full h-full object-cover ${(selectedCard as any).isReversed ? 'rotate-180' : ''}`}
                                />
                              ) : (
                                <div className="w-full h-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center border border-primary-foreground">
                                  <div 
                                    className="text-center"
                                  >
                                    <div className="w-6 h-6 md:w-8 md:h-8 mx-auto mb-1 opacity-50">
                                      <svg viewBox="0 0 24 24" fill="currentColor" className="text-primary-foreground">
                                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15h2v-6h-2v6zm1-8c.83 0 1.5-.67 1.5-1.5S12.83 6 12 6s-1.5.67-1.5 1.5S11.17 9 12 9z"/>
                                      </svg>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </motion.div>
                            <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 whitespace-nowrap bg-card/80 backdrop-blur-sm px-1 md:px-2 py-0.5 rounded-full text-xs">
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
                {shuffledDeck.length > 0 && (
                  <div className={`deck-pile absolute ${isMobile ? 'bottom-4 left-1/2 transform -translate-x-1/2' : 'bottom-8 left-1/2 transform -translate-x-1/2'} z-20`}>
                    {isMobile ? (
                      /* Mobile: Full deck with horizontal panning - all 78 cards */
                      <div className="relative w-screen h-24 overflow-x-auto">
                        <div 
                          className="relative h-24 mx-auto"
                          style={{ 
                            width: `${shuffledDeck.length * 8}px`,
                            left: '50%',
                            transform: 'translateX(-50%)'
                          }}
                        >
                          {shuffledDeck.map((card: Card, index: number) => {
                            const totalCards = shuffledDeck.length;
                            const angle = (index - (totalCards - 1) / 2) * 1.2; // 1.2 degrees between cards for mobile shallow arc
                            const radius = 200; // Radius for mobile arc
                            const x = Math.sin((angle * Math.PI) / 180) * radius + (totalCards * 4); // Center the arc properly
                            const y = -Math.cos((angle * Math.PI) / 180) * radius * 0.12; // Very shallow curve for mobile
                            
                            return (
                              <motion.div
                                key={`deck-mobile-${index}`}
                                className="absolute w-10 h-15 cursor-grab active:cursor-grabbing"
                                style={{
                                  left: `${x}px`,
                                  bottom: '0',
                                  transformOrigin: 'bottom center'
                                }}
                                initial={{
                                  transform: `translateY(${y}px) rotate(${angle}deg)`,
                                  zIndex: totalCards - index,
                                }}
                                whileHover={{
                                  transform: `translateY(${y - 12}px) rotate(${angle}deg) scale(1.15)`,
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
                                  if (isMobile && isDragging) {
                                    e.preventDefault();
                                    handleFreeLayoutDrop(e);
                                  }
                                }}
                              >
                                <div className="w-full h-full bg-gradient-to-br from-primary to-primary/80 rounded-md border border-primary-foreground flex items-center justify-center shadow-md hover:shadow-lg transition-shadow">
                                  <div className="text-center">
                                    <div className="w-3 h-3 mx-auto mb-0.5 opacity-60">
                                      <svg viewBox="0 0 24 24" fill="currentColor" className="text-primary-foreground">
                                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                                      </svg>
                                    </div>
                                    <span className="text-xs text-primary-foreground opacity-75">
                                      {index < 5 ? 'Drag' : ''}
                                    </span>
                                  </div>
                                </div>
                                {index === Math.floor(totalCards / 2) && (
                                  <div className="absolute -top-2 -right-1 bg-accent text-accent-foreground rounded-full w-4 h-4 text-xs flex items-center justify-center shadow-md">
                                    {shuffledDeck.length}
                                  </div>
                                )}
                              </motion.div>
                            );
                          })}
                        </div>
                        
                        {/* Mobile navigation hints */}
                        <div className="absolute top-0 left-1/2 transform -translate-x-1/2 bg-muted/80 backdrop-blur-sm px-3 py-1 rounded-full text-xs text-muted-foreground">
                          ← Swipe to browse all {shuffledDeck.length} cards →
                        </div>
                        
                        {/* Left/Right gradient overlays to indicate more cards */}
                        <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-background/80 to-transparent pointer-events-none"></div>
                        <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-background/80 to-transparent pointer-events-none"></div>
                      </div>
                    ) : (
                      /* Desktop: Wide fan spread showing all cards - larger and more readable */
                      <div className="relative w-full h-36">
                        {shuffledDeck.map((card: Card, index: number) => {
                          const totalCards = shuffledDeck.length;
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
                              <div className="w-full h-full bg-gradient-to-br from-primary to-primary/80 rounded-lg border border-primary-foreground flex items-center justify-center shadow-lg hover:shadow-xl transition-shadow">
                                <div className="text-center">
                                  <div className="w-5 h-5 mx-auto mb-1 opacity-60">
                                    <svg viewBox="0 0 24 24" fill="currentColor" className="text-primary-foreground">
                                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                                    </svg>
                                  </div>
                                  <span className="text-xs text-white font-medium">
                                    {index < 20 ? 'Drag' : ''}
                                  </span>
                                </div>
                              </div>
                            </motion.div>
                          );
                        })}

                        {/* Card count indicator */}
                        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-accent text-accent-foreground rounded-full w-8 h-8 text-sm flex items-center justify-center shadow-lg">
                          {shuffledDeck.length}
                        </div>
                      </div>
                    )}
                  </div>
                )}
                
                {/* Generate interpretation button for free layout */}
                {selectedLayout?.id === 'free-layout' && selectedCards.length > 0 && !isGeneratingInterpretation && readingStep === 'drawing' && (
                  <div className={`interpretation-button absolute ${isMobile ? (isLandscape ? 'top-12 right-4' : 'top-20 right-4') : 'top-4 right-4'} z-50`}>
                    <Tooltip content={`Generate interpretation for ${selectedCards.length} cards`} position="left" disabled={isMobile}>
                      <button 
                        onClick={() => generateInterpretation()}
                        className="btn btn-primary px-3 md:px-4 py-2 flex items-center text-sm bg-primary/90 backdrop-blur-sm border-primary shadow-lg"
                      >
                        <TarotLogo className="mr-1 md:mr-2 h-4 w-4" />
                        <span className="hidden md:inline">Interpret ({selectedCards.length} cards)</span>
                        <span className="md:hidden">Read ({selectedCards.length})</span>
                      </button>
                    </Tooltip>
                  </div>
                )}
                
                {/* All cards placed - show interpretation button (predefined layouts) */}
                {selectedLayout?.id !== 'free-layout' && selectedCards.filter((card: any) => card).length === selectedLayout?.card_count && !isGeneratingInterpretation && readingStep === 'drawing' && (
                  <div className={`interpretation-button absolute ${isMobile ? (isLandscape ? 'top-12 right-4' : 'top-20 right-4') : 'top-4 right-4'} z-50`}>
                    <Tooltip content="Generate reading interpretation" position="left">
                      <button 
                        onClick={() => generateInterpretation()}
                        className="btn btn-primary px-3 md:px-4 py-2 flex items-center text-sm bg-primary/90 backdrop-blur-sm border-primary shadow-lg"
                      >
                        <TarotLogo className="mr-1 md:mr-2 h-4 w-4" />
                        <span className="hidden md:inline">See Interpretation</span>
                        <span className="md:hidden">Read</span>
                      </button>
                    </Tooltip>
                  </div>
                )}
                
                {/* Loading indicator for interpretation */}
                {isGeneratingInterpretation && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center backdrop-blur-sm">
                    <div className="bg-card p-4 md:p-6 rounded-xl shadow-lg text-center mx-4">
                      <LoadingSpinner size="lg" className="mx-auto mb-4" />
                      <p className="text-muted-foreground text-sm md:text-base">Generating interpretation...</p>
                    </div>
                  </div>
                )}
                
                {/* Loading indicator for shuffling */}
                {isShuffling && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center backdrop-blur-sm">
                    <div className="bg-card p-4 md:p-6 rounded-xl shadow-lg text-center mx-4">
                      <LoadingSpinner size="lg" className="mx-auto mb-4" />
                      <p className="text-muted-foreground text-sm md:text-base">Shuffling cards...</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Step 3: Interpretation - mobile responsive layout */}
          {readingStep === 'interpretation' && (
            <div className={`absolute inset-0 ${isMobile ? (isLandscape && !showMobileInterpretation ? 'flex pt-8' : 'flex-col pt-12') : 'flex pt-20'}`}>
              {/* Reading display */}
              <div 
                className={`${isMobile ? (isLandscape && !showMobileInterpretation ? 'w-3/5' : (showMobileInterpretation ? 'hidden' : 'flex-1')) : 'w-3/5'} relative`}
                onMouseDown={(e) => {
                  // Only start panning if not on mobile, zoomed in, clicking on empty space, and not dragging cards
                  if (!isMobile && zoomLevel > 1 && !isDragging && !isDraggingPlacedCard && e.target === e.currentTarget) {
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
                  ...getTransform(zoomLevel, zoomFocus, panOffset),
                  // Additional optimizations for smooth performance
                  contain: 'layout style paint',
                  cursor: zoomLevel > 1 && !isDragging && !isDraggingPlacedCard ? (isPanning ? 'grabbing' : 'grab') : 'default'
                }}
              >
                {/* Zoom controls */}
                <div className={`zoom-controls absolute ${
                  isMobile 
                    ? 'left-2 top-1/2 transform -translate-y-1/2 flex-col' // Always left side vertical on mobile
                    : 'top-4 left-4 flex-col'
                } flex gap-1 md:gap-2 bg-card/90 backdrop-blur-sm p-1 rounded-md z-40`}>
                  <Tooltip content="Zoom out" position="right" disabled={isMobile}>
                    <button onClick={zoomOut} className="p-1 hover:bg-muted rounded-sm">
                      <ZoomOut className="h-4 w-4" />
                    </button>
                  </Tooltip>
                  <Tooltip content="Reset zoom" position="right" disabled={isMobile}>
                    <button onClick={resetZoom} className="p-1 hover:bg-muted rounded-sm">
                      <RotateCcw className="h-4 w-4" />
                    </button>
                  </Tooltip>
                  <Tooltip content="Zoom in" position="right" disabled={isMobile}>
                    <button onClick={zoomIn} className="p-1 hover:bg-muted rounded-sm">
                      <ZoomIn className="h-4 w-4" />
                    </button>
                  </Tooltip>
                  <Tooltip content="Shuffle deck" position="right" disabled={isMobile}>
                    <button onClick={shuffleDeck} className={`p-1 hover:bg-muted rounded-sm ${!isMobile ? 'hidden' : ''}`}>
                      <Shuffle className="h-4 w-4" />
                    </button>
                  </Tooltip>
                  <Tooltip content="Show help" position="right" disabled={isMobile}>
                    <button onClick={showHint} className={`p-1 hover:bg-muted rounded-sm ${!isMobile ? 'hidden' : ''}`}>
                      <HelpCircle className="h-4 w-4" />
                    </button>
                  </Tooltip>
                  <Tooltip content="Shuffle deck" position="right" disabled={isMobile}>
                    <button onClick={shuffleDeck} className={`p-1 hover:bg-muted rounded-sm ${isMobile ? 'hidden' : ''}`}>
                      <Shuffle className="h-4 w-4" />
                    </button>
                  </Tooltip>
                </div>
                
                {/* Card layout with zoom applied */}
                <div 
                  className="absolute inset-0 transition-transform duration-300 ease-in-out"
                  onMouseDown={(e) => {
                    // Only start panning if not on mobile, zoomed in, clicking on empty space, and not dragging cards
                    if (!isMobile && zoomLevel > 1 && !isDragging && !isDraggingPlacedCard && e.target === e.currentTarget) {
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
                    ...getTransform(zoomLevel, zoomFocus, panOffset),
                    // Additional optimizations for smooth performance
                    contain: 'layout style paint',
                    cursor: zoomLevel > 1 && !isDragging && !isDraggingPlacedCard ? (isPanning ? 'grabbing' : 'grab') : 'default'
                  }}
                >
                  {/* Free layout cards in interpretation */}
                  {selectedLayout?.id === 'free-layout' && selectedCards.map((selectedCard: any, index: number) => (
                    <motion.div
                      key={`free-interp-${index}`}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ 
                        opacity: 1, 
                        scale: activeCardIndex === index ? 1.1 : 1 
                      }}
                      transition={cardAnimationConfig}
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
                      onDragStart={handlePlacedCardDragStart}
                      onDrag={(event, info) => handlePlacedCardDrag(index, event, info)}
                      onDragEnd={handlePlacedCardDragEnd}
                      whileHover={{ scale: 1.05 }}
                      whileDrag={{ scale: 1.1, zIndex: 50 }}
                      onClick={() => {
                        if (!(selectedCard as any).revealed) {
                          handleCardFlip(index);
                        }
                      }}
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
                        className={`${isMobile ? 'w-16 h-24' : 'w-20 h-30 md:w-24 md:h-36'} rounded-md overflow-hidden shadow-lg cursor-pointer transition-shadow ${
                          activeCardIndex === index ? 'ring-2 ring-primary shadow-xl' : ''
                        }`}
                        animate={{ 
                          rotateY: (selectedCard as any).revealed ? 0 : 180 
                        }}
                        transition={cardAnimationConfig}
                      >
                        {(selectedCard as any).revealed ? (
                          <img 
                            src={selectedCard.image_url} 
                            alt={selectedCard.name} 
                            className={`w-full h-full object-cover ${(selectedCard as any).isReversed ? 'rotate-180' : ''}`}
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center border border-primary-foreground">
                            <div 
                              className="text-center"
                            >
                              <div className="w-6 h-6 md:w-8 md:h-8 mx-auto mb-1 opacity-50">
                                <svg viewBox="0 0 24 24" fill="currentColor" className="text-primary-foreground">
                                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15h2v-6h-2v6zm1-8c.83 0 1.5-.67 1.5-1.5S12.83 6 12 6s-1.5.67-1.5 1.5S11.17 9 12 9z"/>
                                </svg>
                              </div>
                            </div>
                          </div>
                        )}
                      </motion.div>
                      <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 whitespace-nowrap bg-card/80 backdrop-blur-sm px-1 md:px-2 py-0.5 rounded-full text-xs">
                        {selectedCard.position} {(selectedCard as any).revealed && (selectedCard as any).isReversed && '(R)'}
                      </div>
                    </motion.div>
                  ))}

                  {/* Predefined layout cards in interpretation */}
                  {selectedLayout?.id !== 'free-layout' && selectedLayout && selectedLayout.positions.map((position: any, index: number) => {
                    const selectedCard = selectedCards[index];
                    if (!selectedCard) return null;
                    
                    return (
                      <div 
                        key={position.id}
                        className="absolute transform -translate-x-1/2 -translate-y-1/2"
                        style={{ 
                          left: `${position.x}%`, 
                          top: `${position.y}%`,
                          zIndex: activeCardIndex === index ? 20 : 10 + index
                        }}
                      >
                        <motion.div
                          className="relative"
                          data-card-element="true"
                          onClick={() => {
                            if ((selectedCard as any).revealed) {
                              setActiveCardIndexWrapped(index);
                            } else {
                              handleCardFlip(index);
                            }
                          }}
                          onTouchEnd={(e) => {
                            if (isMobile) {
                              e.preventDefault();
                              handleCardDoubleTap(index, e);
                            }
                          }}
                          whileHover={{ scale: 1.05 }}
                          animate={activeCardIndex === index ? { scale: 1.1 } : { scale: 1 }}
                        >
                          <motion.div 
                            className={`${isMobile ? 'w-16 h-24' : 'w-20 h-30 md:w-24 md:h-36'} rounded-md overflow-hidden shadow-lg cursor-pointer`}
                            animate={{ 
                              rotateY: (selectedCard as any).revealed ? 0 : 180 
                            }}
                            transition={cardAnimationConfig}
                          >
                            {(selectedCard as any).revealed ? (
                              <img 
                                src={selectedCard.image_url} 
                                alt={selectedCard.name} 
                                className={`w-full h-full object-cover ${(selectedCard as any).isReversed ? 'rotate-180' : ''}`}
                              />
                            ) : (
                              <div className="w-full h-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center border border-primary-foreground">
                                <div 
                                  className="text-center"
                                >
                                  <div className="w-6 h-6 md:w-8 md:h-8 mx-auto mb-1 opacity-50">
                                    <svg viewBox="0 0 24 24" fill="currentColor" className="text-primary-foreground">
                                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15h2v-6h-2v6zm1-8c.83 0 1.5-.67 1.5-1.5S12.83 6 12 6s-1.5.67-1.5 1.5S11.17 9 12 9z"/>
                                    </svg>
                                  </div>
                                </div>
                              </div>
                            )}
                          </motion.div>
                          <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 whitespace-nowrap bg-card/80 backdrop-blur-sm px-1 md:px-2 py-0.5 rounded-full text-xs">
                            {isMobile ? position.name.slice(0, 8) + (position.name.length > 8 ? '...' : '') : position.name} {(selectedCard as any).revealed && (selectedCard as any).isReversed && '(R)'}
                          </div>
                        </motion.div>
                      </div>
                    );
                  })}
                </div>
                
                {/* Reading controls */}
                <div className={`absolute ${isMobile ? 'top-2 right-2' : 'bottom-6 right-6'} flex gap-1 md:gap-3`}>
                  <Tooltip content="View interpretation" position="left" disabled={!(isMobile && !isLandscape && !showMobileInterpretation)}>
                    <button 
                      onClick={() => setShowMobileInterpretation(true)}
                      className={`btn btn-primary px-2 py-1 text-xs mobile-interpretation-button ${!(isMobile && !isLandscape && !showMobileInterpretation) ? 'hidden' : ''}`}
                  
                    >
                      <Info className="h-4 w-4" />
                    </button>
                  </Tooltip>
                  <Tooltip content="Close interpretation" position="left" disabled={!(isMobile && !isLandscape && showMobileInterpretation)}>
                    <button 
                      onClick={() => setShowMobileInterpretation(false)}
                      className={`text-muted-foreground hover:text-foreground ${!(isMobile && !isLandscape && showMobileInterpretation) ? 'hidden' : ''}`}
                    >
                      <XCircle className="h-4 w-4" />
                    </button>
                  </Tooltip>
                  <Tooltip content="Return to card table" position="left">
                    <button 
                      onClick={() => setReadingStepWrapped('drawing')}
                      className={`btn btn-secondary ${isMobile ? 'px-2 py-1 text-xs' : 'px-3 md:px-4 py-1.5 md:py-2 text-sm'}`}
                    >
                      {isMobile ? 'Back' : 'Back to Table'}
                    </button>
                  </Tooltip>
                  
                  <Tooltip content="Start a new reading" position="left">
                    <button 
                      onClick={resetReading}
                      className={`btn btn-ghost border border-input ${isMobile ? 'px-2 py-1 text-xs' : 'px-3 md:px-4 py-1.5 md:py-2 text-sm'}`}
                    >
                      {isMobile ? 'New' : 'New Reading'}
                    </button>
                  </Tooltip>
                </div>
              </div>
              
              {/* Interpretation panel - responsive layout */}
              <div className={`${isMobile ? (isLandscape && !showMobileInterpretation ? 'w-2/5' : (showMobileInterpretation ? 'flex-1' : 'hidden')) : 'w-2/5'} bg-card ${isMobile ? (isLandscape && !showMobileInterpretation ? 'border-l' : '') : 'border-l'} border-border flex flex-col h-full`}>
                <div className={`${isMobile ? 'p-2' : 'p-3 md:p-4'} border-b border-border bg-primary/5 flex justify-between items-center`}>
                  <div className="flex items-center">
                    <TarotLogo className={`${isMobile ? 'h-3 w-3' : 'h-4 w-4 md:h-5 md:w-5'} text-primary mr-2`} />
                    <h3 className={`font-medium ${isMobile ? 'text-xs' : 'text-sm md:text-base'}`}>Reading Interpretation</h3>
                  </div>
                  <Tooltip content="Close interpretation" position="left" disabled={!isMobile}>
                    <button 
                      onClick={() => setShowMobileInterpretation(false)}
                      className={`text-muted-foreground hover:text-foreground ${!isMobile ? 'hidden' : ''}`}
                    >
                      <XCircle className="h-4 w-4" />
                    </button>
                  </Tooltip>
                </div>
                
                <div className={`flex-1 ${isMobile ? 'p-2' : 'p-3 md:p-4'} overflow-y-auto`}>
                  {/* Card information */}
                  {activeCardIndex !== null && activeCardIndex !== undefined && selectedCards[activeCardIndex] && (
                    <div className={`${isMobile ? 'mb-3 p-2' : 'mb-4 md:mb-6 p-2 md:p-3'} bg-muted/30 border border-border rounded-lg`}>
                      <div className={`flex ${isMobile ? 'gap-1' : 'gap-2 md:gap-3'}`}>
                        <div className={`shrink-0 ${isMobile ? 'w-8 h-12' : 'w-10 h-15 md:w-12 md:h-18'} rounded-md overflow-hidden`}>
                          <img 
                            src={selectedCards[activeCardIndex].image_url} 
                            alt={selectedCards[activeCardIndex].name} 
                            className={`w-full h-full object-cover ${selectedCards[activeCardIndex].isReversed ? 'rotate-180' : ''}`}
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className={`font-medium ${isMobile ? 'text-xs' : 'text-sm md:text-base'}`}>{selectedCards[activeCardIndex].name} {selectedCards[activeCardIndex].isReversed && '(Reversed)'}</h4>
                          <p className="text-xs text-accent mb-1">{selectedCards[activeCardIndex].position}</p>
                          <p className="text-xs text-muted-foreground">{selectedCards[activeCardIndex].description}</p>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Interpretation text */}
                  <div className="space-y-2">
                    {cleanMarkdownText(interpretation).map((line, i: number) => (
                      <div key={i}>
                        {line.isHeader ? (
                          <h4 className={`font-semibold text-primary ${isMobile ? 'text-sm' : 'text-base'} mb-2`}>
                            {line.content}
                          </h4>
                        ) : line.isBullet ? (
                          <div className={`flex items-start gap-2 ${isMobile ? 'text-xs' : 'text-sm'} text-muted-foreground ml-2`}>
                            <span className="text-primary mt-1">•</span>
                            <span>{line.content}</span>
                          </div>
                        ) : (
                          <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-foreground leading-relaxed`}>
                            {line.content}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Card navigation */}
                {selectedCards.length > 1 && (
                  <div className={`${isMobile ? 'p-1' : 'p-2 md:p-3'} border-t border-border flex justify-between items-center`}>
                    <Tooltip content="Previous card" position="top">
                      <button 
                        onClick={() => {
                          const currentIndex = activeCardIndex ?? 0;
                          const newIndex = currentIndex > 0 ? currentIndex - 1 : selectedCards.length - 1;
                          setActiveCardIndexWrapped(newIndex);
                        }}
                        className={`btn btn-ghost ${isMobile ? 'p-0.5' : 'p-1'}`}
                      >
                        <ChevronLeft className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'}`} />
                      </button>
                    </Tooltip>
                    
                    <div className={`${isMobile ? 'text-xs' : 'text-sm'} text-muted-foreground`}>
                      {(activeCardIndex ?? 0) + 1} of {selectedCards.length} cards
                    </div>
                    
                    <Tooltip content="Next card" position="top">
                      <button 
                        onClick={() => {
                          const currentIndex = activeCardIndex ?? 0;
                          const newIndex = currentIndex < selectedCards.length - 1 ? currentIndex + 1 : 0;
                          setActiveCardIndexWrapped(newIndex);
                        }}
                        className={`btn btn-ghost ${isMobile ? 'p-0.5' : 'p-1'}`}
                      >
                        <ChevronRight className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'}`} />
                      </button>
                    </Tooltip>
                  </div>
                )}
              </div>
            </div>
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
      
      {/* Video Chat - Mobile Optimized Draggable Bubbles */}
      {showVideoChat && (
        <VideoChat 
          onClose={() => setShowVideoChat(false)}
          sessionId={sessionId}
        />
      )}
      
      {/* Share Room Modal - mobile responsive */}
      <AnimatePresence>
        {showShareModal && sessionId && (
          <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
            <motion.div 
              className="relative bg-card max-w-md w-full rounded-xl overflow-hidden"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="flex items-center justify-between bg-primary/10 p-4 border-b border-border">
                <h3 className="font-serif font-bold">Share Reading Room</h3>
                <Tooltip content="Close share modal" position="left">
                  <button 
                    onClick={() => setShowShareModal(false)}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <XCircle className="h-5 w-5" />
                  </button>
                </Tooltip>
              </div>
              
              <div className="p-6">
                <p className="mb-4 text-sm md:text-base">
                  Share this link with others to invite them to your reading room. 
                  {participants.length > 0 && ` Currently ${participants.length} participants are connected.`}
                </p>
                
                <div className="mb-6">
                  <label htmlFor="roomLink" className="block text-sm font-medium mb-2">
                    Room Invitation Link
                  </label>
                  <div className="flex">
                    <input
                      id="roomLink"
                      type="text"
                      value={sessionId ? generateShareableLink(sessionId) : ''}
                      readOnly
                      className="flex-1 p-2 text-sm rounded-l-md border border-r-0 border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    <Tooltip content={showCopied ? "Link copied!" : "Copy link to clipboard"} position="top">
                      <button
                        onClick={copyRoomLink}
                        className="p-2 bg-primary text-primary-foreground rounded-r-md hover:bg-primary/90 transition-colors flex items-center"
                      >
                        {showCopied ? <Check className="h-5 w-5" /> : <Copy className="h-5 w-5" />}
                      </button>
                    </Tooltip>
                  </div>
                  {showCopied && (
                    <p className="text-xs text-success mt-2">Link copied to clipboard!</p>
                  )}
                </div>
                
                <div className="flex justify-end">
                  <button
                    onClick={() => setShowShareModal(false)}
                    className="btn btn-primary px-4 py-2"
                  >
                    Done
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      
      {/* Guest Account Upgrade Modal */}
      <AnimatePresence>
        {showGuestUpgrade && isGuest && (() => {
          console.log('Rendering GuestAccountUpgrade modal', { 
            showGuestUpgrade, 
            isGuest, 
            joinSessionId, 
            participantCount: participants.length,
            isInviteJoin: !!joinSessionId 
          });
          return (
            <GuestAccountUpgrade
              onUpgradeSuccess={handleGuestUpgrade}
              onClose={handleCloseGuestUpgrade}
              participantCount={participants.length}
              isInviteJoin={!!joinSessionId}
              onGuestNameSet={handleGuestNameSet}
            />
          );
        })()}
      </AnimatePresence>
      
      {/* Sign In Modal */}
      <SignInModal 
        isOpen={showSignInModal}
        onClose={() => setShowSignInModal(false)}
        onSuccess={handleSignInSuccess}
      />
    </div>
  );
};

export default memo(ReadingRoom);