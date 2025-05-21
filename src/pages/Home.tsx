import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Sparkles, Zap, ArrowRight, Star, TrendingUp, Search } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSubscription } from '../context/SubscriptionContext';
import TarotLogo from '../components/ui/TarotLogo';
import CreditBadge from '../components/ui/CreditBadge';

// Mystical loading messages that rotate
const loadingMessages = [
  "Consulting the cosmos...",
  "Channeling mystical energies...",
  "Drawing from the collective unconscious...",
  "Weaving arcane patterns...",
  "Peering into the void...",
  "Aligning with celestial forces...",
  "Communing with ancient wisdom..."
];

const Home = () => {
  const { user } = useAuth();
  const { isSubscribed } = useSubscription();
  
  const [showCreateButton, setShowCreateButton] = useState(false);
  const [isGeneratingTheme, setIsGeneratingTheme] = useState(false);
  const [currentLoadingMessage, setCurrentLoadingMessage] = useState(loadingMessages[0]);
  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0);

  // Effect for rotating loading messages
  useEffect(() => {
    if (isGeneratingTheme) {
      const intervalId = setInterval(() => {
        setLoadingMessageIndex((prevIndex) => (prevIndex + 1) % loadingMessages.length);
      }, 2000);

      return () => clearInterval(intervalId);
    }
  }, [isGeneratingTheme]);

  // Update current loading message when index changes
  useEffect(() => {
    setCurrentLoadingMessage(loadingMessages[loadingMessageIndex]);
  }, [loadingMessageIndex]);
  
  // Simulate theme generation when button is clicked
  const generateTheme = () => {
    setIsGeneratingTheme(true);
    // Simulate API call delay
    setTimeout(() => {
      setIsGeneratingTheme(false);
    }, 5000);
  };

  useEffect(() => {
    const onScroll = () => {
      const showButtonPoint = window.innerHeight * 0.7;
      if (window.scrollY > showButtonPoint) {
        setShowCreateButton(true);
      } else {
        setShowCreateButton(false);
      }
    };
    
    window.addEventListener("scroll", onScroll);
    
    // Create button location checking
    const params = new URLSearchParams(window.location.search);
    const createParam = params.get('createDeck');
    
    if (createParam) {
      const deckSection = document.getElementById('create-deck-section');
      if (deckSection) {
        deckSection.scrollIntoView({ behavior: 'smooth' });
      }
    }
    
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      {/* Hero Section */}
      <section className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden">
        {/* Background Gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-primary/10 via-background to-background pointer-events-none"></div>
        
        {/* Sparkles Background */}
        <div className="absolute inset-0 sparkles pointer-events-none"></div>
        
        {/* Content */}
        <div className="container px-4 z-10">
          <motion.div 
            className="text-center max-w-4xl mx-auto"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <div className="mb-6">
              <TarotLogo className="w-24 h-24 mx-auto text-primary" />
            </div>
            <h1 className="text-4xl md:text-6xl font-serif font-bold mb-6">
              Create &amp; Collect <span className="text-primary">Unique</span> Tarot Decks
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground mb-8">
              Design your own mystical cards with AI assistance or explore decks created by our community.
            </p>
            
            <div className="flex flex-wrap justify-center gap-4 mb-10">
              <Link to="/create-deck" className="btn btn-primary px-8 py-3 text-lg flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                Create Your Deck
              </Link>
              <Link to="/marketplace" className="btn btn-outline px-8 py-3 text-lg border-input">
                Explore Marketplace
              </Link>
            </div>
            
            <div className="flex justify-center">
              <CreditBadge showIcon={true} className="text-sm px-3 py-1.5" />
            </div>
          </motion.div>
          
          {/* Floating Cards */}
          <div className="absolute hidden lg:block -right-10 top-1/3 rotate-12">
            <motion.div
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="w-48 h-72 bg-gradient-to-br from-primary to-accent rounded-lg shadow-lg"
            ></motion.div>
          </div>
          <div className="absolute hidden lg:block -left-10 top-2/3 -rotate-12">
            <motion.div
              initial={{ opacity: 0, x: -100 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.6 }}
              className="w-48 h-72 bg-gradient-to-br from-accent to-primary rounded-lg shadow-lg"
            ></motion.div>
          </div>
        </div>
        
        {/* Scroll indicator */}
        <motion.div 
          className="absolute bottom-10 left-1/2 transform -translate-x-1/2"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ 
            duration: 0.5, 
            delay: 1,
            repeat: Infinity,
            repeatType: "reverse",
            repeatDelay: 0.5
          }}
        >
          <ArrowRight className="h-8 w-8 text-muted-foreground transform rotate-90" />
        </motion.div>
      </section>
      
      {/* Features Section */}
      <section className="py-24 bg-card/30" id="features">
        <div className="container px-4">
          <div className="text-center mb-16">
            <div className="inline-block rounded-full bg-primary/10 px-3 py-1 text-primary text-sm font-medium mb-4">
              Why Tarot Forge
            </div>
            <h2 className="text-3xl md:text-4xl font-serif font-bold mb-6">
              Create Your Mystical Journey
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Design, customize, and share your own tarot decks. Use AI to generate
              stunning imagery that reflects your unique spiritual vision.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <motion.div 
              className="bg-card rounded-xl p-6 border border-border"
              whileHover={{ y: -5 }}
              transition={{ duration: 0.3 }}
            >
              <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center mb-4">
                <Sparkles className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-serif font-bold mb-2">AI-Generated Art</h3>
              <p className="text-muted-foreground">
                Create customized tarot cards using advanced AI image generation. 
                Just describe your vision and watch it come to life.
              </p>
            </motion.div>
            
            <motion.div 
              className="bg-card rounded-xl p-6 border border-border"
              whileHover={{ y: -5 }}
              transition={{ duration: 0.3 }}
            >
              <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center mb-4">
                <Star className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-serif font-bold mb-2">Personalized Readings</h3>
              <p className="text-muted-foreground">
                Get intuitive readings using your custom decks or choose from
                our marketplace of unique community-created options.
              </p>
            </motion.div>
            
            <motion.div 
              className="bg-card rounded-xl p-6 border border-border"
              whileHover={{ y: -5 }}
              transition={{ duration: 0.3 }}
            >
              <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center mb-4">
                <TrendingUp className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-serif font-bold mb-2">Creator Economy</h3>
              <p className="text-muted-foreground">
                Sell your deck creations in our marketplace. Earn money while
                sharing your spiritual vision with the world.
              </p>
            </motion.div>
          </div>
        </div>
      </section>
      
      {/* Create Deck Section */}
      <section id="create-deck-section" className="py-24 relative overflow-hidden">
        <div className="container px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-block rounded-full bg-primary/10 px-3 py-1 text-primary text-sm font-medium mb-4">
                Design Process
              </div>
              <h2 className="text-3xl md:text-4xl font-serif font-bold mb-6">
                Design Your Own Tarot Deck
              </h2>
              <p className="text-muted-foreground mb-6">
                Our intuitive design process makes it easy to create professional-quality
                tarot cards that reflect your unique spiritual perspective.
              </p>
              
              <div className="space-y-4 mb-8">
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary shrink-0">1</div>
                  <div>
                    <h3 className="font-medium">Choose Theme & Style</h3>
                    <p className="text-sm text-muted-foreground">
                      Select from cosmic, nature-inspired, minimalist, and many more theme options.
                    </p>
                  </div>
                </div>
                
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary shrink-0">2</div>
                  <div>
                    <h3 className="font-medium">Describe Your Vision</h3>
                    <p className="text-sm text-muted-foreground">
                      Enter text prompts to guide the AI in generating your perfect card imagery.
                    </p>
                  </div>
                </div>
                
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary shrink-0">3</div>
                  <div>
                    <h3 className="font-medium">Customize & Share</h3>
                    <p className="text-sm text-muted-foreground">
                      Fine-tune your deck, add descriptions, and share or sell your creation.
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="flex gap-4">
                <Link to="/create-deck" className="btn btn-primary px-6 py-2 flex items-center gap-2">
                  <Sparkles className="h-4 w-4" />
                  Start Creating
                </Link>
                <Link to="/marketplace" className="btn btn-ghost border border-input px-6 py-2">
                  See Examples
                </Link>
              </div>
            </div>
            
            <div>
              <div className="bg-card border border-border rounded-2xl p-6 shadow-lg">
                <h3 className="font-serif font-bold mb-4">Theme Inspiration</h3>
                {isGeneratingTheme ? (
                  <div className="relative">
                    <div className="bg-muted/30 p-4 rounded-lg relative">
                      <div className="min-h-36 flex items-center justify-center">
                        <div className="text-center">
                          <div className="absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none">
                            <div className="animate-pulse">
                              <TarotLogo className="h-20 w-20 text-primary" />
                            </div>
                          </div>
                          <p className="italic text-foreground/90 relative z-10">{currentLoadingMessage}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground mb-4">
                      Choose a theme or describe your vision for AI-generated imagery:
                    </p>
                    
                    <div className="space-y-2">
                      <div className="flex gap-2 flex-wrap">
                        <button 
                          onClick={generateTheme}
                          className="bg-primary/10 hover:bg-primary/20 text-primary px-3 py-1 rounded-full text-sm transition-colors"
                        >
                          Celestial
                        </button>
                        <button 
                          onClick={generateTheme}
                          className="bg-primary/10 hover:bg-primary/20 text-primary px-3 py-1 rounded-full text-sm transition-colors"
                        >
                          Mystical Forest
                        </button>
                        <button 
                          onClick={generateTheme}
                          className="bg-primary/10 hover:bg-primary/20 text-primary px-3 py-1 rounded-full text-sm transition-colors"
                        >
                          Art Nouveau
                        </button>
                      </div>
                    </div>
                    
                    <div className="relative">
                      <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">
                        <Search className="h-4 w-4" />
                      </div>
                      <input
                        type="text"
                        placeholder="Describe your deck theme..."
                        className="w-full pl-10 pr-4 py-2 rounded-md bg-background border border-input focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                    
                    <div className="flex justify-end">
                      <button 
                        onClick={generateTheme}
                        className="btn btn-primary px-4 py-1.5 flex items-center gap-2"
                      >
                        <Sparkles className="h-4 w-4" />
                        Generate Theme
                      </button>
                    </div>
                  </div>
                )}
                
                <div className="mt-6 pt-6 border-t border-border">
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="font-medium">Credit Usage</h4>
                      <p className="text-sm text-muted-foreground">For a 78-card tarot deck</p>
                    </div>
                    <CreditBadge showIcon={true} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      {/* Pricing Section */}
      <section className="py-24 bg-card/30" id="pricing">
        <div className="container px-4">
          <div className="text-center mb-16">
            <div className="inline-block rounded-full bg-primary/10 px-3 py-1 text-primary text-sm font-medium mb-4">
              Pricing Options
            </div>
            <h2 className="text-3xl md:text-4xl font-serif font-bold mb-6">
              Choose Your Creative Path
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Select a plan that fits your creative needs, from casual exploration
              to professional deck creation.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Free Plan */}
            <motion.div 
              className="bg-card rounded-xl p-6 border border-border"
              whileHover={{ y: -5, boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)' }}
              transition={{ duration: 0.3 }}
            >
              <h3 className="text-xl font-serif font-bold mb-2">Free</h3>
              <div className="text-3xl font-bold mb-1">$0</div>
              <p className="text-muted-foreground text-sm mb-6">Get started with basic features</p>
              
              <ul className="space-y-3 mb-6">
                <li className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs">✓</div>
                  <span className="text-sm">5 cards per month</span>
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs">✓</div>
                  <span className="text-sm">Access to free decks</span>
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs">✓</div>
                  <span className="text-sm">Basic card quality</span>
                </li>
              </ul>
              
              <Link to="/subscription" className="btn btn-outline w-full py-2 border-input">
                Get Started
              </Link>
            </motion.div>
            
            {/* Premium Plan */}
            <motion.div 
              className="bg-card rounded-xl p-6 border border-primary relative"
              whileHover={{ y: -5, boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)' }}
              transition={{ duration: 0.3 }}
            >
              <div className="absolute top-0 right-0 transform translate-x-2 -translate-y-2">
                <div className="bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-full shadow-sm">
                  Popular
                </div>
              </div>
              
              <h3 className="text-xl font-serif font-bold mb-2">Creator</h3>
              <div className="text-3xl font-bold mb-1">$29<span className="text-sm font-normal">/month</span></div>
              <p className="text-muted-foreground text-sm mb-6">For serious deck creators</p>
              
              <ul className="space-y-3 mb-6">
                <li className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs">✓</div>
                  <span className="text-sm">78 cards per month (full deck)</span>
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs">✓</div>
                  <span className="text-sm">Sell decks in marketplace</span>
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs">✓</div>
                  <span className="text-sm">Advanced card quality</span>
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs">✓</div>
                  <span className="text-sm">Roll over up to 15 credits</span>
                </li>
              </ul>
              
              <Link to="/subscription" className="btn btn-primary w-full py-2">
                Choose Plan
              </Link>
            </motion.div>
            
            {/* Professional Plan */}
            <motion.div 
              className="bg-card rounded-xl p-6 border border-border"
              whileHover={{ y: -5, boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)' }}
              transition={{ duration: 0.3 }}
            >
              <h3 className="text-xl font-serif font-bold mb-2">Visionary</h3>
              <div className="text-3xl font-bold mb-1">$79<span className="text-sm font-normal">/month</span></div>
              <p className="text-muted-foreground text-sm mb-6">For professional creators</p>
              
              <ul className="space-y-3 mb-6">
                <li className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs">✓</div>
                  <span className="text-sm">118 premium credits monthly</span>
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs">✓</div>
                  <span className="text-sm">Ultra HD card quality</span>
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs">✓</div>
                  <span className="text-sm">Style consistency across deck</span>
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs">✓</div>
                  <span className="text-sm">Unlimited credit rollover</span>
                </li>
              </ul>
              
              <Link to="/subscription" className="btn btn-outline w-full py-2 border-input">
                Choose Plan
              </Link>
            </motion.div>
          </div>
        </div>
      </section>
      
      {/* Featured Decks */}
      <section className="py-24">
        <div className="container px-4">
          <div className="text-center mb-16">
            <div className="inline-block rounded-full bg-primary/10 px-3 py-1 text-primary text-sm font-medium mb-4">
              Community Showcase
            </div>
            <h2 className="text-3xl md:text-4xl font-serif font-bold mb-6">
              Featured Tarot Decks
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Explore decks created by our community members and get inspired for your next creation.
            </p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((idx) => (
              <motion.div 
                key={idx}
                className="group bg-card rounded-xl overflow-hidden border border-border"
                whileHover={{ y: -5, boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)' }}
                transition={{ duration: 0.3 }}
              >
                <div className="aspect-[3/4] bg-gradient-to-br from-primary/20 via-accent/10 to-primary/5 relative overflow-hidden">
                  {/* Placeholder for deck cover image */}
                  <div className="absolute inset-0 bg-primary/10 flex items-center justify-center">
                    <TarotLogo className="h-16 w-16 text-primary opacity-30" />
                  </div>
                  
                  {idx === 0 && (
                    <div className="absolute top-2 right-2 bg-accent/90 text-accent-foreground font-medium text-xs px-3 py-1 rounded-full">
                      <Zap className="h-3 w-3 inline mr-1" />
                      Free
                    </div>
                  )}
                </div>
                
                <div className="p-4">
                  <h3 className="font-serif font-medium mb-1">Mystical Collection #{idx + 1}</h3>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center">
                      <Star className="h-4 w-4 text-accent mr-1" />
                      <span className="text-xs text-muted-foreground">4.{idx+5}/5.0 ({30 + idx * 12})</span>
                    </div>
                    <span className="text-xs text-muted-foreground">78 cards</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
          
          <div className="text-center mt-12">
            <Link to="/marketplace" className="btn btn-outline px-6 py-2 border-input">
              View All Decks
            </Link>
          </div>
        </div>
      </section>
      
      {/* CTA Section */}
      <section className="py-24 bg-gradient-to-br from-primary/20 via-accent/10 to-primary/5">
        <div className="container px-4">
          <div className="max-w-3xl mx-auto text-center">
            <TarotLogo className="h-16 w-16 text-accent mx-auto mb-6" />
            <h2 className="text-3xl md:text-4xl font-serif font-bold mb-6">
              Begin Your Mystical Journey
            </h2>
            <p className="text-lg mb-10">
              Create your unique tarot deck today and share your spiritual wisdom with our growing community.
            </p>
            
            <div className="flex flex-wrap justify-center gap-4">
              <Link to="/create-deck" className="btn btn-primary px-8 py-3 text-lg">
                <Sparkles className="mr-2 h-5 w-5" />
                Start Creating
              </Link>
              
              {!user && (
                <Link to="/signup" className="btn btn-outline px-8 py-3 text-lg border-input">
                  Create Account
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>
      
      {/* Fixed create button that appears on scroll */}
      {showCreateButton && (
        <motion.div 
          className="fixed bottom-8 right-8 z-40"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Link to="/create-deck" className="btn btn-primary rounded-full p-4 shadow-lg flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            <span className="hidden sm:inline">Create Deck</span>
          </Link>
        </motion.div>
      )}
    </>
  );
};

export default Home;