import React from 'react';
import { AlertCircle, ZoomIn, Sparkles, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useDeckLimits } from '../../context/DeckLimitContext';

interface DeckUsageEstimateProps {
  imageQuality: 'medium' | 'high';
  cardCount: number;
}

const DeckUsageEstimate: React.FC<DeckUsageEstimateProps> = ({ 
  imageQuality, 
  cardCount
}) => {
  const { limits, usage, canGenerateMajorArcana, canGenerateCompleteDeck } = useDeckLimits();
  
  // Determine what type of deck this is
  const isMajorArcana = cardCount <= 22;
  const isFullDeck = cardCount > 22;
  const isFreeEligible = isMajorArcana && canGenerateMajorArcana;
  const needsUpgrade = isFullDeck && !canGenerateCompleteDeck;
  
  // If limits or usage are not loaded yet, show minimal info
  if (!limits || !usage) {
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
      </div>
    );
  }
  
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
      
      {/* Plan Information */}
      <div className="bg-muted/30 p-3 rounded-md mb-4">
        <div className="flex justify-between mb-1">
          <span className="text-xs text-muted-foreground">Your Plan</span>
          <span className="text-xs font-medium capitalize">{usage.planType}</span>
        </div>
        
        <div className="flex justify-between mb-1">
          <span className="text-xs text-muted-foreground">
            {isMajorArcana ? 'Major Arcana Usage' : 'Complete Deck Usage'}
          </span>
          <span className={`text-xs font-medium ${
            isMajorArcana 
              ? usage.majorArcanaGenerated >= limits.majorArcanaLimit ? 'text-warning' : ''
              : usage.completeDecksGenerated >= limits.completeDeckLimit ? 'text-warning' : ''
          }`}>
            {isMajorArcana 
              ? `${usage.majorArcanaGenerated} / ${limits.majorArcanaLimit} used` 
              : `${usage.completeDecksGenerated} / ${limits.completeDeckLimit} used`}
          </span>
        </div>
        
        <div className="w-full h-2 bg-muted rounded-full overflow-hidden mb-3">
          <div 
            className={`h-full rounded-full ${
              isMajorArcana
                ? usage.majorArcanaGenerated < limits.majorArcanaLimit ? 'bg-success' : 'bg-warning'
                : usage.completeDecksGenerated < limits.completeDeckLimit ? 'bg-success' : 'bg-warning'
            }`}
            style={{ 
              width: `${Math.min(100, isMajorArcana 
                ? (limits.majorArcanaLimit > 0 ? (usage.majorArcanaGenerated / limits.majorArcanaLimit) * 100 : 0)
                : (limits.completeDeckLimit > 0 ? (usage.completeDecksGenerated / limits.completeDeckLimit) * 100 : 0)
              )}%` 
            }}
          ></div>
        </div>
        
        <div className="flex justify-between mb-1">
          <span className="text-xs text-muted-foreground">Next Reset</span>
          <span className="text-xs font-medium">
            {usage.nextResetDate 
              ? new Date(usage.nextResetDate).toLocaleDateString() 
              : 'Not scheduled'}
          </span>
        </div>
      </div>
      
      {needsUpgrade && (
        <div className="flex items-start gap-3 bg-warning/10 border border-warning/30 rounded-lg p-3">
          <AlertCircle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-warning mb-1">Full Deck Creation</p>
            <p className="text-xs text-warning/90 mb-2">
              {imageQuality === 'high' 
                ? 'Creating high-quality complete decks requires a Creator or Visionary subscription.'
                : 'You can preview the deck generation, but upgrading is required to save the complete 78-card deck.'}
            </p>
            <div className="flex flex-wrap gap-2">
              <Link to="/subscription?plan=explorer-plus" className="btn btn-warning text-xs py-1 px-2 inline-flex items-center">
                <TrendingUp className="h-3 w-3 mr-1" />
                Upgrade This Deck ($5)
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

export default DeckUsageEstimate;