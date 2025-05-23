import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, HelpCircle, Share2, Shuffle, Save, XCircle, Video, PhoneCall, Zap, Copy, Check, ChevronLeft, ChevronRight, Info, ZoomIn, ZoomOut, RotateCcw, Menu } from 'lucide-react';
import { Deck, Card, ReadingLayout } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { fetchDeckById, fetchCardsByDeckId } from '../../lib/deck-utils';
import { getReadingInterpretation } from '../../lib/gemini-ai';
import VideoChat from '../../components/video/VideoChat';
import TarotLogo from '../../components/ui/TarotLogo';
import { v4 as uuidv4 } from 'uuid';

// Mock reading layouts
const readingLayouts: ReadingLayout[] = [
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
  
  const [deck, setDeck] = useState<Deck | null>(null);
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [selectedLayout, setSelectedLayout] = useState<ReadingLayout | null>(null);
  const [shuffledDeck, setShuffledDeck] = useState<Card[]>([]);
  const [selectedCards, setSelectedCards] = useState<(Card & { position: string; isReversed: boolean })[]>([]);
  const [question, setQuestion] = useState('');
  
  const [readingStep, setReadingStep] = useState<'setup' | 'drawing' | 'interpretation'>('setup');
  const [interpretation, setInterpretation] = useState('');
  const [isGeneratingInterpretation, setIsGeneratingInterpretation] = useState(false);
  
  // UI State
  const [activeCardIndex, setActiveCardIndex] = useState<number | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showCopied, setShowCopied] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isMobile, setIsMobile] = useState(false);
  const [showMobileInterpretation, setShowMobileInterpretation] = useState(false);
  
  // Video chat state
  const [showVideoChat, setShowVideoChat] = useState(false);
  const [isVideoConnecting, setIsVideoConnecting] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [roomId, setRoomId] = useState<string | null>(null);
  
  // Check for mobile screen size
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  // Function to show the share link modal
  const showShareLinkModal = () => {
    setShowShareModal(true);
  };
  
  // Function to copy room link to clipboard
  const copyRoomLink = () => {
    if (roomId) {
      const shareableLink = generateShareableLink(roomId);
      navigator.clipboard.writeText(shareableLink);
      setShowCopied(true);
      setTimeout(() => setShowCopied(false), 3000);
    }
  };
  
  // Generate a shareable link for the room
  const generateShareableLink = (id: string): string => {
    const baseUrl = window.location.origin;
    return `${baseUrl}/reading-room?join=${id}`;
  };
  
  // Check for join parameter in URL on load
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const joinSessionId = params.get('join');
    
    if (joinSessionId) {
      setSessionId(joinSessionId);
      setRoomId(joinSessionId);
      setShowVideoChat(true);
      
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete('join');
      window.history.replaceState({}, '', newUrl.toString());
    }
  }, [location.search]);
  
  // Create a unique room ID when the component mounts
  useEffect(() => {
    if (!roomId && !sessionId) {
      const newRoomId = uuidv4();
      setRoomId(newRoomId);
    }
  }, [roomId, sessionId]);
  
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
  
  const handleLayoutSelect = (layout: ReadingLayout) => {
    setSelectedLayout(layout);
    setSelectedCards([]);
    setReadingStep('drawing');
    setInterpretation('');
    // Auto-zoom for mobile and complex layouts
    if (isMobile) {
      setZoomLevel(layout.id === 'celtic-cross' ? 0.6 : 0.8);
    } else {
      setZoomLevel(layout.id === 'celtic-cross' ? 0.8 : 1);
    }
  };
  
  const shuffleDeck = () => {
    setShuffledDeck([...shuffledDeck].sort(() => Math.random() - 0.5));
  };
  
  const handleCardSelection = () => {
    if (!selectedLayout || !shuffledDeck.length) return;
    
    const cardsNeeded = selectedLayout.card_count - selectedCards.length;
    if (cardsNeeded <= 0) return;
    
    const newSelectedCards = [...selectedCards];
    
    for (let i = 0; i < cardsNeeded; i++) {
      const position = selectedLayout.positions[newSelectedCards.length];
      const isReversed = Math.random() < 0.2;
      
      newSelectedCards.push({
        ...shuffledDeck[i],
        position: position.name,
        isReversed
      });
    }
    
    setSelectedCards(newSelectedCards);
    setShuffledDeck(shuffledDeck.slice(cardsNeeded));
    
    if (newSelectedCards.length === selectedLayout.card_count) {
      // Auto-generate interpretation when all cards are drawn
      generateInterpretation(newSelectedCards);
    }
  };
  
  const generateInterpretation = async (cards = selectedCards) => {
    if (!deck || !cards.length) return;
    
    try {
      setIsGeneratingInterpretation(true);
      
      const formattedCards = cards.map(card => ({
        name: card.name,
        position: card.position,
        isReversed: card.isReversed
      }));
      
      const result = await getReadingInterpretation(
        question || 'General life guidance',
        formattedCards,
        deck.theme
      );
      
      setInterpretation(result);
      setReadingStep('interpretation');
    } catch (error) {
      console.error('Error generating interpretation:', error);
      setInterpretation('Unable to generate an interpretation at this time. Please try again later.');
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
    setReadingStep('setup');
    setSelectedLayout(null);
    setSelectedCards([]);
    setInterpretation('');
    setShuffledDeck([...cards].sort(() => Math.random() - 0.5));
    setActiveCardIndex(null);
    setZoomLevel(1);
  };
  
  const zoomIn = () => {
    setZoomLevel(prev => Math.min(prev + 0.2, 2));
  };
  
  const zoomOut = () => {
    setZoomLevel(prev => Math.max(prev - 0.2, 0.5));
  };
  
  const resetZoom = () => {
    setZoomLevel(1);
  };
  
  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Preparing reading room...</p>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="h-screen flex flex-col items-center justify-center p-4">
        <div className="text-center max-w-md mx-auto p-6 bg-card border border-border rounded-xl">
          <HelpCircle className="h-16 w-16 text-warning mx-auto mb-4" />
          <h2 className="text-xl md:text-2xl font-serif font-bold mb-4">Something Went Wrong</h2>
          <p className="text-muted-foreground mb-6 text-sm md:text-base">{error}</p>
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
      {/* Header - compact for mobile */}
      <header className="py-2 md:py-3 px-3 md:px-6 border-b border-border flex justify-between items-center bg-background z-10">
        <div className="flex items-center">
          <Link to="/collection" className="inline-flex items-center text-muted-foreground hover:text-foreground mr-2 md:mr-4">
            <ArrowLeft className="mr-1 h-4 w-4" />
            <span className="hidden md:inline">Back</span>
          </Link>
          <div>
            <h1 className="text-lg md:text-xl font-serif font-bold">Reading Room</h1>
            {!isMobile && (
              <p className="text-xs text-muted-foreground">
                {deck?.title ? `Using ${deck.title} by ${deck.creator_name}` : 'Select a deck to begin'}
              </p>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-1 md:gap-2">
          <button 
            onClick={showShareLinkModal}
            className="btn btn-ghost border border-input p-1.5 md:p-2 text-sm flex items-center"
          >
            <Share2 className="h-4 w-4" />
          </button>
          
          <button 
            onClick={() => !isVideoConnecting && !showVideoChat && initiateVideoChat()}
            className={`btn ${showVideoChat ? 'btn-success' : 'btn-secondary'} p-1.5 md:p-2 text-sm flex items-center`}
            disabled={isVideoConnecting}
          >
            {isVideoConnecting ? (
              <span className="h-4 w-4 border-2 border-secondary-foreground border-t-transparent rounded-full animate-spin"></span>
            ) : (
              <PhoneCall className="h-4 w-4" />
            )}
          </button>

          <button className="btn btn-primary p-1.5 md:p-2 text-sm flex items-center">
            <Save className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* Main content - responsive layout */}
      <main className="flex-1 flex overflow-hidden relative">
        {/* Reading table */}
        <div className="flex-1 relative bg-gradient-to-b from-background to-background/80">
          {/* Step 1: Setup Screen */}
          {readingStep === 'setup' && (
            <div className="absolute inset-0 flex items-center justify-center p-4">
              <div className="max-w-md w-full p-4 md:p-6 bg-card border border-border rounded-xl shadow-lg">
                <h2 className="text-lg md:text-xl font-serif font-bold mb-4">Select a Layout</h2>
                
                <div className="space-y-3 mb-4">
                  {readingLayouts.map((layout) => (
                    <div 
                      key={layout.id}
                      className="border rounded-lg p-3 cursor-pointer transition-colors hover:border-primary/50 active:bg-primary/5"
                      onClick={() => handleLayoutSelect(layout)}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="font-medium text-sm md:text-base">{layout.name}</h4>
                        <span className="text-xs bg-muted px-2 py-0.5 rounded-full">
                          {layout.card_count} {layout.card_count === 1 ? 'card' : 'cards'}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">{layout.description}</p>
                    </div>
                  ))}
                </div>
                
                <div className="mb-4">
                  <label htmlFor="question" className="block text-sm font-medium mb-1">
                    Your Question (Optional)
                  </label>
                  <input
                    id="question"
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    placeholder="What would you like guidance on?"
                    className="w-full p-2 text-sm rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>
            </div>
          )}
          
          {/* Step 2: Drawing Cards */}
          {readingStep === 'drawing' && selectedLayout && (
            <div className="absolute inset-0 flex flex-col">
              {/* Reading info bar - compact for mobile */}
              <div className="bg-card border-b border-border p-2 md:p-3 flex justify-between items-center">
                <div className="flex-1 min-w-0">
                  <span className="font-medium text-sm md:text-base truncate block">{selectedLayout.name}</span>
                  {question && !isMobile && (
                    <span className="text-xs text-muted-foreground italic">"{question}"</span>
                  )}
                </div>
                <div className="flex items-center gap-2 md:gap-3 ml-2">
                  <span className="text-xs md:text-sm whitespace-nowrap">
                    {selectedCards.length}/{selectedLayout.card_count}
                  </span>
                  
                  <button 
                    onClick={shuffleDeck}
                    className="btn btn-ghost p-1 text-sm flex items-center"
                  >
                    <Shuffle className="h-4 w-4" />
                  </button>
                  
                  <button 
                    onClick={resetReading}
                    className="btn btn-ghost p-1 text-sm flex items-center text-warning"
                  >
                    <XCircle className="h-4 w-4" />
                  </button>
                </div>
              </div>
              
              {/* Reading table with mobile-friendly zoom controls */}
              <div className="flex-1 relative">
                {/* Zoom controls - repositioned for mobile */}
                <div className={`absolute ${isMobile ? 'bottom-4 left-1/2 transform -translate-x-1/2 flex-row' : 'top-4 left-4 flex-col'} flex gap-2 bg-card/90 backdrop-blur-sm p-1 rounded-md z-50`}>
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
                  {selectedLayout.positions && selectedLayout.positions.map((position, index) => {
                    const selectedCard = selectedCards[index];
                    
                    return (
                      <div 
                        key={position.id}
                        className="absolute transform -translate-x-1/2 -translate-y-1/2"
                        style={{ 
                          left: `${position.x}%`, 
                          top: `${position.y}%`,
                          zIndex: selectedCard ? 10 + index : 1
                        }}
                      >
                        {/* Card position indicator - responsive size */}
                        {!selectedCard && (
                          <div 
                            className={`${isMobile ? 'w-16 h-24' : 'w-20 h-30 md:w-24 md:h-36'} border-2 border-dashed border-muted-foreground/30 rounded-md flex flex-col items-center justify-center`}
                            style={{ transform: position.rotation ? `rotate(${position.rotation}deg)` : 'none' }}
                          >
                            <span className="text-xs text-muted-foreground text-center px-1">{position.name}</span>
                          </div>
                        )}
                        
                        {/* Selected card - responsive size */}
                        {selectedCard && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.5 }}
                            className="relative"
                            onClick={() => setActiveCardIndex(index)}
                          >
                            <div 
                              className={`${isMobile ? 'w-16 h-24' : 'w-20 h-30 md:w-24 md:h-36'} rounded-md overflow-hidden shadow-lg cursor-pointer`}
                              style={{ 
                                transform: selectedCard.isReversed 
                                  ? `rotate(180deg)${position.rotation ? ` rotate(${position.rotation}deg)` : ''}` 
                                  : position.rotation ? `rotate(${position.rotation}deg)` : 'none'
                              }}
                            >
                              <img 
                                src={selectedCard.image_url} 
                                alt={selectedCard.name} 
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 whitespace-nowrap bg-card/80 backdrop-blur-sm px-1 md:px-2 py-0.5 rounded-full text-xs">
                              {isMobile ? position.name.slice(0, 8) + (position.name.length > 8 ? '...' : '') : position.name} {selectedCard.isReversed && '(R)'}
                            </div>
                          </motion.div>
                        )}
                      </div>
                    );
                  })}
                </div>
                
                {/* Deck - responsive positioning */}
                {selectedCards.length < selectedLayout.card_count && (
                  <div 
                    className={`absolute ${isMobile ? 'right-4 bottom-16' : 'right-8 bottom-8'} cursor-pointer`}
                    onClick={handleCardSelection}
                  >
                    <div className={`relative ${isMobile ? 'w-16 h-24' : 'w-20 h-30 md:w-24 md:h-36'}`}>
                      <div className="absolute inset-0 bg-card border border-border rounded-md transform translate-x-1 translate-y-1"></div>
                      <div className="absolute inset-0 bg-card border border-border rounded-md transform translate-x-0.5 translate-y-0.5"></div>
                      <div className="bg-card border border-border rounded-md w-full h-full flex items-center justify-center">
                        <span className="text-xs text-center text-muted-foreground px-1">
                          {isMobile ? 'Tap to Draw' : 'Click to Draw Card'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* All cards drawn - show interpretation button */}
                {selectedCards.length === selectedLayout.card_count && !isGeneratingInterpretation && readingStep === 'drawing' && (
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
            <div className={`absolute inset-0 ${isMobile ? 'flex-col' : 'flex'}`}>
              {/* Reading display */}
              <div className={`${isMobile ? (showMobileInterpretation ? 'hidden' : 'flex-1') : 'w-3/5'} relative`}>
                {/* Zoom controls */}
                <div className={`absolute ${isMobile ? 'bottom-4 left-1/2 transform -translate-x-1/2 flex-row' : 'top-4 left-4 flex-col'} flex gap-2 bg-card/90 backdrop-blur-sm p-1 rounded-md z-50`}>
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
                  {selectedLayout && selectedLayout.positions.map((position, index) => {
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
                          onClick={() => setActiveCardIndex(index)}
                          whileHover={{ scale: 1.05 }}
                          animate={activeCardIndex === index ? { scale: 1.1 } : { scale: 1 }}
                        >
                          <div 
                            className={`${isMobile ? 'w-16 h-24' : 'w-20 h-30 md:w-24 md:h-36'} rounded-md overflow-hidden shadow-lg cursor-pointer transition-shadow ${
                              activeCardIndex === index ? 'ring-2 ring-primary shadow-xl' : ''
                            }`}
                            style={{ 
                              transform: selectedCard.isReversed 
                                ? `rotate(180deg)${position.rotation ? ` rotate(${position.rotation}deg)` : ''}` 
                                : position.rotation ? `rotate(${position.rotation}deg)` : 'none'
                            }}
                          >
                            <img 
                              src={selectedCard.image_url} 
                              alt={selectedCard.name} 
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 whitespace-nowrap bg-card/80 backdrop-blur-sm px-1 md:px-2 py-0.5 rounded-full text-xs">
                            {isMobile ? position.name.slice(0, 8) + (position.name.length > 8 ? '...' : '') : position.name} {selectedCard.isReversed && '(R)'}
                          </div>
                        </motion.div>
                      </div>
                    );
                  })}
                </div>
                
                {/* Reading controls */}
                <div className={`absolute ${isMobile ? 'top-4 right-4' : 'bottom-6 right-6'} flex gap-2 md:gap-3`}>
                  {isMobile && (
                    <button 
                      onClick={() => setShowMobileInterpretation(true)}
                      className="btn btn-primary px-3 py-1.5 text-sm flex items-center"
                    >
                      <Menu className="mr-1 h-4 w-4" />
                      Read
                    </button>
                  )}
                  <button 
                    onClick={() => setReadingStep('drawing')}
                    className="btn btn-secondary px-3 md:px-4 py-1.5 md:py-2 text-sm"
                  >
                    {isMobile ? 'Back' : 'Back to Table'}
                  </button>
                  
                  <button 
                    onClick={resetReading}
                    className="btn btn-ghost border border-input px-3 md:px-4 py-1.5 md:py-2 text-sm"
                  >
                    {isMobile ? 'New' : 'New Reading'}
                  </button>
                </div>
              </div>
              
              {/* Interpretation panel - responsive layout */}
              <div className={`${isMobile ? (showMobileInterpretation ? 'flex-1' : 'hidden') : 'w-2/5'} bg-card ${isMobile ? '' : 'border-l'} border-border flex flex-col h-full`}>
                <div className="p-3 md:p-4 border-b border-border bg-primary/5 flex justify-between items-center">
                  <div className="flex items-center">
                    <TarotLogo className="h-4 w-4 md:h-5 md:w-5 text-primary mr-2" />
                    <h3 className="font-medium text-sm md:text-base">Reading Interpretation</h3>
                  </div>
                  {isMobile && (
                    <button 
                      onClick={() => setShowMobileInterpretation(false)}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <XCircle className="h-5 w-5" />
                    </button>
                  )}
                </div>
                
                <div className="flex-1 p-3 md:p-4 overflow-y-auto">
                  {/* Card information */}
                  {activeCardIndex !== null && selectedCards[activeCardIndex] && (
                    <div className="mb-4 md:mb-6 p-2 md:p-3 bg-muted/30 border border-border rounded-lg">
                      <div className="flex gap-2 md:gap-3">
                        <div className="shrink-0 w-10 h-15 md:w-12 md:h-18 rounded-md overflow-hidden">
                          <img 
                            src={selectedCards[activeCardIndex].image_url} 
                            alt={selectedCards[activeCardIndex].name} 
                            className={`w-full h-full object-cover ${selectedCards[activeCardIndex].isReversed ? 'rotate-180' : ''}`}
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="font-medium text-sm md:text-base">{selectedCards[activeCardIndex].name} {selectedCards[activeCardIndex].isReversed && '(Reversed)'}</h4>
                          <p className="text-xs text-accent mb-1">{selectedCards[activeCardIndex].position}</p>
                          <p className="text-xs text-muted-foreground">{selectedCards[activeCardIndex].description}</p>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Interpretation text */}
                  <div className="prose prose-sm prose-invert max-w-none">
                    {interpretation.split('\n').map((paragraph, i) => (
                      <p key={i} className="mb-2 md:mb-3 text-sm md:text-base">{paragraph}</p>
                    ))}
                  </div>
                </div>
                
                {/* Card navigation */}
                {selectedCards.length > 1 && (
                  <div className="p-2 md:p-3 border-t border-border flex justify-between items-center">
                    <button 
                      onClick={() => setActiveCardIndex(prev => prev !== null && prev > 0 ? prev - 1 : selectedCards.length - 1)}
                      className="btn btn-ghost p-1"
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </button>
                    
                    <div className="text-sm text-muted-foreground">
                      {activeCardIndex !== null ? activeCardIndex + 1 : 1} of {selectedCards.length} cards
                    </div>
                    
                    <button 
                      onClick={() => setActiveCardIndex(prev => prev !== null && prev < selectedCards.length - 1 ? prev + 1 : 0)}
                      className="btn btn-ghost p-1"
                    >
                      <ChevronRight className="h-5 w-5" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
      
      {/* Video chat overlay - mobile responsive */}
      <AnimatePresence>
        {showVideoChat && (
          <motion.div 
            className={`absolute ${isMobile ? 'top-14 right-2 w-40 h-30' : 'top-16 right-4 w-1/4 h-1/3 min-w-[300px] min-h-[200px]'} bg-card shadow-xl border border-border rounded-xl overflow-hidden z-20`}
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
          >
            <div className="absolute top-1 right-1 z-30">
              <button 
                onClick={() => setShowVideoChat(false)}
                className="bg-background/80 p-0.5 md:p-1 rounded-full text-muted-foreground hover:text-foreground"
              >
                <XCircle className="h-4 w-4 md:h-5 md:w-5" />
              </button>
            </div>
            <VideoChat 
              onClose={() => setShowVideoChat(false)}
              sessionId={sessionId}
            />
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Share Room Modal - mobile responsive */}
      <AnimatePresence>
        {showShareModal && roomId && (
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
                </p>
                
                <div className="mb-6">
                  <label htmlFor="roomLink" className="block text-sm font-medium mb-2">
                    Room Invitation Link
                  </label>
                  <div className="flex">
                    <input
                      id="roomLink"
                      type="text"
                      value={generateShareableLink(roomId)}
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
    </div>
  );
};

export default ReadingRoom;