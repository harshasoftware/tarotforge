import { useState } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { Sparkles, Shield, Zap, CreditCard, ArrowRight, Check } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { STRIPE_PRODUCTS } from '../../lib/stripe-config';
import TarotLogo from '../../components/ui/TarotLogo';

const PricingPage = () => {
  const { user, setShowSignInModal } = useAuth();
  const navigate = useNavigate();
  const [billingInterval, setBillingInterval] = useState<'month' | 'year'>('month');

  // If user is logged in, redirect to subscription page
  if (user) {
    navigate('/subscription');
    return null;
  }

  // Filter plans based on billing interval
  const getPlansForInterval = (interval: 'month' | 'year') => {
    return Object.entries(STRIPE_PRODUCTS)
      .filter(([_, product]) => product.interval === interval)
      .map(([key, product]) => ({ key, product }));
  };
  
  // Calculate savings percentage for yearly plans
  const calculateSavings = (monthlyPrice: number, yearlyPrice: number): number => {
    const monthlyTotal = monthlyPrice * 12;
    const yearlyTotal = yearlyPrice;
    return Math.round(((monthlyTotal - yearlyTotal) / monthlyTotal) * 100);
  };

  // Handle "Get Started" button click
  const handleGetStarted = () => {
    setShowSignInModal(true);
  };

  return (
    <div className="min-h-screen pt-12 pb-20">
      <div className="container mx-auto px-4">
        <div className="py-8">
          {/* Header */}
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
            <h1 className="text-3xl md:text-4xl font-serif font-bold mb-3">Plans & Pricing</h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Choose a plan that fits your creative journey. Unlock the power to create unique tarot decks and access premium features.
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

          {/* Free Plan as a banner */}
          <motion.div
            className="bg-card border border-border rounded-xl overflow-hidden shadow mb-8"
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
                  <h3 className="text-xl font-serif font-bold">🌙 Explorer (Free Plan)</h3>
                  <p className="text-sm text-muted-foreground max-w-md">Try out basic features with 5 monthly credits for medium quality cards</p>
                </div>
              </div>
              
              <div className="flex items-center">
                <div className="bg-muted/20 px-4 py-2 rounded-lg mr-4">
                  <span className="text-2xl font-bold">$0</span>
                  <span className="text-muted-foreground text-sm">/forever</span>
                </div>
                
                <button
                  onClick={handleGetStarted}
                  className="btn btn-secondary py-2 px-4 flex items-center"
                >
                  Get Started
                </button>
              </div>
            </div>
          </motion.div>
          
          {/* Paid Plans Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            {getPlansForInterval(billingInterval).map(({ key, product }, index) => (
              <motion.div
                key={key}
                className="bg-card border border-border rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-all relative"
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
                
                <div className="p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-serif font-bold">
                      {key.includes('mystic') ? '⭐ ' : key.includes('creator') ? '💫 ' : '✨ '}
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
                      <span className="text-muted-foreground ml-1">/{product.interval}</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">{product.description}</p>
                    
                    {product.interval === 'year' && (
                      <div className="mt-1 flex items-center">
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
                    onClick={handleGetStarted}
                    className={`w-full py-2 rounded-md font-medium transition-colors ${
                      key.includes('mystic')
                        ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                        : key.includes('creator')
                          ? 'bg-accent text-accent-foreground hover:bg-accent/90'
                          : 'bg-teal text-teal-foreground hover:bg-teal/90'
                    } flex items-center justify-center`}
                  >
                    <ArrowRight className="h-4 w-4 mr-2" />
                    Get Started
                  </button>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Features Comparison Table */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="bg-card border border-border rounded-xl overflow-hidden mb-12"
          >
            <div className="p-6 border-b border-border">
              <h2 className="text-xl font-serif font-bold">Compare All Features</h2>
            </div>
            <div className="p-6 overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left pb-4">Feature</th>
                    <th className="text-center pb-4">🌙 Explorer</th>
                    <th className="text-center pb-4">⭐ Mystic</th>
                    <th className="text-center pb-4">💫 Creator</th>
                    <th className="text-center pb-4">✨ Visionary</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-border">
                    <td className="py-3">Monthly Generation</td>
                    <td className="text-center py-3">1 deck (78 cards)</td>
                    <td className="text-center py-3">2 decks (156 cards)</td>
                    <td className="text-center py-3">3 decks (234 cards)</td>
                    <td className="text-center py-3">5 decks (390 cards)</td>
                  </tr>
                  <tr className="border-b border-border">
                    <td className="py-3">Card Image Quality</td>
                    <td className="text-center py-3">Medium</td>
                    <td className="text-center py-3">Medium + Styles</td>
                    <td className="text-center py-3">Medium + High</td>
                    <td className="text-center py-3">High + Premium</td>
                  </tr>
                  <tr className="border-b border-border">
                    <td className="py-3">Usage Rights</td>
                    <td className="text-center py-3">Personal use only</td>
                    <td className="text-center py-3">Personal use</td>
                    <td className="text-center py-3">Commercial use</td>
                    <td className="text-center py-3">Extended commercial</td>
                  </tr>
                  <tr className="border-b border-border">
                    <td className="py-3">Deck Privacy</td>
                    <td className="text-center py-3">Public only</td>
                    <td className="text-center py-3">Private option</td>
                    <td className="text-center py-3">Full privacy</td>
                    <td className="text-center py-3">Content protection</td>
                  </tr>
                  <tr className="border-b border-border">
                    <td className="py-3">Storage</td>
                    <td className="text-center py-3">3 decks</td>
                    <td className="text-center py-3">10 decks</td>
                    <td className="text-center py-3">25 decks</td>
                    <td className="text-center py-3">Unlimited</td>
                  </tr>
                  <tr className="border-b border-border">
                    <td className="py-3">Marketplace</td>
                    <td className="text-center py-3">Browse only</td>
                    <td className="text-center py-3">30% commission</td>
                    <td className="text-center py-3">25% commission</td>
                    <td className="text-center py-3">15% commission</td>
                  </tr>
                  <tr className="border-b border-border">
                    <td className="py-3">Card Regeneration</td>
                    <td className="text-center py-3">
                      <span className="inline-block w-4 h-4 bg-destructive/20 rounded-full"></span>
                    </td>
                    <td className="text-center py-3">10 cards/month</td>
                    <td className="text-center py-3">Unlimited</td>
                    <td className="text-center py-3">Unlimited</td>
                  </tr>
                  <tr>
                    <td className="py-3">Advanced Features</td>
                    <td className="text-center py-3">
                      <span className="inline-block w-4 h-4 bg-destructive/20 rounded-full"></span>
                    </td>
                    <td className="text-center py-3">
                      <span className="inline-block w-4 h-4 bg-destructive/20 rounded-full"></span>
                    </td>
                    <td className="text-center py-3">
                      <Check className="h-4 w-4 text-success inline-block" />
                    </td>
                    <td className="text-center py-3">
                      <Check className="h-4 w-4 text-success inline-block" />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </motion.div>

          {/* Testimonials */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="mb-12"
          >
            <h2 className="text-2xl font-serif font-bold mb-6 text-center">What Our Users Say</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-card border border-border rounded-lg p-6">
                <div className="flex items-center text-accent mb-3">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-current" />
                  ))}
                </div>
                <p className="text-muted-foreground mb-4">"Tarot Forge has transformed my spiritual practice. Creating my own deck that perfectly resonates with my energy has been incredibly fulfilling."</p>
                <div className="flex items-center">
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center mr-3">
                    <span className="font-medium text-primary">CM</span>
                  </div>
                  <div>
                    <p className="font-medium">Crystal Moonflower</p>
                    <p className="text-xs text-muted-foreground">Mystic Plan</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-card border border-border rounded-lg p-6">
                <div className="flex items-center text-accent mb-3">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-current" />
                  ))}
                </div>
                <p className="text-muted-foreground mb-4">"As a professional tarot reader, the Creator plan has been a game-changer. I've sold multiple custom decks and my clients love having readings with decks I've designed."</p>
                <div className="flex items-center">
                  <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center mr-3">
                    <span className="font-medium text-accent">AS</span>
                  </div>
                  <div>
                    <p className="font-medium">Astral Seeker</p>
                    <p className="text-xs text-muted-foreground">Creator Plan</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-card border border-border rounded-lg p-6">
                <div className="flex items-center text-accent mb-3">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-current" />
                  ))}
                </div>
                <p className="text-muted-foreground mb-4">"The quality of the Visionary plan's card generation is astounding. I've created multiple decks with consistent style and intricate details that exceeded my expectations."</p>
                <div className="flex items-center">
                  <div className="w-10 h-10 rounded-full bg-teal/20 flex items-center justify-center mr-3">
                    <span className="font-medium text-teal">EW</span>
                  </div>
                  <div>
                    <p className="font-medium">Ethereal Wanderer</p>
                    <p className="text-xs text-muted-foreground">Visionary Plan</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* CTA Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="bg-gradient-to-br from-primary/20 via-accent/10 to-primary/20 rounded-xl border border-border p-8 text-center"
          >
            <h2 className="text-2xl font-serif font-bold mb-3">Ready to Begin Your Tarot Journey?</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto mb-6">
              Join Tarot Forge today and start creating beautiful custom tarot decks that reflect your unique spiritual perspective.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button 
                onClick={handleGetStarted}
                className="btn btn-primary py-2 px-6 flex items-center justify-center"
              >
                <ArrowRight className="mr-2 h-5 w-5" />
                Sign Up Now
              </button>
              <Link 
                to="/marketplace" 
                className="btn btn-secondary py-2 px-6"
              >
                Explore Marketplace
              </Link>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

// Star icon for testimonials
const Star = (props: React.SVGProps<SVGSVGElement>) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="currentColor"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
};

export default PricingPage;