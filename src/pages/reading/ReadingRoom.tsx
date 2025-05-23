import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, HelpCircle, Share2, Shuffle, Save, XCircle, Video, PhoneCall, Zap, Copy, Check, ChevronLeft, ChevronRight, Info, ZoomIn, ZoomOut, RotateCcw, Menu, Users, UserPlus } from 'lucide-react';
import { Deck, Card, ReadingLayout } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { fetchDeckById, fetchCardsByDeckId } from '../../lib/deck-utils';
import { getReadingInterpretation } from '../../lib/gemini-ai';
import VideoChat from '../../components/video/VideoChat';
import TarotLogo from '../../components/ui/TarotLogo';
import GuestAccountUpgrade from '../../components/ui/GuestAccountUpgrade';
import { v4 as uuidv4 } from 'uuid';
import { useReadingSession } from '../../hooks/useReadingSession';

// Mock reading layouts
const readingLayouts: ReadingLayout[] = [
  {
    id: 'free-layout',
    name: 'Free Layout',
    description: 'Create your own custom spread - drag cards anywhere on the table',
    card_count: 999, // Unlimited
    positions: [] // No predefined positions
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
    id: 'single-card',
    name: 'Single Card',
    description: 'Quick guidance for your day or a specific question',
    card_count: 1,
    positions: [
      { id: 0, name: 'Guidance', meaning: 'Offers insight or guidance for your question', x: 50, y: 50 }
    ]
  }
];

