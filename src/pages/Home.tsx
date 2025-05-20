import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Sparkles, Wand2, ShoppingBag, BookOpen, Hammer, ArrowRight, Zap, Video, Star, Camera, Users, Download, Shield, ChevronLeft, ChevronRight, RefreshCw, Crown, Check } from 'lucide-react';
import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import TarotLogo from '../components/ui/TarotLogo';
import { useAuth } from '../context/AuthContext';
import { useSubscription } from '../context/SubscriptionContext';
import { useCredits } from '../context/CreditContext';
import { generateThemeSuggestions, generateElaborateTheme } from '../lib/gemini-ai';
import SubscriptionBadge from '../components/subscription/SubscriptionBadge';
import CreditBadge from '../components/ui/CreditBadge';

// Featured decks data
const featuredDecks = [
  {
    id: '1',
    creator_id: 'user1',
    creator_name: 'MysticArtist',
    title: 'Celestial Journey',
    description: 'A cosmic-themed deck exploring the journey through celestial bodies and astral planes.',
    theme: 'cosmic',
    style: 'ethereal',
    card_count: 78,
    price: 12.99,
    cover_image: 'https://images.pexels.com/photos/1274260/pexels-photo-1274260.jpeg?auto=compress&cs=tinysrgb&w=1600',
    sample_images: [],
    created_at: '2023-10-15T14:30:00Z',
    updated_at: '2023-10-15T14:30:00Z',
    purchase_count: 124,
    rating: 4.7,
    is_nft: true,
  },
  {
    id: '8',
    creator_id: 'mysticforge',
    creator_name: 'Mystic Forge',
    title: 'Mystical Archetypes',
    description: 'Explore the universal archetypes of the major arcana with this free deck. Great for all experience levels.',
    theme: 'archetypes',
    style: 'watercolor',
    card_count: 22,
    price: 0,
    is_free: true,
    cover_image: 'https://images.pexels.com/photos/1097456/pexels-photo-1097456.jpeg?auto=compress&cs=tinysrgb&w=1600',
    sample_images: [],
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    purchase_count: 987,
    rating: 4.4
  },
  {
    id: '3',
    creator_id: 'user3',
    creator_name: 'DigitalSeer',
    title: 'Cybernetic Oracle',
    description: 'A futuristic deck blending technology and spirituality for the digital age seeker.',
    theme: 'cyberpunk',
    style: 'digital',
    card_count: 78,
    price: 14.99,
    cover_image: 'https://images.pexels.com/photos/2150/sky-space-dark-galaxy.jpg?auto=compress&cs=tinysrgb&w=1600',
    sample_images: [],
    created_at: '2023-09-22T16:45:00Z',
    updated_at: '2023-09-22T16:45:00Z',
    purchase_count: 203,
    rating: 4.9,
    is_nft: true
  }
];

// Tarot card images for background
const tarotCardImages = [
  'https://images.pexels.com/photos/1619317/pexels-photo-1619317.jpeg?auto=compress&cs=tinysrgb&w=1600', // The Fool
  'https://images.pexels.com/photos/2693529/pexels-photo-2693529.jpeg?auto=compress&cs=tinysrgb&w=1600', // The Magician
  'https://images.pexels.com/photos/3617457/pexels-photo-3617457.jpeg?auto=compress&cs=tinysrgb&w=1600', // The High Priestess
  'https://images.pexels.com/photos/1252890/pexels-photo-1252890.jpeg?auto=compress&cs=tinysrgb&w=1600', // The Star
  'https://images.pexels.com/photos/2670898/pexels-photo-2670898.jpeg?auto=compress&cs=tinysrgb&w=1600', // The Moon
  'https://images.pexels.com/photos/1727684/pexels-photo-1727684.jpeg?auto=compress&cs=tinysrgb&w=1600', // Wheel of Fortune
];

// Generate theme suggestions using Gemini AI
const generateAIThemeSuggestions = async (input: string): Promise<string[]> => {
  try {
    // Generate a larger number of suggestions to ensure variety
    const allSuggestions = await generateThemeSuggestions(15);
    
    // If there's input, try to find relevant suggestions
    if (input.trim()) {
      // Convert input to lowercase for case-insensitive matching
      const inputLower = input.toLowerCase();
      
      // Filter suggestions that contain any word from the input
      const relevantSuggestions = allSuggestions.filter(suggestion => 
        inputLower.split(' ').some(word => 
          word.length > 3 && // Only consider words longer than 3 characters
          suggestion.toLowerCase().includes(word)
        )
      );
      
      // If we found relevant suggestions, return them (up to 10)
      if (relevantSuggestions.length > 0) {
        return relevantSuggestions.slice(0, 10);
      }
    }
    
    // If no input or no relevant suggestions found, return the first 10 suggestions
    return allSuggestions.slice(0, 10);
    
  } catch (error) {
    console.warn('Error generating theme suggestions:', error);
    // Fallback to default suggestions if there's an error
    return [
      "Celestial Voyage", "Ancient Mythology", "Enchanted Forest", 
      "Cybernetic Dreams", "Elemental Forces", "Oceanic Mysteries",
      "Astral Projections", "Crystal Energies", "Gothic Shadows", 
      "Shamanic Vision"
    ];
  }
};

