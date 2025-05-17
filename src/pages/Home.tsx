import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Home = () => {
  const { user, setShowSignInModal } = useAuth();
  const [hoveredFeature, setHoveredFeature] = useState<number | null>(null);

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative py-24 overflow-hidden">
        {/* Background Effect */}
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-background to-background -z-10"></div>
        <div className="absolute top-0 left-0 right-0 h-48 bg-gradient-to-b from-primary/10 to-transparent -z-10"></div>
        
        {/* Animated particles */}
        <div className="absolute inset-0 opacity-30 -z-5">
          <div className="absolute h-4 w-4 rounded-full bg-accent/50 animate-pulse top-1/4 left-1/3" style={{ animationDelay: '0.5s', animationDuration: '3s' }}></div>
          <div className="absolute h-3 w-3 rounded-full bg-accent/50 animate-pulse top-1/3 left-2/3" style={{ animationDelay: '1.2s', animationDuration: '2.5s' }}></div>
          <div className="absolute h-5 w-5 rounded-full bg-accent/50 animate-pulse top-2/3 left-1/4" style={{ animationDelay: '0.8s', animationDuration: '3.5s' }}></div>
          <div className="absolute h-4 w-4 rounded-full bg-accent/50 animate-pulse top-1/2 right-1/4" style={{ animationDelay: '1.5s', animationDuration: '4s' }}></div>
        </div>
        
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <motion.div 
              className="inline-block mb-6"
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.8 }}
            >
              <div className="relative">
                <img src="/tarot-forge-logo.svg" alt="Tarot Forge" className="h-24 w-24 mx-auto" />
                <div className="absolute inset-0 rounded-full bg-accent/10 animate-pulse"></div>
              </div>
            </motion.div>
            
            <motion.h1 
              className="text-4xl md:text-6xl font-serif font-bold mb-6"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.3 }}
            >
              Forge Your Mystical <span className="text-accent">Journey</span>
            </motion.h1>
            
            <motion.p 
              className="text-xl text-muted-foreground mb-8"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.5 }}
            >
              Create, collect, and experience unique AI-generated tarot decks that reflect your personal spiritual journey.
            </motion.p>
            
            <motion.div
              className="flex flex-col sm:flex-row gap-4 justify-center"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.7 }}
            >
              {user ? (
                <>
                  <Link to="/create" className="btn btn-primary py-3 px-8 text-lg">
                    Create Your Deck
                  </Link>
                  <Link to="/marketplace" className="btn btn-outline border-primary text-primary hover:bg-primary/10 py-3 px-8 text-lg">
                    Explore Marketplace
                  </Link>
                </>
              ) : (
                <>
                  <button 
                    onClick={() => setShowSignInModal(true)}
                    className="btn btn-primary py-3 px-8 text-lg"
                  >
                    Get Started
                  </button>
                  <Link to="/marketplace" className="btn btn-outline border-primary text-primary hover:bg-primary/10 py-3 px-8 text-lg">
                    Explore Marketplace
                  </Link>
                </>
              )}
            </motion.div>
          </div>
        </div>
      </section>
      
      {/* Features Section */}
      <section className="py-24 bg-card/30">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center mb-16">
            <h2 className="text-3xl font-serif font-bold mb-4">Unlock the Power of Tarot</h2>
            <p className="text-lg text-muted-foreground">
              Our platform combines ancient wisdom with modern AI to create a unique tarot experience.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                className="bg-card border border-border rounded-xl p-6 h-full"
                initial={{ y: 20, opacity: 0 }}
                whileInView={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                onMouseEnter={() => setHoveredFeature(index)}
                onMouseLeave={() => setHoveredFeature(null)}
              >
                <div className={`w-14 h-14 rounded-lg flex items-center justify-center mb-4 transition-colors duration-300 ${
                  hoveredFeature === index ? 'bg-primary text-primary-foreground' : 'bg-primary/10 text-primary'
                }`}>
                  <feature.icon className="h-7 w-7" />
                </div>
                
                <h3 className="text-xl font-serif font-bold mb-3">{feature.title}</h3>
                <p className="text-muted-foreground mb-4">{feature.description}</p>
                <Link to={feature.link} className="text-primary hover:underline inline-flex items-center">
                  Learn more <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
      
      {/* Call to Action */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-card border border-border rounded-xl p-8 md:p-12">
            <div className="flex flex-col md:flex-row items-center">
              <div className="md:w-2/3 md:pr-12 mb-6 md:mb-0">
                <h2 className="text-3xl font-serif font-bold mb-4">Ready to Begin Your Journey?</h2>
                <p className="text-lg text-muted-foreground">
                  Join our community of creators and collectors to discover the mystical world of AI-generated tarot.
                </p>
              </div>
              
              <div className="md:w-1/3 flex md:justify-end">
                {user ? (
                  <Link 
                    to="/create" 
                    className="btn btn-primary py-3 px-8 text-lg"
                  >
                    Create Your Deck
                  </Link>
                ) : (
                  <button 
                    onClick={() => setShowSignInModal(true)}
                    className="btn btn-primary py-3 px-8 text-lg"
                  >
                    Sign Up Now
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

// Feature data
const features = [
  {
    icon: () => <img src="/tarot-forge-logo.svg" alt="Create" className="h-7 w-7" />,
    title: 'Create Custom Decks',
    description: 'Use our AI-powered platform to create personalized tarot decks that reflect your unique spiritual perspective.',
    link: '/create'
  },
  {
    icon: () => <img src="/tarot-forge-logo.svg" alt="Collect" className="h-7 w-7" />,
    title: 'Collect Unique Decks',
    description: 'Browse and collect one-of-a-kind tarot decks created by artists and spiritualists from around the world.',
    link: '/marketplace'
  },
  {
    icon: () => <img src="/tarot-forge-logo.svg" alt="Read" className="h-7 w-7" />,
    title: 'Virtual Readings',
    description: 'Experience immersive tarot readings with our interactive virtual reading room or connect with professional readers.',
    link: '/reading-room'
  }
];

export default Home;