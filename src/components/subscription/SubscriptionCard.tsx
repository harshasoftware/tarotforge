import React from 'react';
import { motion } from 'framer-motion';
import { Check, Zap, Star, Crown, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { StripeProduct } from '../../lib/stripe-config';
import { createCheckoutSession } from '../../lib/stripe';

interface SubscriptionCardProps {
  product: StripeProduct;
  isActive?: boolean;
}

const SubscriptionCard: React.FC<SubscriptionCardProps> = ({ product, isActive = false }) => {
  const navigate = useNavigate();
  const { user, setShowSignInModal } = useAuth();
  const [isLoading, setIsLoading] = React.useState(false);

  const handleSubscribe = async () => {
    if (!user) {
      setShowSignInModal(true);
      return;
    }

    try {
      setIsLoading(true);
      
      const { url } = await createCheckoutSession({
        priceId: product.priceId,
        mode: product.mode,
        successUrl: `${window.location.origin}/subscription/success`,
        cancelUrl: `${window.location.origin}/subscription`,
      });
      
      if (url) {
        window.location.href = url;
      }
    } catch (error) {
      console.error('Error creating checkout session:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div
      className={`bg-card border ${isActive ? 'border-primary' : 'border-border'} rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-all`}
      whileHover={{ y: -5 }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {isActive && (
        <div className="bg-primary text-primary-foreground text-center py-2 font-medium">
          Current Plan
        </div>
      )}
      
      <div className="p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-serif font-bold">{product.name}</h3>
          <div className="p-2 bg-primary/20 rounded-full">
            <Crown className="h-5 w-5 text-primary" />
          </div>
        </div>
        
        <div className="mb-6">
          <div className="flex items-baseline">
            <span className="text-3xl font-bold">${product.price}</span>
            <span className="text-muted-foreground ml-1">/{product.interval}</span>
          </div>
          <p className="text-sm text-muted-foreground mt-2">{product.description}</p>
        </div>
        
        <div className="space-y-3 mb-6">
          {product.features?.map((feature, index) => (
            <div key={index} className="flex items-start">
              <div className="flex-shrink-0 mt-1">
                <Check className="h-4 w-4 text-success" />
              </div>
              <span className="ml-2 text-sm">{feature}</span>
            </div>
          ))}
        </div>
        
        <button
          onClick={handleSubscribe}
          disabled={isLoading || isActive}
          className={`w-full py-2 rounded-md font-medium transition-colors ${
            isActive 
              ? 'bg-success/20 text-success cursor-default'
              : 'bg-primary text-primary-foreground hover:bg-primary/90'
          } flex items-center justify-center`}
        >
          {isLoading ? (
            <>
              <span className="h-4 w-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin mr-2"></span>
              Processing...
            </>
          ) : isActive ? (
            <>
              <Check className="h-4 w-4 mr-2" />
              Current Plan
            </>
          ) : (
            <>
              <Zap className="h-4 w-4 mr-2" />
              Subscribe Now
            </>
          )}
        </button>
      </div>
    </motion.div>
  );
};

export default SubscriptionCard;