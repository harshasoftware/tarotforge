import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Search, UserCheck, Users, Filter, Clock, CrownIcon, Star, Flame, Sparkles, Heart, Sun, SortAsc, SortDesc, DollarSign } from 'lucide-react';
import ReaderCard from '../../components/readers/ReaderCard';
import { User } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { fetchAllReaders } from '../../lib/reader-services';
import TarotLogo from '../../components/ui/TarotLogo';

// Sort options type
type SortOption = 'level-asc' | 'level-desc' | 'price-asc' | 'price-desc' | 'none';

const ReadersPage: React.FC = () => {
  const { user } = useAuth();
  const [readers, setReaders] = useState<User[]>([]);
  const [filteredReaders, setFilteredReaders] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<'all' | 'new' | 'top-rated' | 'advanced'>('all');
  const [sortOption, setSortOption] = useState<SortOption>('none');
  
  useEffect(() => {
    const loadReaders = async () => {
      try {
        setLoading(true);
        const readersData = await fetchAllReaders();
        setReaders(readersData);
        setFilteredReaders(readersData);
      } catch (err: any) {
        setError(err.message || 'Failed to load readers');
      } finally {
        setLoading(false);
      }
    };
    
    loadReaders();
  }, []);
  
  // Filter readers based on search query and active filter
  useEffect(() => {
    let filtered = [...readers];
    
    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        r => r.username?.toLowerCase().includes(query) || 
             r.email.toLowerCase().includes(query) || 
             r.bio?.toLowerCase().includes(query)
      );
    }
    
    // Apply category filter
    switch (activeFilter) {
      case 'new':
        // Sort by reader_since, newest first
        filtered = [...filtered].sort(
          (a, b) => new Date(b.reader_since || '').getTime() - new Date(a.reader_since || '').getTime()
        );
        break;
      case 'top-rated':
        // Sort by average rating, highest first
        filtered = [...filtered].sort(
          (a, b) => (b.average_rating || 5) - (a.average_rating || 5)
        );
        break;
      case 'advanced':
        // Filter to show only readers with higher levels (rank 3+)
        filtered = filtered.filter(
          r => r.readerLevel && r.readerLevel.rank_order >= 3
        );
        break;
      default:
        // Keep default order
        break;
    }
    
    // Apply sort option
    switch(sortOption) {
      case 'level-asc':
        // Sort by level, lowest to highest
        filtered = [...filtered].sort(
          (a, b) => (a.readerLevel?.rank_order || 1) - (b.readerLevel?.rank_order || 1)
        );
        break;
      case 'level-desc':
        // Sort by level, highest to lowest
        filtered = [...filtered].sort(
          (a, b) => (b.readerLevel?.rank_order || 1) - (a.readerLevel?.rank_order || 1)
        );
        break;
      case 'price-asc':
        // Sort by price, lowest to highest
        filtered = [...filtered].sort(
          (a, b) => (a.readerLevel?.base_price_per_minute || 0.25) - (b.readerLevel?.base_price_per_minute || 0.25)
        );
        break;
      case 'price-desc':
        // Sort by price, highest to lowest
        filtered = [...filtered].sort(
          (a, b) => (b.readerLevel?.base_price_per_minute || 0.25) - (a.readerLevel?.base_price_per_minute || 0.25)
        );
        break;
      default:
        // Use the filter sort order established above
        break;
    }
    
    setFilteredReaders(filtered);
  }, [searchQuery, activeFilter, readers, sortOption]);
  
  // Filter button component
  const FilterButton: React.FC<{
    active: boolean;
    onClick: () => void;
    icon: React.ReactNode;
    children: React.ReactNode;
  }> = ({ active, onClick, icon, children }) => (
    <button
      onClick={onClick}
      className={`flex items-center px-4 py-2 rounded-md text-sm transition-colors ${
        active ? 'bg-primary text-primary-foreground' : 'hover:bg-secondary/50'
      }`}
    >
      {React.cloneElement(icon as React.ReactElement, { className: 'h-4 w-4 mr-2' })}
      {children}
    </button>
  );
  
  // Sort button component
  const SortButton: React.FC<{
    active: boolean;
    onClick: () => void;
    children: React.ReactNode;
  }> = ({ active, onClick, children }) => (
    <button
      onClick={onClick}
      className={`flex items-center px-4 py-1.5 rounded text-xs transition-colors ${
        active ? 'bg-accent/20 text-accent-foreground' : 'bg-muted/30 hover:bg-muted/50'
      }`}
    >
      {children}
    </button>
  );
  
  return (
    <div className="min-h-screen pt-12 pb-20">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="py-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center mb-12"
          >
            <div className="flex justify-center mb-4">
              <div className="rounded-full bg-accent/20 p-3">
                <UserCheck className="h-10 w-10 text-accent" />
              </div>
            </div>
            <h1 className="text-3xl md:text-4xl font-serif font-bold mb-3">Certified Tarot Readers</h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Connect with our community of certified readers for personalized insights and guidance on your spiritual journey.
            </p>
          </motion.div>
          
          {/* Search and Filters */}
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between mb-8">
            <div className="relative w-full md:w-96">
              <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">
                <Search className="h-5 w-5" />
              </div>
              <input 
                type="text"
                placeholder="Search by reader name or specialties..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-md bg-card border border-input focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            
            <div className="flex items-center space-x-2 overflow-x-auto pb-2 w-full md:w-auto">
              <FilterButton 
                active={activeFilter === 'all'} 
                onClick={() => setActiveFilter('all')} 
                icon={<Users />}
              >
                All Readers
              </FilterButton>
              <FilterButton 
                active={activeFilter === 'new'} 
                onClick={() => setActiveFilter('new')} 
                icon={<Clock />}
              >
                Newest
              </FilterButton>
              <FilterButton 
                active={activeFilter === 'top-rated'} 
                onClick={() => setActiveFilter('top-rated')} 
                icon={<Star />}
              >
                Top Rated
              </FilterButton>
              <FilterButton 
                active={activeFilter === 'advanced'} 
                onClick={() => setActiveFilter('advanced')} 
                icon={<CrownIcon />}
              >
                Advanced Levels
              </FilterButton>
            </div>
          </div>
          
          {/* Sort options */}
          <div className="mb-6 flex flex-wrap items-center gap-2">
            <span className="text-sm text-muted-foreground mr-1">Sort by:</span>
            <SortButton 
              active={sortOption === 'level-asc'} 
              onClick={() => setSortOption(sortOption === 'level-asc' ? 'none' : 'level-asc')}
            >
              <CrownIcon className="h-3 w-3 mr-1" />
              Level (Low to High)
              <SortAsc className="h-3 w-3 ml-1" />
            </SortButton>
            
            <SortButton 
              active={sortOption === 'level-desc'} 
              onClick={() => setSortOption(sortOption === 'level-desc' ? 'none' : 'level-desc')}
            >
              <CrownIcon className="h-3 w-3 mr-1" />
              Level (High to Low) 
              <SortDesc className="h-3 w-3 ml-1" />
            </SortButton>
            
            <SortButton 
              active={sortOption === 'price-asc'} 
              onClick={() => setSortOption(sortOption === 'price-asc' ? 'none' : 'price-asc')}
            >
              <DollarSign className="h-3 w-3 mr-1" />
              Price (Low to High)
              <SortAsc className="h-3 w-3 ml-1" />
            </SortButton>
            
            <SortButton 
              active={sortOption === 'price-desc'} 
              onClick={() => setSortOption(sortOption === 'price-desc' ? 'none' : 'price-desc')}
            >
              <DollarSign className="h-3 w-3 mr-1" />
              Price (High to Low)
              <SortDesc className="h-3 w-3 ml-1" />
            </SortButton>
          </div>
        </div>
        
        {loading ? (
          // Loading state
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="bg-card border border-border rounded-xl overflow-hidden">
                <div className="p-6">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-16 h-16 rounded-full bg-muted/50 animate-pulse" />
                    <div className="flex-1">
                      <div className="h-6 w-32 bg-muted/50 rounded animate-pulse mb-2" />
                      <div className="h-4 w-24 bg-muted/50 rounded animate-pulse" />
                    </div>
                  </div>
                  <div className="h-4 bg-muted/50 rounded animate-pulse mb-2" />
                  <div className="h-4 bg-muted/50 rounded animate-pulse mb-2" />
                  <div className="h-4 w-3/4 bg-muted/50 rounded animate-pulse mb-4" />
                  <div className="flex gap-2 mb-4">
                    <div className="h-6 w-20 bg-muted/50 rounded-full animate-pulse" />
                    <div className="h-6 w-24 bg-muted/50 rounded-full animate-pulse" />
                  </div>
                  <div className="flex gap-2 mt-4 pt-4 border-t border-border">
                    <div className="flex-1 h-10 bg-muted/50 rounded animate-pulse" />
                    <div className="flex-1 h-10 bg-muted/50 rounded animate-pulse" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          // Error state
          <div className="text-center py-12">
            <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-6 max-w-md mx-auto">
              <UserCheck className="h-12 w-12 text-destructive mx-auto mb-4" />
              <h2 className="text-xl font-medium mb-2">Unable to Load Readers</h2>
              <p className="text-muted-foreground mb-6">{error}</p>
              <button 
                onClick={() => window.location.reload()}
                className="btn btn-primary px-6 py-2"
              >
                Try Again
              </button>
            </div>
          </div>
        ) : filteredReaders.length === 0 ? (
          // Empty results state
          <div className="text-center py-12">
            <div className="bg-muted/20 border border-border rounded-lg p-8 max-w-md mx-auto">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-xl font-medium mb-2">No Readers Found</h2>
              {searchQuery || sortOption !== 'none' ? (
                <p className="text-muted-foreground mb-4">
                  No readers match your search or filter criteria. Try different keywords or clear your filters.
                </p>
              ) : (
                <p className="text-muted-foreground mb-4">
                  We don't have any certified readers available at the moment. Check back soon!
                </p>
              )}
              {(searchQuery || sortOption !== 'none' || activeFilter !== 'all') && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSortOption('none');
                    setActiveFilter('all');
                  }}
                  className="btn btn-secondary px-6 py-2"
                >
                  Clear All Filters
                </button>
              )}
            </div>
          </div>
        ) : (
          <>
            {/* Reader levels legend - Using chakra system colors */}
            <div className="mb-8 bg-card/50 border border-border rounded-lg p-4">
              <h2 className="font-medium mb-3">Reader Certification Levels</h2>
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-red-500 rounded-full mr-2"></div>
                  <span className="text-sm">Novice Seer</span>
                </div>
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-orange-500 rounded-full mr-2"></div>
                  <span className="text-sm">Mystic Adept</span>
                </div>
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-yellow-500 rounded-full mr-2"></div>
                  <span className="text-sm">Ethereal Guide</span>
                </div>
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-green-500 rounded-full mr-2"></div>
                  <span className="text-sm">Celestial Oracle</span>
                </div>
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-violet-500 rounded-full mr-2"></div>
                  <span className="text-sm">Arcane Hierophant</span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Readers progress through levels by demonstrating expertise, maintaining high ratings, and completing readings.
              </p>
            </div>
            
            {/* Results count and active filters */}
            <div className="mb-4 flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Showing {filteredReaders.length} {filteredReaders.length === 1 ? 'reader' : 'readers'}
                {sortOption !== 'none' && (
                  <span> • Sorted by: {
                    sortOption === 'level-asc' ? 'Level (Low to High)' :
                    sortOption === 'level-desc' ? 'Level (High to Low)' :
                    sortOption === 'price-asc' ? 'Price (Low to High)' :
                    'Price (High to Low)'
                  }</span>
                )}
              </div>
              
              {(searchQuery || sortOption !== 'none' || activeFilter !== 'all') && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSortOption('none');
                    setActiveFilter('all');
                  }}
                  className="text-xs text-primary hover:underline flex items-center"
                >
                  Clear Filters
                  <Filter className="h-3 w-3 ml-1" />
                </button>
              )}
            </div>
            
            {/* Readers grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredReaders.map(reader => (
                <ReaderCard key={reader.id} reader={reader} />
              ))}
            </div>
            
            {/* Become a reader CTA - only show if user is not already a reader */}
            {user && !user.is_reader && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="mt-16 bg-gradient-to-br from-primary/20 to-accent/20 border border-border rounded-xl p-8 text-center"
              >
                <div className="max-w-2xl mx-auto">
                  <div className="flex justify-center mb-4">
                    <div className="rounded-full bg-primary/20 p-3">
                      <TarotLogo className="h-8 w-8 text-primary" />
                    </div>
                  </div>
                  <h2 className="text-2xl font-serif font-bold mb-3">Share Your Tarot Wisdom</h2>
                  <p className="mb-6">
                    Join our community of certified tarot readers. Take the certification quiz to showcase your tarot knowledge and connect with seekers from around the world.
                  </p>
                  <Link 
                    to="/become-reader" 
                    className="btn btn-primary px-6 py-2 inline-flex items-center"
                  >
                    <CrownIcon className="h-4 w-4 mr-2" />
                    Become a Certified Reader
                  </Link>
                </div>
              </motion.div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ReadersPage;