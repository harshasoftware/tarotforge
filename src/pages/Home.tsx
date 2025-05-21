import { useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Star, ArrowRight, Zap, Sparkles, Shield, CreditCard, Check, Crown } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSubscription } from '../context/SubscriptionContext';
import TarotLogo from '../components/ui/TarotLogo';
import { STRIPE_PRODUCTS } from '../lib/stripe-config';

const Home = () => {
  const { user, setShowSignInModal } = useAuth();
  const { isSubscribed } = useSubscription();
  const [activeTab, setActiveTab] = useState<'mystic' | 'creator' | 'visionary'>('creator');

  // Get featured products
  const getProductByKey = (key: string) => {
    return STRIPE_PRODUCTS[key];
  };

  return (
    <div>
      {/* Hero Section */}
      <section className="relative min-h-[90vh] flex flex-col justify-center items-center overflow-hidden px-4 pt-20 pb-32">
        <div className="absolute inset-0 z-0 overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-primary/20 via-transparent to-background"></div>
          <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-accent/30 blur-3xl animate-float"></div>
          <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-primary/20 blur-3xl opacity-70"></div>
        </div>
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="text-center relative z-10"
        >
          <h1 className="text-4xl md:text-6xl font-serif font-bold mb-6 max-w-4xl leading-tight">
            Create & Collect AI-Generated Tarot Decks
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Generate stunning custom tarot cards, build unique decks, and experience personalized readings.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Link 
              to={user ? "/create-deck" : "/login"}
              className="btn btn-primary py-3 px-8 text-lg font-medium flex items-center justify-center"
            >
              <Sparkles className="mr-2 h-5 w-5" />
              Create Your Deck
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
            <Link 
              to="/marketplace" 
              className="btn btn-ghost border border-input py-3 px-8 text-lg font-medium flex items-center justify-center"
            >
              Explore Marketplace
            </Link>
          </div>
          
          <div className="flex flex-wrap justify-center gap-4">
            <div className="flex items-center bg-card/50 px-4 py-2 rounded-full border border-border">
              <Star className="h-4 w-4 text-accent mr-2" />
              <span className="text-sm">Top-rated designs</span>
            </div>
            <div className="flex items-center bg-card/50 px-4 py-2 rounded-full border border-border">
              <TarotLogo className="h-4 w-4 text-accent mr-2" />
              <span className="text-sm">Personalized readings</span>
            </div>
            <div className="flex items-center bg-card/50 px-4 py-2 rounded-full border border-border">
              <Zap className="h-4 w-4 text-accent mr-2" />
              <span className="text-sm">Free starter decks</span>
            </div>
          </div>
        </motion.div>
        
        {/* Hero Cards (Animated) */}
        <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/4 flex justify-center w-full px-4 z-0">
          <motion.div 
            className="relative w-64 sm:w-80"
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 1, delay: 0.5 }}
          >
            <div className="absolute top-0 left-1/2 -ml-12 sm:-ml-16 w-24 sm:w-32 aspect-[2/3] rounded-lg shadow-lg transform -rotate-12 overflow-hidden">
              <img src="https://images.pexels.com/photos/2150/sky-space-dark-galaxy.jpg?auto=compress&cs=tinysrgb&w=1600" alt="Tarot Card" className="w-full h-full object-cover" />
            </div>
            <div className="absolute top-0 left-1/2 -ml-8 w-28 sm:w-36 aspect-[2/3] rounded-lg shadow-lg transform rotate-3 overflow-hidden z-20">
              <img src="https://images.pexels.com/photos/1169754/pexels-photo-1169754.jpeg?auto=compress&cs=tinysrgb&w=1600" alt="Tarot Card" className="w-full h-full object-cover" />
            </div>
            <div className="absolute top-0 left-1/2 -ml-20 sm:-ml-24 w-20 sm:w-28 aspect-[2/3] rounded-lg shadow-lg transform rotate-12 overflow-hidden">
              <img src="https://images.pexels.com/photos/2627945/pexels-photo-2627945.jpeg?auto=compress&cs=tinysrgb&w=1600" alt="Tarot Card" className="w-full h-full object-cover" />
            </div>
          </motion.div>
        </div>
      </section>
      
      {/* Features Section */}
      <section className="py-24 px-4">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true }}
            >
              <h2 className="text-3xl md:text-4xl font-serif font-bold mb-4">Unleash Your Mystical Creativity</h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Our platform brings together the best of AI, tarot tradition, and your unique vision.
              </p>
            </motion.div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              viewport={{ once: true }}
              className="bg-card border border-border rounded-xl p-6 h-full hover:shadow-lg transition-shadow"
            >
              <div className="w-12 h-12 bg-accent/20 rounded-full flex items-center justify-center mb-4">
                <Sparkles className="h-6 w-6 text-accent" />
              </div>
              <h3 className="text-xl font-bold mb-3">AI Card Generation</h3>
              <p className="text-muted-foreground mb-4">
                Create unique tarot cards with our AI technology. Describe your vision and watch it come to life with stunning artwork.
              </p>
              <ul className="space-y-2 mb-6">
                <li className="flex items-center">
                  <div className="w-5 h-5 rounded-full bg-accent/10 flex items-center justify-center mr-2">
                    <Check className="h-3 w-3 text-accent" />
                  </div>
                  <span className="text-sm">Customizable card imagery</span>
                </li>
                <li className="flex items-center">
                  <div className="w-5 h-5 rounded-full bg-accent/10 flex items-center justify-center mr-2">
                    <Check className="h-3 w-3 text-accent" />
                  </div>
                  <span className="text-sm">Personalized descriptions</span>
                </li>
                <li className="flex items-center">
                  <div className="w-5 h-5 rounded-full bg-accent/10 flex items-center justify-center mr-2">
                    <Check className="h-3 w-3 text-accent" />
                  </div>
                  <span className="text-sm">Multiple art styles</span>
                </li>
              </ul>
              <Link to="/create" className="text-accent hover:underline flex items-center text-sm">
                Start creating
                <ArrowRight className="ml-1 h-3 w-3" />
              </Link>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              viewport={{ once: true }}
              className="bg-card border border-border rounded-xl p-6 h-full hover:shadow-lg transition-shadow"
            >
              <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center mb-4">
                <TarotLogo className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-bold mb-3">Personalized Readings</h3>
              <p className="text-muted-foreground mb-4">
                Experience interactive tarot readings with your custom decks or choose from our curated collection. Get AI-assisted interpretations.
              </p>
              <ul className="space-y-2 mb-6">
                <li className="flex items-center">
                  <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center mr-2">
                    <Check className="h-3 w-3 text-primary" />
                  </div>
                  <span className="text-sm">Multiple spread options</span>
                </li>
                <li className="flex items-center">
                  <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center mr-2">
                    <Check className="h-3 w-3 text-primary" />
                  </div>
                  <span className="text-sm">Detailed card meanings</span>
                </li>
                <li className="flex items-center">
                  <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center mr-2">
                    <Check className="h-3 w-3 text-primary" />
                  </div>
                  <span className="text-sm">AI interpretation assistance</span>
                </li>
              </ul>
              <Link to="/reading-room" className="text-primary hover:underline flex items-center text-sm">
                Enter reading room
                <ArrowRight className="ml-1 h-3 w-3" />
              </Link>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              viewport={{ once: true }}
              className="bg-card border border-border rounded-xl p-6 h-full hover:shadow-lg transition-shadow"
            >
              <div className="w-12 h-12 bg-teal/20 rounded-full flex items-center justify-center mb-4">
                <Star className="h-6 w-6 text-teal" />
              </div>
              <h3 className="text-xl font-bold mb-3">Creator Marketplace</h3>
              <p className="text-muted-foreground mb-4">
                Buy unique tarot decks from talented creators or list your own creations. Build a collection that reflects your style.
              </p>
              <ul className="space-y-2 mb-6">
                <li className="flex items-center">
                  <div className="w-5 h-5 rounded-full bg-teal/10 flex items-center justify-center mr-2">
                    <Check className="h-3 w-3 text-teal" />
                  </div>
                  <span className="text-sm">Discover artist-made decks</span>
                </li>
                <li className="flex items-center">
                  <div className="w-5 h-5 rounded-full bg-teal/10 flex items-center justify-center mr-2">
                    <Check className="h-3 w-3 text-teal" />
                  </div>
                  <span className="text-sm">Sell your own designs</span>
                </li>
                <li className="flex items-center">
                  <div className="w-5 h-5 rounded-full bg-teal/10 flex items-center justify-center mr-2">
                    <Check className="h-3 w-3 text-teal" />
                  </div>
                  <span className="text-sm">NFT options available</span>
                </li>
              </ul>
              <Link to="/marketplace" className="text-teal hover:underline flex items-center text-sm">
                Browse marketplace
                <ArrowRight className="ml-1 h-3 w-3" />
              </Link>
            </motion.div>
          </div>
        </div>
      </section>
      
      {/* Testimonials Section */}
      <section className="py-24 px-4 bg-card/50 border-y border-border">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true }}
            >
              <h2 className="text-3xl md:text-4xl font-serif font-bold mb-4">Loved by Mystics Worldwide</h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Join thousands of tarot enthusiasts who've discovered their creative potential.
              </p>
            </motion.div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Testimonial 1 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              viewport={{ once: true }}
              className="bg-card border border-border rounded-xl p-6"
            >
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-accent/20 rounded-full flex items-center justify-center mr-4">
                  <span className="text-lg font-bold">S</span>
                </div>
                <div>
                  <h4 className="font-bold">Sarah K.</h4>
                  <p className="text-sm text-muted-foreground">Tarot Creator</p>
                </div>
              </div>
              <div className="flex mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-4 w-4 text-accent fill-accent" />
                ))}
              </div>
              <p className="text-muted-foreground">
                "I've been creating tarot decks for years, but this platform has taken my art to a whole new level. The AI assistance helps bring my visions to life exactly as I imagine them."
              </p>
            </motion.div>
            
            {/* Testimonial 2 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              viewport={{ once: true }}
              className="bg-card border border-border rounded-xl p-6"
            >
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center mr-4">
                  <span className="text-lg font-bold">M</span>
                </div>
                <div>
                  <h4 className="font-bold">Marcus J.</h4>
                  <p className="text-sm text-muted-foreground">Spiritual Coach</p>
                </div>
              </div>
              <div className="flex mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-4 w-4 text-accent fill-accent" />
                ))}
              </div>
              <p className="text-muted-foreground">
                "The reading room feature has transformed my client sessions. Being able to use custom decks that resonate with my specific practice has deepened the connections I make."
              </p>
            </motion.div>
            
            {/* Testimonial 3 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              viewport={{ once: true }}
              className="bg-card border border-border rounded-xl p-6"
            >
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-teal/20 rounded-full flex items-center justify-center mr-4">
                  <span className="text-lg font-bold">L</span>
                </div>
                <div>
                  <h4 className="font-bold">Lucia T.</h4>
                  <p className="text-sm text-muted-foreground">Collector</p>
                </div>
              </div>
              <div className="flex mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-4 w-4 text-accent fill-accent" />
                ))}
              </div>
              <p className="text-muted-foreground">
                "I've collected over 20 decks from the marketplace. Each one is unique and the quality is exceptional. The community of creators here is incredibly talented."
              </p>
            </motion.div>
          </div>
        </div>
      </section>
      
      {/* CTA Section */}
      <section className="py-24 px-4 relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden z-0">
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-transparent to-background"></div>
          <div className="absolute -top-32 -right-32 w-64 h-64 rounded-full bg-primary/30 blur-3xl"></div>
          <div className="absolute -bottom-32 -left-32 w-64 h-64 rounded-full bg-accent/20 blur-3xl"></div>
        </div>
        
        <div className="container mx-auto relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className="text-center max-w-3xl mx-auto"
          >
            <h2 className="text-3xl md:text-4xl font-serif font-bold mb-4">Begin Your Mystical Journey Today</h2>
            <p className="text-xl text-muted-foreground mb-8">
              Join our community of tarot enthusiasts, creators, and seekers. Your first deck awaits.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
              <button 
                onClick={() => user ? window.location.href = "/create-deck" : setShowSignInModal(true)}
                className="btn btn-primary py-3 px-8 text-lg font-medium flex items-center justify-center"
              >
                <Sparkles className="mr-2 h-5 w-5" />
                {user ? "Create Your Deck" : "Sign Up & Create"}
                <ArrowRight className="ml-2 h-5 w-5" />
              </button>
              
              <Link 
                to="/reading-room"
                className="btn btn-outline border-primary/50 text-primary hover:bg-primary/10 py-3 px-8 text-lg font-medium"
              >
                Try a Free Reading
              </Link>
            </div>
            
            <p className="text-sm text-muted-foreground">
              No credit card required to start. Free decks and readings available for all users.
            </p>
          </motion.div>
        </div>
      </section>
      
      {/* Pricing Section */}
      <section className="py-24 px-4 bg-card/50 border-t border-border">
        <div className="container mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-serif font-bold mb-4">Flexible Pricing Plans</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Choose the perfect plan for your creative journey. All plans include access to our core features.
            </p>
          </motion.div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {/* Free Plan */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              viewport={{ once: true }}
              className="bg-card border border-border rounded-xl overflow-hidden"
            >
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-serif font-bold">Free</h3>
                  <div className="p-2 bg-muted/30 rounded-full">
                    <Zap className="h-5 w-5 text-muted-foreground" />
                  </div>
                </div>
                
                <div className="mb-4">
                  <div className="flex items-baseline">
                    <span className="text-2xl font-bold">$0</span>
                    <span className="text-muted-foreground ml-1">/forever</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">Start your tarot journey</p>
                </div>
                
                <div className="space-y-2 mb-6">
                  <div className="flex items-start">
                    <Check className="h-4 w-4 text-success mt-0.5 mr-2" />
                    <span className="text-sm">5 basic credits monthly</span>
                  </div>
                  <div className="flex items-start">
                    <Check className="h-4 w-4 text-success mt-0.5 mr-2" />
                    <span className="text-sm">Access to reading room</span>
                  </div>
                  <div className="flex items-start">
                    <Check className="h-4 w-4 text-success mt-0.5 mr-2" />
                    <span className="text-sm">Use community decks</span>
                  </div>
                </div>
                
                <Link
                  to="/reading-room"
                  className="w-full btn btn-ghost border border-input py-2 flex items-center justify-center"
                >
                  Try Free
                </Link>
              </div>
            </motion.div>
            
            {/* Mystic Plan */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              viewport={{ once: true }}
              className="bg-card border border-border rounded-xl overflow-hidden"
            >
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-serif font-bold">Mystic</h3>
                  <div className="p-2 bg-primary/20 rounded-full">
                    <Sparkles className="h-5 w-5 text-primary" />
                  </div>
                </div>
                
                <div className="mb-4">
                  <div className="flex items-baseline">
                    <span className="text-2xl font-bold">${getProductByKey('mystic-monthly')?.price}</span>
                    <span className="text-muted-foreground ml-1">/month</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">Perfect for beginners</p>
                </div>
                
                <div className="space-y-2 mb-6">
                  <div className="flex items-start">
                    <Check className="h-4 w-4 text-success mt-0.5 mr-2" />
                    <span className="text-sm">22 basic credits monthly</span>
                  </div>
                  <div className="flex items-start">
                    <Check className="h-4 w-4 text-success mt-0.5 mr-2" />
                    <span className="text-sm">Medium quality images</span>
                  </div>
                  <div className="flex items-start">
                    <Check className="h-4 w-4 text-success mt-0.5 mr-2" />
                    <span className="text-sm">Create Major Arcana decks</span>
                  </div>
                </div>
                
                <Link
                  to="/profile"
                  className="w-full btn btn-primary py-2 flex items-center justify-center"
                >
                  <Crown className="h-4 w-4 mr-2" />
                  Subscribe
                </Link>
              </div>
            </motion.div>
            
            {/* Creator Plan */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              viewport={{ once: true }}
              className="bg-card border border-accent/50 rounded-xl overflow-hidden shadow-lg relative"
            >
              <div className="absolute top-0 left-0 right-0 bg-accent text-accent-foreground text-center py-1 text-sm font-medium">
                Most Popular
              </div>
              <div className="p-6 pt-10">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-serif font-bold">Creator</h3>
                  <div className="p-2 bg-accent/20 rounded-full">
                    <CreditCard className="h-5 w-5 text-accent" />
                  </div>
                </div>
                
                <div className="mb-4">
                  <div className="flex items-baseline">
                    <span className="text-2xl font-bold">${getProductByKey('creator-monthly')?.price}</span>
                    <span className="text-muted-foreground ml-1">/month</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">For serious enthusiasts</p>
                </div>
                
                <div className="space-y-2 mb-6">
                  <div className="flex items-start">
                    <Check className="h-4 w-4 text-success mt-0.5 mr-2" />
                    <span className="text-sm">78 basic credits monthly</span>
                  </div>
                  <div className="flex items-start">
                    <Check className="h-4 w-4 text-success mt-0.5 mr-2" />
                    <span className="text-sm">Create full 78-card decks</span>
                  </div>
                  <div className="flex items-start">
                    <Check className="h-4 w-4 text-success mt-0.5 mr-2" />
                    <span className="text-sm">Sell decks in marketplace</span>
                  </div>
                </div>
                
                <Link
                  to="/profile"
                  className="w-full btn bg-accent text-accent-foreground hover:bg-accent/90 py-2 flex items-center justify-center"
                >
                  <Crown className="h-4 w-4 mr-2" />
                  Subscribe
                </Link>
              </div>
            </motion.div>
            
            {/* Visionary Plan */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              viewport={{ once: true }}
              className="bg-card border border-border rounded-xl overflow-hidden"
            >
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-serif font-bold">Visionary</h3>
                  <div className="p-2 bg-teal/20 rounded-full">
                    <Shield className="h-5 w-5 text-teal" />
                  </div>
                </div>
                
                <div className="mb-4">
                  <div className="flex items-baseline">
                    <span className="text-2xl font-bold">${getProductByKey('visionary-monthly')?.price}</span>
                    <span className="text-muted-foreground ml-1">/month</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">For professionals</p>
                </div>
                
                <div className="space-y-2 mb-6">
                  <div className="flex items-start">
                    <Check className="h-4 w-4 text-success mt-0.5 mr-2" />
                    <span className="text-sm">118 premium credits monthly</span>
                  </div>
                  <div className="flex items-start">
                    <Check className="h-4 w-4 text-success mt-0.5 mr-2" />
                    <span className="text-sm">High quality images</span>
                  </div>
                  <div className="flex items-start">
                    <Check className="h-4 w-4 text-success mt-0.5 mr-2" />
                    <span className="text-sm">Full credit rollover</span>
                  </div>
                </div>
                
                <Link
                  to="/profile"
                  className="w-full btn btn-teal py-2 flex items-center justify-center"
                >
                  <Crown className="h-4 w-4 mr-2" />
                  Subscribe
                </Link>
              </div>
            </motion.div>
          </div>
          
          <div className="mt-12 text-center max-w-xl mx-auto">
            <p className="text-muted-foreground mb-4">
              All paid plans include rollover credits, style consistency, and access to all platform features. Save up to 20% with yearly billing.
            </p>
            <Link
              to="/profile"
              className="inline-flex items-center text-primary hover:underline"
            >
              View detailed pricing
              <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;