import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, HelpCircle, Share2, Shuffle, Save, XCircle, MessageSquare, Video, PhoneCall, Zap, Link as LinkIcon } from 'lucide-react';
import { Deck, Card, ReadingLayout } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { getReadingInterpretation } from '../../lib/gemini-ai';
import VideoChat from '../../components/video/VideoChat';
import JoinByLinkModal from '../../components/video/JoinByLinkModal';
import TarotLogo from '../../components/ui/TarotLogo';
import { completeRiderWaiteDeck } from '../../components/decks/RiderWaiteDeck';

// Free deck cards
const freeDeckCards: {[key: string]: Card[]} = {
  '7': [
    {
      id: 'free-card1',
      deck_id: '7',
      name: 'The Fool',
      description: 'The Fool represents new beginnings, innocence, and spontaneity. In this elemental interpretation, the figure stands at the edge of earth, about to step into the air with total trust.',
      image_url: 'https://images.pexels.com/photos/2627945/pexels-photo-2627945.jpeg?auto=compress&cs=tinysrgb&w=1600',
      card_type: 'major',
      keywords: ['beginnings', 'innocence', 'adventure'],
      order: 0
    },
    {
      id: 'free-card2',
      deck_id: '7',
      name: 'The Magician',
      description: 'The Magician symbolizes manifestation, resourcefulness, and power. This elemental version shows a figure wielding fire, air, water, and earth to manifest their will.',
      image_url: 'https://images.pexels.com/photos/2150/sky-space-dark-galaxy.jpg?auto=compress&cs=tinysrgb&w=1600',
      card_type: 'major',
      keywords: ['manifestation', 'power', 'elements'],
      order: 1
    },
    {
      id: 'free-card3',
      deck_id: '7',
      name: 'The High Priestess',
      description: 'The High Priestess represents intuition, mystery, and the subconscious mind. This elemental version shows her emerging from water, keeper of the unknown depths.',
      image_url: 'https://images.pexels.com/photos/355887/pexels-photo-355887.jpeg?auto=compress&cs=tinysrgb&w=1600',
      card_type: 'major',
      keywords: ['intuition', 'mystery', 'water'],
      order: 2
    }
  ],
  '8': [
    {
      id: 'free-card4',
      deck_id: '8',
      name: 'The Fool',
      description: 'The Fool represents new beginnings, innocence, and spontaneity. In this archetypal interpretation, the figure represents the universal beginnings that exist in all cultures and mythologies.',
      image_url: 'https://images.pexels.com/photos/1619317/pexels-photo-1619317.jpeg?auto=compress&cs=tinysrgb&w=1600',
      card_type: 'major',
      keywords: ['beginnings', 'innocence', 'archetype'],
      order: 0
    },
    {
      id: 'free-card5',
      deck_id: '8',
      name: 'The Magician',
      description: 'The Magician symbolizes manifestation, resourcefulness, and power. This archetypal version embodies the trickster, the alchemist, and the creator that appears across human mythology.',
      image_url: 'https://images.pexels.com/photos/2693529/pexels-photo-2693529.jpeg?auto=compress&cs=tinysrgb&w=1600',
      card_type: 'major',
      keywords: ['manifestation', 'power', 'alchemy'],
      order: 1
    },
    {
      id: 'free-card6',
      deck_id: '8',
      name: 'The High Priestess',
      description: 'The High Priestess represents intuition, mystery, and the subconscious mind. This archetypal version represents the seer, the wise woman, and the keeper of mysteries found in ancient cultures.',
      image_url: 'https://images.pexels.com/photos/1097456/pexels-photo-1097456.jpeg?auto=compress&cs=tinysrgb&w=1600',
      card_type: 'major',
      keywords: ['intuition', 'mystery', 'wisdom'],
      order: 2
    }
  ],
  '9': [
    {
      id: 'free-card7',
      deck_id: '9',
      name: 'The Fool',
      description: 'The Fool represents new beginnings, innocence, and spontaneity. This minimalist cosmic interpretation reduces the concept to its simplest form: a figure among stars about to embark on a journey.',
      image_url: 'https://images.pexels.com/photos/1938348/pexels-photo-1938348.jpeg?auto=compress&cs=tinysrgb&w=1600',
      card_type: 'major',
      keywords: ['beginnings', 'innocence', 'simplicity'],
      order: 0
    },
    {
      id: 'free-card8',
      deck_id: '9',
      name: 'The Magician',
      description: 'The Magician symbolizes manifestation, resourcefulness, and power. This minimalist cosmic version shows a simple geometric representation of the elements and forces of the universe.',
      image_url: 'https://images.pexels.com/photos/956981/milky-way-starry-sky-night-sky-star-956981.jpeg?auto=compress&cs=tinysrgb&w=1600',
      card_type: 'major',
      keywords: ['manifestation', 'power', 'geometry'],
      order: 1
    },
    {
      id: 'free-card9',
      deck_id: '9',
      name: 'The High Priestess',
      description: 'The High Priestess represents intuition, mystery, and the subconscious mind. This minimalist cosmic version depicts the concept through the simple contrast of light and shadow in space.',
      image_url: 'https://images.pexels.com/photos/816608/pexels-photo-816608.jpeg?auto=compress&cs=tinysrgb&w=1600',
      card_type: 'major',
      keywords: ['intuition', 'mystery', 'duality'],
      order: 2
    }
  ]
};

