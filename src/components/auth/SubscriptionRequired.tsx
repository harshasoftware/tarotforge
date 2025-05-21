import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Crown, ArrowRight, Zap } from 'lucide-react';
import TarotLogo from '../ui/TarotLogo';
import { useCredits } from '../../context/CreditContext';

const SubscriptionRequired = () => {
  const { credits } = useCredits();
  const needsMoreCredits = credits && (credits.basicCredits === 0 && credits.premiumCredits === 0);

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
            {needsMoreCredits ? (
              <Zap className="h-8 w-8 text-primary" />
            ) : (
              <Crown className="h-8 w-8 text-primary" />
            )}
          </div>
          
          <h2 className="text-2xl font-serif font-bold mb-2">
            {needsMoreCredits ? "Out of Credits" : "Premium Feature"}
          </h2>
          <p className="text-muted-foreground mb-6">
            {needsMoreCredits 
              ? "You've used all your available credits for deck creation. Please subscribe to a plan to get more credits."
              : "To create your own tarot decks, you need credits. Upgrade to our Premium membership or purchase credits to unlock all creative features."}
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
            {needsMoreCredits ? "Get More Credits" : "Upgrade to Premium"}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </div>
      </motion.div>
    </div>
  );
};

export default SubscriptionRequired;