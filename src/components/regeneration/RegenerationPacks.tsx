import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { RefreshCw, AlertCircle, Check, Loader } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useDeckLimits } from '../../context/DeckLimitContext';
import RegenerationPackCard from './RegenerationPackCard';
import { useLocation } from 'react-router-dom';

interface RegenerationPack {
  id: string;
  name: string;
  description: string;
  price_id: string;
  card_count: number;
  price: number;
}

const RegenerationPacks: React.FC = () => {
  const [packs, setPacks] = useState<RegenerationPack[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const { refreshLimits, limits, usage } = useDeckLimits();
  const location = useLocation();
  
  // Check for success or error in URL params
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const regenerationStatus = searchParams.get('regeneration');
    
    if (regenerationStatus === 'success') {
      setSuccess('Regeneration pack purchased successfully! Your regenerations have been added to your account.');
      refreshLimits();
      
      // Clear the URL params after a delay
      setTimeout(() => {
        const url = new URL(window.location.href);
        url.searchParams.delete('regeneration');
        url.searchParams.delete('packId');
        window.history.replaceState({}, '', url.toString());
      }, 5000);
    } else if (regenerationStatus === 'canceled') {
      setError('Regeneration pack purchase was canceled.');
      
      // Clear the URL params after a delay
      setTimeout(() => {
        const url = new URL(window.location.href);
        url.searchParams.delete('regeneration');
        window.history.replaceState({}, '', url.toString());
      }, 5000);
    }
  }, [location.search, refreshLimits]);
  
  useEffect(() => {
    const fetchPacks = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('regeneration_packs')
          .select('*')
          .order('card_count', { ascending: true });
          
        if (error) throw error;
        
        setPacks(data || []);
      } catch (err) {
        console.error('Error fetching regeneration packs:', err);
        setError('Failed to load regeneration packs');
      } finally {
        setLoading(false);
      }
    };
    
    fetchPacks();
  }, []);
  
  // Calculate remaining regenerations
  const remainingRegenerations = limits && usage 
    ? Math.max(0, limits.regenerationLimit - usage.regenerationsUsed)
    : 0;
  
  if (loading) {
    return (
      <div className="p-4 text-center">
        <Loader className="h-6 w-6 animate-spin mx-auto mb-2 text-primary" />
        <p className="text-sm text-muted-foreground">Loading regeneration packs...</p>
      </div>
    );
  }
  
  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="p-4 border-b border-border">
        <h3 className="flex items-center font-medium">
          <RefreshCw className="h-4 w-4 mr-2 text-primary" />
          Regeneration Packs
        </h3>
      </div>
      
      <div className="p-6">
        <a id="regeneration-packs"></a>
        {error && (
          <div className="mb-4 p-3 bg-destructive/10 border border-destructive/30 rounded-lg flex items-start gap-2">
            <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}
        
        {success && (
          <div className="mb-4 p-3 bg-success/10 border border-success/30 rounded-lg flex items-start gap-2">
            <Check className="h-5 w-5 text-success shrink-0 mt-0.5" />
            <p className="text-sm text-success">{success}</p>
          </div>
        )}
        
        <div className="mb-4 p-4 bg-muted/20 rounded-lg">
          <div className="flex justify-between items-center">
            <h4 className="font-medium">Current Regenerations</h4>
            <span className="text-lg font-bold">{remainingRegenerations}</span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Regenerations allow you to recreate individual cards if you're not satisfied with the result.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          {packs.map(pack => (
            <RegenerationPackCard key={pack.id} {...pack} />
          ))}
        </div>
        
        <p className="text-xs text-muted-foreground">
          Regeneration packs are one-time purchases that add to your available regenerations.
          They don't expire and can be used across any of your decks.
        </p>
      </div>
    </div>
  );
};

export default RegenerationPacks;