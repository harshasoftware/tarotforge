import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { 
  ArrowRight, 
  Sparkles, 
  CheckCircle, 
  BookOpen, 
  Star, 
  Package, 
  WalletCards, 
  TrendingUp,
  Crown
} from 'lucide-react';
import TarotLogo from '../components/ui/TarotLogo';
import { useAuth } from '../context/AuthContext';
import { useSubscription } from '../context/SubscriptionContext';
import { useDeckLimits } from '../context/DeckLimitContext';

const Home = () => {
  const { user } = useAuth();
  const { isSubscribed } = useSubscription();
  const { limits, usage, canGenerateMajorArcana } = useDeckLimits();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  
  // Check if we should prompt deck creation
  const [showCreateDeckModal, setShowCreateDeckModal] = useState(false);
  
  useEffect(() => {
    // Check for createDeck param in URL
    const createDeckParam = searchParams.get('createDeck');
    if (createDeckParam === 'true') {
      setShowCreateDeckModal(true);
    }
  }, [searchParams]);
  
  const startCreateDeck = () => {
    navigate('/create-deck');
  };

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative pt-20 pb-20 lg:pt-32 lg:pb-32 overflow-hidden">
        {/* Background elements */}
        <div className="absolute inset-0 z-0 overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,rgba(124,58,237,0.07)_1px,transparent_1px)] bg-[length:24px_24px]"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-primary/5 blur-3xl"></div>
          <div className="absolute bottom-0 right-0 w-[500px] h-[500px] rounded-full bg-accent/5 blur-3xl"></div>
        </div>
        
        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center max-w-4xl mx-auto">
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7 }}
            >
              <div className="flex justify-center mb-6">
                <div className="p-3 rounded-full bg-primary/10">
                  <TarotLogo className="h-14 w-14 text-primary" />
                </div>
              </div>
              <h1 className="text-4xl md:text-6xl font-serif font-bold mb-6 leading-tight">
                Create, Collect, and Experience <span className="text-primary">Tarot Decks</span> 
              </h1>
              <p className="text-xl text-muted-foreground mb-8 max-w-3xl mx-auto">
                Design unique AI-generated tarot decks, collect from our marketplace, and experience professional readings all in one mystical platform.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button 
                  onClick={startCreateDeck}
                  className="btn btn-primary px-6 py-3 text-lg flex items-center justify-center"
                >
                  <Sparkles className="mr-2 h-5 w-5" />
                  Create Your Tarot Deck
                  <ArrowRight className="ml-2 h-5 w-5" />
                </button>
                <Link to="/marketplace" className="btn btn-outline bg-card/50 backdrop-blur-xs border-input hover:bg-secondary/50 px-6 py-3 text-lg flex items-center justify-center">
                  <BookOpen className="mr-2 h-5 w-5" />
                  Explore Marketplace
                </Link>
              </div>
            </motion.div>
            
            {user && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="mt-12 p-4 border border-primary/30 bg-primary/5 rounded-lg inline-flex items-center"
              >
                {isSubscribed ? (
                  <CheckCircle className="h-5 w-5 text-primary mr-2" />
                ) : (
                  <WalletCards className="h-5 w-5 text-primary mr-2" />
                )}
                <span className="text-sm">
                  {isSubscribed
                    ? 'You have full access to create complete decks!'
                    : canGenerateMajorArcana 
                      ? 'You can create a Major Arcana (22 cards) deck for free!' 
                      : 'You\'ve used your free Major Arcana deck for this month.'}
                </span>
              </motion.div>
            )}
          </div>
        </div>
      </section>
      
      {/* Features Section */}
      <section className="py-20 bg-gradient-to-b from-background to-background/95">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-serif font-bold mb-4">Unleash Your Mystical Creativity</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Our platform offers everything you need to dive into the world of tarot,
              whether you're a creator, reader, or enthusiast.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Create Feature */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="bg-card border border-border rounded-xl p-6 hover:border-primary/50 transition-colors"
            >
              <div className="p-3 bg-primary/10 rounded-full w-12 h-12 flex items-center justify-center mb-4">
                <Sparkles className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-serif font-bold mb-3">Create</h3>
              <p className="text-muted-foreground mb-4">
                Design custom tarot decks using our AI generation system. Choose themes, styles, and customize each card's meaning.
              </p>
              <ul className="space-y-2 mb-6">
                <li className="flex items-start">
                  <CheckCircle className="h-4 w-4 text-primary mt-1 mr-2" />
                  <span className="text-sm">Free plan: Create Major Arcana (22 cards)</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-4 w-4 text-primary mt-1 mr-2" />
                  <span className="text-sm">Upgrade to complete 78-card decks</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-4 w-4 text-primary mt-1 mr-2" />
                  <span className="text-sm">Multiple artistic styles and themes</span>
                </li>
              </ul>
              <Link 
                to="/create-deck" 
                className="inline-flex items-center text-primary hover:underline"
              >
                Start Creating
                <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </motion.div>
            
            {/* Collect Feature */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="bg-card border border-border rounded-xl p-6 hover:border-accent/50 transition-colors"
            >
              <div className="p-3 bg-accent/10 rounded-full w-12 h-12 flex items-center justify-center mb-4">
                <Package className="h-6 w-6 text-accent" />
              </div>
              <h3 className="text-xl font-serif font-bold mb-3">Collect</h3>
              <p className="text-muted-foreground mb-4">
                Browse and purchase unique decks created by artists and AI enthusiasts from around the world.
              </p>
              <ul className="space-y-2 mb-6">
                <li className="flex items-start">
                  <CheckCircle className="h-4 w-4 text-accent mt-1 mr-2" />
                  <span className="text-sm">Discover unique tarot decks</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-4 w-4 text-accent mt-1 mr-2" />
                  <span className="text-sm">Both free and premium options</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-4 w-4 text-accent mt-1 mr-2" />
                  <span className="text-sm">Digital and NFT collections</span>
                </li>
              </ul>
              <Link 
                to="/marketplace" 
                className="inline-flex items-center text-accent hover:underline"
              >
                Explore Marketplace
                <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </motion.div>
            
            {/* Experience Feature */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="bg-card border border-border rounded-xl p-6 hover:border-secondary/50 transition-colors"
            >
              <div className="p-3 bg-secondary/20 rounded-full w-12 h-12 flex items-center justify-center mb-4">
                <Star className="h-6 w-6 text-secondary" />
              </div>
              <h3 className="text-xl font-serif font-bold mb-3">Experience</h3>
              <p className="text-muted-foreground mb-4">
                Get readings from professional tarot readers or use AI interpretation with your favorite decks.
              </p>
              <ul className="space-y-2 mb-6">
                <li className="flex items-start">
                  <CheckCircle className="h-4 w-4 text-secondary mt-1 mr-2" />
                  <span className="text-sm">Book sessions with certified readers</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-4 w-4 text-secondary mt-1 mr-2" />
                  <span className="text-sm">Use any deck for your readings</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-4 w-4 text-secondary mt-1 mr-2" />
                  <span className="text-sm">AI-powered interpretation</span>
                </li>
              </ul>
              <Link 
                to="/reading-room" 
                className="inline-flex items-center text-secondary hover:underline"
              >
                Enter Reading Room
                <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </motion.div>
          </div>
        </div>
      </section>
      
      {/* Plans Section - Only show for non-subscribed users */}
      {!isSubscribed && (
        <section className="py-20 bg-gradient-to-b from-card/30 to-background">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-serif font-bold mb-4">Choose Your Creative Path</h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                From free exploration to unlimited creation, we have options for every level of enthusiasm.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
              {/* Free Plan */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
                className="bg-card border border-border rounded-xl p-6 hover:border-primary/30 transition-colors"
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-serif font-bold">🌙 Explorer</h3>
                    <p className="text-2xl font-bold mt-1">$0</p>
                  </div>
                  <div className="p-2 bg-primary/10 rounded-full">
                    <WalletCards className="h-5 w-5 text-primary" />
                  </div>
                </div>
                
                <p className="text-sm text-muted-foreground mb-4">
                  Perfect for beginners wanting to explore tarot deck creation.
                </p>
                
                <ul className="space-y-2 mb-6">
                  <li className="flex items-start">
                    <CheckCircle className="h-4 w-4 text-primary mt-0.5 mr-2 shrink-0" />
                    <span className="text-sm">Create 1 Major Arcana deck (22 cards) per month</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="h-4 w-4 text-primary mt-0.5 mr-2 shrink-0" />
                    <span className="text-sm">Basic style options</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="h-4 w-4 text-primary mt-0.5 mr-2 shrink-0" />
                    <span className="text-sm">2 card regenerations per deck</span>
                  </li>
                </ul>
                
                <Link to="/create-deck" className="btn btn-outline w-full py-2">
                  Start Free
                </Link>
              </motion.div>
              
              {/* One-time Upgrade */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="bg-card border border-warning/30 rounded-xl p-6 hover:border-warning/50 transition-colors relative overflow-hidden"
              >
                <div className="absolute -right-10 -top-10 w-20 h-20 bg-warning/20 rounded-full"></div>
                <div className="relative">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-xl font-serif font-bold">⚡ Explorer Plus</h3>
                      <p className="text-2xl font-bold mt-1">$5</p>
                    </div>
                    <div className="p-2 bg-warning/10 rounded-full">
                      <TrendingUp className="h-5 w-5 text-warning" />
                    </div>
                  </div>
                  
                  <p className="text-sm text-muted-foreground mb-4">
                    One-time upgrade for your Major Arcana deck to a complete 78-card deck.
                  </p>
                  
                  <ul className="space-y-2 mb-6">
                    <li className="flex items-start">
                      <CheckCircle className="h-4 w-4 text-warning mt-0.5 mr-2 shrink-0" />
                      <span className="text-sm">Upgrade any Major Arcana to a full 78-card deck</span>
                    </li>
                    <li className="flex items-start">
                      <CheckCircle className="h-4 w-4 text-warning mt-0.5 mr-2 shrink-0" />
                      <span className="text-sm">5 card regenerations per upgraded deck</span>
                    </li>
                    <li className="flex items-start">
                      <CheckCircle className="h-4 w-4 text-warning mt-0.5 mr-2 shrink-0" />
                      <span className="text-sm">One-time purchase (no subscription)</span>
                    </li>
                  </ul>
                  
                  <Link to="/subscription?plan=explorer-plus" className="btn bg-warning hover:bg-warning/90 text-warning-foreground w-full py-2">
                    Upgrade a Deck
                  </Link>
                </div>
              </motion.div>
              
              {/* Subscription Plan */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="bg-card border border-accent/30 rounded-xl p-6 hover:border-accent/50 transition-colors relative overflow-hidden"
              >
                <div className="absolute -right-12 -top-12 w-24 h-24 bg-accent/10 rounded-full"></div>
                <div className="relative">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-xl font-serif font-bold">⭐ Premium Plans</h3>
                      <p className="text-2xl font-bold mt-1">From $12.99</p>
                    </div>
                    <div className="p-2 bg-accent/10 rounded-full">
                      <Crown className="h-5 w-5 text-accent" />
                    </div>
                  </div>
                  
                  <p className="text-sm text-muted-foreground mb-4">
                    Unlimited deck creation with premium features and commercial rights.
                  </p>
                  
                  <ul className="space-y-2 mb-6">
                    <li className="flex items-start">
                      <CheckCircle className="h-4 w-4 text-accent mt-0.5 mr-2 shrink-0" />
                      <span className="text-sm">Create multiple complete decks each month</span>
                    </li>
                    <li className="flex items-start">
                      <CheckCircle className="h-4 w-4 text-accent mt-0.5 mr-2 shrink-0" />
                      <span className="text-sm">High quality options and commercial rights</span>
                    </li>
                    <li className="flex items-start">
                      <CheckCircle className="h-4 w-4 text-accent mt-0.5 mr-2 shrink-0" />
                      <span className="text-sm">Unlimited card regenerations</span>
                    </li>
                  </ul>
                  
                  <Link to="/subscription" className="btn bg-accent hover:bg-accent/90 text-accent-foreground w-full py-2">
                    View Plans
                  </Link>
                </div>
              </motion.div>
            </div>
          </div>
        </section>
      )}
      
      {/* CTA Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="bg-gradient-to-br from-primary/20 via-accent/10 to-primary/20 rounded-xl border border-border p-8 md:p-12 text-center max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <h2 className="text-3xl md:text-4xl font-serif font-bold mb-4">Begin Your Mystical Journey</h2>
              <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
                Whether you're creating your own deck, exploring the marketplace, or seeking spiritual guidance,
                Tarot Forge offers a seamless and magical experience.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                {user ? (
                  <Link 
                    to="/create-deck"
                    className="btn btn-primary px-6 py-3 text-lg flex items-center justify-center"
                  >
                    <Sparkles className="mr-2 h-5 w-5" />
                    Create Your First Deck
                  </Link>
                ) : (
                  <Link 
                    to="/signup"
                    className="btn btn-primary px-6 py-3 text-lg flex items-center justify-center"
                  >
                    <Sparkles className="mr-2 h-5 w-5" />
                    Create Free Account
                  </Link>
                )}
                
                <Link 
                  to="/marketplace"
                  className="btn btn-outline bg-card/50 backdrop-blur-xs border-input hover:bg-secondary/50 px-6 py-3 text-lg"
                >
                  Explore Marketplace
                </Link>
              </div>
            </motion.div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;