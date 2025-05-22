import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, Link } from 'react-router-dom';
import { Wand2, Crown, Check, ArrowRight, TrendingUp } from 'lucide-react';
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
  const [canCreateMajorArcana, setCanCreateMajorArcana] = useState(true); // Default to true for simplified model
  const [canCreateFullDeck, setCanCreateFullDeck] = useState(false);

  useEffect(() => {
    // If the user is not logged in, redirect to login
    if (!user) {
      navigate('/login');
    }

    // Check if the user can create decks based on subscription status
    if (isSubscribed) {
      setCanCreateFullDeck(true);
    } else {
      // Free users can create Major Arcana (22 cards) but not full decks
      setCanCreateMajorArcana(true);
      setCanCreateFullDeck(false);
    }
  }, [user, navigate, isSubscribed]);

  // If user is subscribed or allowed to create at least Major Arcana, they can proceed
  const handleContinue = () => {
    if ((isSubscribed || canCreateMajorArcana || canCreateFullDeck) && acceptedTerms) {
      onComplete();
    } else {
      // Redirect to subscription page if not allowed to create any decks
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
          <p className="text-muted-foreground max-w-xl mx-auto">
            Craft unique tarot decks with AI-assisted card generation
          </p>
        </div>

        {/* Access Status */}
        <div className={`mb-6 p-4 rounded-xl ${
          canCreateFullDeck 
            ? 'border-success/30 bg-success/10' 
            : isSubscribed 
              ? 'border-success/30 bg-success/10' 
              : 'border-primary/30 bg-primary/10'
        }`}>
          <div className="flex items-start gap-3">
            {canCreateFullDeck || isSubscribed ? (
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
                {canCreateFullDeck 
                  ? 'Full Deck Access' 
                  : canCreateMajorArcana
                    ? 'Major Arcana Access'
                    : isSubscribed 
                      ? 'Premium Access Enabled' 
                      : 'Subscription Required'}
              </h3>
              <p className="text-sm text-muted-foreground">
                {canCreateFullDeck
                  ? 'You can create complete 78-card tarot decks with your subscription.'
                  : canCreateMajorArcana
                    ? 'You can create Major Arcana decks (22 cards) with the free plan. To create complete 78-card decks, consider upgrading to Explorer Plus or subscribing.'
                    : isSubscribed 
                      ? 'You have full access to create and publish your own custom tarot decks.' 
                      : 'Creating custom tarot decks requires a subscription or upgrade. Choose from our Explorer Plus, Mystic, Creator, or Visionary plans.'}
              </p>
              
              {canCreateMajorArcana && !canCreateFullDeck && (
                <div className="mt-3 flex gap-2 flex-wrap">
                  <Link to="/subscription?plan=explorer-plus" className="btn btn-warning mt-2 py-1.5 px-4 text-sm flex items-center">
                    <TrendingUp className="h-4 w-4 mr-2" />
                    Upgrade One Deck ($5)
                  </Link>
                  <Link to="/subscription" className="btn btn-primary mt-2 py-1.5 px-4 text-sm flex items-center">
                    <Crown className="h-4 w-4 mr-2" />
                    View Subscription Plans
                  </Link>
                </div>
              )}
              
              {!canCreateMajorArcana && !isSubscribed && (
                <Link to="/subscription" className="btn btn-primary mt-3 py-1.5 px-4 text-sm flex items-center w-fit">
                  <Crown className="h-4 w-4 mr-2" />
                  View Plans
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
              <span>Generate stunning tarot cards with AI</span>
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
        {(isSubscribed || canCreateMajorArcana) && (
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
            disabled={(isSubscribed || canCreateMajorArcana) && !acceptedTerms}
            className="btn btn-primary py-2 px-4 flex items-center"
          >
            {isSubscribed || canCreateMajorArcana ? (
              <>
                Begin Creation
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            ) : (
              <>
                <Crown className="mr-2 h-4 w-4" />
                View Plans
              </>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default CreatorOnboarding;