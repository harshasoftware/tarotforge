import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Check, ArrowRight, Home } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSubscription } from '../../context/SubscriptionContext';
import { useCredits } from '../../context/CreditContext';
import TarotLogo from '../../components/ui/TarotLogo';

const SubscriptionSuccess: React.FC = () => {
  const { user } = useAuth();
  const { refreshSubscription } = useSubscription();
  const { initializeCredits } = useCredits();
  const navigate = useNavigate();
  const location = useLocation();

  // Redirect to home if not authenticated
  useEffect(() => {
    if (!user) {
      navigate('/');
      return;
    }
    
    // Refresh subscription and credit data
    const updateUserData = async () => {
      await refreshSubscription();
      await initializeCredits();
    };
    
    updateUserData();
  }, [user, navigate, refreshSubscription, initializeCredits]);

  // Determine if user was coming from deck creation
  const returnToDeckCreation = location.state?.fromDeckCreation || 
    localStorage.getItem('redirectToDeckCreation') === 'true';
  
  // Clean up localStorage
  useEffect(() => {
    localStorage.removeItem('redirectToDeckCreation');
  }, []);

  return (
    <div className="min-h-screen pt-12 pb-20 flex items-center justify-center">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="max-w-2xl mx-auto bg-card border border-border rounded-xl overflow-hidden shadow-lg"
        >
          <div className="bg-gradient-to-r from-primary/20 via-accent/10 to-primary/20 p-8 text-center">
            <div className="w-20 h-20 bg-success/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <Check className="h-10 w-10 text-success" />
            </div>
            <h1 className="text-3xl font-serif font-bold mb-3">Subscription Successful!</h1>
            <p className="text-lg mb-0">
              Thank you for subscribing to Tarot Forge Premium
            </p>
          </div>
          
          <div className="p-8">
            <div className="mb-8">
              <h2 className="text-xl font-medium mb-4">What's Next?</h2>
              <p className="text-muted-foreground mb-4">
                Your premium membership is now active. Your credits have been initialized and you can start enjoying all the premium features immediately:
              </p>
              
              <ul className="space-y-3">
                <li className="flex items-start">
                  <div className="flex-shrink-0 mt-1">
                    <Check className="h-4 w-4 text-success" />
                  </div>
                  <span className="ml-2">Create your own custom tarot decks</span>
                </li>
                <li className="flex items-start">
                  <div className="flex-shrink-0 mt-1">
                    <Check className="h-4 w-4 text-success" />
                  </div>
                  <span className="ml-2">Access to all premium tarot decks</span>
                </li>
                <li className="flex items-start">
                  <div className="flex-shrink-0 mt-1">
                    <Check className="h-4 w-4 text-success" />
                  </div>
                  <span className="ml-2">Advanced AI reading interpretations</span>
                </li>
                <li className="flex items-start">
                  <div className="flex-shrink-0 mt-1">
                    <Check className="h-4 w-4 text-success" />
                  </div>
                  <span className="ml-2">Premium quality card generation</span>
                </li>
              </ul>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {returnToDeckCreation ? (
                <Link to="/create-deck" className="btn btn-primary py-2 px-6 flex items-center justify-center">
                  <TarotLogo className="h-4 w-4 mr-2" />
                  Continue Creating Your Deck
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              ) : (
                <Link to="/marketplace" className="btn btn-primary py-2 px-6 flex items-center justify-center">
                  <TarotLogo className="h-4 w-4 mr-2" />
                  Explore Premium Decks
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              )}
              
              <Link to="/" className="btn btn-secondary py-2 px-6 flex items-center justify-center">
                <Home className="h-4 w-4 mr-2" />
                Return to Home
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default SubscriptionSuccess;