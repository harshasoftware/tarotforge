import React from 'react';
import { useDeckLimits } from '../../context/DeckLimitContext';
import { WalletCards } from 'lucide-react';

interface DeckBadgeProps {
  showIcon?: boolean;
  className?: string;
  absolute?: boolean;
}

const DeckBadge: React.FC<DeckBadgeProps> = ({ showIcon = true, className = '', absolute = false }) => {
  const { usage, limits, loading } = useDeckLimits();
  
  if (loading || !usage || !limits) {
    return null;
  }
  
  const totalMajorArcana = limits.majorArcanaLimit - usage.majorArcanaGenerated;
  const totalCompleteDeck = limits.completeDeckLimit - usage.completeDecksGenerated;
  const totalDecks = totalMajorArcana + totalCompleteDeck;
  const hasDecks = totalDecks > 0;
  
  return (
    <div className={`inline-flex items-center ${
      hasDecks 
        ? 'bg-card border border-yellow-500 text-yellow-500' 
        : 'bg-warning/20 text-warning border border-warning/30'
    } rounded-full shadow-sm px-2 py-1 ${absolute ? 'absolute -top-3 right-3' : ''} ${className}`}>
      {showIcon && (
        <WalletCards className="h-3 w-3 mr-1.5" />
      )}
      <span className="text-xs font-medium">
        {totalDecks} {totalDecks === 1 ? 'deck' : 'decks'}
      </span>
    </div>
  );
};

export default DeckBadge;