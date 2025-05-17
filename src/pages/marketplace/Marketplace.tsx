import { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Search, Filter, Zap, TrendingUp, Clock, Star, XCircle, AlertCircle } from 'lucide-react';
import DeckPreview from '../../components/ui/DeckPreview';
import { Deck } from '../../types';
import { supabase } from '../../lib/supabase';
import { generateThemeSuggestions, generateElaborateTheme } from '../../lib/gemini-ai';
import TarotLogo from '../../components/ui/TarotLogo';

// Placeholder decks for initial render
const placeholderDecks: Deck[] = Array(9).fill(null).map((_, i) => ({
  id: `placeholder-${i}`,
  creator_id: 'placeholder',
  creator_name: 'Creator',
  title: 'Loading Deck...',
  description: 'Loading description...',
  theme: '',
  style: '',
  card_count: 78,
  price: 9.99,
  cover_image: 'https://placehold.co/300x400/300',
  sample_images: [],
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  purchase_count: 0,
}));

// Define theme suggestions for dynamic generation
const themeStarters = [
  "Cosmic", "Nature", "Cyberpunk", "Mythology", "Steampunk", "Fairytale", 
  "Abstract", "Ocean", "Gothic", "Elemental", "Celestial", "Dreamscape",
  "Ancient Egypt", "Medieval", "Futuristic", "Botanical", "Crystal", "Shamanic",
  "Zodiac", "Alchemical", "Shadow", "Minimalist", "Urban", "Fractal", 
  "Psychedelic", "Folklore", "Sacred Geometry", "Witch", "Druidic", "Angelic"
];