const Home = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, setShowSignInModal } = useAuth();
  const { isSubscribed } = useSubscription();
  const { credits } = useCredits();
  const [themePrompt, setThemePrompt] = useState("");
  const [themeSuggestions, setThemeSuggestions] = useState<string[]>([]);
  const [isGeneratingThemes, setIsGeneratingThemes] = useState(false);
  const [isGeneratingElaboration, setIsGeneratingElaboration] = useState(false);
  const [autoScrollPaused, setAutoScrollPaused] = useState(false);
  const [lastLoadedIndex, setLastLoadedIndex] = useState(0);
  
  // Load initial theme suggestions on component mount
  useEffect(() => {
    const loadInitialThemes = async () => {
      try {
        const initialThemes = await generateThemeSuggestions(12);
        setThemeSuggestions(initialThemes);
        setLastLoadedIndex(12);
      } catch (error) {
        console.error('Error loading initial theme suggestions:', error);
      }
    };
    
    loadInitialThemes();
  }, []);
  
  // Check for createDeck query parameter on load
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const shouldCreateDeck = params.get('createDeck') === 'true';
    
    if (shouldCreateDeck) {
      // Focus the input and scroll to it
      const inputElement = document.getElementById('deck-theme-input');
      if (inputElement) {
        inputElement.focus();
        inputElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      
      // Remove the query parameter without triggering a navigation
      window.history.replaceState(null, '', window.location.pathname);
    }
  }, [location]);
  
  // Reference for the scroll container
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  // Auto-scroll functionality
  useEffect(() => {
    let scrollInterval: number | null = null;
    
    // Only auto-scroll if not paused
    if (!autoScrollPaused && scrollContainerRef.current) {
      scrollInterval = window.setInterval(() => {
        if (scrollContainerRef.current) {
          scrollContainerRef.current.scrollBy({ left: 1, behavior: 'auto' });
          
          // Check if we've reached near the end for lazy loading
          const container = scrollContainerRef.current;
          if (container.scrollLeft + container.clientWidth >= container.scrollWidth - 100) {
            lazyLoadMoreThemes();
          }
        }
      }, 30);
    }
    
    return () => {
      if (scrollInterval !== null) {
        clearInterval(scrollInterval);
      }
    };
  }, [autoScrollPaused, themeSuggestions]);
  
  // Monitor scroll position for lazy loading
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    
    const handleScroll = () => {
      // If we're near the end and have more themes to load
      if (container.scrollLeft + container.clientWidth >= container.scrollWidth - 100) {
        lazyLoadMoreThemes();
      }
    };
    
    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [themeSuggestions, lastLoadedIndex]);
  
  // Update lazyLoadMoreThemes to use AI generation
  const lazyLoadMoreThemes = async () => {
    if (themeSuggestions.length < 50) {
      try {
        const newThemes = await generateThemeSuggestions(5);
        if (newThemes.length > 0) {
          setThemeSuggestions(prev => {
            const updated = [...prev, ...newThemes];
            return updated.slice(0, 50);
          });
          setLastLoadedIndex(prev => prev + newThemes.length);
        }
      } catch (error) {
        console.error('Error loading more theme suggestions:', error);
      }
    }
  };
  
  const handleThemeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (themePrompt.trim()) {
      // Check if user is authenticated
      if (!user) {
        // Store deck creation intent in localStorage
        localStorage.setItem('pending_deck_theme', themePrompt);
        // Show the sign-in modal instead of redirecting
        setShowSignInModal(true);
        return;
      }
      
      // Navigate to deck creation with theme
      navigate('/create-deck', { 
        state: { 
          initialTheme: themePrompt, 
          autoGenerate: true,
          skipFormStep: true,
          startGenerating: true 
        } 
      });
    }
  };

  const selectSuggestion = async (suggestion: string) => {
    // First set the basic suggestion
    setThemePrompt(suggestion);
    
    // Generate elaboration
    try {
      setIsGeneratingElaboration(true);
      const elaboration = await generateElaborateTheme(suggestion);
      setThemePrompt(`${suggestion}: ${elaboration}`);
    } catch (error) {
      console.error('Error generating theme elaboration:', error);
      // If there's an error, just keep the basic suggestion
      setThemePrompt(suggestion);
    } finally {
      setIsGeneratingElaboration(false);
    }
  };
  
  const handleGenerateThemes = async () => {
    setIsGeneratingThemes(true);
    try {
      const newThemes = await generateAIThemeSuggestions(themePrompt);
      setThemeSuggestions(prevThemes => {
        const remainingThemes = prevThemes.length > 10 ? prevThemes.slice(10) : [];
        return [...newThemes, ...remainingThemes].slice(0, 50);
      });
    } catch (error) {
      console.error('Error generating themes:', error);
    } finally {
      setIsGeneratingThemes(false);
    }
  };
  
  const scrollLeft = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: -200, behavior: 'smooth' });
    }
  };
  
  const scrollRight = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: 200, behavior: 'smooth' });
    }
  };
  
  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <motion.section 
        className="relative min-h-screen flex flex-col items-center justify-center px-4 pt-0 pb-12 md:py-6 overflow-hidden"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
      >
        {/* Animated Background */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/30 via-background to-teal/30 animated-gradient" />
          <div className="absolute inset-0 sparkles"></div>
        </div>
        
        {/* Floating Tarot Cards in Background */}
        {useMemo(() => tarotCardImages.map((imageUrl, index) => (
          <motion.div
            key={`tarot-card-${index}`}
            className="absolute hidden sm:block"
            initial={{ 
              x: -100 + Math.random() * 200, 
              y: -100 + Math.random() * 200,
              opacity: 0.1 + Math.random() * 0.3,
              rotate: -20 + Math.random() * 40,
              scale: 0.4 + Math.random() * 0.3
            }}
            animate={{ 
              y: [0, 10, -10, 0], 
              rotate: [-5 + Math.random() * 10, 5 + Math.random() * 10],
              transition: { 
                y: { 
                  repeat: Infinity, 
                  duration: 5 + Math.random() * 5, 
                  ease: "easeInOut" 
                },
                rotate: { 
                  repeat: Infinity, 
                  duration: 10 + Math.random() * 5, 
                  ease: "easeInOut",
                  repeatType: "reverse"
                }
              }
            }}
            style={{ 
              left: `${10 + Math.random() * 80}%`, 
              top: `${10 + Math.random() * 80}%`,
              zIndex: -1
            }}
          >
            <div className="relative aspect-[2/3] w-32 md:w-48 rounded-lg shadow-lg overflow-hidden transform">
              <img 
                src={imageUrl} 
                alt="Tarot card" 
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-background/30 backdrop-blur-sm"></div>
            </div>
          </motion.div>
        )), [tarotCardImages])}
        
        {/* Main Heading */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-2 md:mb-4 z-10"
        >
          <div className="flex justify-center mb-2">
            <TarotLogo className="h-12 w-12 md:h-16 md:w-16" />
          </div>
        </motion.div>
        
        {/* Bento-style Deck Creation Prompt Box */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.5 }}
          className="w-full max-w-xl mx-auto z-10 mt-1"
        >
          <div className="bg-background/95 backdrop-blur-sm border border-border rounded-xl shadow-xl overflow-hidden">
            <div className="p-4 pb-3">
              <h4 className="text-xl md:text-2xl font-serif font-bold mb-2 text-center flex items-center justify-center">
                Create Your Tarot Deck Now
                <div className="ml-2 flex gap-1">
                  <SubscriptionBadge />
                  {user && credits && <CreditBadge />}
                </div>
              </h4>
              
              <form onSubmit={handleThemeSubmit}>
                <div className="mb-5">
                  <textarea
                    id="deck-theme-input"
                    value={themePrompt}
                    onChange={(e) => setThemePrompt(e.target.value)}
                    placeholder="Describe your deck's theme or concept (e.g., Cosmic journey through ancient mythology...)"
                    className="w-full p-3 rounded-lg bg-card border border-input focus:outline-none focus:ring-2 focus:ring-primary min-h-[80px] resize-none"
                  />
                </div>
                
                <div className="relative mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs text-muted-foreground">Theme inspiration:</p>
                    <button
                      type="button"
                      onClick={handleGenerateThemes}
                      disabled={isGeneratingThemes}
                      className="text-xs flex items-center text-primary hover:text-primary/80 transition-colors disabled:opacity-50"
                    >
                      {isGeneratingThemes ? (
                        <>
                          <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-3 w-3 mr-1" />
                          Generate Ideas
                        </>
                      )}
                    </button>
                  </div>
                  
                  <div 
                    className="relative group"
                    onMouseEnter={() => setAutoScrollPaused(true)}
                    onMouseLeave={() => setAutoScrollPaused(false)}
                  >
                    {/* Left scroll button */}
                    <button 
                      type="button"
                      onClick={scrollLeft}
                      className="absolute left-0 top-1/2 transform -translate-y-1/2 z-10 h-full px-1 
                                flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity
                                bg-gradient-to-r from-background/90 to-transparent"
                      aria-label="Scroll left"
                    >
                      <ChevronLeft className="h-4 w-4 text-foreground" />
                    </button>
                    
                    {/* Scrollable theme suggestions */}
                    <div 
                      ref={scrollContainerRef}
                      className="flex gap-2 overflow-x-auto scrollbar-hide py-2 px-1"
                      style={{
                        scrollbarWidth: 'none', /* Firefox */
                        msOverflowStyle: 'none', /* IE and Edge */
                      }}
                    >
                      {themeSuggestions.map((suggestion, index) => (
                        <button
                          key={`${suggestion}-${index}`}
                          type="button"
                          onClick={() => selectSuggestion(suggestion)}
                          disabled={isGeneratingElaboration}
                          className={`whitespace-nowrap text-sm px-3 py-1.5 rounded-full 
                                    bg-primary/10 hover:bg-primary/20 text-primary transition-colors
                                    border border-primary/20 focus:outline-none focus:ring-2 focus:ring-primary/40
                                    ${isGeneratingElaboration ? 'opacity-70 cursor-not-allowed' : ''}`}
                        >
                          {isGeneratingElaboration ? '...' : suggestion}
                        </button>
                      ))}
                    </div>
                    
                    {/* Right scroll button */}
                    <button 
                      type="button"
                      onClick={scrollRight}
                      className="absolute right-0 top-1/2 transform -translate-y-1/2 z-10 h-full px-1 
                              flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity
                              bg-gradient-to-l from-background/90 to-transparent"
                      aria-label="Scroll right"
                    >
                      <ChevronRight className="h-4 w-4 text-foreground" />
                    </button>
                  </div>
                </div>
                
                <button
                  type="submit"
                  disabled={!themePrompt.trim()}
                  className="w-full btn btn-primary py-3 disabled:opacity-70 flex items-center justify-center"
                >
                  {isSubscribed ? (
                    <>
                      Forge a Deck
                      <Hammer className="ml-2 h-4 w-4" />
                    </>
                  ) : (
                    <>
                      <Crown className="mr-2 h-4 w-4" />
                      Upgrade to Create Decks
                    </>
                  )}
                </button>
              </form>
            </div>
            
            {/* Action Links */}
            <div className="grid grid-cols-2 divide-x divide-border border-t border-border">
              <Link 
                to="/marketplace" 
                className="py-4 flex items-center justify-center text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/20 transition-colors"
              >
                <ShoppingBag className="h-4 w-4 mr-2" />
                Browse Marketplace
              </Link>
              {user ? (
                <Link 
                  to="/reading-room" 
                  className="py-4 flex items-center justify-center text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/20 transition-colors"
                >
                  <BookOpen className="h-4 w-4 mr-2" />
                  Try Free Reading
                </Link>
              ) : (
                <button 
                  onClick={() => setShowSignInModal(true)}
                  className="py-4 flex items-center justify-center text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/20 transition-colors"
                >
                  <BookOpen className="h-4 w-4 mr-2" />
                  Try Free Reading
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </motion.section>
      
      {/* Credit Pricing Section */}
      <section className="py-16 px-4 bg-card/30">
        <div className="container mx-auto max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-10"
          >
            <h2 className="text-3xl md:text-4xl font-serif font-bold mb-4">Choose Your Creative Journey</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Our credit-based plans are designed to fit your creative needs and budget
            </p>
          </motion.div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
            {/* Free Plan */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0 }}
              className="bg-card border border-border rounded-xl overflow-hidden hover:shadow-lg transition-all"
            >
              <div className="p-6">
                <h3 className="text-xl font-serif font-bold mb-2">Free</h3>
                <div className="mb-4">
                  <span className="text-3xl font-bold">$0</span>
                  <span className="text-muted-foreground">/month</span>
                </div>
                
                <div className="border-t border-border pt-4 mb-4">
                  <ul className="space-y-3 mb-6">
                    <li className="flex items-start">
                      <Check className="h-4 w-4 text-success mt-1 mr-2" />
                      <span className="text-sm">5 basic credits monthly</span>
                    </li>
                    <li className="flex items-start">
                      <Check className="h-4 w-4 text-success mt-1 mr-2" />
                      <span className="text-sm">Medium quality cards only</span>
                    </li>
                    <li className="flex items-start">
                      <Check className="h-4 w-4 text-success mt-1 mr-2" />
                      <span className="text-sm">No credit rollover</span>
                    </li>
                    <li className="flex items-start">
                      <Check className="h-4 w-4 text-success mt-1 mr-2" />
                      <span className="text-sm">Free deck access</span>
                    </li>
                  </ul>
                </div>
                
                <Link to="/subscription" className="btn btn-outline border-primary text-primary hover:bg-primary hover:text-primary-foreground w-full py-2">
                  Current Tier
                </Link>
              </div>
            </motion.div>
            
            {/* Mystic Plan */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="bg-card border border-primary/20 rounded-xl overflow-hidden hover:shadow-lg transition-all"
            >
              <div className="p-6">
                <h3 className="text-xl font-serif font-bold mb-2">Mystic</h3>
                <div className="mb-4">
                  <span className="text-3xl font-bold">$12.99</span>
                  <span className="text-muted-foreground">/month</span>
                </div>
                
                <div className="border-t border-border pt-4 mb-4">
                  <ul className="space-y-3 mb-6">
                    <li className="flex items-start">
                      <Check className="h-4 w-4 text-success mt-1 mr-2" />
                      <span className="text-sm">22 basic credits monthly</span>
                    </li>
                    <li className="flex items-start">
                      <Check className="h-4 w-4 text-success mt-1 mr-2" />
                      <span className="text-sm">Create Major Arcana deck (22 cards)</span>
                    </li>
                    <li className="flex items-start">
                      <Check className="h-4 w-4 text-success mt-1 mr-2" />
                      <span className="text-sm">Roll over up to 5 credits</span>
                    </li>
                    <li className="flex items-start">
                      <Check className="h-4 w-4 text-success mt-1 mr-2" />
                      <span className="text-sm">Medium quality cards</span>
                    </li>
                  </ul>
                </div>
                
                <Link to="/subscription" className="btn btn-primary w-full py-2">
                  Subscribe
                </Link>
              </div>
            </motion.div>
            
            {/* Creator Plan - Popular */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="bg-card border border-accent rounded-xl overflow-hidden hover:shadow-lg transition-all relative z-10 scale-105 transform shadow-xl"
            >
              <div className="bg-accent text-accent-foreground text-center py-2 text-sm font-medium">
                MOST POPULAR
              </div>
              
              <div className="p-6">
                <h3 className="text-xl font-serif font-bold mb-2">Creator</h3>
                <div className="mb-4">
                  <span className="text-3xl font-bold">$29.99</span>
                  <span className="text-muted-foreground">/month</span>
                </div>
                
                <div className="border-t border-border pt-4 mb-4">
                  <ul className="space-y-3 mb-6">
                    <li className="flex items-start">
                      <Check className="h-4 w-4 text-success mt-1 mr-2" />
                      <span className="text-sm">78 basic credits monthly</span>
                    </li>
                    <li className="flex items-start">
                      <Check className="h-4 w-4 text-success mt-1 mr-2" />
                      <span className="text-sm">Create full tarot deck (78 cards)</span>
                    </li>
                    <li className="flex items-start">
                      <Check className="h-4 w-4 text-success mt-1 mr-2" />
                      <span className="text-sm">Roll over up to 15 credits</span>
                    </li>
                    <li className="flex items-start">
                      <Check className="h-4 w-4 text-success mt-1 mr-2" />
                      <span className="text-sm">Sell decks in marketplace</span>
                    </li>
                  </ul>
                </div>
                
                <Link to="/subscription" className="btn btn-accent w-full py-2">
                  Subscribe
                </Link>
              </div>
            </motion.div>
            
            {/* Visionary Plan */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1,