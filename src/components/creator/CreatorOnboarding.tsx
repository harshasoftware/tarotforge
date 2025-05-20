import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, Link } from 'react-router-dom';
import { Wand2, Crown, Check, ArrowRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSubscription } from '../../context/SubscriptionContext';
import TarotLogo from '../ui/TarotLogo';

interface CreatorOnboardingProps {
  onComplete: () => void;
}

const CreatorOnboarding: React.FC<CreatorOnboardingProps> = ({ onComplete }) => {
  const { user } = useAuth();
  const { isSubscribed } = useSubscription();
  const navigate = useNavigate();
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  useEffect(() => {
    // If the user is not logged in, redirect to login
    if (!user) {
      navigate('/login');
    }
  }, [user, navigate]);

  // If user is subscribed, they can proceed
  const handleContinue = () => {
    if (isSubscribed && acceptedTerms) {
      onComplete();
    } else if (!isSubscribed) {
      // Redirect to subscription page if not subscribed
      navigate('/subscription', { state: { fromDeckCreation: true } });
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="bg-card border border-border rounded-xl shadow-lg max-w-lg w-full p-8"
      >
        <div className="text-center mb-8">
          <div className="flex justify-center">
            <div className="p-3 bg-primary/10 rounded-full">
              <Wand2 className="h-8 w-8 text-primary" />
            </div>
          </div>
          <h1 className="text-3xl font-serif font-bold mt-4 mb-2">Create Your Own Deck</h1>
          <p className="text-muted-foreground">
            Craft unique tarot decks with AI-assisted card generation
          </p>
        </div>

        {/* Subscription Required Notice */}
        <div className={`mb-6 p-4 border rounded-xl ${isSubscribed ? 'border-success/30 bg-success/10' : 'border-primary/30 bg-primary/10'}`}>
          <div className="flex items-start gap-3">
            {isSubscribed ? (
              <div className="p-2 rounded-full bg-success/20 mt-1">
                <Check className="h-4 w-4 text-success" />
              </div>
            ) : (
              <div className="p-2 rounded-full bg-primary/20 mt-1">
                <Crown className="h-4 w-4 text-primary" />
              </div>
            )}
            <div>
              <h3 className="font-medium mb-1">
                {isSubscribed ? 'Premium Access Enabled' : 'Premium Subscription Required'}
              </h3>
              <p className="text-sm text-muted-foreground">
                {isSubscribed 
                  ? 'You have full access to create and publish your own custom tarot decks.' 
                  : 'Creating custom tarot decks requires a premium subscription. Upgrade to unlock this creative feature.'}
              </p>
              {!isSubscribed && (
                <Link to="/subscription" className="btn btn-primary mt-3 py-1.5 px-4 text-sm flex items-center w-fit">
                  <Crown className="h-4 w-4 mr-2" />
                  Upgrade Now
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Features List */}
        <div className="mb-6 space-y-4">
          <h3 className="font-medium">With deck creation, you can:</h3>
          <div className="space-y-3">
            <div className="flex items-start">
              <div className="mt-0.5 mr-3 text-accent">
                <TarotLogo className="h-5 w-5" />
              </div>
              <span>Generate stunning tarot cards with Gemini AI</span>
            </div>
            <div className="flex items-start">
              <div className="mt-0.5 mr-3 text-accent">
                <TarotLogo className="h-5 w-5" />
              </div>
              <span>Customize every aspect from artwork to card meanings</span>
            </div>
            <div className="flex items-start">
              <div className="mt-0.5 mr-3 text-accent">
                <TarotLogo className="h-5 w-5" />
              </div>
              <span>Use your decks for readings or list them in the marketplace</span>
            </div>
          </div>
        </div>

        {/* Terms & Conditions Checkbox */}
        {isSubscribed && (
          <div className="mb-6">
            <label className="flex items-start cursor-pointer">
              <input
                type="checkbox"
                checked={acceptedTerms}
                onChange={() => setAcceptedTerms(!acceptedTerms)}
                className="mr-2 mt-1"
              />
              <span className="text-sm text-muted-foreground">
                I agree to the <a href="#" className="text-primary hover:underline">Terms of Service</a> and understand that I am responsible for the content I create.
              </span>
            </label>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-4 justify-end">
          <button 
            onClick={() => navigate('/')}
            className="btn btn-ghost border border-input py-2 px-4"
          >
            Cancel
          </button>

          <button
            onClick={handleContinue}
            disabled={isSubscribed && !acceptedTerms}
            className="btn btn-primary py-2 px-4 flex items-center"
          >
            {isSubscribed ? (
              <>
                Begin Creation
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            ) : (
              <>
                <Crown className="mr-2 h-4 w-4" />
                Upgrade to Premium
              </>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default CreatorOnboarding;