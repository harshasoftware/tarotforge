import { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { User } from '../../../types';
import { fetchAllReaders } from '../../../lib/reader-services';
import { REFRESH_INTERVAL_DURATION } from '../constants';

export function useReaderDataManagement() {
  const location = useLocation();
  const [readers, setReaders] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const performFetch = useCallback(async () => {
    console.log('[useReaderDataManagement] Starting fetch');
    setLoading(true);
    setError(null);
    try {
      const readersData = await fetchAllReaders();
      console.log('[useReaderDataManagement] Fetched data:', readersData);
      const validReadersData = Array.isArray(readersData) ? readersData : [];
      setReaders(validReadersData);
    } catch (err: any) {
      console.error("[useReaderDataManagement] Error fetching readers:", err);
      setError(err.message || 'Failed to load readers');
      setReaders([]);
    } finally {
      setLoading(false);
      setInitialLoad(false);
    }
  }, []);

  useEffect(() => {
    console.log('[useReaderDataManagement] Location changed:', location.pathname);
    if (location.pathname === '/readers') {
      setInitialLoad(true);
      setError(null);
      performFetch();
    }
  }, [location.pathname, performFetch]);

  // Background refresh interval
  useEffect(() => {
    const refreshInterval = setInterval(async () => {
      if (location.pathname === '/readers' && document.visibilityState === 'visible' && !loading) {
        try {
          console.log('[useReaderDataManagement] Background refresh');
          const readersData = await fetchAllReaders();
          const validReadersData = Array.isArray(readersData) ? readersData : [];
          setReaders(validReadersData);
        } catch (err) {
          console.error("[useReaderDataManagement] Error refreshing readers during interval:", err);
        }
      }
    }, REFRESH_INTERVAL_DURATION);

    return () => clearInterval(refreshInterval);
  }, [location.pathname, loading]);

  return { readers, loading, initialLoad, error };
} 