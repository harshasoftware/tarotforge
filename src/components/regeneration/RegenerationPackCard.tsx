import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { RefreshCw, Zap, Loader } from 'lucide-react';
import { createCheckoutSession } from '../../lib/stripe';

interface RegenerationPackProps {
  id: string;
  name: string;
  description: string;
  price_id: string;
  card_count: number;
  price: number;
}

const RegenerationPackCard: React.FC<RegenerationPackProps> = ({
  id,
  name,
  description,
  price_id,
  card_count,
  price
}) => {
  const [purchasing, setPurchasing] = useState(false);
  
  const handlePurchase = async () => {
    try {
      setPurchasing(true);
      
      // Create checkout session
      const { url } = await createCheckoutSession({
        priceId: price_id,
        mode: 'payment',
        successUrl: `${window.location.origin}/profile?regeneration=success&packId=${id}`,
        cancelUrl: `${window.location.origin}/profile?regeneration=canceled`,
        metadata: {
          type: 'regeneration_pack',
          pack_id: id
        }
      });
      
      if (url) {
        window.location.href = url;
      } else {
        throw new Error('Failed to create checkout session');
      }
    } catch (err) {
      console.error('Error purchasing regeneration pack:', err);
      setPurchasing(false);
    }
  };
  
  return (
    <motion.div
      className="border border-border rounded-lg p-4 hover:border-primary/50 transition-colors"
      whileHover={{ y: -5 }}
    >
      <div className="flex justify-between items-center mb-2">
        <h4 className="font-medium">{name}</h4>
        <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-full text-xs">
          ${price.toFixed(2)}
        </span>
      </div>
      
      <p className="text-sm text-muted-foreground mb-3">{description}</p>
      
      <div className="bg-muted/20 p-2 rounded-lg text-center mb-3">
        <span className="text-lg font-bold flex items-center justify-center">
          <RefreshCw className="h-4 w-4 mr-1 text-accent" />
          {card_count} regenerations
        </span>
      </div>
      
      <button
        onClick={handlePurchase}
        disabled={purchasing}
        className="w-full btn btn-primary py-1.5 text-sm flex items-center justify-center"
      >
        {purchasing ? (
          <>
            <Loader className="h-4 w-4 animate-spin mr-2" />
            Processing...
          </>
        ) : (
          <>
            <Zap className="h-4 w-4 mr-1" />
            Purchase
          </>
        )}
      </button>
    </motion.div>
  );
};

export default RegenerationPackCard;