// Mock decks data with all decks
const mockDecksData: {[key: string]: Deck} = {
  'rider-waite': {
    ...completeRiderWaiteDeck
  },
  '1': {
    id: '1',
    creator_id: 'user1',
    creator_name: 'MysticArtist',
    title: 'Celestial Journey',
    description: 'A cosmic-themed deck exploring the journey through celestial bodies and astral planes.',
    theme: 'cosmic',
    style: 'ethereal',
    card_count: 78,
    price: 12.99,
    cover_image: 'https://images.pexels.com/photos/1274260/pexels-photo-1274260.jpeg?auto=compress&cs=tinysrgb&w=1600',
    sample_images: [],
    created_at: '2023-10-15T14:30:00Z',
    updated_at: '2023-10-15T14:30:00Z',
    purchase_count: 124,
    rating: 4.7,
  },
  '7': {
    id: '7',
    creator_id: 'mysticforge',
    creator_name: 'Mystic Forge',
    title: 'Elemental Beginnings',
    description: 'A free starter deck exploring the four elements: Earth, Air, Fire, and Water. Perfect for beginners.',
    theme: 'elements',
    style: 'digital',
    card_count: 22,
    price: 0,
    is_free: true,
    cover_image: 'https://images.pexels.com/photos/1761279/pexels-photo-1761279.jpeg?auto=compress&cs=tinysrgb&w=1600',
    sample_images: [],
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    purchase_count: 1205,
    rating: 4.2
  },
  '8': {
    id: '8',
    creator_id: 'mysticforge',
    creator_name: 'Mystic Forge',
    title: 'Mystical Archetypes',
    description: 'Explore the universal archetypes of the major arcana with this free deck. Great for all experience levels.',
    theme: 'archetypes',
    style: 'watercolor',
    card_count: 22,
    price: 0,
    is_free: true,
    cover_image: 'https://images.pexels.com/photos/1097456/pexels-photo-1097456.jpeg?auto=compress&cs=tinysrgb&w=1600',
    sample_images: [],
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    purchase_count: 987,
    rating: 4.4
  },
  '9': {
    id: '9',
    creator_id: 'mysticforge',
    creator_name: 'Mystic Forge',
    title: 'Cosmic Minimalist',
    description: 'A free minimalist deck with cosmic themes. Clean designs make the symbolism clear and accessible.',
    theme: 'cosmic',
    style: 'minimalist',
    card_count: 22,
    price: 0,
    is_free: true,
    cover_image: 'https://images.pexels.com/photos/1938348/pexels-photo-1938348.jpeg?auto=compress&cs=tinysrgb&w=1600',
    sample_images: [],
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    purchase_count: 845,
    rating: 4.1
  }
};

