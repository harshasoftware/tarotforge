import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Sparkles, Shield, Zap, ArrowLeft, Loader, Check, Crown } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import SubscriptionCard from '../../components/subscription/SubscriptionCard';
import { STRIPE_PRODUCTS } from '../../lib/stripe-config';
import { getUserSubscription } from '../../lib/stripe';
import TarotLogo from '../../components/ui/TarotLogo';

const SubscriptionPage: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSubscription = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const subscriptionData = await getUserSubscription();
        setSubscription(subscriptionData);
      } catch (err) {
        console.error('Error fetching subscription:', err);
        setError('Failed to load subscription information. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchSubscription();
  }, [user]);

  const isSubscribed = subscription?.subscription_status === 'active' || subscription?.subscription_status === 'trialing';

  return (
    <div className="min-h-screen pt-12 pb-20">
      <div className="container mx-auto px-4">
        <div className="py-8">
          <Link to="/" className="inline-flex items-center text-muted-foreground hover:text-foreground mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Home
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
            <h1 className="text-3xl md:text-4xl font-serif font-bold mb-3">Premium Membership</h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Unlock the full potential of Tarot Forge with our premium membership. Access exclusive decks, advanced features, and more.
            </p>
          </motion.div>

          {loading ? (
            <div className="flex justify-center items-center py-12">
              <Loader className="h-8 w-8 text-primary animate-spin mr-3" />
              <span className="text-lg">Loading subscription information...</span>
            </div>
          ) : error ? (
            <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-6 max-w-md mx-auto text-center">
              <Shield className="h-12 w-12 text-destructive mx-auto mb-4" />
              <h2 className="text-xl font-medium mb-2">Error Loading Subscription</h2>
              <p className="text-muted-foreground mb-6">{error}</p>
              <button 
                onClick={() => window.location.reload()}
                className="btn btn-primary px-6 py-2"
              >
                Try Again
              </button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
                {/* Free Plan */}
                <motion.div
                  className={`bg-card border ${!isSubscribed ? 'border-primary' : 'border-border'} rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-all`}
                  whileHover={{ y: -5 }}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.1 }}
                >
                  {!isSubscribed && (
                    <div className="bg-primary text-primary-foreground text-center py-2 font-medium">
                      Current Plan
                    </div>
                  )}
                  
                  <div className="p-6">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-xl font-serif font-bold">Free Plan</h3>
                      <div className="p-2 bg-muted/30 rounded-full">
                        <Zap className="h-5 w-5 text-muted-foreground" />
                      </div>
                    </div>
                    
                    <div className="mb-6">
                      <div className="flex items-baseline">
                        <span className="text-3xl font-bold">$0</span>
                        <span className="text-muted-foreground ml-1">/forever</span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-2">Basic access to Tarot Forge with limited features</p>
                    </div>
                    
                    <div className="space-y-3 mb-6">
                      <div className="flex items-start">
                        <div className="flex-shrink-0 mt-1">
                          <Check className="h-4 w-4 text-success" />
                        </div>
                        <span className="ml-2 text-sm">5 basic credits monthly</span>
                      </div>
                      <div className="flex items-start">
                        <div className="flex-shrink-0 mt-1">
                          <Check className="h-4 w-4 text-success" />
                        </div>
                        <span className="ml-2 text-sm">Medium quality cards only</span>
                      </div>
                      <div className="flex items-start">
                        <div className="flex-shrink-0 mt-1">
                          <Check className="h-4 w-4 text-success" />
                        </div>
                        <span className="ml-2 text-sm">No credit rollover</span>
                      </div>
                    </div>
                    
                    <button
                      disabled={!isSubscribed}
                      className={`w-full py-2 rounded-md font-medium transition-colors ${
                        !isSubscribed 
                          ? 'bg-success/20 text-success cursor-default'
                          : 'bg-secondary text-secondary-foreground hover:bg-secondary/90'
                      } flex items-center justify-center`}
                    >
                      {!isSubscribed ? (
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

                {/* Premium Subscription */}
                <SubscriptionCard 
                  product={STRIPE_PRODUCTS.subscription} 
                  isActive={isSubscribed}
                />

                {/* Annual Plan (placeholder) */}
                <motion.div
                  className="bg-card border border-border rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-all opacity-60"
                  whileHover={{ y: -5 }}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 0.6, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.3 }}
                >
                  <div className="absolute inset-0 flex items-center justify-center bg-card/80 backdrop-blur-xs z-10">
                    <div className="bg-card/90 px-4 py-2 rounded-md border border-border">
                      <span className="text-sm font-medium">Coming Soon</span>
                    </div>
                  </div>
                  
                  <div className="p-6 relative">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-xl font-serif font-bold">Annual Plan</h3>
                      <div className="p-2 bg-accent/20 rounded-full">
                        <Sparkles className="h-5 w-5 text-accent" />
                      </div>
                    </div>
                    
                    <div className="mb-6">
                      <div className="flex items-baseline">
                        <span className="text-3xl font-bold">$89.99</span>
                        <span className="text-muted-foreground ml-1">/year</span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-2">Save 25% with our annual plan</p>
                    </div>
                    
                    <div className="space-y-3 mb-6">
                      <div className="flex items-start">
                        <div className="flex-shrink-0 mt-1">
                          <Check className="h-4 w-4 text-success" />
                        </div>
                        <span className="ml-2 text-sm">All premium features</span>
                      </div>
                      <div className="flex items-start">
                        <div className="flex-shrink-0 mt-1">
                          <Check className="h-4 w-4 text-success" />
                        </div>
                        <span className="ml-2 text-sm">25% savings compared to monthly</span>
                      </div>
                      <div className="flex items-start">
                        <div className="flex-shrink-0 mt-1">
                          <Check className="h-4 w-4 text-success" />
                        </div>
                        <span className="ml-2 text-sm">Exclusive annual member benefits</span>
                      </div>
                    </div>
                    
                    <button
                      disabled={true}
                      className="w-full py-2 rounded-md font-medium bg-muted text-muted-foreground cursor-not-allowed flex items-center justify-center"
                    >
                      Coming Soon
                    </button>
                  </div>
                </motion.div>
              </div>

              {/* Subscription details for current subscribers */}
              {isSubscribed && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.4 }}
                  className="bg-card border border-border rounded-xl p-6 max-w-3xl mx-auto"
                >
                  <h2 className="text-xl font-serif font-bold mb-4">Your Subscription Details</h2>
                  
                  <div className="space-y-4">
                    <div className="flex justify-between border-b border-border pb-3">
                      <span className="text-muted-foreground">Status</span>
                      <span className="font-medium capitalize">{subscription?.subscription_status || 'Unknown'}</span>
                    </div>
                    
                    <div className="flex justify-between border-b border-border pb-3">
                      <span className="text-muted-foreground">Current Period</span>
                      <span className="font-medium">
                        {subscription?.current_period_start 
                          ? new Date(subscription.current_period_start * 1000).toLocaleDateString() 
                          : 'N/A'} - {subscription?.current_period_end 
                          ? new Date(subscription.current_period_end * 1000).toLocaleDateString() 
                          : 'N/A'}
                      </span>
                    </div>
                    
                    {subscription?.payment_method_brand && (
                      <div className="flex justify-between border-b border-border pb-3">
                        <span className="text-muted-foreground">Payment Method</span>
                        <span className="font-medium capitalize">
                          {subscription.payment_method_brand} •••• {subscription.payment_method_last4}
                        </span>
                      </div>
                    )}
                    
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Auto Renewal</span>
                      <span className="font-medium">
                        {subscription?.cancel_at_period_end ? 'Off' : 'On'}
                      </span>
                    </div>
                  </div>
                  
                  <div className="mt-6 pt-6 border-t border-border flex justify-end">
                    <button className="btn btn-secondary py-2 px-4">
                      Manage Subscription
                    </button>
                  </div>
                </motion.div>
              )}
            </>
          )}

          {/* Credit System Section */}
          <div className="mt-16">
            <h2 className="text-2xl font-serif font-bold mb-6 text-center">Credit System Explained</h2>
            
            <div className="bg-card border border-border rounded-lg p-6 max-w-4xl mx-auto mb-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-xl font-serif font-bold mb-4 flex items-center">
                    <Sparkles className="h-5 w-5 text-primary mr-2" />
                    How Credits Work
                  </h3>
                  
                  <p className="text-sm text-muted-foreground mb-4">
                    Our flexible credit system gives you control over how you create and use cards:
                  </p>
                  
                  <ul className="space-y-3">
                    <li className="flex items-start">
                      <div className="h-5 w-5 rounded-full bg-primary/20 flex items-center justify-center text-primary mr-2 flex-shrink-0 mt-0.5">✓</div>
                      <div>
                        <p className="font-medium">Basic Credit</p>
                        <p className="text-sm text-muted-foreground">1 credit = 1 medium quality card</p>
                      </div>
                    </li>
                    <li className="flex items-start">
                      <div className="h-5 w-5 rounded-full bg-primary/20 flex items-center justify-center text-primary mr-2 flex-shrink-0 mt-0.5">✓</div>
                      <div>
                        <p className="font-medium">Premium Credit</p>
                        <p className="text-sm text-muted-foreground">1 credit = 1/3 high quality card (3 credits per high-quality image)</p>
                      </div>
                    </li>
                    <li className="flex items-start">
                      <div className="h-5 w-5 rounded-full bg-primary/20 flex items-center justify-center text-primary mr-2 flex-shrink-0 mt-0.5">✓</div>
                      <div>
                        <p className="font-medium">Monthly Reset</p>
                        <p className="text-sm text-muted-foreground">Credits refresh at the beginning of each billing cycle</p>
                      </div>
                    </li>
                  </ul>
                </div>
                
                <div>
                  <h3 className="text-xl font-serif font-bold mb-4 flex items-center">
                    <Crown className="h-5 w-5 text-primary mr-2" />
                    Plan Comparison
                  </h3>
                  
                  <div className="overflow-x-auto">
                    <table className="min-w-full">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left py-2">Plan</th>
                          <th className="text-center py-2">Credits</th>
                          <th className="text-center py-2">Quality</th>
                          <th className="text-center py-2">Rollover</th>
                        </tr>
                      </thead>
                      <tbody className="text-sm">
                        <tr className="border-b border-border">
                          <td className="py-2">Free</td>
                          <td className="text-center py-2">5</td>
                          <td className="text-center py-2">Medium</td>
                          <td className="text-center py-2">None</td>
                        </tr>
                        <tr className="border-b border-border">
                          <td className="py-2">Mystic</td>
                          <td className="text-center py-2">22</td>
                          <td className="text-center py-2">Medium</td>
                          <td className="text-center py-2">Up to 5</td>
                        </tr>
                        <tr className="border-b border-border">
                          <td className="py-2">Creator</td>
                          <td className="text-center py-2">78</td>
                          <td className="text-center py-2">Medium</td>
                          <td className="text-center py-2">Up to 15</td>
                        </tr>
                        <tr>
                          <td className="py-2">Visionary</td>
                          <td className="text-center py-2">118</td>
                          <td className="text-center py-2">High</td>
                          <td className="text-center py-2">Full</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Premium Plan Details */}
          <div className="mt-16">
            <h2 className="text-2xl font-serif font-bold mb-6 text-center">Premium Plan Details</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
              {/* Free Plan */}
              <div className="bg-card border border-border rounded-lg p-6">
                <div className="p-3 bg-muted/30 rounded-xl w-fit mb-4 mx-auto">
                  <Zap className="h-6 w-6 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-serif font-bold mb-2 text-center">Free Plan</h3>
                <div className="text-center mb-4">
                  <span className="text-2xl font-bold">$0</span>
                  <span className="text-muted-foreground">/forever</span>
                </div>
                <div className="space-y-2 mb-4 text-sm">
                  <div className="flex items-start">
                    <Check className="h-4 w-4 text-success mt-1 mr-2 flex-shrink-0" />
                    <span>5 basic credits</span>
                  </div>
                  <div className="flex items-start">
                    <Check className="h-4 w-4 text-success mt-1 mr-2 flex-shrink-0" />
                    <span>Medium quality only</span>
                  </div>
                  <div className="flex items-start">
                    <Check className="h-4 w-4 text-success mt-1 mr-2 flex-shrink-0" />
                    <span>No credit rollover</span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground text-center mb-4">
                  Cost to us: $0.32 per active user monthly
                </p>
              </div>
              
              {/* Mystic Plan */}
              <div className="bg-card border border-border rounded-lg p-6">
                <div className="p-3 bg-primary/10 rounded-xl w-fit mb-4 mx-auto">
                  <Crown className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-lg font-serif font-bold mb-2 text-center">Mystic</h3>
                <div className="text-center mb-4">
                  <span className="text-2xl font-bold">$12.99</span>
                  <span className="text-muted-foreground">/month</span>
                </div>
                <div className="space-y-2 mb-4 text-sm">
                  <div className="flex items-start">
                    <Check className="h-4 w-4 text-success mt-1 mr-2 flex-shrink-0" />
                    <span>22 basic credits (complete Major Arcana)</span>
                  </div>
                  <div className="flex items-start">
                    <Check className="h-4 w-4 text-success mt-1 mr-2 flex-shrink-0" />
                    <span>Medium quality only</span>
                  </div>
                  <div className="flex items-start">
                    <Check className="h-4 w-4 text-success mt-1 mr-2 flex-shrink-0" />
                    <span>Up to 5 unused credits rollover</span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground text-center mb-4">
                  Annual: $124.99/year with 25 bonus credits
                </p>
              </div>
              
              {/* Creator Plan */}
              <div className="bg-card border border-border rounded-lg p-6">
                <div className="p-3 bg-accent/10 rounded-xl w-fit mb-4 mx-auto">
                  <Sparkles className="h-6 w-6 text-accent" />
                </div>
                <h3 className="text-lg font-serif font-bold mb-2 text-center">Creator</h3>
                <div className="text-center mb-4">
                  <span className="text-2xl font-bold">$29.99</span>
                  <span className="text-muted-foreground">/month</span>
                </div>
                <div className="space-y-2 mb-4 text-sm">
                  <div className="flex items-start">
                    <Check className="h-4 w-4 text-success mt-1 mr-2 flex-shrink-0" />
                    <span>78 basic credits (complete full deck)</span>
                  </div>
                  <div className="flex items-start">
                    <Check className="h-4 w-4 text-success mt-1 mr-2 flex-shrink-0" />
                    <span>Medium quality only</span>
                  </div>
                  <div className="flex items-start">
                    <Check className="h-4 w-4 text-success mt-1 mr-2 flex-shrink-0" />
                    <span>Up to 15 unused credits rollover</span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground text-center mb-4">
                  Annual: $287.99/year with 100 bonus credits
                </p>
              </div>
              
              {/* Visionary Plan */}
              <div className="bg-gradient-to-b from-primary/5 to-transparent border border-primary rounded-lg p-6 relative">
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-primary text-primary-foreground px-3 py-1 rounded-full text-xs font-bold">
                  BEST VALUE
                </div>
                <div className="p-3 bg-primary/10 rounded-xl w-fit mb-4 mx-auto">
                  <Crown className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-lg font-serif font-bold mb-2 text-center">Visionary</h3>
                <div className="text-center mb-4">
                  <span className="text-2xl font-bold">$79.99</span>
                  <span className="text-muted-foreground">/month</span>
                </div>
                <div className="space-y-2 mb-4 text-sm">
                  <div className="flex items-start">
                    <Check className="h-4 w-4 text-success mt-1 mr-2 flex-shrink-0" />
                    <span>118 premium credits (HIGH quality only)</span>
                  </div>
                  <div className="flex items-start">
                    <Check className="h-4 w-4 text-success mt-1 mr-2 flex-shrink-0" />
                    <span>Full commercial rights</span>
                  </div>
                  <div className="flex items-start">
                    <Check className="h-4 w-4 text-success mt-1 mr-2 flex-shrink-0" />
                    <span>Full rollover of unused credits</span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground text-center mb-4">
                  Annual: $767.99/year with 200 bonus credits
                </p>
              </div>
            </div>
          </div>

          {/* FAQ Section */}
          <div className="mt-16">
            <h2 className="text-2xl font-serif font-bold mb-6 text-center">Frequently Asked Questions</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
              <div className="bg-card border border-border rounded-lg p-5">
                <h3 className="font-medium mb-2">What are credits and how do they work?</h3>
                <p className="text-sm text-muted-foreground">
                  Credits are our system for card creation. One basic credit creates one medium-quality card, while high-quality cards require 3 premium credits each. Credits refresh monthly with your subscription.
                </p>
              </div>
              
              <div className="bg-card border border-border rounded-lg p-5">
                <h3 className="font-medium mb-2">What's the difference between medium and high quality?</h3>
                <p className="text-sm text-muted-foreground">
                  High-quality cards have enhanced detail, better composition, and more sophisticated imagery. They're ideal for professional-looking decks or commercial projects.
                </p>
              </div>
              
              <div className="bg-card border border-border rounded-lg p-5">
                <h3 className="font-medium mb-2">Can I cancel my subscription anytime?</h3>
                <p className="text-sm text-muted-foreground">
                  Yes, you can cancel your subscription at any time. You'll continue to have access to premium features until the end of your current billing period.
                </p>
              </div>
              
              <div className="bg-card border border-border rounded-lg p-5">
                <h3 className="font-medium mb-2">What happens to my unused credits?</h3>
                <p className="text-sm text-muted-foreground">
                  Depending on your plan, a certain number of unused credits will roll over to the next month. Free plan credits do not roll over, while Visionary subscribers can roll over all unused credits.
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