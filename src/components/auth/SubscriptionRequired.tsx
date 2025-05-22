import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Crown, ArrowRight, Zap, TrendingUp } from 'lucide-react';
import TarotLogo from '../ui/TarotLogo';

const SubscriptionRequired = () => {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="bg-card border border-border rounded-xl max-w-md w-full overflow-hidden"
      >
        <div className="p-8 text-center">
          <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Crown className="h-8 w-8 text-primary" />
          </div>
          
          <h2 className="text-2xl font-serif font-bold mb-2">Premium Feature</h2>
          <p className="text-muted-foreground mb-6">
            To create your own complete tarot decks, you'll need to choose from our subscription plans or one-time upgrade to unlock creative features.
          </p>
          
          <div className="space-y-3 mb-6">
            <div className="flex items-center justify-center">
              <TarotLogo className="h-4 w-4 text-accent mr-2" />
              <span className="text-sm">Create full 78-card tarot decks</span>
            </div>
            <div className="flex items-center justify-center">
              <TarotLogo className="h-4 w-4 text-accent mr-2" />
              <span className="text-sm">Medium and high quality options</span>
            </div>
            <div className="flex items-center justify-center">
              <TarotLogo className="h-4 w-4 text-accent mr-2" />
              <span className="text-sm">List your decks in the marketplace</span>
            </div>
          </div>
          
          <div className="space-y-3">
            <Link
              to="/subscription"
              className="btn btn-primary w-full py-2 flex items-center justify-center"
            >
              <Crown className="mr-2 h-4 w-4" />
              View Subscription Plans
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
            
            <Link
              to="/subscription?plan=explorer-plus"
              className="btn btn-secondary w-full py-2 flex items-center justify-center"
            >
              <TrendingUp className="mr-2 h-4 w-4" />
              Upgrade One Deck ($5)
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default SubscriptionRequired;