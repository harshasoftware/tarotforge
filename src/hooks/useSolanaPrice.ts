import { useState, useEffect, useCallback } from 'react';

const SOL_RATE_CACHE_KEY = 'solUsdRateData';
const CACHE_DURATION_MS = 60 * 60 * 1000; // 1 hour

interface SolanaPriceData {
  solUsdRate: number | null;
  isFetchingSolRate: boolean;
  triggerSolRateFetch: () => Promise<void>;
  getSolDisplayPrice: (usdPrice: number | undefined) => string | null;
}

export const useSolanaPrice = (): SolanaPriceData => {
  const [solUsdRate, setSolUsdRate] = useState<number | null>(null);
  const [solUsdRateTimestamp, setSolUsdRateTimestamp] = useState<number | null>(null);
  const [isFetchingSolRate, setIsFetchingSolRate] = useState<boolean>(false);

  useEffect(() => {
    const cachedDataRaw = localStorage.getItem(SOL_RATE_CACHE_KEY);
    if (cachedDataRaw) {
      try {
        const cachedData = JSON.parse(cachedDataRaw);
        if (cachedData && typeof cachedData.rate === 'number' && typeof cachedData.timestamp === 'number') {
          if (Date.now() - cachedData.timestamp < CACHE_DURATION_MS) {
            setSolUsdRate(cachedData.rate);
            setSolUsdRateTimestamp(cachedData.timestamp);
            // console.log('Loaded SOL/USD rate from cache:', cachedData.rate);
          } else {
            localStorage.removeItem(SOL_RATE_CACHE_KEY); // Stale data
            // console.log('Cleared stale SOL/USD rate cache.');
          }
        } else {
          localStorage.removeItem(SOL_RATE_CACHE_KEY); // Invalid data format
        }
      } catch (error) {
        console.error('Error parsing SOL rate from cache:', error);
        localStorage.removeItem(SOL_RATE_CACHE_KEY); // Corrupted data
      }
    }
  }, []);

  const triggerSolRateFetch = useCallback(async () => {
    if (isFetchingSolRate) {
      return; 
    }
    // If rate is current, don't fetch
    if (solUsdRate && solUsdRateTimestamp && (Date.now() - solUsdRateTimestamp < CACHE_DURATION_MS)) {
      return;
    }

    setIsFetchingSolRate(true);
    try {
      const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd');
      if (!response.ok) {
        throw new Error('Failed to fetch SOL price from CoinGecko');
      }
      const data = await response.json();
      if (data.solana && data.solana.usd) {
        const newRate = data.solana.usd;
        const newTimestamp = Date.now();
        setSolUsdRate(newRate);
        setSolUsdRateTimestamp(newTimestamp);
        localStorage.setItem(SOL_RATE_CACHE_KEY, JSON.stringify({ rate: newRate, timestamp: newTimestamp }));
        // console.log('Fetched and cached SOL/USD rate:', newRate);
      } else {
        console.error('SOL price not found in API response:', data);
        setSolUsdRate(null); // Ensure rate is null on error
      }
    } catch (error) {
      console.error('Error fetching SOL price:', error);
      setSolUsdRate(null); // Ensure rate is null on error
    } finally {
      setIsFetchingSolRate(false);
    }
  }, [isFetchingSolRate, solUsdRate, solUsdRateTimestamp]);

  const getSolDisplayPrice = useCallback((usdPrice: number | undefined): string | null => {
    if (usdPrice === undefined) return null;

    const isRateValid = solUsdRate && solUsdRateTimestamp && (Date.now() - solUsdRateTimestamp < CACHE_DURATION_MS);

    if (isRateValid && solUsdRate) {
        return (usdPrice / solUsdRate).toFixed(4) + ' SOL';
    } else if (isFetchingSolRate) {
        return 'Loading SOL...';
    } else {
        // This case covers: no rate yet, rate expired and fetch not triggered, or fetch failed
        return 'Error'; 
    }
  }, [solUsdRate, solUsdRateTimestamp, isFetchingSolRate]);

  return { solUsdRate, isFetchingSolRate, triggerSolRateFetch, getSolDisplayPrice };
}; 