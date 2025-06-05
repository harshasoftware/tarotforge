import { useState, useEffect } from 'react';
import { User } from '../../../types';
import { ActiveFilter, SortOption } from '../types';

export function useReaderFilteringAndSorting(
  allReaders: User[],
  searchQuery: string,
  activeFilter: ActiveFilter,
  sortOption: SortOption,
  selectedLevelNameFilter: string | null
) {
  const [filteredReaders, setFilteredReaders] = useState<User[]>([]);

  useEffect(() => {
    let processedReaders = [...allReaders];

    if (selectedLevelNameFilter) {
      processedReaders = processedReaders.filter(
        r => r.readerLevel?.name === selectedLevelNameFilter
      );
    }

    if (searchQuery && !selectedLevelNameFilter) {
      const query = searchQuery.toLowerCase();
      processedReaders = processedReaders.filter(
        r => r.username?.toLowerCase().includes(query) ||
             r.email?.toLowerCase().includes(query) ||
             r.bio?.toLowerCase().includes(query)
      );
    }

    if (!selectedLevelNameFilter) {
      switch (activeFilter) {
        case 'new':
          processedReaders.sort((a, b) => new Date(b.reader_since || '').getTime() - new Date(a.reader_since || '').getTime());
          break;
        case 'top-rated':
          processedReaders.sort((a, b) => (b.average_rating || 0) - (a.average_rating || 0));
          break;
        case 'advanced':
          processedReaders = processedReaders.filter(r => r.readerLevel && r.readerLevel.rank_order >= 3);
          break;
        default: // 'all'
          break;
      }
    }

    switch(sortOption) {
      case 'level-asc':
        processedReaders.sort((a, b) => (a.readerLevel?.rank_order || 1) - (b.readerLevel?.rank_order || 1));
        break;
      case 'level-desc':
        processedReaders.sort((a, b) => (b.readerLevel?.rank_order || 1) - (a.readerLevel?.rank_order || 1));
        break;
      case 'price-asc':
        processedReaders.sort((a, b) => (a.readerLevel?.base_price_per_minute || 0.25) - (b.readerLevel?.base_price_per_minute || 0.25));
        break;
      case 'price-desc':
        processedReaders.sort((a, b) => (b.readerLevel?.base_price_per_minute || 0.25) - (a.readerLevel?.base_price_per_minute || 0.25));
        break;
      default: // 'none'
        break;
    }
    setFilteredReaders(processedReaders);
  }, [allReaders, searchQuery, activeFilter, sortOption, selectedLevelNameFilter]);

  return { filteredReaders };
} 