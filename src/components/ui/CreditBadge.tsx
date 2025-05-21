import React from 'react';
import { useCredits } from '../../context/CreditContext';
import { Coins } from 'lucide-react';

interface CreditBadgeProps {
  showIcon?: boolean;
  className?: string;
  absolute?: boolean;
}

const CreditBadge: React.FC<CreditBadgeProps> = ({ showIcon = true, className = '', absolute = false }) => {
  const { credits, loading } = useCredits();
  
  if (loading || !credits) {
    return null;
  }
  
  const totalCredits = credits.basicCredits + credits.premiumCredits;
  const hasCredits = totalCredits > 0;
  
  return (
    <div className={`inline-flex items-center ${
      hasCredits 
        ? 'bg-card border border-yellow-500 text-yellow-500' 
        : 'bg-warning/20 text-warning border border-warning/30'
    } rounded-full shadow-sm px-2 py-1 ${absolute ? 'absolute -top-3 right-3' : ''} ${className}`}>
      {showIcon && (
        <Coins className="h-3 w-3 mr-1.5" />
      )}
      <span className="text-xs font-medium text-white">
        {totalCredits} credits
      </span>
    </div>
  );
};

export default CreditBadge;