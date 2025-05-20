import React from 'react';
import { useCredits } from '../../context/CreditContext';
import { CreditCard } from 'lucide-react';
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
    <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${
      hasCredits 
        ? 'bg-success/20 text-success' 
        : 'bg-warning/20 text-warning'
    } ${className}`}>
      {showIcon && (
        <TarotLogo className="h-3 w-3 mr-1" />
      )}
      {hasCredits ? (
        <>
          {totalCredits} {totalCredits === 1 ? 'credit' : 'credits'} available
        </>
      ) : (
        <>No credits available</>
      )}
    </div>
  );
};

export default CreditBadge;