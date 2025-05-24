import React, { useState, useEffect } from 'react';
import { Clock, AlertCircle, WalletCards, BarChart4 } from 'lucide-react';
import { useDeckLimits } from '../../stores/deckLimitStore';

/**
 * This component shows deck usage statistics instead of credit transactions
 * since we've moved to a deck-based pricing model
 */

const CreditTransactionHistory: React.FC = () => {
  const { limits, usage, loading } = useDeckLimits();

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="p-4 border-b border-border">
        <h3 className="flex items-center font-medium">
          <BarChart4 className="h-4 w-4 mr-2 text-primary" />
          Deck Usage Statistics
        </h3>
      </div>
      
      {loading ? (
        <div className="p-6 text-center">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
          <p className="text-sm text-muted-foreground">Loading usage statistics...</p>
        </div>
      ) : !usage ? (
        <div className="p-6 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <AlertCircle className="h-5 w-5 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">
            No usage data available yet.
          </p>
        </div>
      ) : (
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="bg-muted/20 p-4 rounded-lg">
              <h4 className="text-sm font-medium mb-2">Major Arcana Usage</h4>
              <div className="flex justify-between mb-1">
                <span className="text-xs text-muted-foreground">Generated</span>
                <span className="text-xs font-medium">{usage.majorArcanaGenerated} / {limits?.majorArcanaLimit || 0}</span>
              </div>
              <div className="w-full h-2 bg-muted/30 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary rounded-full" 
                  style={{ width: `${Math.min(100, limits && limits.majorArcanaLimit > 0 ? (usage.majorArcanaGenerated / limits.majorArcanaLimit) * 100 : 0)}%` }}
                ></div>
              </div>
            </div>
            
            <div className="bg-muted/20 p-4 rounded-lg">
              <h4 className="text-sm font-medium mb-2">Complete Deck Usage</h4>
              <div className="flex justify-between mb-1">
                <span className="text-xs text-muted-foreground">Generated</span>
                <span className="text-xs font-medium">{usage.completeDecksGenerated} / {limits?.completeDeckLimit || 0}</span>
              </div>
              <div className="w-full h-2 bg-muted/30 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-accent rounded-full" 
                  style={{ width: `${Math.min(100, limits && limits.completeDeckLimit > 0 ? (usage.completeDecksGenerated / limits.completeDeckLimit) * 100 : 0)}%` }}
                ></div>
              </div>
            </div>
          </div>
          
          <div className="bg-muted/20 p-4 rounded-lg mb-4">
            <h4 className="text-sm font-medium mb-2">Regeneration Usage</h4>
            <div className="flex justify-between mb-1">
              <span className="text-xs text-muted-foreground">Used</span>
              <span className="text-xs font-medium">{usage.regenerationsUsed} / {limits?.regenerationLimit || 0}</span>
            </div>
            <div className="w-full h-2 bg-muted/30 rounded-full overflow-hidden">
              <div 
                className="h-full bg-success rounded-full" 
                style={{ width: `${Math.min(100, limits && limits.regenerationLimit > 0 ? (usage.regenerationsUsed / limits.regenerationLimit) * 100 : 0)}%` }}
              ></div>
            </div>
          </div>
          
          <div className="flex items-center justify-between text-sm border-t border-border pt-4">
            <div className="flex items-center">
              <Clock className="h-4 w-4 text-muted-foreground mr-1" />
              <span className="text-muted-foreground">Next reset:</span>
            </div>
            <span>{usage.nextResetDate ? new Date(usage.nextResetDate).toLocaleDateString() : 'Not scheduled'}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreditTransactionHistory;