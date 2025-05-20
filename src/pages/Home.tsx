import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import TarotLogo from '../components/ui/TarotLogo';
import { StarIcon, Shuffle, Sparkles, BookOpen, Zap, UserCheck, EyeIcon, HeartIcon, PenIcon, MessageSquare } from 'lucide-react';

// Sample tarot deck covers for carousel
const tarotDeckCovers = [
  'https://images.pexels.com/photos/1252890/pexels-photo-1252890.jpeg?auto=compress&cs=tinysrgb&w=1600',
  'https://images.pexels.com/photos/1169754/pexels-photo-1169754.jpeg?auto=compress&cs=tinysrgb&w=1600',
  'https://images.pexels.com/photos/1906658/pexels-photo-1906658.jpeg?auto=compress&cs=tinysrgb&w=1600',
  'https://images.pexels.com/photos/956981/milky-way-starry-sky-night-sky-star-956981.jpeg?auto=compress&cs=tinysrgb&w=1600',
  'https://images.pexels.com/photos/816608/pexels-photo-816608.jpeg?auto=compress&cs=tinysrgb&w=1600'
];

const features = [
  {
    title: 'Create AI Tarot Decks',
    description: 'Design custom decks with our AI generator using your own themes and prompts.',
    icon: <Sparkles className="h-6 w-6" />,
    color: 'from-primary/20 to-primary/10'
  },
  {
    title: 'Explore Marketplace',
    description: 'Discover unique decks created by artists from around the world.',
    icon: <EyeIcon className="h-6 w-6" />,
    color: 'from-accent/20 to-accent/10'
  },
  {
    title: 'Virtual Readings',
    description: 'Get personalized readings from certified tarot professionals.',
    icon: <MessageSquare className="h-6 w-6" />,
    color: 'from-purple-500/20 to-purple-500/10'
  },
  {
    title: 'Become a Reader',
    description: 'Share your expertise and offer readings to the community.',
    icon: <UserCheck className="h-6 w-6" />,
    color: 'from-blue-500/20 to-blue-500/10'
  },
  {
    title: 'Daily Cards',
    description: 'Receive daily tarot guidance to inspire your journey.',
    icon: <Zap className="h-6 w-6" />,
    color: 'from-green-500/20 to-green-500/10'
  },
  {
    title: 'Interactive Spreads',
    description: 'Choose from various layouts for different types of readings.',
    icon: <Shuffle className="h-6 w-6" />,
    color: 'from-red-500/20 to-red-500/10'
  }
];

const testimonials = [
  {
    text: "This platform transformed my tarot practice. Creating my own deck was magical!",
    author: "Astral Seeker",
    rating: 5
  },
  {
    text: "The AI-generated cards capture exactly what I envisioned. Simply amazing.",
    author: "Cosmic Dreamer",
    rating: 5
  },
  {
    text: "I've been doing readings for 20 years, and this tool has renewed my passion.",
    author: "Mystic Oracle",
    rating: 4
  }
];

