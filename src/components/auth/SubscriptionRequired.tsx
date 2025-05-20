import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Crown, ArrowRight } from 'lucide-react';
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
            To create your own tarot decks, you need to upgrade to our Premium membership.
            Unleash your creativity with unlimited deck creation and access to all premium features.
          </p>
          
          <div className="space-y-3 mb-6">
            <div className="flex items-center justify-center">
              <TarotLogo className="h-4 w-4 text-accent mr-2" />
              <span className="text-sm">Unlimited deck creation</span>
            </div>
            <div className="flex items-center justify-center">
              <TarotLogo className="h-4 w-4 text-accent mr-2" />
              <span className="text-sm">Advanced AI image generation</span>
            </div>
            <div className="flex items-center justify-center">
              <TarotLogo className="h-4 w-4 text-accent mr-2" />
              <span className="text-sm">List your decks in the marketplace</span>
            </div>
          </div>
          
          <Link
            to="/subscription"
            className="btn btn-primary w-full py-2 flex items-center justify-center"
          >
            <Crown className="mr-2 h-4 w-4" />
            Upgrade to Premium
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </div>
      </motion.div>
    </div>
  );
};

export default SubscriptionRequired;