const ReadingRoom = () => {
  const { deckId } = useParams<{ deckId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Get join session ID from URL params
  const urlParams = new URLSearchParams(location.search);
  const joinSessionId = urlParams.get('join');
  
  // Initialize reading session hook
  const {
    sessionState,
    participants,
    isHost,
    isLoading: sessionLoading,
    error: sessionError,
    updateSession,
    upgradeGuestAccount,
    isGuest,
    setGuestName
  } = useReadingSession({
    initialSessionId: joinSessionId || undefined,
    deckId: deckId || 'rider-waite-classic'
  });
  
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
  const [showMobileInterpretation, setShowMobileInterpretation] = useState(false);
  
  // Guest upgrade state
  const [showGuestUpgrade, setShowGuestUpgrade] = useState(false);
  const [hasShownInviteUpgrade, setHasShownInviteUpgrade] = useState(false);
  
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
  
  // Video chat state
  const [showVideoChat, setShowVideoChat] = useState(false);
  const [isVideoConnecting, setIsVideoConnecting] = useState(false);
  
  // Use session state instead of local state
  const selectedLayout = sessionState?.selectedLayout;
  const selectedCards = sessionState?.selectedCards || [];
  const question = sessionState?.question || '';
  const readingStep = sessionState?.readingStep || 'setup';
  const interpretation = sessionState?.interpretation || '';
  const zoomLevel = sessionState?.zoomLevel || 1;
  const activeCardIndex = sessionState?.activeCardIndex;
  const sessionId = sessionState?.id;

  // Debug session state
  useEffect(() => {
    console.log('ReadingRoom state updated:', {
      sessionState,
      readingStep,
      selectedLayout,
      sessionLoading,
      loading,
      cards: cards?.length || 0,
      error,
      sessionError,
      sessionId: sessionState?.id,
      user: user?.id || 'anonymous',
      isGuest
    });
  }, [sessionState, readingStep, selectedLayout, sessionLoading, loading, cards, error, sessionError, user, isGuest]);

  // Check for mobile screen size
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
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

  const handleLayoutSelect = useCallback((layout: ReadingLayout) => {
    try {
      console.log('Layout selected:', layout);
      updateSession({
        selectedLayout: layout,
        selectedCards: [],
        readingStep: 'drawing',
        interpretation: '',
        activeCardIndex: null,
        zoomLevel: isMobile ? (layout.id === 'celtic-cross' ? 0.6 : 0.8) : (layout.id === 'celtic-cross' ? 0.8 : 1)
      });
      
      // Only shuffle if cards are loaded
      if (cards && cards.length > 0) {
        setShuffledDeck([...cards].sort(() => Math.random() - 0.5));
      }
    } catch (error) {
      console.error('Error selecting layout:', error);
      setError('Failed to select layout. Please try again.');
    }
  }, [updateSession, cards, isMobile]);

  const handleQuestionChange = useCallback((newQuestion: string) => {
    updateSession({ question: newQuestion });
  }, [updateSession]);
  
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
  
  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (e.touches.length === 2) {
      setIsZooming(true);
      setLastTouchDistance(getTouchDistance(e.touches));
      e.preventDefault();
    }
  }, []);
  
  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (isZooming && e.touches.length === 2) {
      const currentDistance = getTouchDistance(e.touches);
      const scale = currentDistance / lastTouchDistance;
      
      if (Math.abs(scale - 1) > 0.02) { // Threshold to prevent jittery zooming
        setZoomLevelWrapped(Math.max(0.5, Math.min(2, zoomLevel * scale)));
        setLastTouchDistance(currentDistance);
      }
      e.preventDefault();
    }
  }, [isZooming, lastTouchDistance, zoomLevel, setZoomLevelWrapped]);
  
  const handleTouchEnd = useCallback((e: TouchEvent) => {
    if (e.touches.length < 2) {
      setIsZooming(false);
      setLastTouchDistance(0);
    }
  }, []);
  
  // Add touch event listeners for pinch-to-zoom
  useEffect(() => {
    const readingArea = readingAreaRef.current;
    if (!readingArea || !isMobile) return;
    
    readingArea.addEventListener('touchstart', handleTouchStart, { passive: false });
    readingArea.addEventListener('touchmove', handleTouchMove, { passive: false });
    readingArea.addEventListener('touchend', handleTouchEnd, { passive: false });
    
    return () => {
      readingArea.removeEventListener('touchstart', handleTouchStart);
      readingArea.removeEventListener('touchmove', handleTouchMove);
      readingArea.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd, isMobile]);
  
  // Fetch deck and cards data
  useEffect(() => {
    const fetchDeckData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const deckData = await fetchDeckById(deckId || 'rider-waite-classic');
        
        if (deckData) {
          setDeck(deckData);
          
          // Fetch cards for this deck
          const cardsData = await fetchCardsByDeckId(deckData.id);
          
          if (cardsData && cardsData.length > 0) {
            setCards(cardsData);
            setShuffledDeck([...cardsData].sort(() => Math.random() - 0.5));
          } else {
            throw new Error("No cards found for this deck");
          }
        } else {
          throw new Error("Deck not found");
        }
        
        setLoading(false);
      } catch (error: any) {
        console.error('Error fetching deck data:', error);
        setError(error.message || "An error occurred loading the deck. Please try again.");
        setLoading(false);
      }
    };
    
    fetchDeckData();
  }, [deckId]);
  
  const shuffleDeck = () => {
    setShuffledDeck([...shuffledDeck].sort(() => Math.random() - 0.5));
  };
  
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
    } catch (error) {
      console.error('Error generating interpretation:', error);
      updateSession({
        interpretation: 'Unable to generate an interpretation at this time. Please try again later.',
        readingStep: 'interpretation'
      });
    } finally {
      setIsGeneratingInterpretation(false);
    }
  };
  
  const initiateVideoChat = () => {
    setIsVideoConnecting(true);
    
    setTimeout(() => {
      setIsVideoConnecting(false);
      setShowVideoChat(true);
    }, 500);
  };
  
  const resetReading = () => {
    updateSession({
      readingStep: 'setup',
      selectedLayout: null,
      selectedCards: [],
      interpretation: '',
      activeCardIndex: null,
      zoomLevel: 1
    });
    setShuffledDeck([...cards].sort(() => Math.random() - 0.5));
    setShowMobileInterpretation(false);
  };
  
  const zoomIn = () => {
    setZoomLevelWrapped(Math.min(zoomLevel + 0.2, 2));
  };
  
  const zoomOut = () => {
    setZoomLevelWrapped(Math.max(zoomLevel - 0.2, 0.5));
  };
  
  const resetZoom = () => {
    setZoomLevelWrapped(1);
  };
  
  // Handle card flip when clicked
  const handleCardFlip = (cardIndex: number) => {
    const newSelectedCards = [...selectedCards];
    if (newSelectedCards[cardIndex]) {
      newSelectedCards[cardIndex] = {
        ...newSelectedCards[cardIndex],
        revealed: !(newSelectedCards[cardIndex] as any).revealed
      } as any;
      updateSession({ selectedCards: newSelectedCards });
    }
  };
  
  // Add mouse move handler to document for dragging
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        setDragPosition({ x: e.clientX, y: e.clientY });
      }
    };
    
    const handleMouseUp = () => {
      if (isDragging) {
        handleDragEnd();
      }
    };
    
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);
  
  // Generate shareable link using session ID
  const generateShareableLink = (id: string): string => {
    const baseUrl = window.location.origin;
    const currentPath = window.location.pathname;
    return `${baseUrl}${currentPath}?join=${id}`;
  };

  // Function to copy room link to clipboard
  const copyRoomLink = () => {
    if (sessionId) {
      const shareableLink = generateShareableLink(sessionId);
      navigator.clipboard.writeText(shareableLink);
      setShowCopied(true);
      setTimeout(() => setShowCopied(false), 3000);
    }
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
  
  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
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
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
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
            <Link to="/collection" className="btn btn-secondary px-6 py-2">
              My Collection
            </Link>
            <Link to="/marketplace" className="btn btn-primary px-6 py-2">
              Browse Marketplace
            </Link>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* Main content - full screen with floating controls */}
      <main className="flex-1 overflow-hidden relative">
        {/* Floating controls in top corner - more compact for mobile */}
        <div className={`absolute ${isMobile ? 'top-2 left-2 right-2' : 'top-4 left-4 right-4'} z-50 flex justify-between items-start`}>
          {/* Left side - Back button and session info */}
          <div className="flex items-center gap-1 md:gap-2">
            <Link 
              to="/collection" 
              className={`btn btn-ghost bg-card/80 backdrop-blur-sm border border-border ${isMobile ? 'p-1.5' : 'p-2'} flex items-center text-muted-foreground hover:text-foreground`}
            >
              <ArrowLeft className="h-4 w-4" />
              {!isMobile && <span className="ml-1 text-sm">Back</span>}
            </Link>
            
            {/* Session info - more compact for mobile */}
            {!isMobile && (
              <div className="bg-card/80 backdrop-blur-sm border border-border rounded-lg px-3 py-2 max-w-xs">
                <div className="flex items-center gap-2">
                  <h1 className="text-sm font-serif font-bold truncate">Reading Room</h1>
                  {participants.length > 0 && (
                    <div 
                      className="flex items-center gap-1 bg-muted px-2 py-0.5 rounded-full cursor-pointer"
                      title={participants.map(p => p.name || 'Anonymous').join(', ')}
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
                  <p className="text-xs text-muted-foreground truncate">
                    {deck.title} by {deck.creator_name}
                  </p>
                )}
              </div>
            )}
          </div>
          
          {/* Right side - Action buttons - more compact for mobile */}
          <div className="flex items-center gap-1 md:gap-2">
            {/* Guest upgrade button */}
            {isGuest && (
              <button 
                onClick={() => setShowGuestUpgrade(true)}
                className={`btn btn-accent bg-accent/80 backdrop-blur-sm border border-accent/50 ${isMobile ? 'p-1.5' : 'p-2'} text-sm flex items-center ${!isMobile ? 'gap-1' : ''}`}
                title="Create account to save your progress"
              >
                <UserPlus className="h-4 w-4" />
                {!isMobile && <span className="text-xs">Upgrade</span>}
              </button>
            )}
            
            <button 
              onClick={() => setShowShareModal(true)}
              className={`btn btn-ghost bg-card/80 backdrop-blur-sm border border-border ${isMobile ? 'p-1.5' : 'p-2'} text-sm flex items-center`}
              disabled={!sessionId}
              title="Share reading room"
            >
              <Share2 className="h-4 w-4" />
            </button>
            
            <button 
              onClick={() => !isVideoConnecting && !showVideoChat && setShowVideoChat(true)}
              className={`btn ${showVideoChat ? 'btn-success' : 'btn-secondary'} bg-card/80 backdrop-blur-sm border border-border ${isMobile ? 'p-1.5' : 'p-2'} text-sm flex items-center`}
              disabled={isVideoConnecting}
              title="Video chat"
            >
              {isVideoConnecting ? (
                <span className="h-4 w-4 border-2 border-secondary-foreground border-t-transparent rounded-full animate-spin"></span>
              ) : (
                <PhoneCall className="h-4 w-4" />
              )}
            </button>

            <button 
              className={`btn btn-primary bg-primary/80 backdrop-blur-sm border border-primary ${isMobile ? 'p-1.5' : 'p-2'} text-sm flex items-center`}
              title="Save reading"
            >
              <Save className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Reading table */}
        <div className="h-full relative bg-gradient-to-b from-background to-background/80">
          {/* Step 1: Setup Screen */}
          {readingStep === 'setup' && (
            <div className={`absolute inset-0 flex items-center justify-center ${isMobile ? 'px-4 pt-16 pb-4' : 'p-4 pt-24'}`}>
              <div className={`w-full ${isMobile ? 'max-h-full overflow-y-auto' : 'max-w-md'} ${isMobile ? 'p-3' : 'p-4 md:p-6'} bg-card border border-border rounded-xl shadow-lg`}>
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
          
          {/* Step 2: Drawing Cards */}
          {readingStep === 'drawing' && selectedLayout && (
            <div className={`absolute inset-0 flex flex-col ${isMobile ? 'pt-12' : 'pt-20'}`}>
              {/* Reading info bar - compact for mobile */}
              <div className={`bg-card/80 backdrop-blur-sm border-b border-border ${isMobile ? 'p-1.5' : 'p-2 md:p-3'} flex justify-between items-center`}>
                <div className="flex-1 min-w-0">
                  <span className={`font-medium ${isMobile ? 'text-sm' : 'text-sm md:text-base'} truncate block`}>{selectedLayout.name}</span>
                  {question && !isMobile && (
                    <span className="text-xs text-muted-foreground italic">"{question}"</span>
                  )}
                </div>
                <div className={`flex items-center ${isMobile ? 'gap-1' : 'gap-2 md:gap-3'} ml-2`}>
                  <span className="text-xs md:text-sm whitespace-nowrap">
                    {selectedCards.filter(card => card).length}/{selectedLayout.card_count === 999 ? '∞' : selectedLayout.card_count}
                  </span>
                  
                  <button 
                    onClick={shuffleDeck}
                    className={`btn btn-ghost ${isMobile ? 'p-0.5' : 'p-1'} text-sm flex items-center`}
                  >
                    <Shuffle className="h-4 w-4" />
                  </button>
                  
                  <button 
                    onClick={resetReading}
                    className={`btn btn-ghost ${isMobile ? 'p-0.5' : 'p-1'} text-sm flex items-center text-warning`}
                  >
                    <XCircle className="h-4 w-4" />
                  </button>
                </div>
              </div>
              
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
              >
                {/* Zoom controls - repositioned for mobile */}
                <div className={`absolute ${isMobile ? 'bottom-4 left-1/2 transform -translate-x-1/2 flex-row' : 'top-20 left-4 flex-col'} flex gap-2 bg-card/90 backdrop-blur-sm p-1 rounded-md z-40`}>
                  <button onClick={zoomOut} className="p-1.5 md:p-1 hover:bg-muted rounded-sm" title="Zoom Out">
                    <ZoomOut className="h-4 w-4 md:h-5 md:w-5" />
                  </button>
                  <button onClick={resetZoom} className="p-1.5 md:p-1 hover:bg-muted rounded-sm" title="Reset Zoom">
                    <RotateCcw className="h-4 w-4 md:h-5 md:w-5" />
                  </button>
                  <button onClick={zoomIn} className="p-1.5 md:p-1 hover:bg-muted rounded-sm" title="Zoom In">
                    <ZoomIn className="h-4 w-4 md:h-5 md:w-5" />
                  </button>
                </div>
                
                {isMobile && (
                  <div className="absolute top-20 left-1/2 transform -translate-x-1/2 bg-muted/80 px-3 py-1 rounded-full text-xs z-40">
                    {selectedLayout?.id === 'free-layout' 
                      ? 'Drag cards anywhere • Pinch to zoom' 
                      : 'Drag cards from deck • Pinch to zoom'}
                  </div>
                )}
              
                {/* Layout visualization with mobile-responsive card sizes */}
                <div 
                  className="absolute inset-0 transition-transform duration-300 ease-in-out"
                  style={{
                    transform: `scale(${zoomLevel})`,
                    transformOrigin: 'center center',
                    height: '100%',
                    width: '100%'
                  }}
                >
                  {/* Free layout cards */}
                  {selectedLayout?.id === 'free-layout' && selectedCards.map((selectedCard: any, index: number) => (
                    <motion.div
                      key={`free-${index}`}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.5 }}
                      className="absolute transform -translate-x-1/2 -translate-y-1/2"
                      style={{ 
                        left: `${selectedCard.x}%`, 
                        top: `${selectedCard.y}%`,
                        zIndex: activeCardIndex === index ? 20 : 10 + index
                      }}
                      onClick={() => {
                        if ((selectedCard as any).revealed) {
                          setActiveCardIndexWrapped(index);
                        } else {
                          handleCardFlip(index);
                        }
                      }}
                    >
                      <motion.div 
                        className={`${isMobile ? 'w-16 h-24' : 'w-20 h-30 md:w-24 md:h-36'} rounded-md overflow-hidden shadow-lg cursor-pointer transition-shadow ${
                          activeCardIndex === index ? 'ring-2 ring-primary shadow-xl' : ''
                        }`}
                        style={{ 
                          transform: (selectedCard as any).isReversed ? 'rotate(180deg)' : 'none'
                        }}
                        animate={{ 
                          rotateY: (selectedCard as any).revealed ? 0 : 180 
                        }}
                        transition={{ 
                          duration: 0.6, 
                          ease: "easeInOut" 
                        }}
                      >
                        {(selectedCard as any).revealed ? (
                          <img 
                            src={selectedCard.image_url} 
                            alt={selectedCard.name} 
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center border border-primary-foreground">
                            <div 
                              className="text-center"
                              style={{
                                transform: (selectedCard as any).isReversed ? 'rotate(180deg)' : 'none'
                              }}
                            >
                              <div className="w-6 h-6 md:w-8 md:h-8 mx-auto mb-1 opacity-50">
                                <svg viewBox="0 0 24 24" fill="currentColor" className="text-primary-foreground">
                                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15h2v-6h-2v6zm1-8c.83 0 1.5-.67 1.5-1.5S12.83 6 12 6s-1.5.67-1.5 1.5S11.17 9 12 9z"/>
                                </svg>
                              </div>
                              <span className="text-xs text-primary-foreground opacity-75">Click to reveal</span>
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
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.5 }}
                            className="relative"
                            onClick={() => {
                              if ((selectedCard as any).revealed) {
                                setActiveCardIndexWrapped(index);
                              } else {
                                handleCardFlip(index);
                              }
                            }}
                            whileHover={{ scale: 1.05 }}
                            animate={activeCardIndex === index ? { scale: 1.1 } : { scale: 1 }}
                          >
                            <motion.div 
                              className={`${isMobile ? 'w-16 h-24' : 'w-20 h-30 md:w-24 md:h-36'} rounded-md overflow-hidden shadow-lg cursor-pointer`}
                              style={{ 
                                transform: (selectedCard as any).isReversed ? 'rotate(180deg)' : 'none'
                              }}
                              animate={{ 
                                rotateY: (selectedCard as any).revealed ? 0 : 180 
                              }}
                              transition={{ 
                                duration: 0.6, 
                                ease: "easeInOut" 
                              }}
                            >
                              {(selectedCard as any).revealed ? (
                                <img 
                                  src={selectedCard.image_url} 
                                  alt={selectedCard.name} 
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center border border-primary-foreground">
                                  <div 
                                    className="text-center"
                                    style={{
                                      transform: (selectedCard as any).isReversed ? 'rotate(180deg)' : 'none'
                                    }}
                                  >
                                    <div className="w-6 h-6 md:w-8 md:h-8 mx-auto mb-1 opacity-50">
                                      <svg viewBox="0 0 24 24" fill="currentColor" className="text-primary-foreground">
                                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15h2v-6h-2v6zm1-8c.83 0 1.5-.67 1.5-1.5S12.83 6 12 6s-1.5.67-1.5 1.5S11.17 9 12 9z"/>
                                      </svg>
                                    </div>
                                    <span className="text-xs text-primary-foreground opacity-75">Click to reveal</span>
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
                  <div className={`absolute ${isMobile ? 'bottom-4 left-1/2 transform -translate-x-1/2' : 'bottom-8 left-1/2 transform -translate-x-1/2'} z-20`}>
                    {isMobile ? (
                      /* Mobile: Full deck with horizontal panning - all 78 cards */
                      <div className="relative w-screen h-24 overflow-hidden">
                        <div 
                          className="relative h-24"
                          style={{ width: `${shuffledDeck.length * 8}px` }} // Dynamic width based on card count
                        >
                          {shuffledDeck.map((card: Card, index: number) => {
                            const totalCards = shuffledDeck.length;
                            const angle = (index - (totalCards - 1) / 2) * 1.2; // 1.2 degrees between cards for mobile shallow arc
                            const radius = 200; // Radius for mobile arc
                            const x = Math.sin((angle * Math.PI) / 180) * radius + (shuffledDeck.length * 4); // Center the arc
                            const y = Math.cos((angle * Math.PI) / 180) * radius * 0.12; // Very shallow curve for mobile
                            
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
                                drag="x"
                                dragElastic={0.1}
                                dragConstraints={{
                                  left: -(shuffledDeck.length * 6),
                                  right: shuffledDeck.length * 6
                                }}
                                draggable={true}
                                onDragStart={(e) => handleDragStart(card, index, e)}
                                onMouseDown={(e) => handleDragStart(card, index, e)}
                                onTouchStart={(e) => handleDragStart(card, index, e)}
                                onMouseMove={handleDragMove}
                                onTouchMove={handleDragMove}
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
                      /* Desktop: Full deck in shallow arc - all 78 cards */
                      <div className="relative w-[1400px] h-32">
                        {shuffledDeck.map((card: Card, index: number) => {
                          const totalCards = shuffledDeck.length;
                          const angle = (index - (totalCards - 1) / 2) * 1.4; // 1.4 degrees between cards for shallow arc
                          const radius = 400; // Large radius for very gentle curve
                          const x = Math.sin((angle * Math.PI) / 180) * radius;
                          const y = Math.cos((angle * Math.PI) / 180) * radius * 0.15; // Very shallow curve
                          
                          return (
                            <motion.div
                              key={`deck-desktop-${index}`}
                              className="absolute w-12 h-18 cursor-grab active:cursor-grabbing"
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
                                transform: `translateX(-50%) translateX(${x}px) translateY(${y - 20}px) rotate(${angle}deg) scale(1.2)`,
                                zIndex: 100,
                                transition: { duration: 0.3, ease: "easeOut" }
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
                            >
                              <div className="w-full h-full bg-gradient-to-br from-primary to-primary/80 rounded-md border border-primary-foreground flex items-center justify-center shadow-md hover:shadow-lg transition-shadow">
                                <div className="text-center">
                                  <div className="w-4 h-4 mx-auto mb-0.5 opacity-60">
                                    <svg viewBox="0 0 24 24" fill="currentColor" className="text-primary-foreground">
                                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                                    </svg>
                                  </div>
                                  <span className="text-xs text-primary-foreground opacity-75">
                                    {index < 10 ? 'Drag' : ''}
                                  </span>
                                </div>
                              </div>
                              {index === 0 && (
                                <div className="absolute -top-3 -right-2 bg-accent text-accent-foreground rounded-full w-5 h-5 text-xs flex items-center justify-center shadow-lg">
                                  {shuffledDeck.length}
                                </div>
                              )}
                            </motion.div>
                          );
                        })}
                        
                        {/* Shuffle button for desktop */}
                        <div className="absolute -bottom-12 left-1/2 transform -translate-x-1/2">
                          <button 
                            onClick={shuffleDeck}
                            className="btn btn-ghost p-3 text-sm flex items-center gap-2 bg-card/90 backdrop-blur-sm rounded-full border border-border hover:bg-card transition-colors shadow-lg"
                            title="Shuffle Deck"
                          >
                            <Shuffle className="h-4 w-4" />
                            <span>Shuffle All {shuffledDeck.length} Cards</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                
                {/* Generate interpretation button for free layout */}
                {selectedLayout?.id === 'free-layout' && selectedCards.length > 0 && !isGeneratingInterpretation && readingStep === 'drawing' && (
                  <div className={`absolute ${isMobile ? 'bottom-4 right-4' : 'bottom-8 right-8'}`}>
                    <button 
                      onClick={() => generateInterpretation()}
                      className="btn btn-primary px-3 md:px-4 py-2 flex items-center text-sm"
                    >
                      <TarotLogo className="mr-1 md:mr-2 h-4 w-4" />
                      <span className="hidden md:inline">Interpret ({selectedCards.length} cards)</span>
                      <span className="md:hidden">Read ({selectedCards.length})</span>
                    </button>
                  </div>
                )}
                
                {/* All cards placed - show interpretation button (predefined layouts) */}
                {selectedLayout?.id !== 'free-layout' && selectedCards.filter((card: any) => card).length === selectedLayout?.card_count && !isGeneratingInterpretation && readingStep === 'drawing' && (
                  <div className={`absolute ${isMobile ? 'bottom-4 right-4' : 'bottom-8 right-8'}`}>
                    <button 
                      onClick={() => generateInterpretation()}
                      className="btn btn-primary px-3 md:px-4 py-2 flex items-center text-sm"
                    >
                      <TarotLogo className="mr-1 md:mr-2 h-4 w-4" />
                      <span className="hidden md:inline">See Interpretation</span>
                      <span className="md:hidden">Read</span>
                    </button>
                  </div>
                )}
                
                {/* Loading indicator for interpretation */}
                {isGeneratingInterpretation && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center backdrop-blur-sm">
                    <div className="bg-card p-4 md:p-6 rounded-xl shadow-lg text-center mx-4">
                      <div className="w-8 h-8 md:w-12 md:h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                      <p className="text-muted-foreground text-sm md:text-base">Generating interpretation...</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Step 3: Interpretation - mobile responsive layout */}
          {readingStep === 'interpretation' && (
            <div className={`absolute inset-0 ${isMobile ? 'flex-col pt-12' : 'flex pt-20'}`}>
              {/* Reading display */}
              <div className={`${isMobile ? (showMobileInterpretation ? 'hidden' : 'flex-1') : 'w-3/5'} relative`}>
                {/* Zoom controls */}
                <div className={`absolute ${isMobile ? 'bottom-2 left-1/2 transform -translate-x-1/2 flex-row' : 'top-4 left-4 flex-col'} flex gap-1 md:gap-2 bg-card/90 backdrop-blur-sm p-1 rounded-md z-40`}>
                  <button onClick={zoomOut} className="p-1 hover:bg-muted rounded-sm" title="Zoom Out">
                    <ZoomOut className="h-4 w-4" />
                  </button>
                  <button onClick={resetZoom} className="p-1 hover:bg-muted rounded-sm" title="Reset Zoom">
                    <RotateCcw className="h-4 w-4" />
                  </button>
                  <button onClick={zoomIn} className="p-1 hover:bg-muted rounded-sm" title="Zoom In">
                    <ZoomIn className="h-4 w-4" />
                  </button>
                </div>
                
                {/* Card layout with zoom applied */}
                <div 
                  className="absolute inset-0 transition-transform duration-300 ease-in-out"
                  style={{
                    transform: `scale(${zoomLevel})`,
                    transformOrigin: 'center center',
                    height: '100%',
                    width: '100%'
                  }}
                >
                  {/* Free layout cards in interpretation */}
                  {selectedLayout?.id === 'free-layout' && selectedCards.map((selectedCard: any, index: number) => (
                    <motion.div
                      key={`free-interp-${index}`}
                      className="relative"
                      onClick={() => {
                        if (selectedCard.revealed) {
                          setActiveCardIndexWrapped(index);
                        } else {
                          handleCardFlip(index);
                        }
                      }}
                      whileHover={{ scale: 1.05 }}
                      animate={activeCardIndex === index ? { scale: 1.1 } : { scale: 1 }}
                      style={{ 
                        position: 'absolute',
                        left: `${selectedCard.x}%`, 
                        top: `${selectedCard.y}%`,
                        transform: 'translate(-50%, -50%)',
                        zIndex: activeCardIndex === index ? 20 : 10 + index
                      }}
                    >
                      <motion.div 
                        className={`${isMobile ? 'w-16 h-24' : 'w-20 h-30 md:w-24 md:h-36'} rounded-md overflow-hidden shadow-lg cursor-pointer transition-shadow ${
                          activeCardIndex === index ? 'ring-2 ring-primary shadow-xl' : ''
                        }`}
                        style={{ 
                          transform: (selectedCard as any).isReversed ? 'rotate(180deg)' : 'none'
                        }}
                        animate={{ 
                          rotateY: (selectedCard as any).revealed ? 0 : 180 
                        }}
                        transition={{ 
                          duration: 0.6, 
                          ease: "easeInOut" 
                        }}
                      >
                        {(selectedCard as any).revealed ? (
                          <img 
                            src={selectedCard.image_url} 
                            alt={selectedCard.name} 
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center border border-primary-foreground">
                            <div 
                              className="text-center"
                              style={{
                                transform: (selectedCard as any).isReversed ? 'rotate(180deg)' : 'none'
                              }}
                            >
                              <div className="w-6 h-6 md:w-8 md:h-8 mx-auto mb-1 opacity-50">
                                <svg viewBox="0 0 24 24" fill="currentColor" className="text-primary-foreground">
                                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15h2v-6h-2v6zm1-8c.83 0 1.5-.67 1.5-1.5S12.83 6 12 6s-1.5.67-1.5 1.5S11.17 9 12 9z"/>
                                </svg>
                              </div>
                              <span className="text-xs text-primary-foreground opacity-75">Click to reveal</span>
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
                          onClick={() => {
                            if ((selectedCard as any).revealed) {
                              setActiveCardIndexWrapped(index);
                            } else {
                              handleCardFlip(index);
                            }
                          }}
                          whileHover={{ scale: 1.05 }}
                          animate={activeCardIndex === index ? { scale: 1.1 } : { scale: 1 }}
                          style={{ 
                            position: 'absolute',
                            left: `${selectedCard.x}%`, 
                            top: `${selectedCard.y}%`,
                            transform: 'translate(-50%, -50%)',
                            zIndex: activeCardIndex === index ? 20 : 10 + index
                          }}
                        >
                          <motion.div 
                            className={`${isMobile ? 'w-16 h-24' : 'w-20 h-30 md:w-24 md:h-36'} rounded-md overflow-hidden shadow-lg cursor-pointer`}
                            style={{ 
                              transform: (selectedCard as any).isReversed ? 'rotate(180deg)' : 'none'
                            }}
                            animate={{ 
                              rotateY: (selectedCard as any).revealed ? 0 : 180 
                            }}
                            transition={{ 
                              duration: 0.6, 
                              ease: "easeInOut" 
                            }}
                          >
                            {(selectedCard as any).revealed ? (
                              <img 
                                src={selectedCard.image_url} 
                                alt={selectedCard.name} 
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center border border-primary-foreground">
                                <div 
                                  className="text-center"
                                  style={{
                                    transform: (selectedCard as any).isReversed ? 'rotate(180deg)' : 'none'
                                  }}
                                >
                                  <div className="w-6 h-6 md:w-8 md:h-8 mx-auto mb-1 opacity-50">
                                    <svg viewBox="0 0 24 24" fill="currentColor" className="text-primary-foreground">
                                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15h2v-6h-2v6zm1-8c.83 0 1.5-.67 1.5-1.5S12.83 6 12 6s-1.5.67-1.5 1.5S11.17 9 12 9z"/>
                                    </svg>
                                  </div>
                                  <span className="text-xs text-primary-foreground opacity-75">Click to reveal</span>
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
                  {isMobile && (
                    <button 
                      onClick={() => setShowMobileInterpretation(true)}
                      className="btn btn-primary px-2 py-1 text-xs flex items-center"
                    >
                      <Menu className="mr-1 h-3 w-3" />
                      Read
                    </button>
                  )}
                  <button 
                    onClick={() => setReadingStepWrapped('drawing')}
                    className={`btn btn-secondary ${isMobile ? 'px-2 py-1 text-xs' : 'px-3 md:px-4 py-1.5 md:py-2 text-sm'}`}
                  >
                    {isMobile ? 'Back' : 'Back to Table'}
                  </button>
                  
                  <button 
                    onClick={resetReading}
                    className={`btn btn-ghost border border-input ${isMobile ? 'px-2 py-1 text-xs' : 'px-3 md:px-4 py-1.5 md:py-2 text-sm'}`}
                  >
                    {isMobile ? 'New' : 'New Reading'}
                  </button>
                </div>
              </div>
              
              {/* Interpretation panel - responsive layout */}
              <div className={`${isMobile ? (showMobileInterpretation ? 'flex-1' : 'hidden') : 'w-2/5'} bg-card ${isMobile ? '' : 'border-l'} border-border flex flex-col h-full`}>
                <div className={`${isMobile ? 'p-2' : 'p-3 md:p-4'} border-b border-border bg-primary/5 flex justify-between items-center`}>
                  <div className="flex items-center">
                    <TarotLogo className={`${isMobile ? 'h-3 w-3' : 'h-4 w-4 md:h-5 md:w-5'} text-primary mr-2`} />
                    <h3 className={`font-medium ${isMobile ? 'text-xs' : 'text-sm md:text-base'}`}>Reading Interpretation</h3>
                  </div>
                  {isMobile && (
                    <button 
                      onClick={() => setShowMobileInterpretation(false)}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <XCircle className="h-4 w-4" />
                    </button>
                  )}
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
                  <div className="prose prose-sm prose-invert max-w-none">
                    {interpretation.split('\n').map((paragraph: string, i: number) => (
                      <p key={i} className={`${isMobile ? 'mb-1 text-xs' : 'mb-2 md:mb-3 text-sm md:text-base'}`}>{paragraph}</p>
                    ))}
                  </div>
                </div>
                
                {/* Card navigation */}
                {selectedCards.length > 1 && (
                  <div className={`${isMobile ? 'p-1' : 'p-2 md:p-3'} border-t border-border flex justify-between items-center`}>
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
                    
                    <div className={`${isMobile ? 'text-xs' : 'text-sm'} text-muted-foreground`}>
                      {(activeCardIndex ?? 0) + 1} of {selectedCards.length} cards
                    </div>
                    
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
                <button 
                  onClick={() => setShowShareModal(false)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <XCircle className="h-5 w-5" />
                </button>
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
                      value={generateShareableLink(sessionId)}
                      readOnly
                      className="flex-1 p-2 text-sm rounded-l-md border border-r-0 border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    <button
                      onClick={copyRoomLink}
                      className="p-2 bg-primary text-primary-foreground rounded-r-md hover:bg-primary/90 transition-colors flex items-center"
                    >
                      {showCopied ? <Check className="h-5 w-5" /> : <Copy className="h-5 w-5" />}
                    </button>
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
    </div>
  );
};

export default ReadingRoom;