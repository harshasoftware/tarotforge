import { useState, useEffect } from 'react';
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
  const [initialLoad, setInitialLoad] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);
      try {
        const readersData = await fetchAllReaders();
        setReaders(readersData);
        setCachedReaders({ data: readersData, timestamp: Date.now() });
      } catch (err: any) {
        setError(err.message || 'Failed to load readers');
        setReaders([]);
      } finally {
        setLoading(false);
        setInitialLoad(false);
      }
    };

    if (location.pathname === '/readers') {
      if (cachedReaders && (Date.now() - cachedReaders.timestamp < CACHE_DURATION)) {
        setReaders(cachedReaders.data);
        setInitialLoad(false);
        setLoading(false);
      } else {
        setInitialLoad(true);
        loadData();
      }
    }

    const refreshInterval = setInterval(async () => {
      if (location.pathname === '/readers' && document.visibilityState === 'visible') {
        try {
          const readersData = await fetchAllReaders();
          setReaders(readersData);
          setCachedReaders({ data: readersData, timestamp: Date.now() });
        } catch (err) {
          console.error("Error refreshing readers:", err);
        }
      }
    }, REFRESH_INTERVAL_DURATION);

    return () => clearInterval(refreshInterval);
  }, [location.pathname]);

  return { readers, loading, initialLoad, error };
} 