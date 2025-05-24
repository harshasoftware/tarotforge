import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuthStore } from '../stores/authStore';
import { useSubscription } from './SubscriptionContext';
import { supabase } from '../lib/supabase';
import { getDeckGenerationStatus } from '../lib/deck-usage';
import { STRIPE_PRODUCTS } from '../lib/stripe-config';

interface DeckLimitContextType {
  limits: {
    majorArcanaLimit: number;
    completeDeckLimit: number;
    regenerationLimit: number;
    qualityLevel: string;
    maxStorage: number;
  } | null;
  usage: {
    majorArcanaGenerated: number;
    completeDecksGenerated: number;
    regenerationsUsed: number;
    lastResetDate: string | null;
    nextResetDate: string | null;
    planType: string;
  } | null;
  loading: boolean;
  error: string | null;
  canGenerateMajorArcana: boolean;
  canGenerateCompleteDeck: boolean;
  canRegenerate: boolean;
  refreshLimits: () => Promise<void>;
}

const DeckLimitContext = createContext<DeckLimitContextType>({
  limits: null,
  usage: null,
  loading: true,
  error: null,
  canGenerateMajorArcana: false,
  canGenerateCompleteDeck: false,
  canRegenerate: false,
  refreshLimits: async () => {},
});

export const useDeckLimits = () => useContext(DeckLimitContext);

export const DeckLimitProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuthStore();
  const { subscription, isSubscribed } = useSubscription();
  
  const [limits, setLimits] = useState<DeckLimitContextType['limits']>(null);
  const [usage, setUsage] = useState<DeckLimitContextType['usage']>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [canGenerateMajorArcana, setCanGenerateMajorArcana] = useState(false);
  const [canGenerateCompleteDeck, setCanGenerateCompleteDeck] = useState(false);
  const [canRegenerate, setCanRegenerate] = useState(false);

  const fetchLimits = async () => {
    if (!user) {
      setLimits(null);
      setUsage(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      // Use the helper function to get deck generation status
      const status = await getDeckGenerationStatus(user.id);
      
      if (!status) {
        // For new users, set default limits
        setLimits({
          majorArcanaLimit: 1,
          completeDeckLimit: 0,
          regenerationLimit: 2,
          qualityLevel: 'medium',
          maxStorage: 3
        });
        
        setUsage({
          majorArcanaGenerated: 0,
          completeDecksGenerated: 0,
          regenerationsUsed: 0,
          lastResetDate: null,
          nextResetDate: null,
          planType: 'free'
        });
        
        setCanGenerateMajorArcana(true);
        setCanGenerateCompleteDeck(false);
        setCanRegenerate(true);
      } else {
        // Use the status data
        setLimits(status.limits);
        setUsage(status.usage);
        setCanGenerateMajorArcana(status.canGenerateMajorArcana);
        setCanGenerateCompleteDeck(status.canGenerateCompleteDeck);
        setCanRegenerate(status.canRegenerate);
      }
    } catch (err) {
      console.error('Error fetching deck limits:', err);
      setError('Failed to load deck generation limits');
    } finally {
      setLoading(false);
    }
  };

  // Watch for user or subscription changes to update limits
  useEffect(() => {
    if (user) {
      fetchLimits();
    } else {
      setLimits(null);
      setUsage(null);
      setLoading(false);
    }
  }, [user?.id, subscription]);

  // Set up polling to check for limit updates periodically
  useEffect(() => {
    if (!user) return;
    
    const pollInterval = setInterval(() => {
      fetchLimits();
    }, 60000); // Check every minute
    
    return () => clearInterval(pollInterval);
  }, [user]);

  return (
    <DeckLimitContext.Provider
      value={{
        limits,
        usage,
        loading,
        error,
        canGenerateMajorArcana,
        canGenerateCompleteDeck,
        canRegenerate,
        refreshLimits: fetchLimits
      }}
    >
      {children}
    </DeckLimitContext.Provider>
  );
};