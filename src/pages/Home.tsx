import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Wand2, BookOpen, Sparkles, ShoppingBag, Lightbulb, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import TarotLogo from '../components/ui/TarotLogo';

const Home = () => {
  const { user } = useAuth();
  const [showScrollButton, setShowScrollButton] = useState(false);

  // Show scroll button after scrolling down
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollButton(window.scrollY > 300);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Scroll to top function
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <>
      {/* Hero Section */}
      <section className="min-h-screen bg-gradient-to-b from-background via-background/95 to-background relative overflow-hidden flex items-center justify-center py-20">
        {/* Background sparkles */}
        <div className="absolute inset-0 overflow-hidden opacity-20 pointer-events-none">
          <div className="absolute w-full h-full bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.1)_1px,transparent_1px)] bg-[length:24px_24px]"></div>
          <div className="absolute -top-48 -left-48 w-96 h-96 rounded-full bg-accent/30 blur-3xl"></div>
          <div className="absolute -bottom-48 -right-48 w-96 h-96 rounded-full bg-primary/30 blur-3xl"></div>
        </div>

        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center max-w-3xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="flex justify-center mb-6"
            >
              <TarotLogo className="h-20 w-20 text-accent" />
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-4xl md:text-6xl font-serif font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-primary via-accent to-primary"
            >
              Tarot Forge
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-xl md:text-2xl text-muted-foreground mb-8"
            >
              Create, collect, and experience personalized tarot decks powered by AI
            </motion.p>

            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="flex flex-col sm:flex-row gap-4 justify-center"
            >
              <Link
                to="/create-deck"
                className="btn btn-primary py-2 px-6 text-lg flex items-center"
              >
                <Wand2 className="mr-2 h-5 w-5" />
                Create Your Deck
              </Link>

              <Link
                to="/marketplace"
                className="btn btn-secondary py-2 px-6 text-lg flex items-center"
              >
                <ShoppingBag className="mr-2 h-5 w-5" />
                Browse Marketplace
              </Link>
            </motion.div>
            
            {/* Only show credits badge for non-logged in users */}
            {!user && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.4 }}
                className="mt-8"
              >
                <div className="inline-flex items-center bg-card border border-yellow-500 px-3 py-1.5 rounded-full shadow-sm text-yellow-500">
                  <Sparkles className="h-4 w-4 mr-1.5" />
                  <span className="text-sm font-medium">5 free credits for new users</span>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 bg-card/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-serif font-bold mb-4">Reimagine Tarot with AI</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Tarot Forge combines ancient mystical wisdom with cutting-edge AI technology to create a unique experience
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Create Feature */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="bg-card p-6 rounded-lg border border-border"
            >
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center mb-4">
                <Wand2 className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-medium font-serif mb-3">Create</h3>
              <p className="text-muted-foreground mb-4">
                Design your own tarot deck with AI assistance. Choose themes, styles, and customize each card to reflect your unique vision.
              </p>
              <Link to="/create-deck" className="text-primary flex items-center text-sm font-medium hover:underline">
                Start Creating
                <ArrowRight className="h-4 w-4 ml-1" />
              </Link>
            </motion.div>

            {/* Collect Feature */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="bg-card p-6 rounded-lg border border-border"
            >
              <div className="w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center mb-4">
                <ShoppingBag className="h-6 w-6 text-accent" />
              </div>
              <h3 className="text-xl font-medium font-serif mb-3">Collect</h3>
              <p className="text-muted-foreground mb-4">
                Discover and collect unique decks created by artists and AI. Build a personal collection that resonates with your spiritual journey.
              </p>
              <Link to="/marketplace" className="text-accent flex items-center text-sm font-medium hover:underline">
                Explore Marketplace
                <ArrowRight className="h-4 w-4 ml-1" />
              </Link>
            </motion.div>

            {/* Read Feature */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="bg-card p-6 rounded-lg border border-border"
            >
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center mb-4">
                <BookOpen className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-medium font-serif mb-3">Read</h3>
              <p className="text-muted-foreground mb-4">
                Perform insightful readings with AI interpretation assistance or connect with professional readers for deeper guidance.
              </p>
              <Link to="/reading-room" className="text-primary flex items-center text-sm font-medium hover:underline">
                Enter Reading Room
                <ArrowRight className="h-4 w-4 ml-1" />
              </Link>
            </motion.div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-serif font-bold mb-4">How It Works</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Follow these simple steps to begin your journey with Tarot Forge
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-8">
            {/* Step 1 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="text-center"
            >
              <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4 relative">
                <span className="text-2xl font-bold text-primary">1</span>
                <div className="absolute inset-0 rounded-full border-4 border-primary/30 animate-ping"></div>
              </div>
              <h3 className="text-xl font-medium font-serif mb-3">Sign Up</h3>
              <p className="text-muted-foreground">
                Create your account and get 5 free credits to start your journey
              </p>
            </motion.div>

            {/* Step 2 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-center"
            >
              <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-primary">2</span>
              </div>
              <h3 className="text-xl font-medium font-serif mb-3">Create or Browse</h3>
              <p className="text-muted-foreground">
                Design your own custom deck or browse the marketplace for unique creations
              </p>
            </motion.div>

            {/* Step 3 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-center"
            >
              <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-primary">3</span>
              </div>
              <h3 className="text-xl font-medium font-serif mb-3">Perform Readings</h3>
              <p className="text-muted-foreground">
                Use your decks for personal readings with AI-powered interpretations
              </p>
            </motion.div>

            {/* Step 4 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="text-center"
            >
              <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-primary">4</span>
              </div>
              <h3 className="text-xl font-medium font-serif mb-3">Connect with Readers</h3>
              <p className="text-muted-foreground">
                Book sessions with professional readers for deeper insights and guidance
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="py-20 bg-gradient-to-r from-primary/20 via-accent/10 to-primary/20">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="text-3xl font-serif font-bold mb-6"
            >
              Begin Your Mystical Journey Today
            </motion.h2>
            
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-lg mb-8"
            >
              Whether you're an experienced tarot enthusiast or just beginning your spiritual exploration,
              Tarot Forge offers a unique blend of tradition and innovation to enhance your practice.
            </motion.p>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <Link 
                to={user ? "/create-deck" : "/signup"} 
                className="btn btn-primary py-3 px-8 text-lg"
              >
                {user ? "Create Your First Deck" : "Join Tarot Forge"}
              </Link>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="mt-12 flex flex-col md:flex-row gap-6 justify-center items-center text-center md:text-left"
            >
              <div className="bg-card p-6 rounded-lg border border-border max-w-xs">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center mb-3 mx-auto md:mx-0">
                  <Sparkles className="h-5 w-5 text-primary" />
                </div>
                <h3 className="text-lg font-medium mb-2">AI-Powered Creation</h3>
                <p className="text-muted-foreground text-sm">
                  Harness the power of generative AI to create stunning tarot imagery tailored to your vision
                </p>
              </div>
              
              <div className="bg-card p-6 rounded-lg border border-border max-w-xs">
                <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center mb-3 mx-auto md:mx-0">
                  <Lightbulb className="h-5 w-5 text-accent" />
                </div>
                <h3 className="text-lg font-medium mb-2">Insightful Readings</h3>
                <p className="text-muted-foreground text-sm">
                  Receive meaningful interpretations that combine traditional tarot wisdom with modern insights
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Scroll to top button */}
      {showScrollButton && (
        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          onClick={scrollToTop}
          className="fixed bottom-8 right-8 p-3 rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 transition-colors z-50"
          aria-label="Scroll to top"
        >
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            width="24" 
            height="24" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          >
            <path d="m18 15-6-6-6 6"/>
          </svg>
        </motion.button>
      )}
    </>
  );
};

export default Home;