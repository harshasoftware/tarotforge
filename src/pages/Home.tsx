import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Wand2, Sparkles, BookOpen, Crown, Zap, ChevronRight, Star, Shield, WalletCards, TrendingUp } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSubscription } from '../context/SubscriptionContext';
import { STRIPE_PRODUCTS } from '../lib/stripe-config';
import TarotLogo from '../components/ui/TarotLogo';
import DeckBadge from '../components/ui/CreditBadge';

const Home = () => {
  const { user, setShowSignInModal } = useAuth();
  const { isSubscribed } = useSubscription();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  // Check for deck creation intent from URL param
  const [showDeckCreator, setShowDeckCreator] = useState(false);
  
  useEffect(() => {
    const createDeck = searchParams.get('createDeck');
    if (createDeck === 'true') {
      setShowDeckCreator(true);
    }
  }, [searchParams]);
  
  const handleCreateDeckClick = () => {
    if (user) {
      navigate('/create-deck');
    } else {
      setShowSignInModal(true);
      localStorage.setItem('auth_with_deck_creation', 'true');
    }
  };
  
  return (
    <>
      {/* Hero Section */}
      <div className="relative min-h-screen">
        <div className="absolute inset-0 bg-gradient-to-b from-background via-primary/5 to-background pointer-events-none"></div>
        
        <div className="container mx-auto px-4 relative z-10">
          <div className="flex flex-col items-center justify-center pt-20 md:pt-32 pb-12 md:pb-20 text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="mb-8"
            >
              <TarotLogo className="h-20 w-20 text-accent mx-auto mb-6" />
              <h1 className="text-4xl md:text-6xl font-serif font-bold mb-4">
                Tarot Forge
              </h1>
              <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto">
                Create unique AI-generated tarot decks and experience personalized readings
              </p>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="flex flex-col sm:flex-row gap-4"
            >
              <button
                onClick={handleCreateDeckClick}
                className="btn btn-primary px-6 py-3 text-lg flex items-center justify-center"
              >
                <Wand2 className="mr-2 h-5 w-5" />
                Create Your Deck
              </button>
              <Link 
                to="/marketplace" 
                className="btn btn-secondary px-6 py-3 text-lg flex items-center justify-center"
              >
                <Sparkles className="mr-2 h-5 w-5" />
                Explore Marketplace
              </Link>
            </motion.div>
          </div>
        </div>
      </div>
      
      {/* Features Section */}
      <section className="py-20 bg-background relative">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.05)_1px,transparent_1px)] bg-[length:20px_20px]"></div>
        
        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-serif font-bold mb-4">
              Create, Collect, and Experience
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Design your own tarot decks with AI, build a collection, and gain insights through personalized readings
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="bg-card border border-border rounded-xl p-6 hover:shadow-xl transition-shadow"
            >
              <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center mb-4">
                <Wand2 className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-serif font-bold mb-2">Design Your Deck</h3>
              <p className="text-muted-foreground mb-4">
                Create custom tarot decks using our AI image generation. Choose themes, styles, and customize meanings.
              </p>
              <button 
                onClick={handleCreateDeckClick}
                className="group flex items-center text-primary hover:underline"
              >
                Start Creating <ChevronRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </button>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="bg-card border border-border rounded-xl p-6 hover:shadow-xl transition-shadow"
            >
              <div className="w-12 h-12 bg-accent/20 rounded-full flex items-center justify-center mb-4">
                <BookOpen className="h-6 w-6 text-accent" />
              </div>
              <h3 className="text-xl font-serif font-bold mb-2">Mystical Readings</h3>
              <p className="text-muted-foreground mb-4">
                Experience tarot readings with custom or traditional decks. Get AI-powered or professional reader interpretations.
              </p>
              <Link to="/reading-room" className="group flex items-center text-accent hover:underline">
                Enter Reading Room <ChevronRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="bg-card border border-border rounded-xl p-6 hover:shadow-xl transition-shadow"
            >
              <div className="w-12 h-12 bg-teal/20 rounded-full flex items-center justify-center mb-4">
                <Star className="h-6 w-6 text-teal" />
              </div>
              <h3 className="text-xl font-serif font-bold mb-2">Reader Network</h3>
              <p className="text-muted-foreground mb-4">
                Connect with certified tarot readers for professional readings and insights with your custom decks.
              </p>
              <Link to="/readers" className="group flex items-center text-teal hover:underline">
                Meet Our Readers <ChevronRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </motion.div>
          </div>
        </div>
      </section>
      
      {/* Plans Overview */}
      <section className="py-20 bg-gradient-to-b from-background via-primary/5 to-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-serif font-bold mb-4">
              Choose Your Journey
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              From free exploration to professional creation, select the plan that fits your mystical path
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Free Plan Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="bg-card border border-border rounded-xl overflow-hidden hover:shadow-xl transition-shadow"
            >
              <div className="p-6 border-b border-border">
                <div className="flex justify-between items-center">
                  <h3 className="text-xl font-serif font-bold">Explorer</h3>
                  <div className="p-2 bg-primary/20 rounded-full">
                    <Zap className="h-5 w-5 text-primary" />
                  </div>
                </div>
                <div className="mt-2 mb-4">
                  <div className="flex items-baseline">
                    <span className="text-3xl font-bold">$0</span>
                    <span className="text-muted-foreground ml-1">/forever</span>
                  </div>
                </div>
              </div>
              <div className="p-6">
                <ul className="space-y-3 mb-6">
                  <li className="flex items-start">
                    <div className="flex-shrink-0 mt-1">
                      <WalletCards className="h-4 w-4 text-success" />
                    </div>
                    <span className="ml-2 text-sm">1 Major Arcana deck (22 cards)/month</span>
                  </li>
                  <li className="flex items-start">
                    <div className="flex-shrink-0 mt-1">
                      <WalletCards className="h-4 w-4 text-success" />
                    </div>
                    <span className="ml-2 text-sm">Medium quality images</span>
                  </li>
                  <li className="flex items-start">
                    <div className="flex-shrink-0 mt-1">
                      <WalletCards className="h-4 w-4 text-success" />
                    </div>
                    <span className="ml-2 text-sm">2 card regenerations per deck</span>
                  </li>
                </ul>
                <Link to="/create-deck" className="btn btn-primary w-full py-2">
                  Start Free
                </Link>
              </div>
            </motion.div>
            
            {/* Explorer Plus Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="bg-card border border-warning/50 bg-warning/5 rounded-xl overflow-hidden hover:shadow-xl transition-shadow"
            >
              <div className="p-6 border-b border-border">
                <div className="flex justify-between items-center">
                  <h3 className="text-xl font-serif font-bold">Explorer Plus</h3>
                  <div className="p-2 bg-warning/20 rounded-full">
                    <TrendingUp className="h-5 w-5 text-warning" />
                  </div>
                </div>
                <div className="mt-2 mb-4">
                  <div className="flex items-baseline">
                    <span className="text-3xl font-bold">$5</span>
                    <span className="text-muted-foreground ml-1">/per deck</span>
                  </div>
                </div>
              </div>
              <div className="p-6">
                <ul className="space-y-3 mb-6">
                  <li className="flex items-start">
                    <div className="flex-shrink-0 mt-1">
                      <WalletCards className="h-4 w-4 text-success" />
                    </div>
                    <span className="ml-2 text-sm">Upgrade Major Arcana to full 78-card deck</span>
                  </li>
                  <li className="flex items-start">
                    <div className="flex-shrink-0 mt-1">
                      <WalletCards className="h-4 w-4 text-success" />
                    </div>
                    <span className="ml-2 text-sm">Medium quality images</span>
                  </li>
                  <li className="flex items-start">
                    <div className="flex-shrink-0 mt-1">
                      <WalletCards className="h-4 w-4 text-success" />
                    </div>
                    <span className="ml-2 text-sm">5 card regenerations per deck</span>
                  </li>
                </ul>
                <Link to="/subscription?plan=explorer-plus" className="btn bg-warning text-warning-foreground hover:bg-warning/90 w-full py-2">
                  Upgrade a Deck
                </Link>
              </div>
            </motion.div>
            
            {/* Monthly Plan Highlight Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="bg-card border border-accent rounded-xl overflow-hidden hover:shadow-xl transition-shadow"
            >
              <div className="bg-accent/10 py-2 text-center">
                <span className="text-xs font-medium">MOST POPULAR</span>
              </div>
              <div className="p-6 border-b border-border">
                <div className="flex justify-between items-center">
                  <h3 className="text-xl font-serif font-bold">Creator</h3>
                  <div className="p-2 bg-accent/20 rounded-full">
                    <Crown className="h-5 w-5 text-accent" />
                  </div>
                </div>
                <div className="mt-2 mb-4">
                  <div className="flex items-baseline">
                    <span className="text-3xl font-bold">${STRIPE_PRODUCTS['creator-monthly'].price}</span>
                    <span className="text-muted-foreground ml-1">/month</span>
                  </div>
                </div>
              </div>
              <div className="p-6">
                <ul className="space-y-3 mb-6">
                  <li className="flex items-start">
                    <div className="flex-shrink-0 mt-1">
                      <WalletCards className="h-4 w-4 text-success" />
                    </div>
                    <span className="ml-2 text-sm">{STRIPE_PRODUCTS['creator-monthly'].deckCount} complete decks/month</span>
                  </li>
                  <li className="flex items-start">
                    <div className="flex-shrink-0 mt-1">
                      <WalletCards className="h-4 w-4 text-success" />
                    </div>
                    <span className="ml-2 text-sm">Medium + High quality images</span>
                  </li>
                  <li className="flex items-start">
                    <div className="flex-shrink-0 mt-1">
                      <WalletCards className="h-4 w-4 text-success" />
                    </div>
                    <span className="ml-2 text-sm">Unlimited regenerations</span>
                  </li>
                </ul>
                <Link to="/subscription?plan=creator-monthly" className="btn btn-accent w-full py-2">
                  Choose Plan
                </Link>
              </div>
            </motion.div>
            
            {/* Visionary Plan Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="bg-card border border-border rounded-xl overflow-hidden hover:shadow-xl transition-shadow"
            >
              <div className="p-6 border-b border-border">
                <div className="flex justify-between items-center">
                  <h3 className="text-xl font-serif font-bold">Visionary</h3>
                  <div className="p-2 bg-teal/20 rounded-full">
                    <Shield className="h-5 w-5 text-teal" />
                  </div>
                </div>
                <div className="mt-2 mb-4">
                  <div className="flex items-baseline">
                    <span className="text-3xl font-bold">${STRIPE_PRODUCTS['visionary-monthly'].price}</span>
                    <span className="text-muted-foreground ml-1">/month</span>
                  </div>
                </div>
              </div>
              <div className="p-6">
                <ul className="space-y-3 mb-6">
                  <li className="flex items-start">
                    <div className="flex-shrink-0 mt-1">
                      <WalletCards className="h-4 w-4 text-success" />
                    </div>
                    <span className="ml-2 text-sm">{STRIPE_PRODUCTS['visionary-monthly'].deckCount} complete decks/month</span>
                  </li>
                  <li className="flex items-start">
                    <div className="flex-shrink-0 mt-1">
                      <WalletCards className="h-4 w-4 text-success" />
                    </div>
                    <span className="ml-2 text-sm">High quality images only</span>
                  </li>
                  <li className="flex items-start">
                    <div className="flex-shrink-0 mt-1">
                      <WalletCards className="h-4 w-4 text-success" />
                    </div>
                    <span className="ml-2 text-sm">Advanced customization + API access</span>
                  </li>
                </ul>
                <Link to="/subscription?plan=visionary-monthly" className="btn btn-secondary w-full py-2">
                  Choose Plan
                </Link>
              </div>
            </motion.div>
          </div>
          
          <div className="text-center mt-8">
            <Link to="/pricing" className="btn btn-outline py-2 px-6">
              View All Plans
            </Link>
          </div>
        </div>
      </section>
      
      {/* How It Works */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-serif font-bold mb-4">
              How It Works
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Creating your own tarot deck is a simple three-step process
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="flex flex-col items-center text-center"
            >
              <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mb-4">
                <span className="text-2xl font-bold text-primary">1</span>
              </div>
              <h3 className="text-xl font-serif font-bold mb-2">Choose Theme & Style</h3>
              <p className="text-muted-foreground">
                Select a theme and art style for your deck, or let AI suggest combinations based on your preferences.
              </p>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="flex flex-col items-center text-center"
            >
              <div className="w-16 h-16 bg-accent/20 rounded-full flex items-center justify-center mb-4">
                <span className="text-2xl font-bold text-accent">2</span>
              </div>
              <h3 className="text-xl font-serif font-bold mb-2">Generate & Refine</h3>
              <p className="text-muted-foreground">
                Our AI generates your cards based on traditional symbolism and your chosen theme. Regenerate any cards until they're perfect.
              </p>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="flex flex-col items-center text-center"
            >
              <div className="w-16 h-16 bg-teal/20 rounded-full flex items-center justify-center mb-4">
                <span className="text-2xl font-bold text-teal">3</span>
              </div>
              <h3 className="text-xl font-serif font-bold mb-2">Use & Share</h3>
              <p className="text-muted-foreground">
                Use your deck for personal readings, share with friends, or even list it in our marketplace for others to purchase.
              </p>
            </motion.div>
          </div>
          
          <div className="text-center mt-12">
            <button
              onClick={handleCreateDeckClick}
              className="btn btn-primary px-6 py-2"
            >
              <Wand2 className="mr-2 h-5 w-5" />
              Start Creating Your Deck
            </button>
          </div>
        </div>
      </section>
      
      {/* Testimonials */}
      <section className="py-20 bg-card border-y border-border">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-serif font-bold mb-4">
              What Our Users Say
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Join the community of mystics, creators, and seekers
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="bg-background rounded-xl p-6 border border-border"
            >
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center mr-3">
                  <span className="font-medium">SG</span>
                </div>
                <div>
                  <h3 className="font-medium">Sarah G.</h3>
                  <div className="flex items-center text-accent">
                    <Star className="h-4 w-4 fill-current" />
                    <Star className="h-4 w-4 fill-current" />
                    <Star className="h-4 w-4 fill-current" />
                    <Star className="h-4 w-4 fill-current" />
                    <Star className="h-4 w-4 fill-current" />
                  </div>
                </div>
              </div>
              <p className="text-muted-foreground">
                "I started with the free plan and was amazed at the quality of the Major Arcana I created. Eventually upgraded to Explorer Plus for my favorite deck. Worth every penny!"
              </p>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="bg-background rounded-xl p-6 border border-border"
            >
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center mr-3">
                  <span className="font-medium">MJ</span>
                </div>
                <div>
                  <h3 className="font-medium">Michael J.</h3>
                  <div className="flex items-center text-accent">
                    <Star className="h-4 w-4 fill-current" />
                    <Star className="h-4 w-4 fill-current" />
                    <Star className="h-4 w-4 fill-current" />
                    <Star className="h-4 w-4 fill-current" />
                    <Star className="h-4 w-4 fill-current" />
                  </div>
                </div>
              </div>
              <p className="text-muted-foreground">
                "As a professional tarot reader, the Creator plan has been invaluable. I've designed custom decks for clients and they absolutely love the personalized experience. Highly recommended!"
              </p>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="bg-background rounded-xl p-6 border border-border"
            >
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 rounded-full bg-teal/20 flex items-center justify-center mr-3">
                  <span className="font-medium">LP</span>
                </div>
                <div>
                  <h3 className="font-medium">Luna P.</h3>
                  <div className="flex items-center text-accent">
                    <Star className="h-4 w-4 fill-current" />
                    <Star className="h-4 w-4 fill-current" />
                    <Star className="h-4 w-4 fill-current" />
                    <Star className="h-4 w-4 fill-current" />
                    <Star className="h-4 w-4 fill-current" />
                  </div>
                </div>
              </div>
              <p className="text-muted-foreground">
                "The community of readers on Tarot Forge is incredible! I've had readings with decks that I never imagined could exist. The platform is beautiful and so intuitive to use."
              </p>
            </motion.div>
          </div>
        </div>
      </section>
      
      {/* CTA */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="bg-gradient-to-r from-primary/20 via-accent/10 to-primary/20 rounded-xl border border-border p-8 md:p-12 text-center"
          >
            <TarotLogo className="h-16 w-16 text-accent mx-auto mb-6" />
            <h2 className="text-3xl md:text-4xl font-serif font-bold mb-4">
              Begin Your Mystical Journey Today
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
              Create your own tarot deck, explore the marketplace, or connect with professional readers.
              Your spiritual path awaits.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={handleCreateDeckClick}
                className="btn btn-primary px-6 py-3 text-lg"
              >
                Create Your First Deck
              </button>
              <Link to="/marketplace" className="btn btn-secondary px-6 py-3 text-lg">
                Explore Marketplace
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </>
  );
};

export default Home;