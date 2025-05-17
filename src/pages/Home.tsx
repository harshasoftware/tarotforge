import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, ArrowDown, BookOpen, Hammer } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import TarotLogo from '../components/ui/TarotLogo';

const Home = () => {
  const { user } = useAuth();
  const [showScrollIndicator, setShowScrollIndicator] = useState(true);
  
  // Handle scroll effect for the indicator
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 100) {
        setShowScrollIndicator(false);
      } else {
        setShowScrollIndicator(true);
      }
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div>
      {/* Hero Section */}
      <section className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/30 via-background to-background z-0"></div>
        <div className="absolute inset-0 sparkles opacity-30 pointer-events-none"></div>
        
        <motion.div 
          className="container mx-auto px-4 text-center z-10 pt-10"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          <div className="flex items-center justify-center mb-6">
            <TarotLogo className="h-16 w-16 text-accent" />
          </div>
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-serif font-bold mb-6 leading-tight">
            Create Your Own <br />
            <span className="text-accent">Mystical Tarot</span> Deck
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto mb-12">
            Design, collect, and experience tarot readings with AI-generated decks that reflect your unique spiritual vision.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <Link 
              to="/create" 
              className="btn btn-primary px-8 py-3 text-lg font-medium"
            >
              Forge Your Deck <Hammer className="ml-1 h-4 w-4" />
            </Link>
            <Link 
              to="/marketplace" 
              className="btn btn-outline border-primary text-primary hover:bg-primary/10 px-8 py-3 text-lg font-medium"
            >
              Explore Marketplace <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </div>
          
          {/* Sample tarot cards with animation */}
          <div className="relative h-64 sm:h-80 md:h-96 max-w-6xl mx-auto">
            {/* Cards in a fan arrangement */}
            <motion.div 
              className="absolute left-1/2 top-0 w-32 md:w-40 lg:w-48 -translate-x-1/2"
              animate={{ 
                rotate: [-5, 5, -5],
                y: [0, -10, 0],
              }}
              transition={{ 
                repeat: Infinity, 
                duration: 8,
                ease: "easeInOut" 
              }}
            >
              <img 
                src="https://images.pexels.com/photos/1619317/pexels-photo-1619317.jpeg?auto=compress&cs=tinysrgb&w=1600" 
                alt="The Fool" 
                className="w-full rounded-lg shadow-xl"
              />
            </motion.div>
            <motion.div 
              className="absolute left-[calc(50%-80px)] sm:left-[calc(50%-120px)] md:left-[calc(50%-140px)] top-0 w-32 md:w-40 lg:w-48 -translate-x-1/2"
              animate={{ 
                rotate: [-15, -5, -15],
                y: [0, -5, 0],
              }}
              transition={{ 
                repeat: Infinity, 
                duration: 7,
                ease: "easeInOut",
                delay: 0.5
              }}
            >
              <img 
                src="https://images.pexels.com/photos/2693529/pexels-photo-2693529.jpeg?auto=compress&cs=tinysrgb&w=1600" 
                alt="The Magician" 
                className="w-full rounded-lg shadow-xl"
              />
            </motion.div>
            <motion.div 
              className="absolute left-[calc(50%+80px)] sm:left-[calc(50%+120px)] md:left-[calc(50%+140px)] top-0 w-32 md:w-40 lg:w-48 -translate-x-1/2"
              animate={{ 
                rotate: [15, 5, 15],
                y: [0, -5, 0],
              }}
              transition={{ 
                repeat: Infinity, 
                duration: 9,
                ease: "easeInOut",
                delay: 1
              }}
            >
              <img 
                src="https://images.pexels.com/photos/1097456/pexels-photo-1097456.jpeg?auto=compress&cs=tinysrgb&w=1600" 
                alt="The High Priestess" 
                className="w-full rounded-lg shadow-xl"
              />
            </motion.div>
          </div>
          
          {/* Scroll indicator */}
          {showScrollIndicator && (
            <motion.div 
              className="absolute bottom-8 left-1/2 transform -translate-x-1/2"
              animate={{ 
                y: [0, 10, 0],
                opacity: [1, 0.6, 1],
              }}
              transition={{ repeat: Infinity, duration: 2 }}
            >
              <ArrowDown className="h-6 w-6 text-muted-foreground" />
            </motion.div>
          )}
        </motion.div>
      </section>
      
      {/* Features Section */}
      <section className="py-20 bg-card">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-serif font-bold mb-6">
              Your Spiritual Vision, <span className="text-accent">Realized</span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Our AI-powered platform makes it easy to create stunning tarot decks, explore the marketplace, and experience powerful readings.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Create Feature */}
            <div className="bg-background rounded-lg p-6 shadow-lg transform transition-transform hover:scale-105">
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center mb-4">
                <TarotLogo className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-serif font-bold mb-2">Create Your Deck</h3>
              <p className="text-muted-foreground">
                Design a custom tarot deck with our AI tools. Choose themes, styles, and prompts to generate unique cards.
              </p>
            </div>
            
            {/* Collect Feature */}
            <div className="bg-background rounded-lg p-6 shadow-lg transform transition-transform hover:scale-105">
              <div className="w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center mb-4">
                <BookOpen className="h-6 w-6 text-accent" />
              </div>
              <h3 className="text-xl font-serif font-bold mb-2">Collect & Trade</h3>
              <p className="text-muted-foreground">
                Build your collection of unique decks. Discover new creators, buy, sell, and even mint decks as NFTs.
              </p>
            </div>
            
            {/* Read Feature */}
            <div className="bg-background rounded-lg p-6 shadow-lg transform transition-transform hover:scale-105">
              <div className="w-12 h-12 rounded-full bg-success/20 flex items-center justify-center mb-4">
                <svg className="h-6 w-6 text-success" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <circle cx="12" cy="12" r="10" strokeWidth="2" />
                  <path d="M12 6v6l4 2" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </div>
              <h3 className="text-xl font-serif font-bold mb-2">Experience Readings</h3>
              <p className="text-muted-foreground">
                Get AI interpretations or connect with professional readers for live video tarot sessions.
              </p>
            </div>
          </div>
          
          <div className="mt-16 text-center">
            <Link 
              to={user ? "/create" : "/signup"} 
              className="btn btn-primary px-8 py-3 text-lg font-medium inline-flex items-center"
            >
              Start Your Journey <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </div>
        </div>
      </section>
      
      {/* Testimonials */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-serif font-bold mb-16 text-center">
            From Our <span className="text-accent">Community</span>
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={index}
                className="bg-card rounded-lg p-6 border border-border"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true, margin: "-100px" }}
              >
                <div className="flex items-center mb-4">
                  <div className="w-10 h-10 rounded-full overflow-hidden mr-3">
                    <img src={testimonial.avatar} alt={testimonial.name} className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <p className="font-medium">{testimonial.name}</p>
                    <p className="text-xs text-muted-foreground">{testimonial.type}</p>
                  </div>
                </div>
                <p className="italic text-muted-foreground">{testimonial.text}</p>
                <div className="flex mt-4">
                  {[...Array(5)].map((_, i) => (
                    <svg key={i} className={`h-4 w-4 ${i < testimonial.stars ? 'text-accent fill-current' : 'text-muted stroke-current'}`} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                    </svg>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
      
      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-br from-primary/30 via-primary/10 to-background">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-serif font-bold mb-6">
            Ready to Create Your <span className="text-accent">Mystical Masterpiece</span>?
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
            Join thousands of creators and collectors in our spiritual marketplace. Start your journey today.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link 
              to={user ? "/create" : "/signup"} 
              className="btn btn-primary px-8 py-3 text-lg font-medium"
            >
              Forge Your Deck <Hammer className="ml-1 h-4 w-4" />
            </Link>
            <Link 
              to="/reading-room" 
              className="btn btn-secondary px-8 py-3 text-lg font-medium"
            >
              Try a Free Reading <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

// Testimonial data
const testimonials = [
  {
    name: "Astrid Luna",
    avatar: "https://images.pexels.com/photos/1036623/pexels-photo-1036623.jpeg?auto=compress&cs=tinysrgb&w=1600",
    type: "Deck Creator",
    text: "Tarot Forge has transformed my artistic practice. I've created three decks so far, each connecting deeply with my audience.",
    stars: 5
  },
  {
    name: "Elijah Meridian",
    avatar: "https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=1600",
    type: "Collector & Reader",
    text: "The quality of decks on this platform is unmatched. I've found tarot art that speaks to my soul like never before.",
    stars: 5
  },
  {
    name: "Serena Visions",
    avatar: "https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=1600",
    type: "Professional Reader",
    text: "I offer readings with decks I've collected here. My clients love the unique imagery and the video call feature is seamless.",
    stars: 4
  }
];

export default Home;