// Mapping deck IDs to their cards
const mockCardsByDeckId: {[key: string]: Card[]} = {
  'rider-waite': completeRiderWaiteDeck.cards,
  '1': [
    {
      id: 'card1',
      deck_id: '1',
      name: 'The Fool',
      description: 'The Fool represents new beginnings, innocence, and spontaneity. In this cosmic interpretation, the figure floats through the astral void, stepping off into the unknown universe with trust and wonder.',
      image_url: 'https://images.pexels.com/photos/1274260/pexels-photo-1274260.jpeg?auto=compress&cs=tinysrgb&w=1600',
      card_type: 'major',
      keywords: ['beginnings', 'innocence', 'adventure'],
      order: 0
    },
    {
      id: 'card2',
      deck_id: '1',
      name: 'The Magician',
      description: 'The Magician symbolizes manifestation, resourcefulness, and power. This cosmic version shows a celestial being channeling the energy of stars and galaxies to manifest reality.',
      image_url: 'https://images.pexels.com/photos/1252890/pexels-photo-1252890.jpeg?auto=compress&cs=tinysrgb&w=1600',
      card_type: 'major',
      keywords: ['manifestation', 'power', 'action'],
      order: 1
    },
    {
      id: 'card3',
      deck_id: '1',
      name: 'The High Priestess',
      description: 'The High Priestess represents intuition, mystery, and the subconscious mind. In this cosmic deck, she emerges from the dark matter of space, keeper of universal secrets.',
      image_url: 'https://images.pexels.com/photos/1169754/pexels-photo-1169754.jpeg?auto=compress&cs=tinysrgb&w=1600',
      card_type: 'major',
      keywords: ['intuition', 'mystery', 'subconscious'],
      order: 2
    },
    {
      id: 'card4',
      deck_id: '1',
      name: 'The Empress',
      description: 'The Empress embodies fertility, nurturing, and abundance. This cosmic interpretation shows her as a nebula giving birth to new stars, the ultimate creative force.',
      image_url: 'https://images.pexels.com/photos/1906658/pexels-photo-1906658.jpeg?auto=compress&cs=tinysrgb&w=1600',
      card_type: 'major',
      keywords: ['abundance', 'nurturing', 'fertility'],
      order: 3
    },
    {
      id: 'card5',
      deck_id: '1',
      name: 'The Emperor',
      description: 'The Emperor represents authority, structure, and control. In this cosmic realm, he appears as a stabilizing force in the chaos of the universe, bringing order to the void.',
      image_url: 'https://images.pexels.com/photos/956981/milky-way-starry-sky-night-sky-star-956981.jpeg?auto=compress&cs=tinysrgb&w=1600',
      card_type: 'major',
      keywords: ['authority', 'structure', 'stability'],
      order: 4
    },
    {
      id: 'card6',
      deck_id: '1',
      name: 'The Hierophant',
      description: 'The Hierophant symbolizes tradition, conformity, and spiritual wisdom. This cosmic version appears as an ancient being who has witnessed the birth and death of countless galaxies.',
      image_url: 'https://images.pexels.com/photos/816608/pexels-photo-816608.jpeg?auto=compress&cs=tinysrgb&w=1600',
      card_type: 'major',
      keywords: ['tradition', 'spiritual wisdom', 'guidance'],
      order: 5
    }
  ],
  '7': freeDeckCards['7'],
  '8': freeDeckCards['8'],
  '9': freeDeckCards['9']
};

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
  const [showQuestion, setShowQuestion] = useState(false);
  
  const [readingStarted, setReadingStarted] = useState(false);
  const [readingComplete, setReadingComplete] = useState(false);
  const [interpretation, setInterpretation] = useState('');
  const [isGeneratingInterpretation, setIsGeneratingInterpretation] = useState(false);
  const [showAIMode, setShowAIMode] = useState(false);
  
  // Video chat state
  const [showVideoChat, setShowVideoChat] = useState(false);
  const [isVideoConnecting, setIsVideoConnecting] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [showJoinModal, setShowJoinModal] = useState(false);
  
  // Function to show the join by link modal
  const showJoinByLinkModal = () => {
    setShowJoinModal(true);
  };
  
  // Function to handle successful join
  const handleJoinSuccess = () => {
    setShowJoinModal(false);
    navigate('/reading-room');
  };
  
  // Check for join parameter in URL on load
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const joinSessionId = params.get('join');
    
    if (joinSessionId) {
      setSessionId(joinSessionId);
      setShowVideoChat(true);
      
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete('join');
      window.history.replaceState({}, '', newUrl.toString());
    }
  }, [location.search]);
  
  // Fetch deck and cards data
  useEffect(() => {
    const fetchDeckData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        setTimeout(() => {
          if (deckId && mockDecksData[deckId]) {
            setDeck(mockDecksData[deckId]);
            const deckCards = mockCardsByDeckId[deckId] || [];
            setCards(deckCards);
            setShuffledDeck([...deckCards].sort(() => Math.random() - 0.5));
          } else if (deckId) {
            setError("Deck not found. Please select a different deck.");
            setDeck(mockDecksData['7']);
            setCards(mockCardsByDeckId['7'] || []);
            setShuffledDeck([...(mockCardsByDeckId['7'] || [])].sort(() => Math.random() - 0.5));
          } else {
            setDeck(mockDecksData['7']);
            setCards(mockCardsByDeckId['7'] || []);
            setShuffledDeck([...(mockCardsByDeckId['7'] || [])].sort(() => Math.random() - 0.5));
          }
          
          setLoading(false);
        }, 1000);
        
      } catch (error) {
        console.error('Error fetching deck data:', error);
        setError("An error occurred loading the deck. Please try again.");
        setLoading(false);
      }
    };
    
    fetchDeckData();
  }, [deckId]);
  
  const handleLayoutSelect = (layout: ReadingLayout) => {
    setSelectedLayout(layout);
    setSelectedCards([]);
    setReadingStarted(false);
    setReadingComplete(false);
    setInterpretation('');
  };
  
  const shuffleDeck = () => {
    setShuffledDeck([...shuffledDeck].sort(() => Math.random() - 0.5));
  };
  
  const startReading = () => {
    if (!selectedLayout) return;
    
    setReadingStarted(true);
    setSelectedCards([]);
    setReadingComplete(false);
    setInterpretation('');
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
      setReadingComplete(true);
    }
  };
  
  const generateInterpretation = async () => {
    if (!deck || !selectedCards.length) return;
    
    try {
      setIsGeneratingInterpretation(true);
      
      const formattedCards = selectedCards.map(card => ({
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
      setShowAIMode(true);
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
  
  if (loading) {
    return (
      <div className="min-h-screen pt-16 pb-20 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Preparing reading room...</p>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="min-h-screen pt-16 pb-20 flex flex-col items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6 bg-card border border-border rounded-xl">
          <HelpCircle className="h-16 w-16 text-warning mx-auto mb-4" />
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
  
  return (
    <div className="min-h-screen pt-12 pb-20">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="py-8">
          <Link to="/collection" className="inline-flex items-center text-muted-foreground hover:text-foreground mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Collection
          </Link>
          
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
            <div>
              <h1 className="text-3xl font-serif font-bold mb-2">Reading Room</h1>
              <p className="text-muted-foreground">
                {deck?.title ? `Using ${deck.title} by ${deck.creator_name}` : 'Select a deck to begin'}
                {deck?.is_free && (
                  <span className="inline-flex items-center ml-2 text-success">
                    <Zap className="h-4 w-4 mr-1" />
                    Free Deck
                  </span>
                )}
              </p>
            </div>
            
            <div className="flex flex-wrap gap-3 mt-4 md:mt-0">
              <button 
                onClick={showJoinByLinkModal}
                className="btn btn-ghost border border-input px-4 py-2 flex items-center"
              >
                <LinkIcon className="mr-2 h-4 w-4" />
                Join by Link
              </button>
              
              <button 
                onClick={() => !isVideoConnecting && !showVideoChat && initiateVideoChat()}
                className={`btn ${showVideoChat ? 'btn-success' : 'btn-secondary'} px-4 py-2 flex items-center`}
                disabled={isVideoConnecting}
              >
                {isVideoConnecting ? (
                  <>
                    <span className="mr-2 h-4 w-4 border-2 border-secondary-foreground border-t-transparent rounded-full animate-spin"></span>
                    Connecting...
                  </>
                ) : showVideoChat ? (
                  <>
                    <Video className="mr-2 h-4 w-4" />
                    End Call
                  </>
                ) : (
                  <>
                    <PhoneCall className="mr-2 h-4 w-4" />
                    Start Reading Call
                  </>
                )}
              </button>
              
              <button className="btn btn-secondary px-4 py-2 flex items-center">
                <Share2 className="mr-2 h-4 w-4" />
                Share
              </button>
              <button className="btn btn-primary px-4 py-2 flex items-center">
                <Save className="mr-2 h-4 w-4" />
                Save Reading
              </button>
            </div>
          </div>
        </div>
        
        {/* Reading Area */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Panel - Layout Selection */}
          <div className="lg:col-span-1">
            <div className="bg-card rounded-xl border border-border p-6 sticky top-24">
              <h2 className="text-xl font-serif font-bold mb-4">Reading Setup</h2>
              
              {!readingStarted ? (
                <>
                  {/* Layout selection */}
                  <div className="space-y-4 mb-6">
                    <h3 className="font-medium">Select a Layout</h3>
                    <div className="space-y-3">
                      {readingLayouts.map((layout) => (
                        <div 
                          key={layout.id}
                          className={`border rounded-lg p-3 cursor-pointer transition-colors ${
                            selectedLayout?.id === layout.id 
                              ? 'border-primary bg-primary/5' 
                              : 'border-input hover:border-primary/50'
                          }`}
                          onClick={() => handleLayoutSelect(layout)}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-medium">{layout.name}</h4>
                            <span className="text-xs bg-muted px-2 py-0.5 rounded-full">
                              {layout.card_count} {layout.card_count === 1 ? 'card' : 'cards'}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground">{layout.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {/* Question input */}
                  <div className="space-y-2 mb-6">
                    <div className="flex justify-between">
                      <h3 className="font-medium">Your Question</h3>
                      <button 
                        className="text-xs text-primary"
                        onClick={() => setShowQuestion(!showQuestion)}
                      >
                        {showQuestion ? 'Hide' : 'Show'}
                      </button>
                    </div>
                    
                    {showQuestion && (
                      <textarea
                        value={question}
                        onChange={(e) => setQuestion(e.target.value)}
                        placeholder="What would you like guidance on?"
                        className="w-full p-2 rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                        rows={3}
                      ></textarea>
                    )}
                  </div>
                  
                  {/* Start reading button */}
                  <button 
                    onClick={startReading}
                    disabled={!selectedLayout}
                    className="w-full btn btn-primary py-2 flex items-center justify-center disabled:opacity-50"
                  >
                    Start Reading
                  </button>
                </>
              ) : (
                <>
                  {/* Reading info */}
                  <div className="mb-6">
                    <div className="bg-muted/30 rounded-lg p-3 mb-4">
                      <h3 className="font-medium mb-1">{selectedLayout?.name}</h3>
                
                      <p className="text-sm text-muted-foreground">{selectedLayout?.description}</p>
                    </div>
                    
                    {question && (
                      <div className="mb-4">
                        <h3 className="font-medium mb-1">Your Question</h3>
                        <p className="text-sm italic">"{question}"</p>
                      </div>
                    )}
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm">
                        {selectedCards.length} of {selectedLayout?.card_count} cards drawn
                      </span>
                      
                      <button 
                        onClick={shuffleDeck}
                        disabled={readingComplete}
                        className="btn btn-ghost p-2 text-sm flex items-center disabled:opacity-50"
                      >
                        <Shuffle className="mr-1 h-4 w-4" />
                        Shuffle
                      </button>
                    </div>
                  </div>
                  
                  {/* Card selection */}
                  {!readingComplete ? (
                    <div className="mb-6">
                      <button 
                        onClick={handleCardSelection}
                        className="w-full btn btn-primary py-2 flex items-center justify-center"
                      >
                        Draw Next Card
                      </button>
                    </div>
                  ) : (
                    <>
                      {/* AI interpretation */}
                      <div className="mb-6">
                        <button 
                          onClick={generateInterpretation}
                          disabled={isGeneratingInterpretation}
                          className="w-full btn btn-primary py-2 flex items-center justify-center disabled:opacity-50"
                        >
                          {isGeneratingInterpretation ? (
                            <>
                              <span className="mr-2 h-4 w-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin"></span>
                              Generating...
                            </>
                          ) : (
                            <>
                              <TarotLogo className="mr-2 h-4 w-4" />
                              AI Interpretation
                            </>
                          )}
                        </button>
                      </div>
                      
                      {/* Reset reading */}
                      <button 
                        onClick={() => {
                          setReadingStarted(false);
                          setReadingComplete(false);
                          setSelectedCards([]);
                          setInterpretation('');
                          setShuffledDeck([...cards].sort(() => Math.random() - 0.5));
                        }}
                        className="w-full btn btn-ghost border border-input py-2"
                      >
                        Reset Reading
                      </button>
                    </>
                  )}
                </>
              )}
            </div>
          </div>
          
          {/* Right Panel - Reading Display */}
          <div className="lg:col-span-2">
            {/* Video Chat - Only shown when active */}
            {showVideoChat && (
              <VideoChat 
                onClose={() => setShowVideoChat(false)}
                sessionId={sessionId}
              />
            )}
            
            {/* Reading board */}
            <div className="aspect-video bg-card/50 rounded-xl border border-border overflow-hidden relative mb-6">
              {/* Guidance */}
              {!readingStarted && (
                <div className="flex flex-col items-center justify-center h-full p-6 text-center">
                  <HelpCircle className="h-16 w-16 text-muted-foreground mb-4" />
                  <h3 className="text-xl font-serif font-medium mb-2">Select a Layout to Begin</h3>
                  <p className="text-muted-foreground max-w-md">
                    Choose a card layout from the left panel, then start your reading.
                    Each layout provides different insights into your question.
                  </p>
                </div>
              )}
              
              {/* Reading in progress */}
              {readingStarted && (
                <div className="h-full p-6 relative">
                  {/* Layout visualization */}
                  {selectedLayout && selectedLayout.positions && selectedLayout.positions.map((position, index) => {
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
                        {/* Card position indicator */}
                        {!selectedCard && (
                          <div 
                            className="w-24 h-36 md:w-32 md:h-48 border-2 border-dashed border-muted-foreground/30 rounded-md flex flex-col items-center justify-center"
                            style={{ transform: position.rotation ? `rotate(${position.rotation}deg)` : 'none' }}
                          >
                            <span className="text-xs text-muted-foreground">{position.name}</span>
                          </div>
                        )}
                        
                        {/* Selected card */}
                        {selectedCard && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.5 }}
                            className="relative"
                          >
                            <div 
                              className="w-24 h-36 md:w-32 md:h-48 rounded-md overflow-hidden shadow-lg cursor-pointer"
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
                            <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 whitespace-nowrap bg-card/80 backdrop-blur-xs px-2 py-0.5 rounded-full text-xs">
                              {position.name} {selectedCard.isReversed && '(Reversed)'}
                            </div>
                          </motion.div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            
            {/* AI Interpretation */}
            {interpretation && showAIMode && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="bg-card rounded-xl border border-border overflow-hidden mb-6"
              >
                <div className="flex items-center justify-between bg-primary/10 p-4 border-b border-border">
                  <div className="flex items-center">
                    <TarotLogo className="h-5 w-5 text-primary mr-2" />
                    <h3 className="font-medium">AI Interpretation</h3>
                  </div>
                  <button onClick={() => setShowAIMode(false)}>
                    <XCircle className="h-5 w-5 text-muted-foreground hover:text-foreground" />
                  </button>
                </div>
                <div className="p-6 max-h-96 overflow-y-auto">
                  <div className="prose prose-invert max-w-none">
                    {interpretation.split('\n').map((paragraph, i) => (
                      <p key={i}>{paragraph}</p>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
            
            {/* Card details */}
            {selectedCards.length > 0 && (
              <div className="bg-card rounded-xl border border-border overflow-hidden">
                <div className="p-4 border-b border-border">
                  <h3 className="font-medium">Card Details</h3>
                </div>
                <div className="p-6 max-h-96 overflow-y-auto">
                  <div className="space-y-6">
                    {selectedCards.map((card, index) => (
                      <div key={index} className="flex gap-4">
                        <div className="shrink-0 w-16 h-24 rounded-md overflow-hidden">
                          <img 
                            src={card.image_url} 
                            alt={card.name} 
                            className={`w-full h-full object-cover ${card.isReversed ? 'rotate-180' : ''}`}
                          />
                        </div>
                        <div>
                          <h4 className="font-medium text-lg">{card.name} {card.isReversed && '(Reversed)'}</h4>
                          <p className="text-sm text-accent mb-2">{card.position}</p>
                          <p className="text-sm text-muted-foreground">{card.description}</p>
                          <div className="flex flex-wrap gap-1 mt-2">
                            {card.keywords && card.keywords.map((keyword, i) => (
                              <span 
                                key={i} 
                                className="text-xs px-2 py-0.5 bg-primary/10 rounded-full"
                              >
                                {keyword}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Join by link modal */}
      {showJoinModal && (
        <JoinByLinkModal 
          onClose={() => setShowJoinModal(false)}
          onJoinSuccess={handleJoinSuccess}
        />
      )}
    </div>
  );
};

export default ReadingRoom;