import { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { User } from '../../../types';
import { fetchAllReaders } from '../../../lib/reader-services';
import { CachedReaders } from '../types';
import { CACHE_DURATION, REFRESH_INTERVAL_DURATION } from '../constants';

export function useReaderDataManagement() {
  const location = useLocation();
  const [readers, setReaders] = useState<User[]>([]);
  const [cachedReaders, setCachedReaders] = useState<CachedReaders | null>(null);
  const [loading, setLoading] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true); // True until the first data load attempt for the page
  const [error, setError] = useState<string | null>(null);

  const performFetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const readersData = await fetchAllReaders();
      const validReadersData = Array.isArray(readersData) ? readersData : [];
      setReaders(validReadersData);
      setCachedReaders({ data: validReadersData, timestamp: Date.now() });
    } catch (err: any) {
      console.error("Error fetching readers:", err);
      setError(err.message || 'Failed to load readers');
      setReaders([]); // Ensure readers is an empty array on error
    } finally {
      setLoading(false);
      setInitialLoad(false); // First data load attempt is complete
    }
  }, []); // No dependencies, it's a stable fetch function

  useEffect(() => {
    if (location.pathname === '/readers') {
      setInitialLoad(true); // Reset initialLoad on navigating to the page
      setError(null); // Clear previous errors

      const now = Date.now();
      if (cachedReaders && (now - cachedReaders.timestamp < CACHE_DURATION)) {
        setReaders(cachedReaders.data);
        setInitialLoad(false); // Data loaded from cache
        setLoading(false);     // Not loading from network
      } else {
        performFetch(); // Fetch new data
      }
    } else {
      // Optional: If navigating away, reset states if necessary for immediate re-entry behavior
      // setInitialLoad(true); 
      // setReaders([]);
    }
  }, [location.pathname, cachedReaders, performFetch]); // Re-run if path, cache changes, or performFetch identity changes (it shouldn't)

  // Background refresh interval
  useEffect(() => {
    const refreshInterval = setInterval(async () => {
      if (location.pathname === '/readers' && document.visibilityState === 'visible' && !loading) {
        // No need to setInitialLoad true for background refresh
        // setLoading(true); // Can set loading if visual feedback for refresh is desired
        try {
          const readersData = await fetchAllReaders();
          const validReadersData = Array.isArray(readersData) ? readersData : [];
          setReaders(validReadersData);
          setCachedReaders({ data: validReadersData, timestamp: Date.now() });
        } catch (err) {
          console.error("Error refreshing readers during interval:", err);
        }
        // setLoading(false); // If set true above
      }
    }, REFRESH_INTERVAL_DURATION);

    return () => clearInterval(refreshInterval);
  }, [location.pathname, loading, cachedReaders]); // Add loading and cachedReaders

  return { readers, loading, initialLoad, error };
} 