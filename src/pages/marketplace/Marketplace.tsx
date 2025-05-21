import { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Search, Filter, Zap, TrendingUp, Clock, Star, XCircle, AlertCircle, Loader } from 'lucide-react';
import DeckPreview from '../../components/ui/DeckPreview';
import { Deck } from '../../types';
import { fetchAllDecks } from '../../lib/deck-utils';
import TarotLogo from '../../components/ui/TarotLogo';

// Mystical loading messages that rotate
const loadingMessages = [
  "Consulting the cosmos...",
  "Channeling mystical energies...",
  "Drawing from the collective unconscious...",
  "Weaving arcane patterns...",
  "Peering into the void...",
  "Aligning with celestial forces...",
  "Communing with ancient wisdom..."
];

const Marketplace = () => {
  const [decks, setDecks] = useState<Deck[]>([]);
  const [displayedDecks, setDisplayedDecks] = useState<Deck[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  
  // Refs for intersection observer
  const observer = useRef<IntersectionObserver | null>(null);
  const lastDeckElementRef = useRef<HTMLDivElement | null>(null);
  
  // Pagination constants
  const DECKS_PER_PAGE = 12;
  
  // Initial decks load
  useEffect(() => {
    const loadDecks = async () => {
      try {
        setLoading(true);
        
        // Fetch decks from Supabase + RiderWaite deck
        const allDecks = await fetchAllDecks();
        setDecks(allDecks);
        
        setLoading(false);
      } catch (error) {
        console.error('Error fetching decks:', error);
        setLoading(false);
      }
    };
    
    loadDecks();
  }, []);
  
  // Filter and search logic
  useEffect(() => {
    let filtered = [...decks];
    
    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(deck => {
        const matchesSearch = deck.title.toLowerCase().includes(query) || 
                          deck.description.toLowerCase().includes(query) ||
                          deck.creator_name.toLowerCase().includes(query) ||
                          deck.theme.toLowerCase().includes(query) || 
                          deck.style.toLowerCase().includes(query);
                          
        return matchesSearch;
      });
    }
    
    // Apply category filter
    switch (activeFilter) {
      case 'all':
        break;
      case 'nft':
        filtered = filtered.filter(deck => deck.is_nft);
        break;
      case 'free':
        filtered = filtered.filter(deck => deck.is_free);
        break;
      case 'popular':
        filtered = filtered.filter(deck => (deck.purchase_count || 0) > 100);
        break;
      case 'new':
        const oneMonthAgo = new Date();
        oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
        filtered = filtered.filter(deck => {
          const deckDate = new Date(deck.created_at);
          return deckDate > oneMonthAgo;
        });
        break;
    }
    
    // Reset pagination when filters change
    setPage(0);
    setHasMore(filtered.length > DECKS_PER_PAGE);
    setDisplayedDecks(filtered.slice(0, DECKS_PER_PAGE));
  }, [activeFilter, searchQuery, decks]);
  
  // Intersection observer for infinite scrolling
  const lastDeckRef = useCallback((node: HTMLDivElement | null) => {
    if (loading || loadingMore) return;
    
    if (observer.current) observer.current.disconnect();
    
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        loadMoreDecks();
      }
    });
    
    if (node) {
      observer.current.observe(node);
      lastDeckElementRef.current = node;
    }
  }, [loading, loadingMore, hasMore]);
  
  // Load more decks
  const loadMoreDecks = useCallback(() => {
    if (!hasMore || loadingMore) return;
    
    setLoadingMore(true);
    
    // Get filtered decks
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
    
    // Simulate loading delay
    setTimeout(() => {
      const nextPage = page + 1;
      const start = nextPage * DECKS_PER_PAGE;
      const end = start + DECKS_PER_PAGE;
      const newItems = filteredDecks.slice(start, end);
      
      if (newItems.length > 0) {
        setDisplayedDecks(prev => [...prev, ...newItems]);
        setPage(nextPage);
        setHasMore(end < filteredDecks.length);
      } else {
        setHasMore(false);
      }
      
      setLoadingMore(false);
    }, 600);
  }, [page, decks, hasMore, loadingMore, activeFilter, searchQuery]);

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
        
        {/* Main content area with sidebar layout */}
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar with search and filters - 33.3% */}
          <div className="w-full lg:w-1/3 space-y-6">
            {/* Search bar */}
            <div className="relative w-full">
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
            <div className="space-y-2">
              <h3 className="text-sm font-medium mb-2">Filter Decks</h3>
              <div className="flex flex-col space-y-2">
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
            
            {/* Results count */}
            <div className="text-sm text-muted-foreground">
              Showing {displayedDecks.length} of {decks.filter(deck => {
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
              }).length} decks
            </div>
          </div>
          
          {/* Main content area - 66.7% */}
          <div className="w-full lg:w-2/3">
            {!loading && displayedDecks.length > 0 ? (
              <>
                {/* All Filtered Decks - Standard Grid */}
                <section>
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-serif font-bold">All Decks</h2>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {displayedDecks.map((deck, index) => {
                      // Add ref to last item for infinite scrolling
                      if (index === displayedDecks.length - 1) {
                        return (
                          <div ref={lastDeckRef} key={deck.id}>
                            <DeckPreview deck={deck} />
                          </div>
                        );
                      }
                      return <DeckPreview key={deck.id} deck={deck} />;
                    })}
                  </div>
                  
                  {/* Loading more indicator */}
                  {loadingMore && (
                    <div className="text-center py-8">
                      <div className="flex items-center justify-center">
                        <Loader className="h-6 w-6 text-primary animate-spin mr-2" />
                        <span>Loading more decks...</span>
                      </div>
                    </div>
                  )}
                  
                  {/* No more decks indicator */}
                  {!hasMore && displayedDecks.length > 0 && !loadingMore && (
                    <div className="text-center py-8 text-muted-foreground">
                      <p>You've reached the end of the marketplace</p>
                    </div>
                  )}
                </section>
              </>
            ) : loading ? (
              <div className="space-y-8">
                {/* Skeleton loading state */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
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
      </div>
    </div>
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
      className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition-colors w-full ${
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