import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Shuffle, Save, Info, RotateCcw, Zap, BookOpen, Search, X, ChevronLeft, ChevronRight, HelpCircle, Settings, ChevronRight as ChevronRightIcon, Check } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { fetchDeckById, fetchCardsByDeckId } from '../../lib/deck-utils';
import { 
  DndContext, 
  useSensor, 
  useSensors, 
  MouseSensor, 
  TouchSensor, 
  DragOverlay, 
  DragStartEvent, 
  DragEndEvent,
  useDraggable,
  useDroppable
} from '@dnd-kit/core';
import { restrictToWindowEdges } from '@dnd-kit/modifiers';
import { Card as CardType, ReadingLayout } from '../../types';
import TarotLogo from '../../components/ui/TarotLogo';

// Spread layouts
const readingLayouts: ReadingLayout[] = [
  {
    id: 'three-card',
    name: 'Three Card Spread',
    description: 'Past, Present, Future reading to understand your current situation',
    card_count: 3,
    positions: [
      { id: 0, name: 'Past', meaning: 'Represents influences from the past that led to your current situation', x: 25, y: 40 },
      { id: 1, name: 'Present', meaning: 'Shows the current situation and energies surrounding your question', x: 50, y: 40 },
      { id: 2, name: 'Future', meaning: 'Potential outcome based on the current path you are on', x: 75, y: 40 }
    ]
  },
  {
    id: 'single-card',
    name: 'Single Card',
    description: 'Quick guidance for your day or a specific question',
    card_count: 1,
    positions: [
      { id: 0, name: 'Guidance', meaning: 'Offers insight or guidance for your question', x: 50, y: 40 }
    ]
  },
  {
    id: 'cross',
    name: 'Simple Cross',
    description: 'A focused insight into a specific situation',
    card_count: 5,
    positions: [
      { id: 0, name: 'Center', meaning: 'The core of the situation', x: 50, y: 40 },
      { id: 1, name: 'Above', meaning: 'What crowns the situation', x: 50, y: 20 },
      { id: 2, name: 'Below', meaning: 'The foundation', x: 50, y: 60 },
      { id: 3, name: 'Left', meaning: 'Past influence', x: 30, y: 40 },
      { id: 4, name: 'Right', meaning: 'Future direction', x: 70, y: 40 }
    ]
  },
  {
    id: 'celtic-cross',
    name: 'Celtic Cross',
    description: 'Comprehensive reading for deep understanding',
    card_count: 10,
    positions: [
      { id: 0, name: 'Present', meaning: 'The current situation or influence', x: 35, y: 40 },
      { id: 1, name: 'Challenge', meaning: 'What crosses or challenges the situation', x: 35, y: 40, rotation: 90 },
      { id: 2, name: 'Foundation', meaning: 'The basis or foundation of the situation', x: 35, y: 70 },
      { id: 3, name: 'Past', meaning: 'Recent past influences', x: 35, y: 10 },
      { id: 4, name: 'Crown', meaning: 'The best outcome that could happen', x: 15, y: 40 },
      { id: 5, name: 'Future', meaning: 'The immediate future', x: 55, y: 40 },
      { id: 6, name: 'Self', meaning: 'Your attitude or approach', x: 75, y: 15 },
      { id: 7, name: 'Environment', meaning: "Others' attitudes or external influences", x: 75, y: 35 },
      { id: 8, name: 'Hopes/Fears', meaning: 'Your hopes and fears regarding the outcome', x: 75, y: 55 },
      { id: 9, name: 'Outcome', meaning: 'The final outcome', x: 75, y: 75 }
    ]
  }
];

// Setup stages
type SetupStage = 'selectLayout' | 'enterQuestion' | 'reading';

// Reading card placement type
interface PlacedCard extends CardType {
  positionId: number;
  isFlipped: boolean;
  isReversed: boolean;
}