const Home: React.FC = () => {
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  
  // Auto-rotate images
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveImageIndex((prev) => (prev + 1) % tarotDeckCovers.length);
    }, 5000);
    
    return () => clearInterval(interval);
  }, []);
  
  return (
    <div>
      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 md:py-32">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-black via-background to-background"></div>
        
        {/* Sparkle animation */}
        <div className="absolute inset-0 sparkles opacity-30"></div>
        
        <div className="container mx-auto px-4 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7 }}
              className="text-center lg:text-left"
            >
              <div className="flex items-center justify-center lg:justify-start mb-4">
                <TarotLogo className="h-10 w-10 text-accent mr-3" />
                <h3 className="text-xl font-serif">Tarot Forge</h3>
              </div>
              <h1 className="text-4xl md:text-6xl font-serif font-bold mb-6">
                Create <span className="text-accent">Mystical</span> Tarot Decks with AI
              </h1>
              <p className="text-xl text-muted-foreground mb-8 max-w-lg mx-auto lg:mx-0">
                Design, collect, and experience personalized tarot readings with unique AI-generated decks.
              </p>
              <div className="flex flex-col sm:flex-row items-center gap-4 justify-center lg:justify-start">
                <Link to="/create-deck" className="btn btn-primary py-3 px-8 text-lg">
                  <PenIcon className="mr-2 h-5 w-5" />
                  Create Your Deck
                </Link>
                <Link to="/marketplace" className="btn btn-secondary py-3 px-8 text-lg">
                  Explore Marketplace
                </Link>
              </div>
              <div className="mt-6 text-muted-foreground flex items-center justify-center lg:justify-start">
                <Zap className="h-5 w-5 text-accent mr-2" />
                <span>Over 10,000 decks created by our community</span>
              </div>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.7, delay: 0.2 }}
              className="relative"
            >
              <div className="relative h-96 overflow-hidden rounded-lg">
                <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent z-10"></div>
                {tarotDeckCovers.map((cover, index) => (
                  <motion.div
                    key={index}
                    className="absolute inset-0"
                    initial={{ opacity: 0 }}
                    animate={{ 
                      opacity: activeImageIndex === index ? 1 : 0,
                      scale: activeImageIndex === index ? 1 : 1.05
                    }}
                    transition={{ duration: 1.5 }}
                  >
                    <img 
                      src={cover} 
                      alt={`Tarot deck ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </motion.div>
                ))}
              </div>
              
              <div className="absolute -bottom-10 -right-10 w-40 h-40 rounded-full bg-accent/20 blur-3xl"></div>
              <div className="absolute -top-10 -left-10 w-40 h-40 rounded-full bg-primary/20 blur-3xl"></div>
            </motion.div>
          </div>
        </div>
      </section>
      
      {/* Features Section */}
      <section className="py-16 md:py-24 bg-card/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-serif font-bold mb-4">Discover the Magic</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Explore the features that make Tarot Forge the perfect platform for creators and seekers.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="bg-card border border-border rounded-xl overflow-hidden"
              >
                <div className={`p-6 bg-gradient-to-br ${feature.color}`}>
                  <div className="w-12 h-12 bg-card/80 backdrop-blur-sm rounded-full flex items-center justify-center mb-4">
                    {feature.icon}
                  </div>
                  <h3 className="text-xl font-serif font-bold mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
      
      {/* How It Works Section */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-serif font-bold mb-4">How It Works</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Create your own unique deck in just a few simple steps
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="text-center"
            >
              <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-2xl font-serif font-bold">1</span>
              </div>
              <h3 className="text-xl font-serif font-bold mb-3">Describe Your Vision</h3>
              <p className="text-muted-foreground">
                Share your theme, style, and preferences for your custom tarot deck
              </p>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-center"
            >
              <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-2xl font-serif font-bold">2</span>
              </div>
              <h3 className="text-xl font-serif font-bold mb-3">AI Generates Cards</h3>
              <p className="text-muted-foreground">
                Our AI creates stunning, unique card imagery based on your specifications
              </p>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="text-center"
            >
              <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-2xl font-serif font-bold">3</span>
              </div>
              <h3 className="text-xl font-serif font-bold mb-3">Use or Share</h3>
              <p className="text-muted-foreground">
                Perform readings with your deck, list it in our marketplace, or keep it private
              </p>
            </motion.div>
          </div>
          
          <div className="mt-16 text-center">
            <Link to="/create-deck" className="btn btn-primary py-3 px-8 text-lg">
              Start Creating Now
            </Link>
          </div>
        </div>
      </section>
      
      {/* Testimonials */}
      <section className="py-16 md:py-24 bg-card/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-serif font-bold mb-4">What Our Users Say</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Discover how Tarot Forge is transforming spiritual practices around the world
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="bg-card border border-border rounded-xl p-6"
              >
                <div className="flex mb-4">
                  {[...Array(5)].map((_, i) => (
                    <StarIcon 
                      key={i} 
                      className={`h-5 w-5 ${i < testimonial.rating ? 'text-accent fill-accent' : 'text-muted-foreground'}`} 
                    />
                  ))}
                </div>
                <p className="italic mb-6">"{testimonial.text}"</p>
                <p className="font-medium">- {testimonial.author}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
      
      {/* CTA Section */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="bg-gradient-to-br from-primary/20 via-accent/10 to-primary/20 rounded-xl p-8 md:p-12 text-center max-w-4xl mx-auto"
          >
            <TarotLogo className="h-16 w-16 text-accent mx-auto mb-6" />
            <h2 className="text-3xl md:text-4xl font-serif font-bold mb-4">Begin Your Mystical Journey</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
              Join our community of tarot enthusiasts, creators, and professionals
            </p>
            <div className="flex flex-col sm:flex-row items-center gap-4 justify-center">
              <Link to="/create-deck" className="btn btn-primary py-3 px-8 text-lg">
                <PenIcon className="mr-2 h-5 w-5" />
                Create Your Deck
              </Link>
              <Link to="/reading-room" className="btn btn-secondary py-3 px-8 text-lg">
                <BookOpen className="mr-2 h-5 w-5" />
                Get a Reading
              </Link>
            </div>
            <p className="mt-6 text-muted-foreground">
              No account needed to start creating - sign up to save your work
            </p>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default Home;