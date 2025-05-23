import React, { useState, useEffect } from 'react';
import { Clock, AlertCircle } from 'lucide-react';

// This component has been deprecated as we've moved to deck-based pricing
// Keeping a placeholder for backward compatibility

const CreditTransactionHistory: React.FC = () => {

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="p-4 border-b border-border">
        <h3 className="flex items-center font-medium">Transaction History</h3>
      </div>
      
      <div className="p-6 text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <AlertCircle className="h-5 w-5 text-muted-foreground" />
          <Clock className="h-5 w-5 text-muted-foreground" />
        </div>
        <p className="text-sm text-muted-foreground">
          Transaction history has been replaced with deck-based usage tracking.
          Check your deck generation limits in the Deck Summary card.
        </p>
      </div>
    </div>
  );
};

export default CreditTransactionHistory;