// Draggable Card Component
function DraggableCard({ card, index }: { card: CardType; index: number }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: card.id,
    data: { card }
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`flex-shrink-0 cursor-grab ${isDragging ? 'opacity-30' : ''}`}
      style={{
        zIndex: 10 + index,
        touchAction: 'none' // Prevents scrolling while dragging on touch devices
      }}
    >
      <div 
        className="w-20 h-30 md:w-24 md:h-36 rounded-lg shadow-md transform 
          transition-transform hover:translate-y-[-8px] hover:shadow-lg 
          relative border border-border"
        style={{
          backgroundImage: `url('/tarot-icon.svg')`,
          backgroundRepeat: 'repeat',
          backgroundSize: '24px',
          backgroundPosition: 'center',
          // Each card in the fan has a slight offset and rotation
          transform: `rotate(${index % 2 === 0 ? '-' : ''}${Math.min(index * 0.5, 5)}deg)`,
          marginLeft: index > 0 ? `-${60}px` : '0',
        }}
      >
        {/* Card back pattern */}
        <div className="absolute inset-0 bg-primary/10 rounded-lg"></div>
      </div>
    </div>
  );
}

// Droppable Position Component
function DroppablePosition({ 
  position, 
  hasCard, 
  children 
}: { 
  position: { id: number; name: string; meaning: string; x: number; y: number; rotation?: number }; 
  hasCard: boolean;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `position-${position.id}`,
    disabled: hasCard
  });

  return (
    <div
      ref={setNodeRef}
      className={`absolute transform -translate-x-1/2 -translate-y-1/2 transition-all duration-300 z-10`}
      style={{
        left: `${position.x}%`,
        top: `${position.y}%`,
      }}
    >
      <div className={`transition-all duration-300 ${isOver ? 'scale-110' : ''}`}>
        {children}
      </div>
    </div>
  );
}

// Card Gallery Component
function CardGallery({ 
  cards, 
  onSelectCard 
}: { 
  cards: CardType[]; 
  onSelectCard: (card: CardType) => void 
}) {
  const [currentPage, setCurrentPage] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const cardsPerPage = 12;
  
  // Filter cards based on search and category
  const filteredCards = cards.filter(card => {
    const matchesSearch = searchQuery ? 
      card.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      (card.description && card.description.toLowerCase().includes(searchQuery.toLowerCase())) :
      true;
      
    const matchesCategory = selectedCategory ? 
      (selectedCategory === 'major' && card.card_type === 'major') ||
      (selectedCategory === 'minor' && card.card_type === 'minor') ||
      (card.suit === selectedCategory) :
      true;
      
    return matchesSearch && matchesCategory;
  });
  
  // Calculate pagination
  const totalPages = Math.ceil(filteredCards.length / cardsPerPage);
  const displayedCards = filteredCards.slice(
    currentPage * cardsPerPage, 
    (currentPage + 1) * cardsPerPage
  );
  
  // Categories for filtering
  const categories = [
    { id: 'major', name: 'Major Arcana' },
    { id: 'minor', name: 'Minor Arcana' },
    { id: 'wands', name: 'Wands' },
    { id: 'cups', name: 'Cups' },
    { id: 'swords', name: 'Swords' },
    { id: 'pentacles', name: 'Pentacles' }
  ];

  return (
    <div className="bg-card border border-border rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-medium">Card Browser</h2>
        <div className="relative">
          <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search cards..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(0); // Reset to first page when searching
            }}
            className="pl-7 pr-3 py-1.5 text-xs bg-muted/20 rounded-md border border-input focus:outline-none focus:ring-1 focus:ring-primary w-40"
          />
        </div>
      </div>
      
      {/* Category filters */}
      <div className="flex overflow-x-auto pb-2 mb-4 gap-1.5">
        <button
          onClick={() => {
            setSelectedCategory(null);
            setCurrentPage(0);
          }}
          className={`px-2.5 py-1 rounded-md text-xs whitespace-nowrap ${
            selectedCategory === null ? 'bg-primary text-primary-foreground' : 'bg-muted/20 hover:bg-muted/30'
          }`}
        >
          All Cards
        </button>
        {categories.map(category => (
          <button
            key={category.id}
            onClick={() => {
              setSelectedCategory(category.id);
              setCurrentPage(0);
            }}
            className={`px-2.5 py-1 rounded-md text-xs whitespace-nowrap ${
              selectedCategory === category.id ? 'bg-primary text-primary-foreground' : 'bg-muted/20 hover:bg-muted/30'
            }`}
          >
            {category.name}
          </button>
        ))}
      </div>
      
      {/* Cards grid */}
      {displayedCards.length > 0 ? (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-4">
            {displayedCards.map((card) => (
              <div 
                key={card.id} 
                className="cursor-pointer group"
                onClick={() => onSelectCard(card)}
              >
                <div className="aspect-[2/3] rounded-lg overflow-hidden border border-border shadow-sm group-hover:shadow-md transition-all group-hover:scale-105 group-hover:border-primary/50">
                  <img 
                    src={card.image_url} 
                    alt={card.name} 
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </div>
                <p className="mt-0.5 text-xs text-center truncate">{card.name}</p>
              </div>
            ))}
          </div>
          
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-between items-center">
              <button
                onClick={() => setCurrentPage(prev => Math.max(0, prev - 1))}
                disabled={currentPage === 0}
                className="p-1 rounded-md disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              
              <span className="text-xs">
                Page {currentPage + 1} of {totalPages}
              </span>
              
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages - 1, prev + 1))}
                disabled={currentPage === totalPages - 1}
                className="p-1 rounded-md disabled:opacity-40"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-6">
          <p className="text-sm">No cards match your search criteria</p>
          <button
            onClick={() => {
              setSearchQuery('');
              setSelectedCategory(null);
              setCurrentPage(0);
            }}
            className="mt-2 text-xs text-primary hover:underline"
          >
            Clear filters
          </button>
        </div>
      )}
    </div>
  );
}

const InteractiveReadingRoom = () => {
  const { deckId } = useParams<{ deckId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // States
  const [deck, setDeck] = useState<any>(null);
  const [cards, setCards] = useState<CardType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [setupStage, setSetupStage] = useState<SetupStage>('selectLayout');
  const [selectedLayout, setSelectedLayout] = useState<ReadingLayout | null>(null);
  const [placedCards, setPlacedCards] = useState<PlacedCard[]>([]);
  const [currentDeck, setCurrentDeck] = useState<CardType[]>([]);
  const [activeCardId, setActiveCardId] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showCardBrowser, setShowCardBrowser] = useState(false);
  const [question, setQuestion] = useState('');
  const [visibleDeckSize, setVisibleDeckSize] = useState(8); // Number of cards visible in the deck UI
  const [selectedCardDetails, setSelectedCardDetails] = useState<CardType | null>(null);
  
  // References
  const spreadAreaRef = useRef<HTMLDivElement>(null);
  
  // Configure sensors for drag and drop
  const sensors = useSensors(
    useSensor(MouseSensor, {
      // Lower activation constraint for easier dragging
      activationConstraint: {
        distance: 5,
      }
    }),
    useSensor(TouchSensor, {
      // Configure touch sensor for mobile devices
      activationConstraint: {
        delay: 250,
        tolerance: 5,
      }
    })
  );
  
  // Load deck and cards
  useEffect(() => {
    const loadDeckData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Fetch deck data
        const deckData = await fetchDeckById(deckId || 'rider-waite-classic');
        
        if (deckData) {
          setDeck(deckData);
          
          // Fetch cards for this deck
          const cardsData = await fetchCardsByDeckId(deckData.id);
          
          if (cardsData && cardsData.length > 0) {
            setCards(cardsData);
            
            // Initialize with a shuffled copy
            setCurrentDeck(shuffleArray([...cardsData]));
          } else {
            throw new Error("No cards found for this deck");
          }
        } else {
          throw new Error("Deck not found");
        }
        
        setLoading(false);
      } catch (error: any) {
        console.error('Error loading deck data:', error);
        setError(error.message || "Failed to load the deck");
        setLoading(false);
      }
    };
    
    loadDeckData();
  }, [deckId]);
  
  // Helper function to shuffle the array
  const shuffleArray = (array: CardType[]) => {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
  };
  
  // Handle layout selection
  const selectLayout = (layout: ReadingLayout) => {
    setSelectedLayout(layout);
    setSetupStage('enterQuestion');
  };
  
  // Start a new reading
  const startReading = () => {
    if (!selectedLayout) return;
    
    // Reset the reading
    setPlacedCards([]);
    
    // Shuffle the deck
    setCurrentDeck(shuffleArray([...cards]));
    
    // Start the reading
    setSetupStage('reading');
    setShowCardBrowser(false); // Close card browser if open
  };
  
  // Go back to previous step
  const goBack = () => {
    if (setupStage === 'enterQuestion') {
      setSetupStage('selectLayout');
    } else if (setupStage === 'reading') {
      // Show confirmation modal before going back
      if (window.confirm("This will reset your current reading. Are you sure?")) {
        setSetupStage('enterQuestion');
        setPlacedCards([]);
      }
    }
  };
  
  // Reset the reading
  const resetReading = () => {
    setPlacedCards([]);
    setCurrentDeck(shuffleArray([...cards]));
  };
  
  // Handle drag start
  const handleDragStart = (event: DragStartEvent) => {
    setActiveCardId(event.active.id as string);
  };
  
  // Handle drag end
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveCardId(null);
    
    // If dropped over a valid position
    if (over && over.id.toString().startsWith('position-')) {
      const positionId = parseInt(over.id.toString().replace('position-', ''), 10);
      
      // Check if position already has a card
      const existingCard = placedCards.find(card => card.positionId === positionId);
      if (existingCard) return;
      
      // Find the card being dragged
      const cardId = active.id as string;
      const draggedCard = currentDeck.find(card => card.id === cardId);
      
      if (draggedCard) {
        // Determine if card should be reversed (20% chance)
        const isReversed = Math.random() < 0.2;
        
        // Add card to placed cards
        setPlacedCards(prev => [...prev, {
          ...draggedCard,
          positionId,
          isFlipped: false,
          isReversed
        }]);
        
        // Remove card from deck
        setCurrentDeck(prev => prev.filter(card => card.id !== cardId));
      }
    }
  };
  
  // Handle card flipping
  const flipCard = (cardId: string) => {
    setPlacedCards(prev => 
      prev.map(card => 
        card.id === cardId 
          ? { ...card, isFlipped: !card.isFlipped } 
          : card
      )
    );
  };
  
  // Select card from the browser
  const selectCardFromBrowser = (card: CardType) => {
    // First check if there are any empty positions
    if (!selectedLayout) return;
    
    const filledPositionIds = placedCards.map(card => card.positionId);
    const emptyPositions = selectedLayout.positions.filter(pos => 
      !filledPositionIds.includes(pos.id)
    );
    
    if (emptyPositions.length > 0) {
      // Place the card in the first empty position
      const positionId = emptyPositions[0].id;
      
      // Determine if card should be reversed (20% chance)
      const isReversed = Math.random() < 0.2;
      
      // Add card to placed cards
      setPlacedCards(prev => [...prev, {
        ...card,
        positionId,
        isFlipped: false,
        isReversed
      }]);
      
      // Remove card from current deck if it's there
      setCurrentDeck(prev => prev.filter(c => c.id !== card.id));
      
      // Show a brief message or effect to indicate success
      setShowCardBrowser(false); // Close browser after selection
    }
  };
  
  // Show card details
  const showCardDetails = (card: CardType) => {
    setSelectedCardDetails(card);
  };
  
  // Change spread
  const changeSpread = () => {
    // Show confirmation if there are placed cards
    if (placedCards.length > 0) {
      if (window.confirm("Changing the spread will reset your current reading. Continue?")) {
        setSetupStage('selectLayout');
        setPlacedCards([]);
      }
    } else {
      setSetupStage('selectLayout');
    }
  };
  
  // Find active card
  const activeCard = activeCardId 
    ? currentDeck.find(card => card.id === activeCardId) 
    : null;

  if (loading) {
    return (
      <div className="min-h-screen pt-16 pb-20 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading your reading room...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen pt-16 pb-20 flex flex-col items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6 bg-card border border-border rounded-xl">
          <Info className="h-16 w-16 text-warning mx-auto mb-4" />
          <h2 className="text-2xl font-serif font-bold mb-4">Something Went Wrong</h2>
          <p className="text-muted-foreground mb-6">{error}</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
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
  
  // Render based on the current setup stage
  if (setupStage === 'selectLayout') {
    return (
      <div className="min-h-screen pt-16 pb-20">
        <div className="container mx-auto px-4 py-4">
          <Link to="/collection" className="inline-flex items-center text-muted-foreground hover:text-foreground">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Link>
          
          <div className="max-w-4xl mx-auto mt-8">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-serif font-bold mb-2">Interactive Tarot Reading</h1>
              <p className="text-muted-foreground">
                Using {deck?.title || 'Tarot Deck'} by {deck?.creator_name || 'Unknown Creator'}
              </p>
              
              {/* Step indicator */}
              <div className="flex items-center justify-center mt-6">
                <div className="flex items-center">
                  <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center">1</div>
                  <div className="text-xs font-medium ml-2">Select Spread</div>
                </div>
                <div className="w-8 h-0.5 bg-muted mx-2"></div>
                <div className="flex items-center">
                  <div className="w-8 h-8 rounded-full bg-muted text-muted-foreground flex items-center justify-center">2</div>
                  <div className="text-xs text-muted-foreground ml-2">Add Question</div>
                </div>
                <div className="w-8 h-0.5 bg-muted mx-2"></div>
                <div className="flex items-center">
                  <div className="w-8 h-8 rounded-full bg-muted text-muted-foreground flex items-center justify-center">3</div>
                  <div className="text-xs text-muted-foreground ml-2">Reading</div>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {readingLayouts.map((layout) => (
                <motion.div
                  key={layout.id}
                  whileHover={{ y: -5, boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)' }}
                  className="bg-card border border-border rounded-xl overflow-hidden"
                >
                  <div className="aspect-[3/2] bg-gradient-to-br from-primary/5 to-accent/5 p-6 flex items-center justify-center">
                    <div className="relative">
                      {/* Visual representation of layout */}
                      {layout.positions.map((position) => (
                        <div 
                          key={position.id}
                          className="absolute w-12 h-16 bg-card/50 backdrop-blur-sm border border-primary/20 rounded-md shadow-sm"
                          style={{ 
                            left: `${(position.x - 50) * 1.8}px`, 
                            top: `${(position.y - 40) * 1.8}px`,
                            transform: position.rotation ? `translate(-50%, -50%) rotate(${position.rotation}deg)` : 'translate(-50%, -50%)'
                          }}
                        ></div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="p-4">
                    <h2 className="font-medium text-xl mb-1">{layout.name}</h2>
                    <p className="text-sm text-muted-foreground mb-3">{layout.description}</p>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                        {layout.card_count} cards
                      </span>
                      
                      <button 
                        onClick={() => selectLayout(layout)}
                        className="btn btn-primary py-1.5 px-4 text-sm flex items-center"
                      >
                        Select
                        <ChevronRightIcon className="h-4 w-4 ml-1" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  if (setupStage === 'enterQuestion') {
    return (
      <div className="min-h-screen pt-16 pb-20">
        <div className="container mx-auto px-4 py-4">
          <button 
            onClick={goBack} 
            className="inline-flex items-center text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Layouts
          </button>
          
          <div className="max-w-2xl mx-auto mt-8">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-serif font-bold mb-2">Enter Your Question</h1>
              <p className="text-muted-foreground">
                Focus on what you'd like guidance about (optional)
              </p>
              
              {/* Step indicator */}
              <div className="flex items-center justify-center mt-6">
                <div className="flex items-center">
                  <div className="w-8 h-8 rounded-full bg-success text-success-foreground flex items-center justify-center">
                    <Check className="h-4 w-4" />
                  </div>
                  <div className="text-xs font-medium ml-2">Select Spread</div>
                </div>
                <div className="w-8 h-0.5 bg-primary mx-2"></div>
                <div className="flex items-center">
                  <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center">2</div>
                  <div className="text-xs font-medium ml-2">Add Question</div>
                </div>
                <div className="w-8 h-0.5 bg-muted mx-2"></div>
                <div className="flex items-center">
                  <div className="w-8 h-8 rounded-full bg-muted text-muted-foreground flex items-center justify-center">3</div>
                  <div className="text-xs text-muted-foreground ml-2">Reading</div>
                </div>
              </div>
            </div>
            
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="p-6">
                {/* Selected layout info */}
                <div className="mb-6 p-4 bg-muted/20 rounded-lg">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-medium">{selectedLayout?.name}</h3>
                      <p className="text-sm text-muted-foreground mt-1">{selectedLayout?.description}</p>
                    </div>
                    <div className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                      {selectedLayout?.card_count} cards
                    </div>
                  </div>
                </div>
                
                {/* Question input */}
                <div className="mb-6">
                  <label htmlFor="question" className="block text-sm font-medium mb-2">
                    Your Question (Optional)
                  </label>
                  <textarea
                    id="question"
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    placeholder="What would you like guidance on? For example: 'What do I need to know about my career path?'"
                    className="w-full p-3 rounded-md border border-input bg-card focus:outline-none focus:ring-2 focus:ring-primary resize-none h-32"
                  ></textarea>
                  <p className="text-xs text-muted-foreground mt-2">
                    A clear question helps focus your reading, but you can also proceed without one for general guidance.
                  </p>
                </div>
                
                <div className="flex justify-between">
                  <button
                    onClick={goBack}
                    className="btn btn-ghost border border-input py-2 px-4"
                  >
                    Back
                  </button>
                  
                  <button
                    onClick={startReading}
                    className="btn btn-primary py-2 px-6 flex items-center"
                  >
                    Begin Reading
                    <Zap className="ml-2 h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  // Main reading view
  return (
    <div className="min-h-screen pt-16 pb-20 flex flex-col">
      {/* Header */}
      <div className="container mx-auto px-4 py-2">
        <Link to="/collection" className="inline-flex items-center text-muted-foreground hover:text-foreground">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Exit Reading
        </Link>
        
        <div className="flex justify-between items-center mt-2 mb-4">
          <div>
            <h1 className="text-xl font-serif font-bold">{selectedLayout?.name || 'Tarot Reading'}</h1>
            <p className="text-muted-foreground text-xs">
              {deck?.title ? `Using ${deck.title}` : 'Interactive Tarot Experience'}
              {question && <span className="ml-2 italic">"{question.length > 30 ? question.substring(0, 30) + '...' : question}"</span>}
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="hidden md:flex items-center gap-2">
              <button 
                onClick={() => setShowCardBrowser(true)}
                className="btn btn-secondary py-1 px-2.5 text-xs"
              >
                <Search className="mr-1.5 h-3.5 w-3.5" />
                Browse Cards
              </button>
              <button 
                onClick={changeSpread}
                className="btn btn-ghost border border-input py-1 px-2.5 text-xs"
              >
                <Settings className="mr-1.5 h-3.5 w-3.5" />
                Change Spread
              </button>
              <button 
                onClick={resetReading}
                className="btn btn-ghost border border-input py-1 px-2.5 text-xs"
              >
                <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                Reset
              </button>
            </div>
            
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="md:hidden btn btn-ghost border border-input p-1.5 rounded-md"
            >
              <Settings className="h-5 w-5" />
            </button>
          </div>
        </div>
        
        {/* Mobile settings panel */}
        <AnimatePresence>
          {showSettings && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="md:hidden overflow-hidden mb-2"
            >
              <div className="bg-card border border-border rounded-lg p-3 flex items-center justify-between gap-2">
                <button 
                  onClick={() => setShowCardBrowser(true)}
                  className="btn btn-secondary py-1 px-2 text-xs flex-1"
                >
                  <Search className="mr-1 h-3.5 w-3.5" />
                  Browse Cards
                </button>
                <button 
                  onClick={changeSpread}
                  className="btn btn-ghost border border-input py-1 px-2 text-xs flex-1"
                >
                  <Settings className="mr-1 h-3.5 w-3.5" />
                  Change Spread
                </button>
                <button 
                  onClick={resetReading}
                  className="btn btn-ghost border border-input py-1 px-2 text-xs flex-1"
                >
                  <RotateCcw className="mr-1 h-3.5 w-3.5" />
                  Reset
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      
      <div className="container mx-auto px-4 flex-grow flex flex-col">
        {/* Spread Positions Explainer */}
        <div className="bg-muted/10 border border-border rounded-lg p-3 mb-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium flex items-center">
              <Info className="h-4 w-4 mr-2 text-primary" />
              {selectedLayout?.name} Positions
            </h2>
            
            <div className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
              {placedCards.length}/{selectedLayout?.card_count} cards placed
            </div>
          </div>
          
          <div className="mt-2 flex flex-wrap gap-2">
            {selectedLayout?.positions.map((pos) => {
              const cardInPosition = placedCards.find(card => card.positionId === pos.id);
              return (
                <div 
                  key={pos.id} 
                  className={`px-2 py-1 rounded text-xs ${
                    cardInPosition 
                      ? 'bg-success/10 border border-success/30'
                      : 'bg-muted/10 border border-muted'
                  }`}
                  title={pos.meaning}
                >
                  {pos.name}
                  {cardInPosition && <span className="ml-1 text-success">✓</span>}
                </div>
              );
            })}
          </div>
        </div>
      
        <DndContext
          sensors={sensors}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          modifiers={[restrictToWindowEdges]}
        >
          {/* Reading spread area */}
          <div
            ref={spreadAreaRef}
            className="flex-grow relative bg-card/50 border border-border rounded-lg mb-3 min-h-[60vh]"
          >
            {/* Spread positions */}
            {selectedLayout && (
              <div className="absolute inset-0">
                {selectedLayout.positions.map((position) => {
                  const cardInPosition = placedCards.find(card => card.positionId === position.id);
                  
                  return (
                    <DroppablePosition 
                      key={position.id} 
                      position={position}
                      hasCard={!!cardInPosition}
                    >
                      {/* Position indicator - shown when empty */}
                      {!cardInPosition && (
                        <div 
                          className="w-24 h-36 md:w-32 md:h-48 rounded-lg border-2 border-dashed border-primary/50 
                            flex flex-col items-center justify-center bg-primary/5 cursor-pointer transition-all
                            hover:border-primary hover:bg-primary/10"
                        >
                          <div className="p-2 bg-background/80 backdrop-blur-sm rounded-lg shadow-sm">
                            <p className="font-medium text-xs">{position.name}</p>
                          </div>
                        </div>
                      )}
                      
                      {/* Card in position */}
                      {cardInPosition && (
                        <div className="perspective-600px" onClick={() => flipCard(cardInPosition.id)}>
                          <motion.div 
                            className="relative w-24 h-36 md:w-32 md:h-48 rounded-lg shadow-xl cursor-pointer preserve-3d"
                            animate={{ rotateY: cardInPosition.isFlipped ? 180 : 0 }}
                            transition={{ duration: 0.6, ease: "easeInOut" }}
                            style={{
                              transformStyle: "preserve-3d",
                              transform: cardInPosition.isReversed ? "rotate(180deg)" : "rotate(0deg)"
                            }}
                          >
                            {/* Card back */}
                            <div
                              className="absolute w-full h-full rounded-lg border border-border bg-primary/10 backface-hidden"
                              style={{
                                backgroundImage: `url('/tarot-icon.svg')`,
                                backgroundRepeat: 'repeat',
                                backgroundSize: '50px',
                                backgroundPosition: 'center',
                                backfaceVisibility: "hidden"
                              }}
                            ></div>
                            
                            {/* Card front */}
                            <div
                              className="absolute w-full h-full rounded-lg border border-border overflow-hidden backface-hidden"
                              style={{
                                transform: "rotateY(180deg)",
                                backfaceVisibility: "hidden",
                              }}
                            >
                              <img 
                                src={cardInPosition.image_url} 
                                alt={cardInPosition.name} 
                                className="w-full h-full object-cover"
                              />
                            </div>
                          </motion.div>
                          
                          {/* Position badge */}
                          <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 bg-background border border-border px-2 py-0.5 rounded-full text-xs shadow-sm">
                            {position.name}
                          </div>
                        </div>
                      )}
                    </DroppablePosition>
                  );
                })}
              </div>
            )}
          </div>
          
          {/* Card info panel - shows when a card is flipped */}
          {placedCards.some(card => card.isFlipped) && (
            <div className="bg-card border border-border rounded-lg p-3 mb-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {placedCards.filter(card => card.isFlipped).map((card) => {
                  const position = selectedLayout?.positions.find(pos => pos.id === card.positionId);
                  return (
                    <div key={card.id} className="flex gap-3">
                      <div className="w-12 h-18 md:w-16 md:h-24 rounded-lg overflow-hidden flex-shrink-0 border border-border">
                        <img 
                          src={card.image_url} 
                          alt={card.name} 
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-medium text-sm">{card.name}</h3>
                            <p className="text-xs text-primary">{position?.name} {card.isReversed && '(Reversed)'}</p>
                          </div>
                          <button 
                            onClick={() => flipCard(card.id)}
                            className="text-xs text-muted-foreground hover:text-foreground"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-3">{card.description}</p>
                        <button 
                          onClick={() => showCardDetails(card)}
                          className="text-xs text-primary hover:underline mt-1"
                        >
                          View More
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          
          {/* Card deck */}
          <div className="bg-card/90 border border-border rounded-lg p-3">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-sm font-medium">Deck</h3>
              <div className="flex items-center space-x-2">
                <button 
                  onClick={() => setCurrentDeck(shuffleArray([...currentDeck]))}
                  className="btn btn-ghost text-xs py-1 px-2 flex items-center"
                >
                  <Shuffle className="h-3 w-3 mr-1" />
                  Shuffle
                </button>
                <button 
                  onClick={() => setShowCardBrowser(true)}
                  className="btn btn-secondary text-xs py-1 px-2 flex items-center"
                >
                  <Search className="h-3 w-3 mr-1" />
                  Browse All
                </button>
              </div>
            </div>
            
            {/* Card Stack - Fan Display */}
            <div className="overflow-x-auto pb-2">
              <div className="flex min-h-32 pl-2 pr-16">
                {currentDeck.length > 0 ? (
                  <div className="flex items-center relative fan-container">
                    {/* Display visible cards in fan layout */}
                    {currentDeck.slice(0, Math.min(currentDeck.length, visibleDeckSize)).map((card, index) => (
                      <DraggableCard key={card.id} card={card} index={index} />
                    ))}
                    
                    {/* Indicator for more cards */}
                    {currentDeck.length > visibleDeckSize && (
                      <div className="absolute -right-16 top-1/2 transform -translate-y-1/2 text-xs text-muted-foreground">
                        +{currentDeck.length - visibleDeckSize} more
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="w-24 h-36 rounded-lg border border-dashed border-muted-foreground flex items-center justify-center bg-muted/10">
                    <p className="text-xs text-muted-foreground text-center px-2">No more cards in the deck</p>
                  </div>
                )}
              </div>
            </div>
            
            <div className="text-xs text-muted-foreground text-center mt-1">
              Drag cards from the deck to the outlined positions in the spread
            </div>
          </div>
          
          {/* Drag overlay */}
          <DragOverlay>
            {activeCardId && activeCard && (
              <div className="w-24 h-36 rounded-lg shadow-xl">
                <img 
                  src={activeCard.image_url} 
                  alt={activeCard.name} 
                  className="w-full h-full object-cover rounded-lg"
                />
              </div>
            )}
          </DragOverlay>
        </DndContext>
      </div>
      
      {/* Card Browser Modal */}
      <AnimatePresence>
        {showCardBrowser && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={() => setShowCardBrowser(false)}>
            <motion.div
              className="bg-card rounded-xl overflow-hidden max-w-5xl w-full max-h-[90vh]"
              onClick={(e) => e.stopPropagation()}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ type: "spring", duration: 0.4 }}
            >
              <div className="p-3 border-b border-border flex justify-between items-center">
                <h2 className="font-medium">Browse All Cards</h2>
                <button onClick={() => setShowCardBrowser(false)} className="text-muted-foreground hover:text-foreground">
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              <div className="p-3 max-h-[calc(90vh-60px)] overflow-y-auto">
                <CardGallery 
                  cards={cards} 
                  onSelectCard={(card) => {
                    showCardDetails(card);
                    selectCardFromBrowser(card);
                  }} 
                />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      
      {/* Card Details Modal */}
      <AnimatePresence>
        {selectedCardDetails && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={() => setSelectedCardDetails(null)}>
            <motion.div
              className="bg-card rounded-xl overflow-hidden max-w-lg w-full"
              onClick={(e) => e.stopPropagation()}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ type: "spring", duration: 0.4 }}
            >
              <div className="p-3 border-b border-border flex justify-between items-center">
                <h2 className="font-medium">{selectedCardDetails.name}</h2>
                <button onClick={() => setSelectedCardDetails(null)} className="text-muted-foreground hover:text-foreground">
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2">
                <div className="aspect-[2/3] overflow-hidden">
                  <img 
                    src={selectedCardDetails.image_url} 
                    alt={selectedCardDetails.name} 
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="p-4">
                  <h3 className="font-medium mb-2">Description</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    {selectedCardDetails.description || "No description available."}
                  </p>
                  
                  {selectedCardDetails.keywords && selectedCardDetails.keywords.length > 0 && (
                    <>
                      <h3 className="font-medium mb-2">Keywords</h3>
                      <div className="flex flex-wrap gap-2">
                        {selectedCardDetails.keywords.map((keyword, idx) => (
                          <span 
                            key={idx} 
                            className="px-2 py-1 bg-primary/10 rounded-full text-xs"
                          >
                            {keyword}
                          </span>
                        ))}
                      </div>
                    </>
                  )}
                  
                  <div className="mt-4 pt-3 border-t border-border">
                    <button
                      onClick={() => {
                        selectCardFromBrowser(selectedCardDetails);
                        setSelectedCardDetails(null);
                      }}
                      className="btn btn-primary w-full py-1.5"
                    >
                      Place This Card
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default InteractiveReadingRoom;