import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Search, UserCheck, Users, Filter, Clock, CrownIcon, Star, DollarSign, Loader, SortAsc, SortDesc } from 'lucide-react';
import ReaderCard from '../../components/readers/ReaderCard';
import { useAuthStore } from '../../stores/authStore';
import TarotLogo from '../../components/ui/TarotLogo';

// Import hooks
import { useReaderDataManagement } from './hooks/useReaderDataManagement';
import { useReaderFilteringAndSorting } from './hooks/useReaderFilteringAndSorting';
import { useReaderPagination } from './hooks/useReaderPagination';

// Import components
import FilterButton from './components/FilterButton';
import SortButton from './components/SortButton';
import ReaderLevelsLegend from './components/ReaderLevelsLegend';

// Import types
import { SortOption, ActiveFilter } from './types';

const ReadersPage: React.FC = () => {
  const { user } = useAuthStore();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>('all');
  const [sortOption, setSortOption] = useState<SortOption>('none');
  const [selectedLevelNameFilter, setSelectedLevelNameFilter] = useState<string | null>(null);

  const { readers: allReaders, loading: dataLoading, initialLoad, error } = useReaderDataManagement();
  const { filteredReaders } = useReaderFilteringAndSorting(allReaders, searchQuery, activeFilter, sortOption, selectedLevelNameFilter);
  const { displayedReaders, loadingMore, hasMore, lastReaderRef } = useReaderPagination(filteredReaders);

  const handleLevelSelect = (levelName: string) => {
    setSelectedLevelNameFilter(levelName);
  };

  const handleResetLevelFilter = () => {
    setSelectedLevelNameFilter(null);
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setSortOption('none');
    setActiveFilter('all');
    setSelectedLevelNameFilter(null);
  };
  
  const getSortLabel = (currentSort: SortOption) => {
    switch(currentSort) {
        case 'level-asc': return 'Level (Low to High)';
        case 'level-desc': return 'Level (High to Low)';
        case 'price-asc': return 'Price (Low to High)';
        case 'price-desc': return 'Price (High to Low)';
        default: return '';
    }
  };

  const renderContent = () => {
    if (initialLoad) {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-card border border-border rounded-xl p-6 animate-pulse">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-16 h-16 rounded-full bg-muted/50" />
                <div className="flex-1 space-y-2">
                  <div className="h-5 w-3/4 bg-muted/50 rounded" />
                  <div className="h-4 w-1/2 bg-muted/50 rounded" />
                </div>
              </div>
              <div className="space-y-2">
                <div className="h-4 bg-muted/50 rounded" />
                <div className="h-4 bg-muted/50 rounded" />
                <div className="h-4 w-5/6 bg-muted/50 rounded mb-2" />
              </div>
              <div className="flex gap-2 mt-3 pt-3 border-t border-border">
                <div className="flex-1 h-9 bg-muted/50 rounded" />
                <div className="flex-1 h-9 bg-muted/50 rounded" />
              </div>
            </div>
          ))}
        </div>
      );
    }

    if (error) {
      return (
        <div className="text-center py-12">
          <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-6 max-w-md mx-auto">
            <UserCheck className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-medium mb-2">Unable to Load Readers</h2>
            <p className="text-muted-foreground mb-6">{error}</p>
            <button onClick={() => window.location.reload()} className="btn btn-primary px-6 py-2">
              Try Again
            </button>
          </div>
        </div>
      );
    }

    if (filteredReaders.length === 0 && !dataLoading) {
      return (
        <div className="text-center py-12">
          <div className="bg-muted/20 border border-border rounded-lg p-8 max-w-md mx-auto">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-medium mb-2">No Readers Found</h2>
            <p className="text-muted-foreground mb-4">
              {searchQuery || sortOption !== 'none' || activeFilter !== 'all' || selectedLevelNameFilter
                ? "No readers match your search or filter criteria. Try adjusting your filters."
                : "We don't have any certified readers available right now. Check back soon!"}
            </p>
            {(searchQuery || sortOption !== 'none' || activeFilter !== 'all' || selectedLevelNameFilter) && (
              <button onClick={handleClearFilters} className="btn btn-secondary px-6 py-2">
                Clear All Filters
              </button>
            )}
          </div>
        </div>
      );
    }

    if (displayedReaders.length > 0) {
      return (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {displayedReaders.map((reader, index) => (
              <div ref={index === displayedReaders.length - 1 ? lastReaderRef : null} key={reader.id}>
                <ReaderCard reader={reader} />
              </div>
            ))}
          </div>
          {loadingMore && (
            <div className="text-center py-8 flex items-center justify-center">
              <Loader className="h-6 w-6 text-primary animate-spin mr-2" />
              <span>Loading more readers...</span>
            </div>
          )}
          {!hasMore && displayedReaders.length > 0 && !loadingMore && (
            <div className="text-center py-8 text-muted-foreground">
              <p>No more readers to load</p>
            </div>
          )}
        </>
      );
    }

    return null;
  };

  return (
    <div className="min-h-screen pt-12 pb-20 bg-background text-foreground">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center py-8 mb-10"
        >
          <div className="inline-block rounded-full bg-accent/20 p-3 mb-4">
            <UserCheck className="h-10 w-10 text-accent" />
          </div>
          <h1 className="text-3xl md:text-4xl font-serif font-bold mb-3">Certified Tarot Readers</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Connect with certified readers for personalized insights on your spiritual journey.
          </p>
        </motion.div>
        
        <div className="flex flex-col lg:flex-row gap-8">
          <aside className="w-full lg:w-1/3 space-y-6 lg:sticky lg:top-20 self-start">
            <div className="relative w-full">
              <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground pointer-events-none">
                <Search className="h-5 w-5" />
              </div>
              <input 
                type="text"
                placeholder="Search readers or specialties..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-md bg-card border border-input focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            
            <div className="space-y-1.5">
              <h3 className="text-xs font-semibold uppercase text-muted-foreground tracking-wider mb-2">Filter By Category</h3>
              <FilterButton active={activeFilter === 'all' && !selectedLevelNameFilter} onClick={() => { setActiveFilter('all'); setSelectedLevelNameFilter(null); }} icon={<Users />}>All Readers</FilterButton>
              <FilterButton active={activeFilter === 'new' && !selectedLevelNameFilter} onClick={() => { setActiveFilter('new'); setSelectedLevelNameFilter(null); }} icon={<Clock />}>Newest</FilterButton>
              <FilterButton active={activeFilter === 'top-rated' && !selectedLevelNameFilter} onClick={() => { setActiveFilter('top-rated'); setSelectedLevelNameFilter(null); }} icon={<Star />}>Top Rated</FilterButton>
              <FilterButton active={activeFilter === 'advanced' && !selectedLevelNameFilter} onClick={() => { setActiveFilter('advanced'); setSelectedLevelNameFilter(null); }} icon={<CrownIcon />}>Advanced Levels</FilterButton>
            </div>
            
            <ReaderLevelsLegend 
              selectedLevelName={selectedLevelNameFilter}
              onLevelSelect={handleLevelSelect}
              onResetFilter={handleResetLevelFilter}
            />
            
            <div className="space-y-1.5">
              <h3 className="text-xs font-semibold uppercase text-muted-foreground tracking-wider mb-2">Sort By</h3>
              <SortButton active={sortOption === 'level-asc'} onClick={() => setSortOption(prev => prev === 'level-asc' ? 'none' : 'level-asc')}>
                <span className="flex items-center"><CrownIcon className="h-3.5 w-3.5 mr-1.5" />Level</span> {sortOption === 'level-asc' ? <SortAsc className="h-4 w-4 text-accent"/> : <SortDesc className="h-4 w-4 opacity-30"/>}
              </SortButton>
              <SortButton active={sortOption === 'level-desc'} onClick={() => setSortOption(prev => prev === 'level-desc' ? 'none' : 'level-desc')}>
                <span className="flex items-center"><CrownIcon className="h-3.5 w-3.5 mr-1.5" />Level</span> {sortOption === 'level-desc' ? <SortDesc className="h-4 w-4 text-accent"/> : <SortAsc className="h-4 w-4 opacity-30"/>}
              </SortButton>
              <SortButton active={sortOption === 'price-asc'} onClick={() => setSortOption(prev => prev === 'price-asc' ? 'none' : 'price-asc')}>
                <span className="flex items-center"><DollarSign className="h-3.5 w-3.5 mr-1.5" />Price</span> {sortOption === 'price-asc' ? <SortAsc className="h-4 w-4 text-accent"/> : <SortDesc className="h-4 w-4 opacity-30"/>}
              </SortButton>
              <SortButton active={sortOption === 'price-desc'} onClick={() => setSortOption(prev => prev === 'price-desc' ? 'none' : 'price-desc')}>
                <span className="flex items-center"><DollarSign className="h-3.5 w-3.5 mr-1.5" />Price</span> {sortOption === 'price-desc' ? <SortDesc className="h-4 w-4 text-accent"/> : <SortAsc className="h-4 w-4 opacity-30"/>}
              </SortButton>
            </div>
            
            <div className="text-xs text-muted-foreground pt-2">
              Showing {displayedReaders.length} of {filteredReaders.length} {filteredReaders.length === 1 ? 'reader' : 'readers'}
              {sortOption !== 'none' && ( <span className="block">Sorted by: {getSortLabel(sortOption)}</span> )}
              {selectedLevelNameFilter && ( <span className="block">Filtered by Level: {selectedLevelNameFilter}</span>)}
            </div>
            
            {(searchQuery || sortOption !== 'none' || activeFilter !== 'all' || selectedLevelNameFilter) && (
              <button onClick={handleClearFilters} className="w-full btn btn-secondary py-2.5 flex items-center justify-center text-sm">
                <Filter className="h-4 w-4 mr-2" /> Clear All Filters
              </button>
            )}
          </aside>
          
          <main className="w-full lg:w-2/3">
            {renderContent()}
          </main>
        </div>
        
        {user && !user.is_reader && !initialLoad && !error && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="mt-16 bg-gradient-to-br from-primary/15 to-accent/15 border border-border rounded-xl p-8 text-center"
          >
            <div className="max-w-xl mx-auto">
              <div className="inline-block rounded-full bg-primary/20 p-3 mb-4">
                <TarotLogo className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-2xl font-serif font-bold mb-3">Share Your Tarot Wisdom</h2>
              <p className="mb-6 text-muted-foreground">
                Join our community. Take the certification quiz to showcase your tarot knowledge and connect with seekers.
              </p>
              <Link to="/become-reader" className="btn btn-primary px-6 py-2.5 inline-flex items-center text-sm">
                <CrownIcon className="h-4 w-4 mr-2" /> Become a Certified Reader
              </Link>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default ReadersPage;