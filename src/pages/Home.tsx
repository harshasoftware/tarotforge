import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ArrowRight, Sparkles, Check, Star, Shield, 
  Zap, CreditCard, MessageSquare, Clock
} from 'lucide-react';
import TarotLogo from '../components/ui/TarotLogo';
import { useAuth } from '../context/AuthContext';
import { STRIPE_PRODUCTS } from '../lib/stripe-config';

const Home = () => {
  const { user, setShowSignInModal } = useAuth();
  const navigate = useNavigate();
  const [billingInterval, setBillingInterval] = useState<'month' | 'year'>('month');

  // Check if user came to home with intent to create a deck
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('createDeck') === 'true') {
      navigate('/create-deck', { replace: true });
    }
  }, [navigate]);

  // Calculate savings percentage for yearly plans
  const calculateSavings = (monthlyProduct: string, yearlyProduct: string): number => {
    const monthlyPrice = STRIPE_PRODUCTS[monthlyProduct]?.price || 0;
    const yearlyPrice = STRIPE_PRODUCTS[yearlyProduct]?.price || 0;
    const monthlyTotal = monthlyPrice * 12;
    return Math.round(((monthlyTotal - yearlyPrice) / monthlyTotal) * 100);
  };

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative">
        <div className="absolute inset-0 bg-gradient-to-b from-black to-background z-10 pointer-events-none"></div>
        <div className="absolute inset-0">
          <div className="h-full w-full opacity-30 bg-[radial-gradient(ellipse_at_center,rgba(var(--accent),0.3)_0%,rgba(var(--background),0.5)_70%)]"></div>
        </div>
        
        <div className="container mx-auto px-4 py-24 md:py-32 relative z-20">
          <div className="text-center max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="mb-6 inline-block"
            >
              <TarotLogo className="h-16 w-16 md:h-20 md:w-20 text-accent mx-auto" />
            </motion.div>
            
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-4xl md:text-6xl font-serif font-bold mb-6"
            >
              Craft Your Mystical Journey with AI
            </motion.h1>
            
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto"
            >
              Create personalized tarot decks with the power of AI, explore our marketplace 
              of unique decks, and experience insightful readings from certified readers.
            </motion.p>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="flex flex-col sm:flex-row justify-center gap-4"
            >
              <Link 
                to="/marketplace" 
                className="btn btn-primary px-6 py-3 text-lg font-medium"
              >
                Browse Marketplace
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
              
              {user ? (
                <Link 
                  to="/create-deck" 
                  className="btn btn-outline border-accent text-accent hover:bg-accent hover:text-accent-foreground px-6 py-3 text-lg font-medium"
                >
                  <Sparkles className="mr-2 h-5 w-5" />
                  Create Your Deck
                </Link>
              ) : (
                <button 
                  onClick={() => setShowSignInModal(true)} 
                  className="btn btn-outline border-accent text-accent hover:bg-accent hover:text-accent-foreground px-6 py-3 text-lg font-medium"
                >
                  <Sparkles className="mr-2 h-5 w-5" />
                  Create Your Deck
                </button>
              )}
            </motion.div>
          </div>
        </div>
      </section>
      
      {/* Features Section */}
      <section className="py-20 bg-gradient-to-b from-background to-card/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-serif font-bold mb-4">Unleash Your Mystical Creativity</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Discover powerful tools to express your spiritual vision through custom tarot decks, marketplace exploration, and professional readings.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <FeatureCard 
              icon={<Sparkles className="h-8 w-8 text-accent" />}
              title="AI-Powered Creation"
              description="Design unique tarot decks effortlessly with advanced AI. Create stunning imagery that matches your personal vision and spiritual style."
              link="/create-deck"
              cta="Create a Deck"
            />
            
            <FeatureCard 
              icon={<MessageSquare className="h-8 w-8 text-accent" />}
              title="Insightful Readings"
              description="Experience personalized tarot readings with AI interpretation or connect with certified human readers for deeper insights."
              link="/reading-room"
              cta="Get a Reading"
            />
            
            <FeatureCard 
              icon={<CreditCard className="h-8 w-8 text-accent" />}
              title="Vibrant Marketplace"
              description="Discover, collect, and trade unique tarot decks created by artists and enthusiasts from around the world."
              link="/marketplace"
              cta="Explore Decks"
            />
          </div>
        </div>
      </section>
      
      {/* Showcase/Community Section */}
      <section className="py-20 bg-gradient-to-b from-card/30 to-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-serif font-bold mb-4">Community Voices</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Join thousands of users who've discovered new spiritual insights through our platform.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <TestimonialCard 
              quote="Tarot Forge helped me create the deck I've always envisioned but never had the artistic skills to bring to life."
              author="StellarSeeker"
              rating={5}
            />
            
            <TestimonialCard 
              quote="The quality of AI-generated cards is astounding. I've created three complete decks that perfectly match my spiritual practice."
              author="MysticCreator"
              rating={5}
            />
            
            <TestimonialCard 
              quote="As a professional reader, I'm amazed at how the certification process has connected me with clients who truly value my expertise."
              author="EtherealGuide"
              rating={4.5}
            />
          </div>
        </div>
      </section>
      
      {/* Pricing Section */}
      <section className="py-20 bg-gradient-to-b from-background to-card/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-serif font-bold mb-4">Choose Your Mystical Path</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
              Select the plan that fits your creative journey with our credit-based system
            </p>
            
            {/* Billing Interval Toggle */}
            <div className="inline-flex p-1 bg-card border border-border rounded-full">
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
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            {/* Free Plan */}
            <div className="bg-card border border-border rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-all">
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
                    <span className="text-muted-foreground ml-1">/forever</span>
                  </div>
                </div>
                
                <div className="border-t border-border pt-4 mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm">Basic Credits</span>
                    <span className="font-medium">5 / month</span>
                  </div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm">Premium Credits</span>
                    <span className="font-medium">0</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Card Quality</span>
                    <span className="font-medium">Medium</span>
                  </div>
                </div>
                
                <div className="space-y-3 mb-6">
                  <div className="flex items-start">
                    <Check className="h-4 w-4 text-success mt-1 flex-shrink-0" />
                    <span className="ml-2 text-sm">Access free community decks</span>
                  </div>
                  <div className="flex items-start">
                    <Check className="h-4 w-4 text-success mt-1 flex-shrink-0" />
                    <span className="ml-2 text-sm">AI tarot readings</span>
                  </div>
                </div>
                
                <Link
                  to="/marketplace"
                  className="w-full py-2 rounded-md font-medium transition-colors bg-secondary text-secondary-foreground hover:bg-secondary/90 flex items-center justify-center"
                >
                  Get Started Free
                </Link>
              </div>
            </div>
            
            {/* Mystic Plan */}
            <div className="bg-card border border-border rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-all">
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-serif font-bold">Mystic</h3>
                  <div className="p-2 bg-primary/20 rounded-full">
                    <Sparkles className="h-5 w-5 text-primary" />
                  </div>
                </div>
                
                <div className="mb-6">
                  <div className="flex items-baseline">
                    <span className="text-3xl font-bold">
                      ${billingInterval === 'month' ? '12.99' : '124.00'}
                    </span>
                    <span className="text-muted-foreground ml-1">/{billingInterval}</span>
                  </div>
                  {billingInterval === 'year' && (
                    <div className="mt-1 flex items-center">
                      <Clock className="h-3 w-3 mr-1 text-success" />
                      <span className="text-xs text-success">
                        Save 20% compared to monthly
                      </span>
                    </div>
                  )}
                </div>
                
                <div className="border-t border-border pt-4 mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm">Basic Credits</span>
                    <span className="font-medium">
                      {billingInterval === 'month' ? '22' : '264'}/{billingInterval}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm">Premium Credits</span>
                    <span className="font-medium">0</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Card Quality</span>
                    <span className="font-medium">Medium</span>
                  </div>
                </div>
                
                <div className="space-y-3 mb-6">
                  <div className="flex items-start">
                    <Check className="h-4 w-4 text-success mt-1 flex-shrink-0" />
                    <span className="ml-2 text-sm">Complete Major Arcana (22 cards)</span>
                  </div>
                  <div className="flex items-start">
                    <Check className="h-4 w-4 text-success mt-1 flex-shrink-0" />
                    <span className="ml-2 text-sm">Credit rollovers up to 22</span>
                  </div>
                </div>
                
                <Link
                  to="/subscription"
                  className="w-full py-2 rounded-md font-medium transition-colors bg-primary text-primary-foreground hover:bg-primary/90 flex items-center justify-center"
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  Subscribe
                </Link>
              </div>
            </div>
            
            {/* Creator Plan */}
            <div className="bg-card border border-accent/30 rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-all relative">
              <div className="absolute top-0 right-0 mt-6 mr-6 bg-accent text-accent-foreground text-xs font-medium px-3 py-1 rounded-full">
                Popular
              </div>
              
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-serif font-bold">Creator</h3>
                  <div className="p-2 bg-accent/20 rounded-full">
                    <CreditCard className="h-5 w-5 text-accent" />
                  </div>
                </div>
                
                <div className="mb-6">
                  <div className="flex items-baseline">
                    <span className="text-3xl font-bold">
                      ${billingInterval === 'month' ? '29.99' : '299.00'}
                    </span>
                    <span className="text-muted-foreground ml-1">/{billingInterval}</span>
                  </div>
                  {billingInterval === 'year' && (
                    <div className="mt-1 flex items-center">
                      <Clock className="h-3 w-3 mr-1 text-success" />
                      <span className="text-xs text-success">
                        Save 17% compared to monthly
                      </span>
                    </div>
                  )}
                </div>
                
                <div className="border-t border-border pt-4 mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm">Basic Credits</span>
                    <span className="font-medium">
                      {billingInterval === 'month' ? '78' : '936'}/{billingInterval}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm">Premium Credits</span>
                    <span className="font-medium">0</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Card Quality</span>
                    <span className="font-medium">Medium</span>
                  </div>
                </div>
                
                <div className="space-y-3 mb-6">
                  <div className="flex items-start">
                    <Check className="h-4 w-4 text-success mt-1 flex-shrink-0" />
                    <span className="ml-2 text-sm">Full tarot deck creation (78 cards)</span>
                  </div>
                  <div className="flex items-start">
                    <Check className="h-4 w-4 text-success mt-1 flex-shrink-0" />
                    <span className="ml-2 text-sm">Sell decks in marketplace</span>
                  </div>
                </div>
                
                <Link
                  to="/subscription"
                  className="w-full py-2 rounded-md font-medium transition-colors bg-accent text-accent-foreground hover:bg-accent/90 flex items-center justify-center"
                >
                  <CreditCard className="h-4 w-4 mr-2" />
                  Subscribe
                </Link>
              </div>
            </div>
            
            {/* Visionary Plan */}
            <div className="bg-card border border-border rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-all">
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-serif font-bold">Visionary</h3>
                  <div className="p-2 bg-teal/20 rounded-full">
                    <Shield className="h-5 w-5 text-teal" />
                  </div>
                </div>
                
                <div className="mb-6">
                  <div className="flex items-baseline">
                    <span className="text-3xl font-bold">
                      ${billingInterval === 'month' ? '79.99' : '767.99'}
                    </span>
                    <span className="text-muted-foreground ml-1">/{billingInterval}</span>
                  </div>
                  {billingInterval === 'year' && (
                    <div className="mt-1 flex items-center">
                      <Clock className="h-3 w-3 mr-1 text-success" />
                      <span className="text-xs text-success">
                        Save 20% compared to monthly
                      </span>
                    </div>
                  )}
                </div>
                
                <div className="border-t border-border pt-4 mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm">Basic Credits</span>
                    <span className="font-medium">0</span>
                  </div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm">Premium Credits</span>
                    <span className="font-medium">
                      {billingInterval === 'month' ? '118' : '1,416'}/{billingInterval}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Card Quality</span>
                    <span className="font-medium">High</span>
                  </div>
                </div>
                
                <div className="space-y-3 mb-6">
                  <div className="flex items-start">
                    <Check className="h-4 w-4 text-success mt-1 flex-shrink-0" />
                    <span className="ml-2 text-sm">High quality image generation</span>
                  </div>
                  <div className="flex items-start">
                    <Check className="h-4 w-4 text-success mt-1 flex-shrink-0" />
                    <span className="ml-2 text-sm">Style consistency between cards</span>
                  </div>
                </div>
                
                <Link
                  to="/subscription"
                  className="w-full py-2 rounded-md font-medium transition-colors bg-teal text-teal-foreground hover:bg-teal/90 flex items-center justify-center"
                >
                  <Shield className="h-4 w-4 mr-2" />
                  Subscribe
                </Link>
              </div>
            </div>
          </div>
          
          <div className="text-center">
            <Link 
              to="/subscription" 
              className="inline-flex items-center text-primary hover:underline"
            >
              View full plan details
              <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
      
      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-b from-card/30 to-background">
        <div className="container mx-auto px-4">
          <div className="bg-gradient-to-br from-primary/20 via-accent/10 to-primary/20 border border-border rounded-xl p-8 md:p-12 text-center max-w-4xl mx-auto">
            <TarotLogo className="h-16 w-16 text-accent mx-auto mb-6" />
            <h2 className="text-3xl md:text-4xl font-serif font-bold mb-4">Begin Your Mystical Journey Today</h2>
            <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
              Create your own tarot deck, connect with readers, and explore the marketplace of unique spiritual tools.
            </p>
            {user ? (
              <div className="flex flex-col sm:flex-row justify-center gap-4">
                <Link 
                  to="/create-deck" 
                  className="btn btn-primary px-6 py-3 text-lg font-medium"
                >
                  <Sparkles className="mr-2 h-5 w-5" />
                  Create Your Deck
                </Link>
                <Link 
                  to="/reading-room" 
                  className="btn btn-secondary px-6 py-3 text-lg font-medium"
                >
                  <MessageSquare className="mr-2 h-5 w-5" />
                  Get a Reading
                </Link>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row justify-center gap-4">
                <button 
                  onClick={() => setShowSignInModal(true)} 
                  className="btn btn-primary px-6 py-3 text-lg font-medium"
                >
                  Start Your Journey
                  <ArrowRight className="ml-2 h-5 w-5" />
                </button>
                <Link 
                  to="/marketplace" 
                  className="btn btn-secondary px-6 py-3 text-lg font-medium"
                >
                  Explore Marketplace
                </Link>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};

// Feature Card Component
interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  link: string;
  cta: string;
}

