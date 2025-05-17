import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, ShoppingCart, Bookmark, Share2, Star, Download, Eye, Users, Calendar, Shield, Info, User, BookOpen, Zap, Video } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Deck, Card } from '../../types';
import { supabase } from '../../lib/supabase';
import JoinByLinkModal from '../../components/video/JoinByLinkModal';

const DeckDetails = () => {
  const { deckId } = useParams<{ deckId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [deck, setDeck] = useState<Deck | null>(null);
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [isCardModalOpen, setIsCardModalOpen] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  
  // Fetch deck details
  useEffect(() => {
    const fetchDeckDetails = async () => {
      if (!deckId) return;
      
      try {
        setLoading(true);
        
        // Fetch deck data from Supabase
        const { data: deckData, error: deckError } = await supabase
          .from('decks')
          .select(`
            *,
            users:creator_id (username, email)
          `)
          .eq('id', deckId)
          .single();
        
        if (deckError) {
          console.error('Error fetching deck:', deckError);
          setLoading(false);
          return;
        }
        
        if (deckData) {
          // Format deck data
          const formattedDeck: Deck = {
            ...deckData,
            creator_name: deckData.users?.username || deckData.users?.email?.split('@')[0] || 'Unknown Creator'
          };
          
          setDeck(formattedDeck);
          
          // Fetch cards for this deck
          const { data: cardsData, error: cardsError } = await supabase
            .from('cards')
            .select('*')
            .eq('deck_id', deckId)
            .order('order', { ascending: true });
          
          if (cardsError) {
            console.error('Error fetching cards:', cardsError);
          } else {
            setCards(cardsData || []);
          }
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Error in fetchDeckDetails:', error);
        setLoading(false);
      }
    };
    
    fetchDeckDetails();
  }, [deckId]);
  
  const openCardModal = (card: Card) => {
    setSelectedCard(card);
    setIsCardModalOpen(true);
  };
  
  const closeCardModal = () => {
    setIsCardModalOpen(false);
    setTimeout(() => setSelectedCard(null), 300); // Wait for animation to complete
  };
  
  const handlePurchase = () => {
    if (!user) {
      navigate('/login');
      return;
    }
    
    navigate(`/checkout/${deckId}`);
  };

  const gotoReadingRoom = () => {
    navigate(`/reading-room/${deckId}`);
  };
  
  // Join an existing reading session
  const joinReadingSession = () => {
    setShowJoinModal(true);
  };
  
  // Handle successful join
  const handleJoinSuccess = () => {
    setShowJoinModal(false);
    navigate('/reading-room');
  };
  
  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen pt-16 pb-20 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading deck details...</p>
        </div>
      </div>
    );
  }
  
  // Error state
  if (!deck) {
    return (
      <div className="min-h-screen pt-16 pb-20 flex flex-col items-center justify-center">
        <Info className="w-16 h-16 text-muted-foreground mb-4" />
        <h2 className="text-2xl font-serif mb-2">Deck Not Found</h2>
        <p className="text-muted-foreground mb-6">The deck you're looking for doesn't exist or has been removed.</p>
        <Link to="/marketplace" className="btn btn-primary px-6 py-2">
          Return to Marketplace
        </Link>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen pt-12 pb-20">
      <div className="container mx-auto px-4">
        {/* Back button */}
        <div className="mt-8 mb-6">
          <Link to="/marketplace" className="inline-flex items-center text-muted-foreground hover:text-foreground">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Marketplace
          </Link>
        </div>
        
        {/* Deck Details Header */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          {/* Deck Cover */}
          <div className="md:col-span-1">
            <motion.div 
              className="rounded-xl overflow-hidden shadow-lg aspect-[3/4] relative"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <img 
                src={deck.cover_image} 
                alt={deck.title} 
                className="w-full h-full object-cover"
              />
              {deck.is_nft && (
                <div className="absolute top-3 left-3 bg-primary/90 text-primary-foreground font-medium px-3 py-1 rounded-full text-xs">
                  NFT
                </div>
              )}
              {deck.is_free && (
                <div className="absolute top-3 left-3 bg-success/90 text-success-foreground font-medium px-3 py-1 rounded-full text-xs flex items-center">
                  <Zap className="h-3 w-3 mr-1" />
                  Free
                </div>
              )}
            </motion.div>
          </div>
          
          {/* Deck Info */}
          <motion.div 
            className="md:col-span-2"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <h1 className="text-3xl md:text-4xl font-serif font-bold mb-4">{deck.title}</h1>
            
            <div className="flex items-center mb-4">
              <div className="flex items-center text-accent mr-4">
                <Star className="h-5 w-5 fill-current" />
                <span className="ml-1 font-medium">{deck.rating?.toFixed(1)}</span>
              </div>
              <div className="text-muted-foreground text-sm">
                <span>{deck.purchase_count} downloaded</span>
              </div>
            </div>
            
            <div className="flex items-center text-muted-foreground text-sm mb-6">
              <div className="flex items-center mr-4">
                <Calendar className="h-4 w-4 mr-1" />
                <span>Created {new Date(deck.created_at).toLocaleDateString()}</span>
              </div>
              <div className="flex items-center">
                <Users className="h-4 w-4 mr-1" />
                <span>By {deck.creator_name}</span>
              </div>
            </div>
            
            <p className="text-lg mb-6">
              {deck.description}
            </p>
            
            <div className="flex flex-wrap gap-2 mb-6">
              <span className="px-3 py-1 bg-primary/20 rounded-full text-sm">
                {deck.theme}
              </span>
              <span className="px-3 py-1 bg-primary/20 rounded-full text-sm">
                {deck.style}
              </span>
              <span className="px-3 py-1 bg-primary/20 rounded-full text-sm">
                {deck.card_count} cards
              </span>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4">
              {deck.is_free ? (
                <div className="text-3xl font-bold mb-4 sm:mb-0 flex items-center">
                  <Zap className="mr-2 h-6 w-6 text-success" />
                  Free
                </div>
              ) : (
                <div className="text-3xl font-bold mb-4 sm:mb-0">
                  ${deck.price.toFixed(2)}
                </div>
              )}
              
              <div className="flex flex-col sm:flex-row gap-3 sm:ml-auto">
                {deck.is_free ? (
                  <>
                    <button 
                      onClick={gotoReadingRoom}
                      className="btn btn-primary px-6 py-2 flex items-center justify-center"
                    >
                      <BookOpen className="mr-2 h-5 w-5" />
                      Open in Reading Room
                    </button>
                    <button 
                      onClick={joinReadingSession}
                      className="btn btn-secondary px-4 py-2 flex items-center justify-center"
                    >
                      <Video className="mr-2 h-5 w-5" />
                      Join Reading Session
                    </button>
                  </>
                ) : (
                  <button 
                    onClick={handlePurchase}
                    className="btn btn-primary px-6 py-2 flex items-center justify-center"
                  >
                    <ShoppingCart className="mr-2 h-5 w-5" />
                    Buy Now
                  </button>
                )}
                
                <button className="btn btn-secondary px-4 py-2 flex items-center justify-center">
                  <Bookmark className="mr-2 h-5 w-5" />
                  Save
                </button>
                
                <button className="btn btn-ghost px-4 py-2 flex items-center justify-center border border-input">
                  <Share2 className="mr-2 h-5 w-5" />
                  Share
                </button>
              </div>
            </div>
            
            <div className="mt-6 p-4 border border-border rounded-lg bg-card/50">
              <div className="flex items-start gap-3">
                <Shield className="h-5 w-5 text-success shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-medium mb-1">
                    {deck.is_free ? "Free Access" : "Secure Purchase"}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {deck.is_free 
                      ? "This free deck is available to all users. Access the reading room to start your spiritual journey." 
                      : "All transactions are secure and encrypted. Purchases include lifetime access to this deck."}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
        
        {/* Preview Cards Section */}
        <div className="mb-16">
          <h2 className="text-2xl font-serif font-bold mb-6">Preview Cards</h2>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {cards.map((card, index) => (
              <motion.div
                key={card.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="cursor-pointer group"
                onClick={() => openCardModal(card)}
              >
                <div className="relative aspect-[2/3] rounded-lg overflow-hidden">
                  <img 
                    src={card.image_url} 
                    alt={card.name} 
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Eye className="h-6 w-6 text-white" />
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                    <h3 className="text-white text-sm font-medium truncate">{card.name}</h3>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
        
        {/* Additional Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-card rounded-xl p-6 border border-border">
            <h2 className="text-xl font-serif font-bold mb-4">Deck Details</h2>
            <ul className="space-y-3">
              <li className="flex justify-between">
                <span className="text-muted-foreground">Cards</span>
                <span>{deck.card_count}</span>
              </li>
              <li className="flex justify-between">
                <span className="text-muted-foreground">Style</span>
                <span className="capitalize">{deck.style}</span>
              </li>
              <li className="flex justify-between">
                <span className="text-muted-foreground">Theme</span>
                <span className="capitalize">{deck.theme}</span>
              </li>
              <li className="flex justify-between">
                <span className="text-muted-foreground">Format</span>
                <span>{deck.is_nft ? 'Digital + NFT' : 'Digital'}</span>
              </li>
              <li className="flex justify-between">
                <span className="text-muted-foreground">Access</span>
                <span className="flex items-center">
                  {deck.is_free ? (
                    <>
                      <Zap className="h-4 w-4 text-success mr-1" />
                      Free
                    </>
                  ) : (
                    'Paid'
                  )}
                </span>
              </li>
              <li className="flex justify-between">
                <span className="text-muted-foreground">Created</span>
                <span>{new Date(deck.created_at).toLocaleDateString()}</span>
              </li>
              <li className="flex justify-between">
                <span className="text-muted-foreground">Last Updated</span>
                <span>{new Date(deck.updated_at).toLocaleDateString()}</span>
              </li>
            </ul>
          </div>
          
          <div className="bg-card rounded-xl p-6 border border-border">
            <h2 className="text-xl font-serif font-bold mb-4">Creator</h2>
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center mr-4">
                <User className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-medium">{deck.creator_name}</h3>
                <p className="text-sm text-muted-foreground">Deck Artist</p>
              </div>
            </div>
            <p className="text-muted-foreground mb-4">
              {deck.creator_id === 'mysticforge' 
                ? "Creator of Tarot Forge's official decks, blending traditional tarot symbolism with modern design aesthetics for all spiritual seekers."
                : "Creator of mystical and cosmic-themed tarot decks that blend traditional symbolism with modern aesthetics."}
            </p>
            <button className="w-full btn btn-secondary py-2">
              View Profile
            </button>
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
      
      {/* Card Modal */}
      {isCardModalOpen && selectedCard && (
        <div 
          className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
          onClick={closeCardModal}
        >
          <motion.div 
            className="bg-card rounded-xl overflow-hidden max-w-2xl w-full"
            onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.3 }}
          >
            <div className="grid grid-cols-1 md:grid-cols-2">
              {/* Card Image */}
              <div className="aspect-[2/3] relative overflow-hidden">
                <img 
                  src={selectedCard.image_url}
                  alt={selectedCard.name}
                  className="w-full h-full object-cover"
                />
              </div>
              
              {/* Card Details */}
              <div className="p-6 flex flex-col">
                <h3 className="text-2xl font-serif font-bold mb-2">{selectedCard.name}</h3>
                
                <div className="flex flex-wrap gap-1 mb-4">
                  {selectedCard.keywords && selectedCard.keywords.map((keyword, index) => (
                    <span
                      key={index}
                      className="text-xs px-2 py-0.5 bg-primary/20 rounded-full"
                    >
                      {keyword}
                    </span>
                  ))}
                </div>
                
                <p className="text-muted-foreground flex-grow overflow-y-auto max-h-48 pr-2">
                  {selectedCard.description}
                </p>
                
                <div className="flex justify-between items-center mt-4 pt-4 border-t border-border">
                  <button 
                    onClick={closeCardModal}
                    className="btn btn-ghost border border-input px-4 py-2"
                  >
                    Close
                  </button>
                  
                  {deck.is_free ? (
                    <button 
                      onClick={gotoReadingRoom}
                      className="btn btn-primary px-4 py-2 flex items-center"
                    >
                      <BookOpen className="mr-2 h-4 w-4" />
                      Use in Reading
                    </button>
                  ) : (
                    <button 
                      onClick={handlePurchase}
                      className="btn btn-primary px-4 py-2 flex items-center"
                    >
                      <ShoppingCart className="mr-2 h-4 w-4" />
                      Buy Deck
                    </button>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default DeckDetails;