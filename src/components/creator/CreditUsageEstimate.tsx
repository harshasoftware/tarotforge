import React from 'react';
import { AlertCircle, ZoomIn, Sparkles, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useDeckQuotas } from '../../context/DeckQuotaContext';

interface DeckQuotaEstimateProps {
  imageQuality: 'medium' | 'high';
  cardCount: number;
}

const DeckQuotaEstimate: React.FC<DeckQuotaEstimateProps> = ({ 
  imageQuality, 
  cardCount
}) => {
  const { quotas, getEstimatedQuotaConsumption } = useDeckQuotas();
  
  // Determine what type of deck this is
  const isMajorArcana = cardCount <= 22;
  const isFullDeck = cardCount > 22;
  
  // Calculate if user has enough quota
  const estimatedUsage = getEstimatedQuotaConsumption(imageQuality, 1);
  const isFreeEligible = isMajorArcana && estimatedUsage.hasEnoughQuota;
  const needsUpgrade = isFullDeck && !estimatedUsage.hasEnoughQuota;
  
  return (
    <div className="rounded-lg bg-card/60 border border-border p-4 mb-6">
      <h3 className="text-sm font-medium mb-3 flex items-center">
        <ZoomIn className="h-4 w-4 mr-2 text-primary" />
        Deck Generation Estimate
      </h3>
      
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-muted/30 p-3 rounded-md text-center">
          <p className="text-xs text-muted-foreground mb-1">Card Count</p>
          <p className="font-medium">{cardCount} cards</p>
          <p className="text-xs text-muted-foreground mt-1">
            {isMajorArcana ? 'Major Arcana only' : 'Complete Deck'}
          </p>
        </div>
        
        <div className="bg-muted/30 p-3 rounded-md text-center">
          <p className="text-xs text-muted-foreground mb-1">Quality Level</p>
          <p className="font-medium capitalize">{imageQuality}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {imageQuality === 'high' ? 'Best detail & consistency' : 'Standard quality'}
          </p>
        </div>
      </div>
      
      {/* Plan Recommendation */}
      <div className="bg-muted/30 p-3 rounded-md mb-4">
        <div className="flex justify-between mb-1">
          <span className="text-xs text-muted-foreground">Required Plan</span>
          <span className="text-xs font-medium">
            {isFreeEligible ? 'Free Plan (Major Arcana)' : imageQuality === 'high' ? 'Creator or Visionary' : 'Any Paid Plan'}
          </span>
        </div>
        
        <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
          {isFreeEligible ? (
            <div className="h-full bg-success rounded-full" style={{ width: '100%' }}></div>
          ) : (
            <div className="h-full bg-warning rounded-full" style={{ width: '30%' }}></div>
          )}
        </div>
      </div>
      
      {needsUpgrade && (
        <div className="flex items-start gap-3 bg-warning/10 border border-warning/30 rounded-md p-3">
          <AlertCircle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-warning mb-1">Full Deck Creation</p>
            <p className="text-xs text-warning/90 mb-2">
              {imageQuality === 'high' 
                ? 'Creating high-quality complete decks requires a Creator or Visionary subscription.'
                : 'Creating complete 78-card decks requires a subscription or one-time upgrade.'}
            </p>
            <div className="flex flex-wrap gap-2">
              <Link to="/subscription?plan=explorer-plus" className="btn btn-warning text-xs py-1 px-2 inline-flex items-center">
                <TrendingUp className="h-3 w-3 mr-1" />
                Upgrade One Deck ($5)
              </Link>
              <Link to="/subscription" className="btn btn-warning text-xs py-1 px-2 inline-flex items-center">
                <Sparkles className="h-3 w-3 mr-1" />
                View Subscriptions
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DeckQuotaEstimate;