const Marketplace = () => {
  const [decks, setDecks] = useState<Deck[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [themeSuggestions, setThemeSuggestions] = useState<string[]>(themeStarters.slice(0, 10));
  const [isGeneratingThemes, setIsGeneratingThemes] = useState(false);
  const [promptEngineValue, setPromptEngineValue] = useState('');
  const [isGeneratingElaborateTheme, setIsGeneratingElaborateTheme] = useState(false);
  
  // Refs for infinite scrolling of theme suggestions
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const suggestionIndexRef = useRef<number>(10);
  const scrollIntervalRef = useRef<number | null>(null);
  
  // Fetch AI-generated theme suggestions on component mount
  useEffect(() => {
    const fetchThemeSuggestions = async () => {
      try {
        const suggestions = await generateThemeSuggestions(10);
        if (suggestions && suggestions.length > 0) {
          setThemeSuggestions(suggestions);
        }
      } catch (error) {
        console.error('Error fetching AI theme suggestions:', error);
        // Fallback to static themes if generation fails
      }
    };
    
    fetchThemeSuggestions();
  }, []);
  
  // Start automatic scrolling for theme suggestions
  useEffect(() => {
    if (suggestionsRef.current) {
      // Autoscroll every 3 seconds
      scrollIntervalRef.current = window.setInterval(() => {
        if (suggestionsRef.current) {
          suggestionsRef.current.scrollLeft += 150;
          
          // Check if we're near the end and need to add more suggestions
          const { scrollLeft, scrollWidth, clientWidth } = suggestionsRef.current;
          if (scrollWidth - (scrollLeft + clientWidth) < 300) {
            // Add more suggestions if we're near the end
            loadMoreThemeSuggestions();
          }
          
          // Reset scroll position if at the end
          if (scrollLeft + clientWidth >= scrollWidth) {
            suggestionsRef.current.scrollLeft = 0;
          }
        }
      }, 3000);
    }
    
    return () => {
      if (scrollIntervalRef.current) {
        clearInterval(scrollIntervalRef.current);
      }
    };
  }, [themeSuggestions]);
  
  // Generate more theme suggestions
  const loadMoreThemeSuggestions = useCallback(async () => {
    if (isGeneratingThemes || themeSuggestions.length >= 50) return;
    
    setIsGeneratingThemes(true);
    
    try {
      // Use Gemini API to generate more theme suggestions
      const newThemes = await generateThemeSuggestions(5);
      
      if (newThemes && newThemes.length > 0) {
        setThemeSuggestions(prev => {
          const combined = [...prev, ...newThemes];
          // Limit to 50 suggestions total
          return combined.slice(0, 50);
        });
      } else {
        // Fallback to static suggestions if generation fails
        const adjectives = ['Mystical', 'Enchanted', 'Dark', 'Luminous', 'Ancient'];
        const newThemes: string[] = [];
        
        for (let i = 0; i < 5; i++) {
          const baseTheme = themeStarters[Math.floor(Math.random() * themeStarters.length)];
          const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
          newThemes.push(`${adjective} ${baseTheme}`);
        }
        
        setThemeSuggestions(prev => {
          const combined = [...prev, ...newThemes];
          return combined.slice(0, 50);
        });
      }
      
      suggestionIndexRef.current += 5;
    } catch (error) {
      console.error('Error generating theme suggestions:', error);
      
      // Fallback to static generation
      const adjectives = ['Mystical', 'Enchanted', 'Dark', 'Luminous', 'Ancient'];
      const newThemes: string[] = [];
      
      for (let i = 0; i < 5; i++) {
        const baseTheme = themeStarters[Math.floor(Math.random() * themeStarters.length)];
        const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
        newThemes.push(`${adjective} ${baseTheme}`);
      }
      
      setThemeSuggestions(prev => {
        const combined = [...prev, ...newThemes];
        return combined.slice(0, 50);
      });
    } finally {
      setIsGeneratingThemes(false);
    }
  }, [isGeneratingThemes, themeSuggestions.length]);
  
  useEffect(() => {
    const fetchDecks = async () => {
      try {
        setLoading(true);
        
        // Fixed query - fetch decks without trying to join with users table
        const { data, error } = await supabase
          .from('decks')
          .select('*')
          .eq('is_listed', true) // Only fetch decks that are listed
          .order('created_at', { ascending: false });
        
        if (error) {
          console.error('Error fetching decks:', error);
          throw error;
        }
        
        if (data) {
          // Process creator information from the creator_id
          const userPromises = data.map(async (deck) => {
            if (deck.creator_id) {
              // Fetch user data separately for each deck
              const { data: userData, error: userError } = await supabase
                .from('users')
                .select('username, email')
                .eq('id', deck.creator_id)
                .single();
                
              if (userError) {
                console.warn('Error fetching user data for deck:', userError);
                return {
                  ...deck,
                  creator_name: 'Unknown Creator'
                };
              }
              
              return {
                ...deck,
                creator_name: userData?.username || userData?.email?.split('@')[0] || 'Unknown Creator'
              };
            }
            
            return {
              ...deck,
              creator_name: 'Unknown Creator'
            };
          });
          
          const formattedDecks = await Promise.all(userPromises);
          setDecks(formattedDecks);
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Error fetching decks:', error);
        setLoading(false);
      }
    };
    
    fetchDecks();
  }, []);
  
  // Filter and search logic
  const filteredDecks = decks.filter(deck => {
    const matchesSearch = deck.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          deck.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          deck.creator_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          deck.theme.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          deck.style.toLowerCase().includes(searchQuery.toLowerCase());
                          
    if (activeFilter === 'all') return matchesSearch;
    if (activeFilter === 'nft') return matchesSearch && deck.is_nft;
    if (activeFilter === 'free') return matchesSearch && deck.is_free;
    if (activeFilter === 'popular') return matchesSearch && (deck.purchase_count || 0) > 100;
    if (activeFilter === 'new') {
      const deckDate = new Date(deck.created_at);
      const oneMonthAgo = new Date();
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
      return matchesSearch && deckDate > oneMonthAgo;
    }
    
    return matchesSearch;
  });
  
  const displayDecks = loading ? placeholderDecks : filteredDecks;
  
  // Helper function to sort decks by popularity
  const getPopularDecks = () => {
    return [...displayDecks].sort((a, b) => (b.purchase_count || 0) - (a.purchase_count || 0)).slice(0, 3);
  };
  
  // Helper function to sort decks by rating
  const getTopRatedDecks = () => {
    return [...displayDecks].sort((a, b) => (b.rating || 0) - (a.rating || 0)).slice(0, 2);
  };
  
  // Helper function to sort decks by most recent
  const getNewestDecks = () => {
    return [...displayDecks].sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    ).slice(0, 4);
  };
  
  // Helper function to get free decks
  const getFreeDecks = () => {
    return displayDecks.filter(deck => deck.is_free).slice(0, 2);
  };
  
  // Helper function to get NFT decks
  const getNftDecks = () => {
    return displayDecks.filter(deck => deck.is_nft).slice(0, 2);
  };
  
  // Apply a theme suggestion to search
  const applyThemeSuggestion = async (theme: string) => {
    if (isGeneratingElaborateTheme) return;
    
    setIsGeneratingElaborateTheme(true);
    try {
      // Generate elaborate theme using Gemini API
      const elaborateTheme = await generateElaborateTheme(theme);
      
      if (elaborateTheme) {
        setPromptEngineValue(elaborateTheme);
        setSearchQuery(theme); // Set simple search query to the theme title
      } else {
        // Fallback if elaborate theme generation fails
        setPromptEngineValue(`A mystical deck themed around ${theme} concepts, featuring symbolic imagery that connects ancient wisdom with spiritual awakening.`);
        setSearchQuery(theme);
      }
    } catch (error) {
      console.error('Error generating elaborate theme:', error);
      // Fallback
      setPromptEngineValue(`A mystical deck themed around ${theme} concepts, featuring symbolic imagery that connects ancient wisdom with spiritual awakening.`);
      setSearchQuery(theme);
    } finally {
      setIsGeneratingElaborateTheme(false);
    }
    
    setActiveFilter('all');
  };

  return (
    <div className="min-h-screen pt-12 pb-20 bg-background">
      <div className="container mx-auto px-4">
        {/* Hero section */}
        <div className="text-center mb-12 mt-8">
          <h1 className="text-3xl md:text-4xl font-serif font-bold mb-4">Discover Mystical Tarot Decks</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Explore unique AI-generated decks created by our global community.
          </p>
        </div>
        
        {/* Search and filters */}
        <div className="mb-10">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            {/* Search bar */}
            <div className="relative w-full md:w-96">
              <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">
                <Search className="h-5 w-5" />
              </div>
              <input 
                type="text"
                placeholder="Search decks, creators, or themes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-md bg-card border border-input focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            
            {/* Filter tabs */}
            <div className="flex items-center space-x-1 overflow-x-auto pb-2 w-full md:w-auto">
              <FilterButton 
                isActive={activeFilter === 'all'} 
                onClick={() => setActiveFilter('all')}
              >
                All Decks
              </FilterButton>
              <FilterButton 
                isActive={activeFilter === 'free'} 
                onClick={() => setActiveFilter('free')}
              >
                <Zap className="h-4 w-4 mr-1" />
                Free Decks
              </FilterButton>
              <FilterButton 
                isActive={activeFilter === 'popular'} 
                onClick={() => setActiveFilter('popular')}
              >
                <TrendingUp className="h-4 w-4 mr-1" />
                Popular
              </FilterButton>
              <FilterButton 
                isActive={activeFilter === 'new'} 
                onClick={() => setActiveFilter('new')}
              >
                <Clock className="h-4 w-4 mr-1" />
                New Arrivals
              </FilterButton>
              <FilterButton 
                isActive={activeFilter === 'nft'} 
                onClick={() => setActiveFilter('nft')}
              >
                <TarotLogo className="h-4 w-4 mr-1" />
                NFT Decks
              </FilterButton>
            </div>
          </div>
        </div>
        
        {/* AI Prompt Engine - Show only when we have an elaborate prompt */}
        {promptEngineValue && (
          <motion.div 
            className="mb-8 p-4 bg-primary/5 border border-primary/20 rounded-lg"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="flex items-start gap-3">
              <TarotLogo className="h-5 w-5 text-primary mt-1" />
              <div>
                <h3 className="text-sm font-medium mb-2">AI Theme Inspiration</h3>
                <p className="text-sm text-foreground/90">{promptEngineValue}</p>
              </div>
              <button 
                onClick={() => setPromptEngineValue('')} 
                className="p-1 hover:bg-primary/10 rounded-full ml-auto"
              >
                <XCircle className="h-5 w-5 text-muted-foreground hover:text-foreground" />
              </button>
            </div>
          </motion.div>
        )}
        
        {/* Floating Tarot Cards with Themes */}
        <div 
          ref={suggestionsRef}
          className="mb-8 flex gap-3 overflow-x-auto pb-2 scrollbar-hide" 
        >
          {themeSuggestions.map((theme, index) => (
            <motion.button
              key={`${theme}-${index}`}
              onClick={() => applyThemeSuggestion(theme)}
              disabled={isGeneratingElaborateTheme}
              className={`px-4 py-2 bg-card/80 border border-border hover:border-primary/50 rounded-full text-sm whitespace-nowrap flex-shrink-0 transition-colors ${
                isGeneratingElaborateTheme ? 'opacity-50 cursor-not-allowed' : ''
              }`}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.98 }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: index * 0.05 }}
            >
              {theme}
            </motion.button>
          ))}
          {isGeneratingThemes && (
            <div className="px-4 py-2 bg-card/80 border border-border rounded-full text-sm whitespace-nowrap flex-shrink-0 animate-pulse">
              Loading more...
            </div>
          )}
        </div>
        
        {/* Bento Grid Layout */}
        {!loading && filteredDecks.length > 0 ? (
          <>
            {/* Featured Section */}
            <section className="mb-12">
              <h2 className="text-2xl font-serif font-bold mb-6">Featured Collections</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-6 lg:grid-cols-12 gap-4">
                {/* Main Featured Deck (Large) */}
                <div className="col-span-full md:col-span-6 lg:col-span-6">
                  {getPopularDecks()[0] && (
                    <BentoCard 
                      size="large"
                      deck={getPopularDecks()[0]}
                      badge={getPopularDecks()[0].is_free ? 'free' : (getPopularDecks()[0].is_nft ? 'nft' : 'trending')}
                    />
                  )}
                </div>
                
                {/* Secondary Featured (Medium) */}
                <div className="col-span-full md:col-span-6 lg:col-span-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                  {getTopRatedDecks().map((deck, idx) => (
                    <BentoCard 
                      key={deck.id} 
                      deck={deck} 
                      size="medium" 
                      badge={deck.is_free ? 'free' : (deck.is_nft ? 'nft' : 'top-rated')}
                    />
                  ))}
                </div>
                
                {/* Free Decks Row */}
                {getFreeDecks().length > 0 && (
                  <div className="col-span-full">
                    <h3 className="text-xl font-serif font-medium mb-4 flex items-center">
                      <Zap className="h-5 w-5 text-success mr-2" />
                      Free Decks
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {getFreeDecks().map((deck) => (
                        <BentoCard 
                          key={deck.id} 
                          deck={deck} 
                          size="horizontal" 
                          badge="free"
                        />
                      ))}
                    </div>
                  </div>
                )}
                
                {/* NFT & Premium Decks - Side by side */}
                <div className="col-span-full md:col-span-6">
                  <h3 className="text-xl font-serif font-medium mb-4 flex items-center">
                    <TarotLogo className="h-5 w-5 text-accent mr-2" />
                    NFT Collections
                  </h3>
                  {getNftDecks().length > 0 ? (
                    <div className="grid grid-cols-1 gap-4">
                      {getNftDecks().map((deck) => (
                        <BentoCard 
                          key={deck.id} 
                          deck={deck} 
                          size="horizontal" 
                          badge="nft"
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="bg-card border border-border rounded-xl p-8 text-center">
                      <p className="text-muted-foreground">No NFT decks available</p>
                    </div>
                  )}
                </div>
                
                <div className="col-span-full md:col-span-6">
                  <h3 className="text-xl font-serif font-medium mb-4 flex items-center">
                    <Clock className="h-5 w-5 text-primary mr-2" />
                    New Arrivals
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {getNewestDecks().slice(0, 2).map((deck) => (
                      <BentoCard 
                        key={deck.id} 
                        deck={deck} 
                        size="vertical" 
                        badge="new"
                      />
                    ))}
                  </div>
                </div>
              </div>
            </section>
            
            {/* All Filtered Decks - Standard Grid */}
            <section>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-serif font-bold">All Decks</h2>
                <span className="text-sm text-muted-foreground">
                  {filteredDecks.length} {filteredDecks.length === 1 ? 'deck' : 'decks'} found
                </span>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {filteredDecks.map((deck) => (
                  <DeckPreview key={deck.id} deck={deck} />
                ))}
              </div>
            </section>
          </>
        ) : loading ? (
          <div className="space-y-8">
            {/* Skeleton for featured section */}
            <section className="mb-8">
              <div className="h-8 w-48 bg-muted/30 rounded animate-pulse mb-6"></div>
              
              <div className="grid grid-cols-1 md:grid-cols-6 lg:grid-cols-12 gap-4">
                {/* Main Featured Deck Skeleton */}
                <div className="col-span-full md:col-span-6 lg:col-span-6">
                  <div className="aspect-[3/2] rounded-xl bg-card animate-pulse border border-border overflow-hidden relative">
                    <div className="absolute inset-0 bg-primary/5"></div>
                  </div>
                </div>
                
                {/* Secondary Featured Skeletons */}
                <div className="col-span-full md:col-span-6 lg:col-span-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[1, 2].map((i) => (
                    <div key={i} className="aspect-square rounded-xl bg-card animate-pulse border border-border overflow-hidden"></div>
                  ))}
                </div>
              </div>
            </section>
            
            {/* Skeleton for standard deck grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {Array(8).fill(null).map((_, i) => (
                <div key={i} className="rounded-xl overflow-hidden bg-card border border-border">
                  <div className="aspect-[3/4] bg-primary/10 animate-pulse" />
                  <div className="p-4">
                    <div className="h-6 w-2/3 bg-muted/30 rounded animate-pulse mb-4" />
                    <div className="h-4 bg-muted/30 rounded animate-pulse mb-2" />
                    <div className="h-4 w-2/3 bg-muted/30 rounded animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-20">
            <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-medium mb-2">No decks found</h3>
            <p className="text-muted-foreground">
              Try adjusting your search or filters to find what you're looking for.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

// Bento Card Component
interface BentoCardProps {
  deck: Deck;
  size: 'large' | 'medium' | 'vertical' | 'horizontal';
  badge?: 'new' | 'trending' | 'nft' | 'free' | 'top-rated';
}

const BentoCard = ({ deck, size, badge }: BentoCardProps) => {
  const navigate = (deckId: string) => {
    window.location.href = `/marketplace/${deckId}`;
  };
  
  const getBadgeContent = () => {
    switch (badge) {
      case 'new':
        return (
          <div className="absolute top-3 left-3 bg-primary/90 text-primary-foreground font-medium px-3 py-1 rounded-full text-xs flex items-center">
            <Clock className="h-3 w-3 mr-1" />
            New
          </div>
        );
      case 'trending':
        return (
          <div className="absolute top-3 left-3 bg-warning/90 text-warning-foreground font-medium px-3 py-1 rounded-full text-xs flex items-center">
            <TrendingUp className="h-3 w-3 mr-1" />
            Trending
          </div>
        );
      case 'nft':
        return (
          <div className="absolute top-3 left-3 bg-primary/90 text-primary-foreground font-medium px-3 py-1 rounded-full text-xs flex items-center">
            <TarotLogo className="h-3 w-3 mr-1" />
            NFT
          </div>
        );
      case 'free':
        return (
          <div className="absolute top-3 left-3 bg-success/90 text-success-foreground font-medium px-3 py-1 rounded-full text-xs flex items-center">
            <Zap className="h-3 w-3 mr-1" />
            Free
          </div>
        );
      case 'top-rated':
        return (
          <div className="absolute top-3 left-3 bg-accent/90 text-accent-foreground font-medium px-3 py-1 rounded-full text-xs flex items-center">
            <Star className="h-3 w-3 mr-1" />
            Top Rated
          </div>
        );
      default:
        return null;
    }
  };
  
  // Large Featured Card
  if (size === 'large') {
    return (
      <motion.div 
        className="group rounded-xl overflow-hidden bg-card border border-border hover:border-accent/50 transition-all duration-300 h-full"
        whileHover={{ y: -5, boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)' }}
        onClick={() => navigate(deck.id)}
      >
        <div className="relative aspect-[16/9] overflow-hidden">
          <img 
            src={deck.cover_image} 
            alt={deck.title} 
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
          
          {/* Badge */}
          {getBadgeContent()}
          
          {/* Price Tag */}
          {deck.is_free ? (
            <div className="absolute top-3 right-3 bg-success/90 text-success-foreground font-medium px-3 py-1 rounded-full text-sm flex items-center">
              <Zap className="h-3 w-3 mr-1" />
              Free
            </div>
          ) : (
            <div className="absolute top-3 right-3 bg-accent/90 text-accent-foreground font-medium px-3 py-1 rounded-full text-sm">
              ${deck.price.toFixed(2)}
            </div>
          )}
          
          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
          
          {/* Content overlaid */}
          <div className="absolute bottom-0 left-0 right-0 p-6">
            <h2 className="font-serif text-2xl font-bold text-white mb-2">{deck.title}</h2>
            <p className="text-white/80 text-base mb-4 line-clamp-2">{deck.description}</p>
            
            <div className="flex flex-wrap gap-2 mb-4">
              <span className="bg-white/20 text-white px-3 py-1 rounded-full text-xs">
                {deck.card_count} cards
              </span>
              <span className="bg-white/20 text-white px-3 py-1 rounded-full text-xs capitalize">
                {deck.style}
              </span>
              <span className="bg-white/20 text-white px-3 py-1 rounded-full text-xs capitalize">
                {deck.theme}
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="flex items-center text-accent">
                  <Star className="h-4 w-4 fill-accent text-accent" />
                  <span className="text-white ml-1 font-medium">{deck.rating?.toFixed(1)}</span>
                </div>
                <span className="text-white/60 mx-2">•</span>
                <span className="text-white/60 text-sm">
                  By {deck.creator_name}
                </span>
              </div>
              
              <span className="text-white/60 text-sm">
                {deck.purchase_count} downloads
              </span>
            </div>
          </div>
        </div>
      </motion.div>
    );
  }
  
  // Medium Square Card
  if (size === 'medium') {
    return (
      <motion.div 
        className="group rounded-xl overflow-hidden bg-card border border-border hover:border-accent/50 transition-all duration-300 h-full"
        whileHover={{ y: -5, boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)' }}
        onClick={() => navigate(deck.id)}
      >
        <div className="relative aspect-square overflow-hidden">
          <img 
            src={deck.cover_image} 
            alt={deck.title} 
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
          
          {/* Badge */}
          {getBadgeContent()}
          
          {/* Price Tag */}
          {deck.is_free ? (
            <div className="absolute top-3 right-3 bg-success/90 text-success-foreground font-medium px-3 py-1 rounded-full text-xs flex items-center">
              <Zap className="h-3 w-3 mr-1" />
              Free
            </div>
          ) : (
            <div className="absolute top-3 right-3 bg-accent/90 text-accent-foreground font-medium px-3 py-1 rounded-full text-xs">
              ${deck.price.toFixed(2)}
            </div>
          )}
          
          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
          
          {/* Content overlaid */}
          <div className="absolute bottom-0 left-0 right-0 p-4">
            <h3 className="font-serif text-lg font-bold text-white mb-1">{deck.title}</h3>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center text-white/80 text-xs">
                {deck.rating && (
                  <>
                    <Star className="h-3 w-3 fill-accent text-accent" />
                    <span className="ml-1">{deck.rating.toFixed(1)}</span>
                    <span className="mx-1">•</span>
                  </>
                )}
                <span>
                  {deck.card_count} cards
                </span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    );
  }
  
  // Vertical Card
  if (size === 'vertical') {
    return (
      <motion.div 
        className="group rounded-xl overflow-hidden bg-card border border-border hover:border-accent/50 transition-all duration-300 h-full"
        whileHover={{ y: -5, boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)' }}
        onClick={() => navigate(deck.id)}
      >
        <div className="relative aspect-[2/3] overflow-hidden">
          <img 
            src={deck.cover_image} 
            alt={deck.title} 
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
          
          {/* Badge */}
          {getBadgeContent()}
          
          {/* Price Tag */}
          {deck.is_free ? (
            <div className="absolute top-3 right-3 bg-success/90 text-success-foreground font-medium px-3 py-1 rounded-full text-xs flex items-center">
              <Zap className="h-3 w-3 mr-1" />
              Free
            </div>
          ) : (
            <div className="absolute top-3 right-3 bg-accent/90 text-accent-foreground font-medium px-3 py-1 rounded-full text-xs">
              ${deck.price.toFixed(2)}
            </div>
          )}
        </div>
        
        <div className="p-4">
          <h3 className="font-serif text-lg font-medium line-clamp-1">{deck.title}</h3>
          <p className="text-muted-foreground text-sm line-clamp-2 mt-1 mb-3">{deck.description}</p>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center text-xs text-muted-foreground">
              <span>{deck.card_count} cards</span>
              {deck.rating && (
                <div className="flex items-center ml-2">
                  <Star className="h-3 w-3 fill-current text-accent" />
                  <span className="ml-1">{deck.rating.toFixed(1)}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    );
  }
  
  // Horizontal Card
  return (
    <motion.div 
      className="group rounded-xl overflow-hidden bg-card border border-border hover:border-accent/50 transition-all duration-300"
      whileHover={{ y: -5, boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)' }}
      onClick={() => navigate(deck.id)}
    >
      <div className="flex">
        <div className="relative w-1/3 overflow-hidden">
          <img 
            src={deck.cover_image} 
            alt={deck.title} 
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            style={{ aspectRatio: '3/4' }}
            loading="lazy"
          />
          
          {/* Badge */}
          {getBadgeContent()}
        </div>
        
        <div className="w-2/3 p-4 flex flex-col">
          <h3 className="font-serif text-lg font-medium mb-1 line-clamp-1">{deck.title}</h3>
          <p className="text-muted-foreground text-sm flex-grow line-clamp-2">{deck.description}</p>
          
          <div className="mt-2 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {deck.is_free ? (
                <span className="flex items-center text-success text-sm font-medium">
                  <Zap className="h-3 w-3 mr-1" />
                  Free
                </span>
              ) : (
                <span className="text-accent font-medium">${deck.price.toFixed(2)}</span>
              )}
            </div>
            
            <div className="flex items-center text-xs text-muted-foreground">
              <Star className="h-3 w-3 fill-current text-accent mr-1" />
              <span>{deck.rating?.toFixed(1)}</span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// Filter Button Component
const FilterButton = ({ 
  children, 
  isActive, 
  onClick 
}: { 
  children: React.ReactNode; 
  isActive: boolean; 
  onClick: () => void;
}) => {
  return (
    <button
      onClick={onClick}
      className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition-colors ${
        isActive 
          ? 'bg-primary text-primary-foreground' 
          : 'bg-card hover:bg-secondary/50'
      }`}
    >
      {children}
    </button>
  );
};

export default Marketplace;