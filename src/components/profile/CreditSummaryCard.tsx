import React from 'react';
import { motion } from 'framer-motion';
import { WalletCards, Calendar, Sparkles, ArrowUpRight, Crown } from 'lucide-react';
import { useDeckLimits } from '../../context/DeckLimitContext';
import { Link } from 'react-router-dom';
import TarotLogo from '../ui/TarotLogo';

const DeckSummaryCard: React.FC = () => {
  const { limits, usage, loading } = useDeckLimits();
  
  if (loading) {
    return (
      <div className="bg-card border border-border rounded-xl p-5">
        <div className="flex items-center mb-4">
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center mr-3">
            <WalletCards className="h-4 w-4 text-primary" />
          </div>
          <h3 className="font-medium">Deck Summary</h3>
        </div>
        
        <div className="space-y-4">
          <div className="h-5 bg-muted/50 rounded animate-pulse"></div>
          <div className="h-20 bg-muted/50 rounded animate-pulse"></div>
        </div>
      </div>
    );
  }
  
  if (!limits || !usage) {
    return (
      <div className="bg-card border border-border rounded-xl p-5">
        <div className="flex items-center mb-4">
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center mr-3">
            <WalletCards className="h-4 w-4 text-primary" />
          </div>
          <h3 className="font-medium">Deck Summary</h3>
        </div>
        
        <div className="text-center py-4">
          <p className="text-sm text-muted-foreground">No deck information available.</p>
        </div>
      </div>
    );
  }
  
  // Format date for display
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Not scheduled';
    return new Date(dateString).toLocaleDateString();
  };
  
  // Calculate remaining decks
  const remainingMajorArcana = Math.max(0, limits.majorArcanaLimit - usage.majorArcanaGenerated);
  const remainingCompleteDecks = Math.max(0, limits.completeDeckLimit - usage.completeDecksGenerated);
  const totalRemaining = remainingMajorArcana + remainingCompleteDecks;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-card border border-border rounded-xl overflow-hidden"
    >
      <div className="p-5 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center mr-3">
              <WalletCards className="h-4 w-4 text-primary" />
            </div>
            <h3 className="font-medium">Deck Summary</h3>
          </div>
          
          <div className="flex items-center bg-muted/30 px-3 py-1 rounded-full">
            <Crown className="h-3 w-3 mr-1" />
            <span className="text-xs capitalize">{usage.planType} Plan</span>
          </div>
        </div>
      </div>
      
      <div className="p-5">
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="bg-primary/10 p-3 rounded-lg text-center">
            <p className="text-xs text-muted-foreground mb-1">Major Arcana</p>
            <p className="text-2xl font-bold">{remainingMajorArcana}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {remainingMajorArcana === 1 ? 'deck' : 'decks'} remaining
            </p>
          </div>
          
          <div className="bg-accent/10 p-3 rounded-lg text-center">
            <p className="text-xs text-muted-foreground mb-1">Complete Decks</p>
            <p className="text-2xl font-bold">{remainingCompleteDecks}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {remainingCompleteDecks === 1 ? 'deck' : 'decks'} remaining
            </p>
          </div>
        </div>
        
        <div className="flex items-center justify-between text-sm border-t border-border pt-4 mt-2">
          <div className="flex items-center">
            <Calendar className="h-4 w-4 text-muted-foreground mr-1" />
            <span className="text-muted-foreground">Next refresh:</span>
          </div>
          <span>{formatDate(usage.nextResetDate)}</span>
        </div>
        
        <Link 
          to="/subscription" 
          className="btn btn-outline mt-4 w-full py-2 text-sm flex items-center justify-center"
        >
          <Sparkles className="h-4 w-4 mr-2" />
          Manage Plan
        </Link>
      </div>
    </motion.div>
  );
};

export default DeckSummaryCard;