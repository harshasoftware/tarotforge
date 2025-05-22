import React from 'react';
import { useCredits } from '../../context/CreditContext';
import { AlertCircle, ZoomIn, Sparkles, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';

interface CreditUsageEstimateProps {
  imageQuality: 'medium' | 'high';
  cardCount: number;
}

const CreditUsageEstimate: React.FC<CreditUsageEstimateProps> = ({ 
  imageQuality, 
  cardCount
}) => {
  const { credits, getEstimatedCreditConsumption } = useCredits();
  
  if (!credits) {
    return null;
  }
  
  const estimation = getEstimatedCreditConsumption(imageQuality, cardCount);
  const isMajorArcana = cardCount <= 22; // Check if this is a Major Arcana deck (22 cards)
  const canCreateMajorArcana = credits.basicCredits >= 22;
  const needsUpgrade = isMajorArcana && canCreateMajorArcana && credits.basicCredits < 78;
  
  return (
    <div className="rounded-lg bg-card/60 border border-border p-4 mb-6">
      <h3 className="text-sm font-medium mb-3 flex items-center">
        <ZoomIn className="h-4 w-4 mr-2 text-primary" />
        Credit Usage Estimate
      </h3>
      
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-muted/30 p-3 rounded-md text-center">
          <p className="text-xs text-muted-foreground mb-1">Basic Credits Needed</p>
          <p className="font-medium">{estimation.basicCredits}</p>
        </div>
        
        <div className="bg-muted/30 p-3 rounded-md text-center">
          <p className="text-xs text-muted-foreground mb-1">Premium Credits Needed</p>
          <p className="font-medium">{estimation.premiumCredits}</p>
        </div>
      </div>
      
      <div className="bg-muted/30 p-3 rounded-md mb-4">
        <div className="flex justify-between mb-1">
          <span className="text-xs text-muted-foreground">Your Basic Credits</span>
          <span className={`text-xs font-medium ${estimation.basicCredits > credits.basicCredits ? 'text-warning' : ''}`}>
            {credits.basicCredits} / {estimation.basicCredits} needed
          </span>
        </div>
        <div className="w-full h-2 bg-muted rounded-full overflow-hidden mb-3">
          <div 
            className={`h-full rounded-full ${
              credits.basicCredits >= estimation.basicCredits ? 'bg-success' : 'bg-warning'
            }`}
            style={{ 
              width: `${Math.min(100, (credits.basicCredits / Math.max(1, estimation.basicCredits)) * 100)}%` 
            }}
          ></div>
        </div>
        
        <div className="flex justify-between mb-1">
          <span className="text-xs text-muted-foreground">Your Premium Credits</span>
          <span className={`text-xs font-medium ${estimation.premiumCredits > credits.premiumCredits ? 'text-warning' : ''}`}>
            {credits.premiumCredits} / {estimation.premiumCredits} needed
          </span>
        </div>
        <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
          <div 
            className={`h-full rounded-full ${
              credits.premiumCredits >= estimation.premiumCredits ? 'bg-success' : 'bg-warning'
            }`}
            style={{ 
              width: `${Math.min(100, (credits.premiumCredits / Math.max(1, estimation.premiumCredits)) * 100)}%` 
            }}
          ></div>
        </div>
      </div>
      
      {!estimation.hasEnoughCredits && (
        <div className="flex items-start gap-3 bg-warning/10 border border-warning/30 rounded-md p-3">
          <AlertCircle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-warning mb-1">Not Enough Credits</p>
            <p className="text-xs text-warning/90 mb-2">You don't have enough credits to generate all these cards.</p>
            
            {needsUpgrade ? (
              <div>
                <p className="text-xs text-warning/90 mb-2">You have enough credits for a Major Arcana deck, but not a full deck.</p>
                <div className="flex gap-2">
                  <Link to="/subscription" className="btn btn-warning text-xs py-1 px-2 inline-flex items-center">
                    <Sparkles className="h-3 w-3 mr-1" />
                    Subscribe
                  </Link>
                  <Link to="/subscription?plan=explorer-plus" className="btn btn-warning text-xs py-1 px-2 inline-flex items-center">
                    <TrendingUp className="h-3 w-3 mr-1" />
                    Upgrade One Deck ($5)
                  </Link>
                </div>
              </div>
            ) : (
              <Link to="/subscription" className="btn btn-warning text-xs py-1 px-2 inline-flex items-center">
                <Sparkles className="h-3 w-3 mr-1" />
                Get More Credits
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CreditUsageEstimate;