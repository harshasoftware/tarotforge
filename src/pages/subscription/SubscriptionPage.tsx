import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Sparkles, Shield, Zap, ArrowLeft, Loader, CreditCard, Check, AlertCircle, Clock, ChevronsUpDown, TrendingUp } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSubscription } from '../../context/SubscriptionContext';
import { STRIPE_PRODUCTS, StripeProduct } from '../../lib/stripe-config';
import { createCheckoutSession } from '../../lib/stripe';
import TarotLogo from '../../components/ui/TarotLogo';

const SubscriptionPage: React.FC = () => {
  const { user } = useAuth();
  const { subscription, isSubscribed, loading: subscriptionLoading } = useSubscription();
  const location = useLocation();
  const navigate = useNavigate();
  const fromDeckCreation = location.state?.fromDeckCreation || false;
  
  const [billingInterval, setBillingInterval] = useState<'month' | 'year'>('month');
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showExplorerPlus, setShowExplorerPlus] = useState(true);

  // Calculate savings percentage for yearly plans
  const calculateSavings = (monthlyPrice: number, yearlyPrice: number): number => {
    const monthlyTotal = monthlyPrice * 12;
    const yearlyTotal = yearlyPrice;
    return Math.round(((monthlyTotal - yearlyTotal) / monthlyTotal) * 100);
  };

  // Filter plans based on billing interval
  const getPlansForInterval = (interval: 'month' | 'year') => {
    return Object.entries(STRIPE_PRODUCTS)
      .filter(([_, product]) => product.interval === interval)
      .map(([key, product]) => ({ key, product }));
  };

  // Determine current plan for highlighting
  useEffect(() => {
    if (subscription?.price_id) {
      // Find which product this price ID belongs to
      const productKey = Object.keys(STRIPE_PRODUCTS).find(
        key => STRIPE_PRODUCTS[key].priceId === subscription.price_id
      );
      
      if (productKey) {
        setSelectedPlan(productKey);
        // Set the billing interval based on the current subscription
        if (STRIPE_PRODUCTS[productKey].interval) {
          const interval = STRIPE_PRODUCTS[productKey].interval;
          if (interval === 'month' || interval === 'year') {
            setBillingInterval(interval);
          }
        }
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

      // Save redirect information for after successful checkout
      if (fromDeckCreation) {
        localStorage.setItem('redirectToDeckCreation', 'true');
      }

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

  const loading = subscriptionLoading;

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
            className="text-center mb-8"
          >
            <div className="flex justify-center mb-4">
              <div className="rounded-full bg-primary/20 p-3">
                <TarotLogo className="h-10 w-10 text-primary" />
              </div>
            </div>
            <h1 className="text-3xl md:text-4xl font-serif font-bold mb-3">Choose Your Plan</h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Select a plan that fits your creative needs. Each plan provides a different number of decks you can generate.
            </p>
          </motion.div>

          {/* Billing interval toggle */}
          <div className="flex justify-center mb-8">
            <div className="p-1 bg-card border border-border rounded-full">
              <div className="flex items-center">
                <button
                  onClick={() => setBillingInterval('month')}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    billingInterval === 'month' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted/50'
                  }`}
                >
                  Monthly
                </button>
                <button
                  onClick={() => setBillingInterval('year')}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    billingInterval === 'year' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted/50'
                  }`}
                >
                  <span className="flex items-center">
                    Yearly
                    <span className="ml-1 px-1.5 py-0.5 text-xs bg-success/20 text-success rounded-full">Save 20%</span>
                  </span>
                </button>
              </div>
            </div>
          </div>

          {/* Current subscription info */}
          {user && subscription && !loading && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="bg-card border border-border rounded-xl overflow-hidden shadow-md mb-8"
            >
              <div className="p-4 border-b border-border">
                <h2 className="font-medium text-lg">Your Current Subscription</h2>
              </div>
              <div className="p-5">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-primary/10 rounded-lg p-4 text-center">
                    <h3 className="text-sm text-muted-foreground mb-2">Status</h3>
                    <p className="text-lg font-bold capitalize">{subscription?.subscription_status || 'Free'}</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      {subscription?.subscription_id ? 'Active subscription' : 'No active subscription'}
                    </p>
                  </div>
                  
                  <div className="bg-muted/20 rounded-lg p-4 text-center">
                    <h3 className="text-sm text-muted-foreground mb-2">Current Period</h3>
                    <p className="text-lg font-medium">
                      {subscription?.current_period_start 
                        ? formatDate(subscription.current_period_start) 
                        : 'N/A'} - {subscription?.current_period_end 
                        ? formatDate(subscription.current_period_end) 
                        : 'N/A'}
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      {subscription?.cancel_at_period_end ? 'Cancels at period end' : 'Auto-renews'}
                    </p>
                  </div>
                  
                  <div className="bg-muted/20 rounded-lg p-4 text-center">
                    <h3 className="text-sm text-muted-foreground mb-2">Plan</h3>
                    {selectedPlan ? (
                      <p className="text-lg font-bold">
                        {STRIPE_PRODUCTS[selectedPlan]?.name || 'Unknown Plan'}
                      </p>
                    ) : (
                      <p className="text-lg font-bold">Free Plan</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-2">
                      {selectedPlan ? 
                        `${STRIPE_PRODUCTS[selectedPlan]?.deckCount} decks per ${STRIPE_PRODUCTS[selectedPlan]?.interval}` : 
                        '1 Major Arcana deck per month'}
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
            <>
              {/* Free Plan as a banner */}
              <motion.div
                className={`bg-card border ${selectedPlan === null ? 'border-primary' : 'border-border'} rounded-xl overflow-hidden shadow mb-8`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0 }}
              >
                <div className="p-4 md:p-6 flex flex-col md:flex-row md:items-center justify-between">
                  <div className="flex items-center mb-4 md:mb-0">
                    <div className="p-2 bg-muted/30 rounded-full mr-4">
                      <Zap className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <h3 className="text-xl font-serif font-bold">🌙 Explorer (Free)</h3>
                      <p className="text-sm text-muted-foreground max-w-md">1 Major Arcana deck (22 cards) per month with basic features</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center">
                    <div className="bg-muted/20 px-4 py-2 rounded-lg mr-4">
                      <span className="text-2xl font-bold">$0</span>
                      <span className="text-muted-foreground text-sm">/forever</span>
                    </div>
                    
                    <button
                      disabled={selectedPlan === null}
                      className={`py-2 px-4 rounded-md font-medium ${
                        selectedPlan === null 
                          ? 'bg-success/20 text-success' 
                          : 'bg-secondary text-secondary-foreground hover:bg-secondary/90'
                      }`}
                    >
                      {selectedPlan === null ? 'Current Plan' : 'Downgrade'}
                    </button>
                  </div>
                </div>
              </motion.div>
              
              {/* Explorer Plus - One Time Upgrade */}
              {showExplorerPlus && (
                <motion.div
                  className={`bg-card border ${selectedPlan === 'explorer-plus' ? 'border-warning' : 'border-warning/30'} rounded-xl overflow-hidden shadow mb-8 bg-warning/5`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.05 }}
                >
                  <div className="p-4 md:p-6 flex flex-col md:flex-row md:items-center justify-between">
                    <div className="flex items-center mb-4 md:mb-0">
                      <div className="p-2 bg-warning/20 rounded-full mr-4">
                        <TrendingUp className="h-5 w-5 text-warning" />
                      </div>
                      <div>
                        <h3 className="text-xl font-serif font-bold">⚡ Explorer Plus</h3>
                        <p className="text-sm text-muted-foreground max-w-md">Upgrade any Major Arcana to a complete 78-card deck</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center">
                      <div className="bg-card/80 px-4 py-2 rounded-lg mr-4">
                        <span className="text-2xl font-bold">$5</span>
                        <span className="text-muted-foreground text-sm">/per deck</span>
                      </div>
                      
                      <button
                        onClick={() => handleSubscribe('explorer-plus')}
                        disabled={checkoutLoading}
                        className="bg-warning text-warning-foreground hover:bg-warning/90 py-2 px-4 rounded-md font-medium flex items-center"
                      >
                        {checkoutLoading ? (
                          <>
                            <span className="h-4 w-4 border-2 border-warning-foreground border-t-transparent rounded-full animate-spin mr-2"></span>
                            Processing...
                          </>
                        ) : (
                          <>
                            <TrendingUp className="h-4 w-4 mr-2" />
                            Upgrade a Deck
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
              
              {/* Paid Plans Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                {/* Subscription Plans for current billing interval */}
                {getPlansForInterval(billingInterval).map(({ key, product }, index) => (
                  <motion.div
                    key={key}
                    className={`bg-card border ${selectedPlan === key ? 'border-primary' : 'border-border'} rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-all relative`}
                    whileHover={{ y: -5 }}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.1 + index * 0.1 }}
                  >
                    {product.popular && (
                      <div className="absolute top-0 right-0 mt-6 mr-6 bg-accent text-accent-foreground text-xs font-medium px-3 py-1 rounded-full">
                        Popular
                      </div>
                    )}
                    
                    {selectedPlan === key && (
                      <div className="bg-primary text-primary-foreground text-center py-2 font-medium">
                        Current Plan
                      </div>
                    )}
                    
                    <div className="p-6">
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="text-xl font-serif font-bold">
                          {product.name.replace(' (Yearly)', '').replace(' (Monthly)', '')}
                        </h3>
                        {key.includes('mystic') && (
                          <div className="p-2 bg-primary/20 rounded-full">
                            <Sparkles className="h-5 w-5 text-primary" />
                          </div>
                        )}
                        {key.includes('creator') && (
                          <div className="p-2 bg-accent/20 rounded-full">
                            <CreditCard className="h-5 w-5 text-accent" />
                          </div>
                        )}
                        {key.includes('visionary') && (
                          <div className="p-2 bg-teal/20 rounded-full">
                            <Shield className="h-5 w-5 text-teal" />
                          </div>
                        )}
                      </div>
                      
                      <div className="mb-6">
                        <div className="flex items-baseline">
                          <span className="text-3xl font-bold">${product.price}</span>
                          <span className="text-muted-foreground ml-1">
                            {product.interval === 'once' ? '/one-time' : `/${product.interval}`}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-2">{product.description}</p>
                        
                        {product.interval === 'year' && (
                          <div className="mt-1 flex items-center">
                            <Clock className="h-3 w-3 mr-1 text-success" />
                            <span className="text-xs text-success">
                              Save {calculateSavings(
                                STRIPE_PRODUCTS[key.replace('yearly', 'monthly')].price as number,
                                product.price as number
                              )}% compared to monthly
                            </span>
                          </div>
                        )}
                      </div>
                      
                      <div className="space-y-3 mb-6">
                        <div className="flex items-center justify-between">
                          <span className="text-sm">
                            {product.interval === 'year' ? 'Yearly' : 'Monthly'} Deck Limit
                          </span>
                          <span className="font-medium">{product.deckCount} decks</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm">
                            Total Card Capacity
                          </span>
                          <span className="font-medium">{product.cardCount} cards</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Card Quality</span>
                          <span className="font-medium capitalize">{product.cardImageQuality}</span>
                        </div>
                      </div>
                      
                      <div className="space-y-3 mb-6">
                        {product.features?.slice(0, 5).map((feature, index) => (
                          <div key={index} className="flex items-start">
                            <div className="flex-shrink-0 mt-1">
                              <Check className="h-4 w-4 text-success" />
                            </div>
                            <span className="ml-2 text-sm">{feature}</span>
                          </div>
                        ))}
                        
                        {product.features && product.features.length > 5 && (
                          <button
                            className="flex items-center text-sm text-primary hover:underline mt-2"
                            onClick={() => {}}
                          >
                            <ChevronsUpDown className="h-4 w-4 mr-1" />
                            Show all features
                          </button>
                        )}
                      </div>
                      
                      <button
                        onClick={() => handleSubscribe(key)}
                        disabled={checkoutLoading || selectedPlan === key}
                        className={`w-full py-2 rounded-md font-medium transition-colors ${
                          selectedPlan === key
                            ? 'bg-success/20 text-success cursor-default'
                            : key.includes('mystic')
                              ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                              : key.includes('creator')
                                ? 'bg-accent text-accent-foreground hover:bg-accent/90'
                                : 'bg-teal text-teal-foreground hover:bg-teal/90'
                        } flex items-center justify-center`}
                      >
                        {checkoutLoading ? (
                          <>
                            <span className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2"></span>
                            Processing...
                          </>
                        ) : selectedPlan === key ? (
                          <>
                            <Check className="h-4 w-4 mr-2" />
                            Current Plan
                          </>
                        ) : (
                          <>
                            {key.includes('mystic') && <Sparkles className="h-4 w-4 mr-2" />}
                            {key.includes('creator') && <CreditCard className="h-4 w-4 mr-2" />}
                            {key.includes('visionary') && <Shield className="h-4 w-4 mr-2" />}
                            {selectedPlan ? 'Switch Plan' : 'Subscribe Now'}
                          </>
                        )}
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </>
          )}

          {/* How Deck Generation Works */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="max-w-4xl mx-auto bg-card border border-border rounded-xl p-6 mb-12"
          >
            <h2 className="text-xl font-serif font-bold mb-4">How Deck Generation Works</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <div className="flex items-start">
                  <div className="flex-shrink-0 mt-0.5 mr-3">
                    <div className="p-1 bg-primary/20 rounded-full">
                      <TarotLogo className="h-4 w-4 text-primary" />
                    </div>
                  </div>
                  <div>
                    <h3 className="font-medium mb-1">Free Plan</h3>
                    <p className="text-sm text-muted-foreground">With the free plan, you can generate one Major Arcana deck (22 cards) per month. Upgrade to Explorer Plus to complete your deck.</p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="flex-shrink-0 mt-0.5 mr-3">
                    <div className="p-1 bg-primary/20 rounded-full">
                      <TarotLogo className="h-4 w-4 text-primary" />
                    </div>
                  </div>
                  <div>
                    <h3 className="font-medium mb-1">Explorer Plus</h3>
                    <p className="text-sm text-muted-foreground">Pay a one-time fee of $5 to complete a specific Major Arcana deck with the remaining 56 Minor Arcana cards.</p>
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
                    <h3 className="font-medium mb-1">
                      {billingInterval === 'month' ? 'Monthly' : 'Yearly'} Subscription
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Subscriptions give you a monthly allocation of complete deck generation. Decks refresh at the beginning of each billing cycle.
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="flex-shrink-0 mt-0.5 mr-3">
                    <div className="p-1 bg-primary/20 rounded-full">
                      <TarotLogo className="h-4 w-4 text-primary" />
                    </div>
                  </div>
                  <div>
                    <h3 className="font-medium mb-1">Regeneration Limit</h3>
                    <p className="text-sm text-muted-foreground">Free plan allows 2 card regenerations per deck. Explorer Plus gives 5 regenerations. Subscriptions include unlimited regenerations.</p>
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
                <h3 className="font-medium mb-2">What is Explorer Plus?</h3>
                <p className="text-sm text-muted-foreground">
                  Explorer Plus is a one-time purchase to upgrade a single Major Arcana deck (22 cards) to a full 78-card deck. It's perfect if you want to complete just one deck without committing to a subscription.
                </p>
              </div>
              
              <div className="bg-card border border-border rounded-lg p-5">
                <h3 className="font-medium mb-2">What happens if I run out of decks?</h3>
                <p className="text-sm text-muted-foreground">
                  When you reach your monthly deck generation limit, you won't be able to create more decks until your allocation refreshes at the next billing cycle. You can still use all your previously created decks.
                </p>
              </div>
              
              <div className="bg-card border border-border rounded-lg p-5">
                <h3 className="font-medium mb-2">Can I upgrade or downgrade my plan?</h3>
                <p className="text-sm text-muted-foreground">
                  Yes, you can change your plan at any time. When upgrading, you'll receive the new deck allocation immediately. When downgrading, the change takes effect at the end of your current billing cycle.
                </p>
              </div>
              
              <div className="bg-card border border-border rounded-lg p-5">
                <h3 className="font-medium mb-2">What's the difference between medium and high quality?</h3>
                <p className="text-sm text-muted-foreground">
                  High quality images (available in the Creator and Visionary plans) feature enhanced detail, more consistent style across cards, and generally more polished artwork compared to medium quality images.
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