const FeatureCard: React.FC<FeatureCardProps> = ({
  icon,
  title,
  description,
  link,
  cta
}) => {
  const { user, setShowSignInModal } = useAuth();
  
  const handleClick = (e: React.MouseEvent) => {
    if (!user && (link === '/create-deck' || link === '/reading-room')) {
      e.preventDefault();
      setShowSignInModal(true);
    }
  };
  
  return (
    <motion.div
      whileHover={{ y: -10, boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)' }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="bg-card border border-border rounded-xl p-6 md:p-8 hover:border-accent/50 transition-colors"
    >
      <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center mb-6">
        {icon}
      </div>
      <h3 className="text-xl font-serif font-bold mb-2">{title}</h3>
      <p className="text-muted-foreground mb-6">{description}</p>
      <Link 
        to={link} 
        onClick={handleClick}
        className="inline-flex items-center text-primary hover:text-accent transition-colors"
      >
        {cta}
        <ArrowRight className="ml-2 h-4 w-4" />
      </Link>
    </motion.div>
  );
};

// Testimonial Card Component
interface TestimonialCardProps {
  quote: string;
  author: string;
  rating: number;
}

const TestimonialCard: React.FC<TestimonialCardProps> = ({
  quote,
  author,
  rating
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="bg-card border border-border rounded-xl p-6 hover:border-accent/50 transition-colors"
    >
      <div className="flex items-center mb-4">
        {Array(5).fill(0).map((_, i) => (
          <Star 
            key={i} 
            className={`h-4 w-4 ${i < Math.floor(rating) ? 'text-accent fill-accent' : i < rating ? 'text-accent fill-accent/50' : 'text-muted'}`}
          />
        ))}
      </div>
      <p className="italic text-muted-foreground mb-4">"{quote}"</p>
      <p className="text-sm font-medium text-right">— {author}</p>
    </motion.div>
  );
};

export default Home;