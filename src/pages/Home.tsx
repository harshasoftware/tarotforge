import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowRight, Sparkles, BookOpen, Zap, User, PenTool, ShoppingBag, Star, AlertCircle } from 'lucide-react';
import TarotLogo from '../components/ui/TarotLogo';
import { useAuth } from '../context/AuthContext';

const Home = () => {
  const { user, setShowSignInModal } = useAuth();
  const [activeSlide, setActiveSlide] = useState(0);
  
  // Auto-rotate testimonials
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % testimonials.length);
    }, 8000);
    
    return () => clearInterval(interval);
  }, []);
  
  // Hero images for parallax effect
  const heroImages = [
    'https://images.pexels.com/photos/131778/pexels-photo-131778.jpeg?auto=compress&cs=tinysrgb&dpr=1&w=500',
    'https://images.pexels.com/photos/3029868/pexels-photo-3029868.jpeg?auto=compress&cs=tinysrgb&dpr=1&w=500',
    'https://images.pexels.com/photos/5901263/pexels-photo-5901263.jpeg?auto=compress&cs=tinysrgb&dpr=1&w=500',
  ];
  
  const testimonials = [
    {
      quote: "Tarot Forge has transformed the way I create and share my spiritual art. The AI deck creation is remarkably intuitive!",
      author: "Celestia D.",
      stars: 5
    },
    {
      quote: "As both a creator and reader, I've found this platform to be invaluable. The marketplace connects me directly with seekers looking for unique perspectives.",
      author: "Mystic Voyager",
      stars: 5
    },
    {
      quote: "The quality of decks I can create with this tool far exceeds my expectations. Each card feels personal and meaningful.",
      author: "Astral Weaver",
      stars: 5
    }
  ];
  
  // Handle call to action based on authentication
  const handleCTAClick = () => {
    if (!user) {
      setShowSignInModal(true);
    }
  };

  return (
    <div>
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center overflow-hidden">
        {/* Background image parallax */}
        <div className="absolute inset-0 z-0">
          {heroImages.map((img, index) => (
            <motion.div 
              key={index}
              className="absolute inset-0"
              initial={{ opacity: 0 }}
              animate={{ 
                opacity: index === activeSlide ? 0.4 : 0,
                scale: index === activeSlide ? 1 : 1.1
              }}
              transition={{ duration: 1.5 }}
            >
              <img 
                src={img} 
                alt="Mystical background" 
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-background/95 to-background"></div>
            </motion.div>
          ))}
        </div>
        
        {/* Hero content */}
        <div className="container mx-auto px-4 pt-20 pb-32 relative z-10">
          <div className="max-w-5xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
              <TarotLogo className="mx-auto h-16 w-16 text-accent mb-6" />
              <h1 className="text-4xl md:text-6xl lg:text-7xl font-serif font-bold mb-6">
                Create <span className="text-accent">Mystical</span> Tarot Decks with AI
              </h1>
              <p className="text-xl md:text-2xl text-muted-foreground mb-10 max-w-3xl mx-auto leading-relaxed">
                Design and share unique decks, receive personalized readings, and join a community of spiritual seekers.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link 
                  to={user ? "/create-deck" : "#"}
                  onClick={user ? undefined : handleCTAClick}
                  className="btn btn-primary py-6 px-8 text-lg font-medium"
                >
                  {user ? (
                    <>
                      <PenTool className="h-5 w-5 mr-2" />
                      Create Your Deck
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-5 w-5 mr-2" />
                      Create Free Account
                    </>
                  )}
                </Link>
                <Link to="/marketplace" className="btn btn-secondary py-6 px-8 text-lg font-medium">
                  <ShoppingBag className="h-5 w-5 mr-2" />
                  Browse Marketplace
                </Link>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Animated sparkles */}
        <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
          {[...Array(20)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute h-1 w-1 bg-accent rounded-full"
              animate={{
                x: [
                  Math.random() * window.innerWidth,
                  Math.random() * window.innerWidth,
                  Math.random() * window.innerWidth,
                ],
                y: [
                  Math.random() * window.innerHeight,
                  Math.random() * window.innerHeight,
                  Math.random() * window.innerHeight,
                ],
                opacity: [0, 1, 0],
                scale: [0, 1.5, 0],
              }}
              transition={{
                duration: Math.random() * 10 + 15,
                repeat: Infinity,
                ease: "linear",
              }}
            />
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="py-20 bg-gradient-to-b from-background to-card/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
            >
              <h2 className="text-3xl md:text-4xl font-serif font-bold mb-4">Spiritual Tools for Modern Seekers</h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Tarot Forge combines centuries-old wisdom with cutting-edge AI to transform your spiritual practice.
              </p>
            </motion.div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="bg-card border border-border rounded-xl p-6 hover:shadow-lg transition-shadow"
            >
              <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center mb-4">
                <PenTool className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-serif font-bold mb-2">Create Custom Decks</h3>
              <p className="text-muted-foreground mb-4">
                Design your own tarot cards with our advanced AI. Choose your style, theme, and symbolism to create a deck that speaks to you.
              </p>
              <Link to="/create-deck" className="text-primary flex items-center text-sm font-medium hover:underline">
                Create Your First Deck
                <ArrowRight className="h-4 w-4 ml-1" />
              </Link>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="bg-card border border-border rounded-xl p-6 hover:shadow-lg transition-shadow"
            >
              <div className="h-12 w-12 rounded-full bg-accent/20 flex items-center justify-center mb-4">
                <BookOpen className="h-6 w-6 text-accent" />
              </div>
              <h3 className="text-xl font-serif font-bold mb-2">Personalized Readings</h3>
              <p className="text-muted-foreground mb-4">
                Receive guidance from certified readers or use our AI interpretation tools for a private reading experience.
              </p>
              <Link to="/reading-room" className="text-accent flex items-center text-sm font-medium hover:underline">
                Try a Reading
                <ArrowRight className="h-4 w-4 ml-1" />
              </Link>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="bg-card border border-border rounded-xl p-6 hover:shadow-lg transition-shadow"
            >
              <div className="h-12 w-12 rounded-full bg-success/20 flex items-center justify-center mb-4">
                <Zap className="h-6 w-6 text-success" />
              </div>
              <h3 className="text-xl font-serif font-bold mb-2">Join the Community</h3>
              <p className="text-muted-foreground mb-4">
                Connect with other spiritual enthusiasts, share your creations, and build your presence as a creator or reader.
              </p>
              <Link to="/readers" className="text-success flex items-center text-sm font-medium hover:underline">
                Explore Readers
                <ArrowRight className="h-4 w-4 ml-1" />
              </Link>
            </motion.div>
          </div>
        </div>
      </section>
      
      {/* Testimonial Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1 }}
            className="bg-gradient-to-br from-primary/10 via-accent/5 to-background rounded-xl p-8 md:p-12 max-w-4xl mx-auto"
          >
            <div className="relative">
              <div className="absolute -top-6 -left-6">
                <TarotLogo className="h-12 w-12 text-accent/50" />
              </div>
              
              {testimonials.map((testimonial, index) => (
                <div 
                  key={index}
                  className={`transition-opacity duration-1000 ${
                    activeSlide === index ? 'opacity-100' : 'opacity-0 absolute'
                  }`}
                  style={{ 
                    display: activeSlide === index ? 'block' : 'none',
                  }}
                >
                  <blockquote className="text-center">
                    <p className="text-xl md:text-2xl font-serif mb-6 italic">"{testimonial.quote}"</p>
                    <footer>
                      <div className="flex justify-center space-x-1 mb-2">
                        {[...Array(5)].map((_, i) => (
                          <Star 
                            key={i} 
                            className={`h-5 w-5 ${i < testimonial.stars ? 'text-accent fill-accent' : 'text-muted-foreground'}`} 
                          />
                        ))}
                      </div>
                      <cite className="text-lg font-medium not-italic">— {testimonial.author}</cite>
                    </footer>
                  </blockquote>
                </div>
              ))}
              
              {/* Pagination dots */}
              <div className="flex justify-center space-x-2 mt-8">
                {testimonials.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setActiveSlide(index)}
                    className={`h-2 w-2 rounded-full ${
                      activeSlide === index ? 'bg-accent' : 'bg-muted'
                    }`}
                    aria-label={`Go to testimonial ${index + 1}`}
                  />
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </section>
      
      {/* CTA Section */}
      <section className="py-20 bg-card/30">
        <div className="container mx-auto px-4">
          <div className="text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="max-w-2xl mx-auto"
            >
              <h2 className="text-3xl md:text-4xl font-serif font-bold mb-6">Begin Your Mystical Journey Today</h2>
              <p className="text-xl text-muted-foreground mb-8">
                Whether you're creating a unique deck, seeking guidance, or sharing your knowledge, Tarot Forge is your destination for spiritual growth.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link to="/marketplace" className="btn btn-secondary py-3 px-8">
                  Browse Marketplace
                </Link>
                {user ? (
                  <Link to="/create-deck" className="btn btn-primary py-3 px-8">
                    <PenTool className="h-5 w-5 mr-2" />
                    Create Your Deck
                  </Link>
                ) : (
                  <button 
                    onClick={() => setShowSignInModal(true)} 
                    className="btn btn-primary py-3 px-8"
                  >
                    <User className="h-5 w-5 mr-2" />
                    Sign In
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        </div>
      </section>
      
      {/* Features Grid */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
            >
              <h2 className="text-3xl md:text-4xl font-serif font-bold mb-4">More Ways to Explore</h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Discover the full range of features available on Tarot Forge
              </p>
            </motion.div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <Link to="/marketplace">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
                className="bg-card border border-border rounded-xl p-6 hover:shadow-lg transition-all h-full flex flex-col"
              >
                <ShoppingBag className="h-8 w-8 text-accent mb-4" />
                <h3 className="text-xl font-serif font-bold mb-2">Marketplace</h3>
                <p className="text-muted-foreground flex-grow">
                  Browse and purchase unique tarot decks created by artists from around the world.
                </p>
                <div className="mt-4 flex items-center text-sm text-primary">
                  Browse decks
                  <ArrowRight className="h-4 w-4 ml-1" />
                </div>
              </motion.div>
            </Link>
            
            <Link to="/reading-room">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="bg-card border border-border rounded-xl p-6 hover:shadow-lg transition-all h-full flex flex-col"
              >
                <BookOpen className="h-8 w-8 text-accent mb-4" />
                <h3 className="text-xl font-serif font-bold mb-2">Reading Room</h3>
                <p className="text-muted-foreground flex-grow">
                  Get a personalized tarot reading with your favorite deck or connect with a professional reader.
                </p>
                <div className="mt-4 flex items-center text-sm text-primary">
                  Get a reading
                  <ArrowRight className="h-4 w-4 ml-1" />
                </div>
              </motion.div>
            </Link>
            
            <Link to="/become-reader">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="bg-card border border-border rounded-xl p-6 hover:shadow-lg transition-all h-full flex flex-col"
              >
                <User className="h-8 w-8 text-accent mb-4" />
                <h3 className="text-xl font-serif font-bold mb-2">Become a Reader</h3>
                <p className="text-muted-foreground flex-grow">
                  Share your expertise and offer tarot readings to the community. Get certified and start earning.
                </p>
                <div className="mt-4 flex items-center text-sm text-primary">
                  Learn more
                  <ArrowRight className="h-4 w-4 ml-1" />
                </div>
              </motion.div>
            </Link>
            
            <Link to="/daily-tarot">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="bg-card border border-border rounded-xl p-6 hover:shadow-lg transition-all h-full flex flex-col"
              >
                <Zap className="h-8 w-8 text-accent mb-4" />
                <h3 className="text-xl font-serif font-bold mb-2">Daily Card</h3>
                <p className="text-muted-foreground flex-grow">
                  Receive a daily tarot card with interpretation for guidance and reflection on your spiritual journey.
                </p>
                <div className="mt-4 flex items-center text-sm text-primary">
                  See today's card
                  <ArrowRight className="h-4 w-4 ml-1" />
                </div>
              </motion.div>
            </Link>
          </div>
        </div>
      </section>
      
      {/* Newsletter */}
      <section className="py-20 bg-card/30">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
            >
              <h2 className="text-3xl font-serif font-bold mb-4">Stay Connected</h2>
              <p className="text-muted-foreground mb-6">
                Join our newsletter for tarot tips, monthly guidance, and updates on new features.
              </p>
              <form className="flex flex-col sm:flex-row gap-2">
                <div className="flex-grow relative">
                  <input 
                    type="email" 
                    placeholder="Your email address" 
                    className="w-full px-4 py-3 rounded-md bg-background border border-input focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <button className="btn btn-primary px-6 py-3 sm:whitespace-nowrap">
                  Subscribe
                </button>
              </form>
              <p className="text-xs text-muted-foreground mt-3">
                We respect your privacy and will never share your information.
              </p>
            </motion.div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;