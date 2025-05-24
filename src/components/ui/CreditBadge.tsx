import React from 'react';
import { useDeckQuotas } from '../../stores/deckQuotaStore';
import { WalletCards, Crown, Loader } from 'lucide-react';
import { motion } from 'framer-motion';

interface DeckQuotaBadgeProps {
  showIcon?: boolean;
  className?: string;
  absolute?: boolean;
}

const DeckQuotaBadge: React.FC<DeckQuotaBadgeProps> = ({ showIcon = true, className = '', absolute = false }) => {
  const { quotas, loading } = useDeckQuotas();
  
  if (loading || !quotas) {
    return null;
  }
  
  const totalMajorArcana = Math.max(0, quotas.majorArcanaQuota - quotas.majorArcanaUsed);
  const totalCompleteDeck = Math.max(0, quotas.completeDeckQuota - quotas.completeDeckUsed);
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

export default DeckQuotaBadge;