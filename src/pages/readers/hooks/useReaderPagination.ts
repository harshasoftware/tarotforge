import { useState, useEffect, useCallback, useRef } from 'react';
import { User } from '../../../types';
import { ITEMS_PER_PAGE } from '../constants';

export function useReaderPagination(filteredReaders: User[]) {
  const [displayedReaders, setDisplayedReaders] = useState<User[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const observer = useRef<IntersectionObserver | null>(null);
  const lastReaderElementRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setPage(0);
    setDisplayedReaders(filteredReaders.slice(0, ITEMS_PER_PAGE));
    setHasMore(filteredReaders.length > ITEMS_PER_PAGE);
  }, [filteredReaders]);

  const loadMoreReaders = useCallback(() => {
    if (!hasMore || loadingMore) return;
    setLoadingMore(true);

    setTimeout(() => {
      const nextPage = page + 1;
      const start = nextPage * ITEMS_PER_PAGE;
      const end = start + ITEMS_PER_PAGE;
      const newItems = filteredReaders.slice(start, end);

      if (newItems.length > 0) {
        setDisplayedReaders(prev => [...prev, ...newItems]);
        setPage(nextPage);
        setHasMore(end < filteredReaders.length);
      } else {
        setHasMore(false);
      }
      setLoadingMore(false);
    }, 600);
  }, [page, filteredReaders, hasMore, loadingMore]);
  
  const lastReaderRef = useCallback((node: HTMLDivElement | null) => {
    if (loadingMore) return;
    if (observer.current) observer.current.disconnect();
    
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        loadMoreReaders();
      }
    });
    
    if (node) {
      observer.current.observe(node);
      lastReaderElementRef.current = node;
    }
  }, [loadingMore, hasMore, loadMoreReaders]);

  return { displayedReaders, loadingMore, hasMore, lastReaderRef };
} 