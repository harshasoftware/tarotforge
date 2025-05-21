import React from 'react';
import { useCredits } from '../../context/CreditContext';
import { Coins } from 'lucide-react';
import TarotLogo from './TarotLogo';

interface CreditBadgeProps {
  showIcon?: boolean;
  className?: string;
}

const CreditBadge: React.FC<CreditBadgeProps> = ({ showIcon = true, className = '' }) => {
  const { credits, loading } = useCredits();
  
  if (loading || !credits) {
    return null;
  }
  
  const totalCredits = credits.basicCredits + credits.premiumCredits;
  const hasCredits = totalCredits > 0;
  
  return (
    <div className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs ${
      hasCredits 
        ? 'bg-primary/20 text-primary border border-primary/30' 
        : 'bg-warning/20 text-warning border border-warning/30'
    } ${className}`}>
      {showIcon && (
        <Coins className="h-3.5 w-3.5 mr-1.5" />
      )}
      {hasCredits ? (
        <span className="font-medium">{totalCredits} credits</span>
      ) : (
        <span>No credits</span>
      )}
    </div>
  );
};

export default CreditBadge;