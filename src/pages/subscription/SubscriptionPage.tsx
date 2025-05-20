import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link, useLocation } from 'react-router-dom';
import { Sparkles, Shield, Zap, ArrowLeft, Loader, CreditCard, Check, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSubscription } from '../../context/SubscriptionContext';
import { useCredits } from '../../context/CreditContext';
import { STRIPE_PRODUCTS } from '../../lib/stripe-config';
import { createCheckoutSession } from '../../lib/stripe';
import TarotLogo from '../../components/ui/TarotLogo';

const SubscriptionPage: React.FC = () => {
  const { user } = useAuth();
  const { subscription, isSubscribed, loading: subscriptionLoading } = useSubscription();
  const { credits, loading: creditLoading } = useCredits();
  const location = useLocation();
  const fromDeckCreation = location.state?.fromDeckCreation || false;
  
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Determine current plan for highlighting
  useEffect(() => {
    if (subscription?.price_id) {
      // Find which product this price ID belongs to
      const productKey = Object.keys(STRIPE_PRODUCTS).find(
        key => STRIPE_PRODUCTS[key].priceId === subscription.price_id
      );
      if (productKey) {
        setSelectedPlan(productKey);
      }
    } else {
      setSelectedPlan(null); // Free plan
    }
  }, [subscription]);

  const handleSubscribe = async (planKey: string) => {
    if (!user) {
      // Need to be logged in
      return;
    }

    try {
      setCheckoutLoading(true);
      setError(null);
      const product = STRIPE_PRODUCTS[planKey];

      const { url } = await createCheckoutSession({
        priceId: product.priceId,
        mode: product.mode,
        successUrl: `${window.location.origin}/subscription/success`,
        cancelUrl: `${window.location.origin}/subscription`,
      });

      if (url) {
        window.location.href = url;
      }
    } catch (error: any) {
      console.error('Error creating checkout session:', error);
      setError(error.message || 'Failed to create checkout session');
    } finally {
      setCheckoutLoading(false);
    }
  };

  const loading = subscriptionLoading || creditLoading;

  // Format date for better display
  const formatDate = (timestamp: number | null | undefined) => {
    if (!timestamp) return 'N/A';
    return new Date(timestamp * 1000).toLocaleDateString();
  };

  return (
    <div className="min-h-screen pt-12 pb-20">
      <div className="container mx-auto px-4">
        <div className="py-8">
          <Link to={fromDeckCreation ? "/create-deck" : "/"} className="inline-flex items-center text-muted-foreground hover:text-foreground mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to {fromDeckCreation ? "Deck Creation" : "Home"}
          </Link>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center mb-12"
          >
            <div className="flex justify-center mb-4">
              <div className="rounded-full bg-primary/20 p-3">
                <TarotLogo className="h-10 w-10 text-primary" />
              </div>
            </div>
            <h1 className="text-3xl md:text-4xl font-serif font-bold mb-3">Credit-Based Plans</h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Choose a plan that fits your creative needs. Each plan provides a different number of credits for creating tarot cards.
            </p>
          </motion.div>

          {/* Current credit balance - only show when logged in */}
          {user && credits && !loading && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="bg-card border border-border rounded-xl overflow-hidden shadow-md mb-8"
            >
              <div className="p-4 border-b border-border">
                <h2 className="font-medium text-lg">Your Current Credit Balance</h2>
              </div>
              <div className="p-5">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-primary/10 rounded-lg p-4 text-center">
                    <h3 className="text-sm text-muted-foreground mb-2">Basic Credits</h3>
                    <p className="text-3xl font-bold">{credits.basicCredits}</p>
                    <p className="text-xs text-muted-foreground mt-2">1 credit = 1 medium quality card</p>
                  </div>
                  
                  <div className="bg-accent/10 rounded-lg p-4 text-center">
                    <h3 className="text-sm text-muted-foreground mb-2">Premium Credits</h3>
                    <p className="text-3xl font-bold">{credits.premiumCredits}</p>
                    <p className="text-xs text-muted-foreground mt-2">3 credits = 1 high quality card</p>
                  </div>
                  
                  <div className="bg-muted/20 rounded-lg p-4 text-center">
                    <h3 className="text-sm text-muted-foreground mb-2">Next Refresh</h3>
                    <p className="text-xl font-bold">
                      {credits.nextRefreshDate 
                        ? new Date(credits.nextRefreshDate).toLocaleDateString() 
                        : 'Not scheduled'}
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      Plan: <span className="capitalize">{credits.planTier}</span>
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {error && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="mb-6 bg-destructive/10 border border-destructive/30 rounded-lg p-4 flex items-start gap-3 max-w-3xl mx-auto"
            >
              <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
              <div>
                <p className="font-medium text-destructive">Error</p>
                <p className="text-sm text-destructive/90">{error}</p>
              </div>
            </motion.div>
          )}

          {loading ? (
            <div className="flex justify-center items-center py-12">
              <Loader className="h-8 w-8 text-primary animate-spin mr-3" />
              <span className="text-lg">Loading plans...</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
              {/* Free Plan */}
              <motion.div
                className={`bg-card border ${selectedPlan === null ? 'border-primary' : 'border-border'} rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-all`}
                whileHover={{ y: -5 }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0 }}
              >
                {selectedPlan === null && (
                  <div className="bg-primary text-primary-foreground text-center py-2 font-medium">
                    Current Plan
                  </div>
                )}
                
                <div className="p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-serif font-bold">Free</h3>
                    <div className="p-2 bg-muted/30 rounded-full">
                      <Zap className="h-5 w-5 text-muted-foreground" />
                    </div>
                  </div>
                  
                  <div className="mb-6">
                    <div className="flex items-baseline">
                      <span className="text-3xl font-bold">$0</span>
                      <span className="text-muted-foreground ml-1">/month</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">Try out basic features with limited credits</p>
                  </div>
                  
                  <div className="space-y-3 mb-6">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Basic Credits</span>
                      <span className="font-medium">5 / month</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Premium Credits</span>
                      <span className="font-medium">0</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Credit Rollover</span>
                      <span className="font-medium">None</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Card Quality</span>
                      <span className="font-medium">Medium</span>
                    </div>
                  </div>
                  
                  <div className="space-y-3 mb-6">
                    <div className="flex items-start">
                      <div className="flex-shrink-0 mt-1">
                        <Check className="h-4 w-4 text-success" />
                      </div>
                      <span className="ml-2 text-sm">Create 5 individual cards per month</span>
                    </div>
                    <div className="flex items-start">
                      <div className="flex-shrink-0 mt-1">
                        <Check className="h-4 w-4 text-success" />
                      </div>
                      <span className="ml-2 text-sm">Access free community decks</span>
                    </div>
                  </div>
                  
                  <button
                    disabled={selectedPlan === null}
                    className={`w-full py-2 rounded-md font-medium transition-colors ${
                      selectedPlan === null 
                        ? 'bg-success/20 text-success cursor-default'
                        : 'bg-secondary text-secondary-foreground hover:bg-secondary/90'
                    } flex items-center justify-center`}
                  >
                    {selectedPlan === null ? (
                      <>
                        <Check className="h-4 w-4 mr-2" />
                        Current Plan
                      </>
                    ) : (
                      'Downgrade'
                    )}
                  </button>
                </div>
              </motion.div>

              {/* Mystic Plan */}
              <motion.div
                className={`bg-card border ${selectedPlan === 'mystic' ? 'border-primary' : 'border-border'} rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-all`}
                whileHover={{ y: -5 }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.1 }}
              >
                {selectedPlan === 'mystic' && (
                  <div className="bg-primary text-primary-foreground text-center py-2 font-medium">
                    Current Plan
                  </div>
                )}
                
                <div className="p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-serif font-bold">Mystic</h3>
                    <div className="p-2 bg-primary/20 rounded-full">
                      <Sparkles className="h-5 w-5 text-primary" />
                    </div>
                  </div>
                  
                  <div className="mb-6">
                    <div className="flex items-baseline">
                      <span className="text-3xl font-bold">$12.99</span>
                      <span className="text-muted-foreground ml-1">/month</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">Perfect for beginners exploring tarot creation</p>
                  </div>
                  
                  <div className="space-y-3 mb-6">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Basic Credits</span>
                      <span className="font-medium">22 / month</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Premium Credits</span>
                      <span className="font-medium">0</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Credit Rollover</span>
                      <span className="font-medium">Up to 5</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Card Quality</span>
                      <span className="font-medium">Medium</span>
                    </div>
                  </div>
                  
                  <div className="space-y-3 mb-6">
                    <div className="flex items-start">
                      <div className="flex-shrink-0 mt-1">
                        <Check className="h-4 w-4 text-success" />
                      </div>
                      <span className="ml-2 text-sm">Create complete Major Arcana (22 cards)</span>
                    </div>
                    <div className="flex items-start">
                      <div className="flex-shrink-0 mt-1">
                        <Check className="h-4 w-4 text-success" />
                      </div>
                      <span className="ml-2 text-sm">Medium quality image generation</span>
                    </div>
                    <div className="flex items-start">
                      <div className="flex-shrink-0 mt-1">
                        <Check className="h-4 w-4 text-success" />
                      </div>
                      <span className="ml-2 text-sm">Deck sharing capabilities</span>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => handleSubscribe('mystic')}
                    disabled={checkoutLoading || selectedPlan === 'mystic'}
                    className={`w-full py-2 rounded-md font-medium transition-colors ${
                      selectedPlan === 'mystic'
                        ? 'bg-success/20 text-success cursor-default'
                        : 'bg-primary text-primary-foreground hover:bg-primary/90'
                    } flex items-center justify-center`}
                  >
                    {checkoutLoading ? (
                      <>
                        <span className="h-4 w-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin mr-2"></span>
                        Processing...
                      </>
                    ) : selectedPlan === 'mystic' ? (
                      <>
                        <Check className="h-4 w-4 mr-2" />
                        Current Plan
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4 mr-2" />
                        {selectedPlan ? 'Switch Plan' : 'Subscribe Now'}
                      </>
                    )}
                  </button>
                </div>
              </motion.div>

              {/* Creator Plan with Popular Badge */}
              <motion.div
                className={`bg-card border ${selectedPlan === 'creator' ? 'border-primary' : 'border-border'} rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-all relative`}
                whileHover={{ y: -5 }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.2 }}
              >
                <div className="absolute top-0 right-0 mt-6 mr-6 bg-accent text-accent-foreground text-xs font-medium px-3 py-1 rounded-full">
                  Popular
                </div>
                
                {selectedPlan === 'creator' && (
                  <div className="bg-primary text-primary-foreground text-center py-2 font-medium">
                    Current Plan
                  </div>
                )}
                
                <div className="p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-serif font-bold">Creator</h3>
                    <div className="p-2 bg-accent/20 rounded-full">
                      <CreditCard className="h-5 w-5 text-accent" />
                    </div>
                  </div>
                  
                  <div className="mb-6">
                    <div className="flex items-baseline">
                      <span className="text-3xl font-bold">$29.99</span>
                      <span className="text-muted-foreground ml-1">/month</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">For serious tarot enthusiasts and deck creators</p>
                  </div>
                  
                  <div className="space-y-3 mb-6">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Basic Credits</span>
                      <span className="font-medium">78 / month</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Premium Credits</span>
                      <span className="font-medium">0</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Credit Rollover</span>
                      <span className="font-medium">Up to 15</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Card Quality</span>
                      <span className="font-medium">Medium</span>
                    </div>
                  </div>
                  
                  <div className="space-y-3 mb-6">
                    <div className="flex items-start">
                      <div className="flex-shrink-0 mt-1">
                        <Check className="h-4 w-4 text-success" />
                      </div>
                      <span className="ml-2 text-sm">Create complete full tarot deck (78 cards)</span>
                    </div>
                    <div className="flex items-start">
                      <div className="flex-shrink-0 mt-1">
                        <Check className="h-4 w-4 text-success" />
                      </div>
                      <span className="ml-2 text-sm">Medium quality image generation</span>
                    </div>
                    <div className="flex items-start">
                      <div className="flex-shrink-0 mt-1">
                        <Check className="h-4 w-4 text-success" />
                      </div>
                      <span className="ml-2 text-sm">Sell your decks in marketplace</span>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => handleSubscribe('creator')}
                    disabled={checkoutLoading || selectedPlan === 'creator'}
                    className={`w-full py-2 rounded-md font-medium transition-colors ${
                      selectedPlan === 'creator'
                        ? 'bg-success/20 text-success cursor-default'
                        : 'bg-accent text-accent-foreground hover:bg-accent/90'
                    } flex items-center justify-center`}
                  >
                    {checkoutLoading ? (
                      <>
                        <span className="h-4 w-4 border-2 border-accent-foreground border-t-transparent rounded-full animate-spin mr-2"></span>
                        Processing...
                      </>
                    ) : selectedPlan === 'creator' ? (
                      <>
                        <Check className="h-4 w-4 mr-2" />
                        Current Plan
                      </>
                    ) : (
                      <>
                        <CreditCard className="h-4 w-4 mr-2" />
                        {selectedPlan ? 'Switch Plan' : 'Subscribe Now'}
                      </>
                    )}
                  </button>
                </div>
              </motion.div>

              {/* Visionary Plan */}
              <motion.div
                className={`bg-card border ${selectedPlan === 'visionary' ? 'border-primary' : 'border-border'} rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-all`}
                whileHover={{ y: -5 }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.3 }}
              >
                {selectedPlan === 'visionary' && (
                  <div className="bg-primary text-primary-foreground text-center py-2 font-medium">
                    Current Plan
                  </div>
                )}
                
                <div className="p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-serif font-bold">Visionary</h3>
                    <div className="p-2 bg-teal/20 rounded-full">
                      <Shield className="h-5 w-5 text-teal" />
                    </div>
                  </div>
                  
                  <div className="mb-6">
                    <div className="flex items-baseline">
                      <span className="text-3xl font-bold">$79.99</span>
                      <span className="text-muted-foreground ml-1">/month</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">For professional creators and artists</p>
                  </div>
                  
                  <div className="space-y-3 mb-6">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Basic Credits</span>
                      <span className="font-medium">0</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Premium Credits</span>
                      <span className="font-medium">118 / month</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Credit Rollover</span>
                      <span className="font-medium">Full month's credits</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Card Quality</span>
                      <span className="font-medium text-teal">High</span>
                    </div>
                  </div>
                  
                  <div className="space-y-3 mb-6">
                    <div className="flex items-start">
                      <div className="flex-shrink-0 mt-1">
                        <Check className="h-4 w-4 text-success" />
                      </div>
                      <span className="ml-2 text-sm">High quality image generation</span>
                    </div>
                    <div className="flex items-start">
                      <div className="flex-shrink-0 mt-1">
                        <Check className="h-4 w-4 text-success" />
                      </div>
                      <span className="ml-2 text-sm">Style consistency across deck</span>
                    </div>
                    <div className="flex items-start">
                      <div className="flex-shrink-0 mt-1">
                        <Check className="h-4 w-4 text-success" />
                      </div>
                      <span className="ml-2 text-sm">Full rollover of unused credits</span>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => handleSubscribe('visionary')}
                    disabled={checkoutLoading || selectedPlan === 'visionary'}
                    className={`w-full py-2 rounded-md font-medium transition-colors ${
                      selectedPlan === 'visionary'
                        ? 'bg-success/20 text-success cursor-default'
                        : 'bg-teal text-teal-foreground hover:bg-teal/90'
                    } flex items-center justify-center`}
                  >
                    {checkoutLoading ? (
                      <>
                        <span className="h-4 w-4 border-2 border-teal-foreground border-t-transparent rounded-full animate-spin mr-2"></span>
                        Processing...
                      </>
                    ) : selectedPlan === 'visionary' ? (
                      <>
                        <Check className="h-4 w-4 mr-2" />
                        Current Plan
                      </>
                    ) : (
                      <>
                        <Shield className="h-4 w-4 mr-2" />
                        {selectedPlan ? 'Switch Plan' : 'Subscribe Now'}
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            </div>
          )}

          {/* How Credits Work Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="max-w-4xl mx-auto bg-card border border-border rounded-xl p-6 mb-12"
          >
            <h2 className="text-xl font-serif font-bold mb-4">How Credits Work</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <div className="flex items-start">
                  <div className="flex-shrink-0 mt-0.5 mr-3">
                    <div className="p-1 bg-primary/20 rounded-full">
                      <TarotLogo className="h-4 w-4 text-primary" />
                    </div>
                  </div>
                  <div>
                    <h3 className="font-medium mb-1">Basic Credits</h3>
                    <p className="text-sm text-muted-foreground">1 basic credit generates 1 medium quality card. Available in Free, Mystic, and Creator plans.</p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="flex-shrink-0 mt-0.5 mr-3">
                    <div className="p-1 bg-primary/20 rounded-full">
                      <TarotLogo className="h-4 w-4 text-primary" />
                    </div>
                  </div>
                  <div>
                    <h3 className="font-medium mb-1">Premium Credits</h3>
                    <p className="text-sm text-muted-foreground">3 premium credits generate 1 high quality card. Only available in the Visionary plan.</p>
                  </div>
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-start">
                  <div className="flex-shrink-0 mt-0.5 mr-3">
                    <div className="p-1 bg-primary/20 rounded-full">
                      <TarotLogo className="h-4 w-4 text-primary" />
                    </div>
                  </div>
                  <div>
                    <h3 className="font-medium mb-1">Monthly Refresh</h3>
                    <p className="text-sm text-muted-foreground">Credits refresh at the beginning of each billing cycle. Unused credits may roll over based on your plan.</p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="flex-shrink-0 mt-0.5 mr-3">
                    <div className="p-1 bg-primary/20 rounded-full">
                      <TarotLogo className="h-4 w-4 text-primary" />
                    </div>
                  </div>
                  <div>
                    <h3 className="font-medium mb-1">Rollover Credits</h3>
                    <p className="text-sm text-muted-foreground">Unused credits can roll over to the next month, up to the limit specified in your plan. Free plan credits do not roll over.</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* FAQ Section */}
          <div className="mt-16">
            <h2 className="text-2xl font-serif font-bold mb-6 text-center">Frequently Asked Questions</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
              <div className="bg-card border border-border rounded-lg p-5">
                <h3 className="font-medium mb-2">What happens if I run out of credits?</h3>
                <p className="text-sm text-muted-foreground">
                  When you run out of credits, you won't be able to generate more cards until your credits refresh at your next billing cycle. You can still use all your previously created cards and decks.
                </p>
              </div>
              
              <div className="bg-card border border-border rounded-lg p-5">
                <h3 className="font-medium mb-2">Can I upgrade or downgrade my plan?</h3>
                <p className="text-sm text-muted-foreground">
                  Yes, you can change your plan at any time. When upgrading, you'll receive the new credit allocation immediately. When downgrading, the change takes effect at the end of your current billing cycle.
                </p>
              </div>
              
              <div className="bg-card border border-border rounded-lg p-5">
                <h3 className="font-medium mb-2">What's the difference between medium and high quality?</h3>
                <p className="text-sm text-muted-foreground">
                  High quality images (available in the Visionary plan) feature enhanced detail, more consistent style across cards, and generally more polished artwork compared to medium quality images.
                </p>
              </div>
              
              <div className="bg-card border border-border rounded-lg p-5">
                <h3 className="font-medium mb-2">Can I purchase additional credits?</h3>
                <p className="text-sm text-muted-foreground">
                  Additional credit purchases are coming soon! This feature will allow you to buy more credits if you run out before your monthly refresh.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionPage;