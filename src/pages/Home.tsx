import { motion, AnimatePresence, useAnimation } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Sparkles, Wand2, ShoppingBag, BookOpen, Hammer, ArrowRight, Zap, Video, Star, Camera, Users, Download, Shield, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import DeckPreview from '../components/ui/DeckPreview';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import TarotLogo from '../components/ui/TarotLogo';
import { useAuth } from '../context/AuthContext';

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

// Large pool of theme suggestions for lazy loading
const allThemeSuggestions = [
  "Cosmic Voyage", 
  "Ancient Mythology", 
  "Cyberpunk Future", 
  "Enchanted Forest", 
  "Ocean Depths",
  "Celestial Dreams",
  "Steampunk Revolution",
  "Haunted Victorian",
  "Desert Mysticism",
  "Crystal Realms",
  "Forgotten Gods",
  "Urban Shamanism",
  "Divine Feminine",
  "Shadow Work",
  "Celtic Folklore",
  "Elemental Spirits",
  "Astral Projection",
  "Sacred Geometry",
  "Fractal Universe",
  "Norse Legends",
  "Egyptian Mysteries",
  "Shamanic Journey",
  "Angelic Realm",
  "Gothic Horror",
  "Mystical Animals",
  "Psychedelic Visions",
  "Fairy Tales",
  "Underworld Myths",
  "Quantum Reality",
  "Parallel Dimensions",
  "Dream Interpretation",
  "Alchemical Transformation",
  "Chakra Energies",
  "Botanical Magic",
  "Cosmic Horror",
  "Spiritual Awakening",
  "Hermetic Wisdom",
  "Akashic Records",
  "Urban Fantasy",
  "Spirit Guides",
  "Ancestral Wisdom",
  "Astrology Signs",
  "Mayan Calendar",
  "Arthurian Legend",
  "Magical Creatures",
  "Divine Masculine",
  "Sacred Landscapes",
  "Atlantean Mysteries",
  "Celestial Beings",
  "Metamorphosis"
];

// Mock function to simulate AI generating theme suggestions
const generateAIThemeSuggestions = async (input: string): Promise<string[]> => {
  // In a real implementation, this would call the Gemini AI API
  // For now, we'll just return theme suggestions based on input
  
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  // Sample themes based loosely on input
  if (input.toLowerCase().includes('cosmic') || input.toLowerCase().includes('space')) {
    return [
      "Galactic Pathways",
      "Celestial Odyssey", 
      "Astral Projection",
      "Quantum Multiverse",
      "Nebula Whispers",
      "Event Horizon",
      "Star Children",
      "Void Explorers",
      "Solar Mythology",
      "Constellation Guides"
    ];
  } else if (input.toLowerCase().includes('nature') || input.toLowerCase().includes('forest')) {
    return [
      "Ancient Groves",
      "Whispers of the Wild",
      "Elemental Forest",
      "Mycological Mysteries",
      "Botanical Wisdom",
      "Fae Wilderness",
      "Sacred Plants",
      "Forest Spirits",
      "Natural Cycles",
      "Earth Magic"
    ];
  } else if (input.toLowerCase().includes('myth') || input.toLowerCase().includes('legend')) {
    return [
      "Forgotten Pantheons",
      "Mythic Heroes Journey",
      "Divine Archetypes",
      "Legendary Realms",
      "Primordial Tales",
      "Ancestral Wisdom",
      "Creation Myths",
      "Cultural Legends",
      "Trickster Gods",
      "Origin Stories"
    ];
  } else {
    // Generic suggestions
    return [
      "Dreamscape Visions",
      "Shadow & Light",
      "Alchemical Transformation",
      "Spirit Guides",
      "Elemental Wisdom",
      "Mystic Geometry",
      "Inner Journey",
      "Symbolic Language",
      "Ethereal Beings",
      "Soul Path"
    ];
  }
};

const Home = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, setShowSignInModal } = useAuth();
  const [themePrompt, setThemePrompt] = useState("");
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [sparkles, setSparkles] = useState<Array<{id: number, x: number, y: number, size: number, delay: number}>>([]);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const controls = useAnimation();

  // Generate random sparkles
  const generateSparkles = useCallback(() => {
    if (!inputRef.current) return [];
    
    const rect = inputRef.current.getBoundingClientRect();
    const newSparkles = [];
    
    for (let i = 0; i < 12; i++) {
      newSparkles.push({
        id: Math.random(),
        x: Math.random() * (rect.width - 30),
        y: Math.random() * (rect.height - 30),
        size: 4 + Math.random() * 6,
        delay: Math.random() * 0.5
      });
    }
    
    return newSparkles;
  }, []);

  // Update sparkles on focus
  useEffect(() => {
    if (isInputFocused) {
      setSparkles(generateSparkles());
      const interval = setInterval(() => {
        setSparkles(generateSparkles());
      }, 1500);
      return () => clearInterval(interval);
    } else {
      setSparkles([]);
    }
  }, [isInputFocused, generateSparkles]);

  // Animate button on hover
  const handleButtonHover = () => {
    controls.start({
      backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
      transition: { duration: 3, repeat: Infinity, ease: 'linear' }
    });
  };

  const [isGenerating, setIsGenerating] = useState(false);
  const [themeSuggestions, setThemeSuggestions] = useState<string[]>(allThemeSuggestions.slice(0, 12));
  const [isGeneratingThemes, setIsGeneratingThemes] = useState(false);
  const [autoScrollPaused, setAutoScrollPaused] = useState(false);
  const [lastLoadedIndex, setLastLoadedIndex] = useState(12);
  
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
  
  // Lazy load more themes when approaching the end
  const lazyLoadMoreThemes = () => {
    // Only load more if we haven't reached the maximum (50)
    if (themeSuggestions.length < 50 && lastLoadedIndex < allThemeSuggestions.length) {
      const nextIndex = Math.min(lastLoadedIndex + 5, allThemeSuggestions.length);
      const newThemes = allThemeSuggestions.slice(lastLoadedIndex, nextIndex);
      
      if (newThemes.length > 0) {
        // Add new themes while maintaining a maximum of 50
        const updatedThemes = [...themeSuggestions, ...newThemes];
        if (updatedThemes.length > 50) {
          setThemeSuggestions(updatedThemes.slice(updatedThemes.length - 50));
        } else {
          setThemeSuggestions(updatedThemes);
        }
        setLastLoadedIndex(nextIndex);
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
      
      // User is already authenticated, proceed immediately to deck creation
      // Skip the manual form input step and auto-generate deck details from the prompt
      navigate('/create-deck', { 
        state: { 
          initialTheme: themePrompt, 
          autoGenerate: true,  // Signal to auto-generate deck details
          skipFormStep: true,   // Skip the manual form step
          startGenerating: true // Start generating images immediately
        } 
      });
    }
  };

  const selectSuggestion = (suggestion: string) => {
    setThemePrompt(suggestion);
  };
  
  const handleGenerateThemes = async () => {
    setIsGeneratingThemes(true);
    try {
      const newThemes = await generateAIThemeSuggestions(themePrompt);
      
      // Replace the first 10 themes with new ones
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
        {tarotCardImages.map((imageUrl, index) => (
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
        ))}
        
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
              <h4 className="text-xl md:text-2xl font-serif font-bold mb-2 text-center">
                Create Your Tarot Deck Now
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
                          className="whitespace-nowrap text-sm px-3 py-1.5 rounded-full 
                                    bg-primary/10 hover:bg-primary/20 text-primary transition-colors
                                    border border-primary/20 focus:outline-none focus:ring-2 focus:ring-primary/40"
                        >
                          {suggestion}
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
                  className="w-full btn btn-primary py-3 disabled:opacity-70"
                >
                  <>
                    Forge a Deck
                    <Hammer className="ml-2 h-4 w-4" />
                  </>
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
      
      {/* Bento Grid Features Section */}
      <section className="py-16 px-4">
        <div className="container mx-auto max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-10"
          >
            <h2 className="text-3xl md:text-4xl font-serif font-bold mb-4">Explore the Possibilities</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Discover what makes Mystic Forge the ultimate platform for tarot enthusiasts and creators
            </p>
          </motion.div>
          
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4 md:gap-6">
            {/* Large Feature: AI Deck Creation */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="col-span-1 md:col-span-3 row-span-2 bg-card/90 border border-border rounded-2xl overflow-hidden shadow-sm group hover:shadow-md hover:border-primary/30 transition-all p-6 md:p-8"
            >
              <div className="flex md:flex-col h-full">
                <div className="mb-6 md:mb-auto">
                  <div className="p-3 bg-primary/10 rounded-xl w-fit mb-5">
                    <Wand2 className="h-8 w-8 text-primary" />
                  </div>
                  
                  <h3 className="text-2xl font-serif font-medium mb-2">AI Deck Creation</h3>
                  <p className="text-muted-foreground mb-4">
                    Generate stunning tarot cards with Gemini AI. Customize themes, styles, and symbolism to match your vision.
                  </p>
                  
                  <ul className="space-y-2 text-sm text-muted-foreground mb-6">
                    <li className="flex items-center">
                      <span className="h-5 w-5 rounded-full bg-primary/20 flex items-center justify-center text-primary mr-2">✓</span>
                      <span>22 or 78-card decks</span>
                    </li>
                    <li className="flex items-center">
                      <span className="h-5 w-5 rounded-full bg-primary/20 flex items-center justify-center text-primary mr-2">✓</span>
                      <span>Custom themes and styles</span>
                    </li>
                    <li className="flex items-center">
                      <span className="h-5 w-5 rounded-full bg-primary/20 flex items-center justify-center text-primary mr-2">✓</span>
                      <span>AI-generated descriptions</span>
                    </li>
                  </ul>
                </div>
                
                <Link 
                  to="/create" 
                  className="mt-auto inline-flex items-center text-primary hover:underline group-hover:translate-x-1 transition-transform"
                >
                  Forge Your Deck <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </div>
            </motion.div>

            {/* Marketplace Feature */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="col-span-1 md:col-span-3 bg-accent/5 border border-accent/20 rounded-2xl overflow-hidden shadow-sm hover:shadow-md hover:border-accent/40 transition-all p-6"
            >
              <div className="p-3 bg-accent/10 rounded-xl w-fit mb-4">
                <ShoppingBag className="h-6 w-6 text-accent" />
              </div>
              
              <h3 className="text-xl font-serif font-medium mb-2">Deck Marketplace</h3>
              <p className="text-muted-foreground mb-3">
                Browse, buy and sell unique decks from creators worldwide. Discover rare digital decks and NFT editions.
              </p>
              
              <Link 
                to="/marketplace" 
                className="inline-flex items-center text-accent hover:underline hover:translate-x-1 transition-transform"
              >
                Browse Marketplace <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </motion.div>
            
            {/* AI Reading Assistant */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="col-span-1 md:col-span-2 bg-card/90 border border-border rounded-2xl overflow-hidden shadow-sm hover:shadow-md hover:border-primary/30 transition-all p-6"
            >
              <div className="p-3 bg-teal/10 rounded-xl w-fit mb-4">
                <BookOpen className="h-6 w-6 text-teal" />
              </div>
              
              <h3 className="text-xl font-serif font-medium mb-2">AI Reading Assistant</h3>
              <p className="text-muted-foreground mb-3">
                Get AI-powered interpretations tailored to your deck's imagery and symbolism.
              </p>
              
              <Link 
                to="/reading-room" 
                className="inline-flex items-center text-teal hover:underline hover:translate-x-1 transition-transform"
              >
                Try a Reading <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </motion.div>
            
            {/* Video Reading Sessions */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="col-span-1 md:col-span-4 bg-primary/5 border border-primary/20 rounded-2xl overflow-hidden shadow-sm hover:shadow-md hover:border-primary/40 transition-all p-6"
            >
              <div className="p-3 bg-primary/10 rounded-xl w-fit mb-4">
                <Video className="h-6 w-6 text-primary" />
              </div>
              
              <h3 className="text-xl font-serif font-medium mb-2">Live Reading Sessions</h3>
              <p className="text-muted-foreground mb-3">
                Connect with professional readers or friends for real-time video tarot reading sessions with secure sharing.
              </p>
              
              <Link 
                to="/reading-room" 
                className="inline-flex items-center text-primary hover:underline hover:translate-x-1 transition-transform"
              >
                Start a Session <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </motion.div>
          </div>
        </div>
      </section>
      
      {/* Bento Grid How It Works */}
      <section className="py-16 px-4">
        <div className="container mx-auto max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-10"
          >
            <h2 className="text-3xl md:text-4xl font-serif font-bold mb-4">How It Works</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Create, collect, and experience tarot in three simple steps
            </p>
          </motion.div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Step 1 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 rounded-2xl p-6 relative group hover:border-primary/40 transition-all"
            >
              <div className="absolute -top-4 -right-4 w-12 h-12 rounded-full bg-background flex items-center justify-center font-serif text-2xl border-2 border-primary/30">
                1
              </div>
              
              <Wand2 className="h-10 w-10 text-primary mb-6" />
              <h3 className="text-xl font-serif font-medium mb-3 group-hover:text-primary transition-colors">Create Your Vision</h3>
              <p className="text-muted-foreground">
                Describe your theme and style, then watch as AI generates custom tarot artwork based on your specifications.
              </p>
              
              <div className="absolute bottom-0 right-0 w-20 h-20 bg-primary/5 rounded-tl-3xl -z-10"></div>
            </motion.div>
            
            {/* Step 2 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="bg-gradient-to-br from-accent/10 to-accent/5 border border-accent/20 rounded-2xl p-6 relative group hover:border-accent/40 transition-all"
            >
              <div className="absolute -top-4 -right-4 w-12 h-12 rounded-full bg-background flex items-center justify-center font-serif text-2xl border-2 border-accent/30">
                2
              </div>
              
              <ShoppingBag className="h-10 w-10 text-accent mb-6" />
              <h3 className="text-xl font-serif font-medium mb-3 group-hover:text-accent transition-colors">Build Collection</h3>
              <p className="text-muted-foreground">
                Grow your personal collection by creating your own decks or purchasing unique designs from other creators.
              </p>
              
              <div className="absolute bottom-0 right-0 w-20 h-20 bg-accent/5 rounded-tl-3xl -z-10"></div>
            </motion.div>
            
            {/* Step 3 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="bg-gradient-to-br from-teal/10 to-teal/5 border border-teal/20 rounded-2xl p-6 relative group hover:border-teal/40 transition-all"
            >
              <div className="absolute -top-4 -right-4 w-12 h-12 rounded-full bg-background flex items-center justify-center font-serif text-2xl border-2 border-teal/30">
                3
              </div>
              
              <BookOpen className="h-10 w-10 text-teal mb-6" />
              <h3 className="text-xl font-serif font-medium mb-3 group-hover:text-teal transition-colors">Experience Readings</h3>
              <p className="text-muted-foreground">
                Use your decks for personal readings with AI interpretation or connect with others for live video readings.
              </p>
              
              <div className="absolute bottom-0 right-0 w-20 h-20 bg-teal/5 rounded-tl-3xl -z-10"></div>
            </motion.div>
          </div>
        </div>
      </section>
      
      {/* Bento Featured Decks Section */}
      <section className="py-16 px-4 bg-card/20">
        <div className="container mx-auto max-w-6xl">
          <div className="flex flex-col md:flex-row justify-between items-center mb-10">
            <motion.h2 
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="text-3xl md:text-4xl font-serif font-bold mb-4 md:mb-0"
            >
              Featured Decks
            </motion.h2>
            
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="flex items-center space-x-2"
            >
              <Link 
                to="/marketplace" 
                className="px-4 py-2 rounded-lg border border-accent text-accent hover:bg-accent/10 transition-colors flex items-center"
              >
                <ShoppingBag className="mr-2 h-4 w-4" />
                Explore All Decks
              </Link>
            </motion.div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
            {/* Featured decks, styled as bento cards */}
            {featuredDecks.map((deck, index) => (
              <motion.div
                key={deck.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="group"
              >
                <Link to={`/marketplace/${deck.id}`} className="block">
                  <div className="rounded-xl overflow-hidden bg-card border border-border hover:border-accent/30 hover:shadow-lg transition-all duration-300 h-full">
                    <div className="relative aspect-[4/3] overflow-hidden">
                      <img 
                        src={deck.cover_image} 
                        alt={deck.title} 
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        loading="lazy"
                      />
                      
                      {/* Overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent opacity-80" />
                      
                      {/* Price Tag */}
                      {deck.is_free ? (
                        <div className="absolute top-3 right-3 bg-success/90 text-success-foreground font-medium px-3 py-1 rounded-full text-sm flex items-center z-10">
                          <Zap className="h-3 w-3 mr-1" />
                          Free
                        </div>
                      ) : (
                        <div className="absolute top-3 right-3 bg-accent/90 text-accent-foreground font-medium px-3 py-1 rounded-full text-sm z-10">
                          ${deck.price.toFixed(2)}
                        </div>
                      )}
                      
                      {/* NFT Badge */}
                      {deck.is_nft && (
                        <div className="absolute top-3 left-3 bg-primary/90 text-primary-foreground font-medium px-3 py-1 rounded-full text-xs z-10">
                          NFT
                        </div>
                      )}
                      
                      {/* Card count */}
                      <div className="absolute bottom-3 left-3 text-sm text-white flex items-center z-10">
                        <div className="flex items-center mr-3">
                          <Star className="h-4 w-4 fill-accent stroke-0 mr-1" />
                          <span>{deck.rating?.toFixed(1)}</span>
                        </div>
                        <span>{deck.card_count} cards</span>
                      </div>
                    </div>
                    
                    {/* Content */}
                    <div className="p-4">
                      <h3 className="font-serif text-lg font-medium mb-2">{deck.title}</h3>
                      <p className="text-muted-foreground text-sm line-clamp-2 mb-3">
                        {deck.description}
                      </p>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center">
                            <Users className="h-3 w-3" />
                          </div>
                          <span className="text-xs ml-2 text-muted-foreground">
                            By {deck.creator_name}
                          </span>
                        </div>
                        
                        <span className="text-xs text-primary">{deck.purchase_count} downloads</span>
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
      
      {/* Bento Grid Testimonials */}
      <section className="py-16 px-4">
        <div className="container mx-auto max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-10"
          >
            <h2 className="text-3xl md:text-4xl font-serif font-bold mb-4">Community Voices</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Hear what our community of creators and readers has to say
            </p>
          </motion.div>
          
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4 md:gap-6">
            {/* Large testimonial */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="col-span-1 md:col-span-3 row-span-2 bg-primary/5 border border-primary/20 rounded-2xl p-6 relative"
            >
              <div className="flex items-center mb-6">
                <div className="w-14 h-14 rounded-full overflow-hidden mr-4 border-2 border-primary/20">
                  <img 
                    src="https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=1600" 
                    alt="Eliza Thornwood" 
                    className="w-full h-full object-cover" 
                  />
                </div>
                <div>
                  <h4 className="font-medium">Eliza Thornwood</h4>
                  <p className="text-sm text-muted-foreground">Deck Creator</p>
                </div>
              </div>
              
              <p className="text-muted-foreground italic text-lg mb-4">
                "Creating my own tarot deck has been a dream come true. The Gemini AI perfectly captured my vision of cosmic mythology, and I've already sold over 100 copies in just two weeks!"
              </p>
              
              <p className="text-muted-foreground">
                The platform made it so easy to generate cards that match my exact specifications. The marketplace integration is seamless, and I love seeing how people use my deck in readings.
              </p>
              
              <div className="flex items-center mt-6 text-primary">
                <Star className="h-5 w-5 fill-primary" />
                <Star className="h-5 w-5 fill-primary" />
                <Star className="h-5 w-5 fill-primary" />
                <Star className="h-5 w-5 fill-primary" />
                <Star className="h-5 w-5 fill-primary" />
              </div>
            </motion.div>
            
            {/* Medium testimonial 1 */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="col-span-1 md:col-span-3 bg-accent/5 border border-accent/20 rounded-2xl p-6"
            >
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 rounded-full overflow-hidden mr-4 border-2 border-accent/20">
                  <img 
                    src="https://images.pexels.com/photos/1681010/pexels-photo-1681010.jpeg?auto=compress&cs=tinysrgb&w=1600" 
                    alt="Marcus Chen" 
                    className="w-full h-full object-cover" 
                  />
                </div>
                <div>
                  <h4 className="font-medium">Marcus Chen</h4>
                  <p className="text-sm text-muted-foreground">Professional Reader</p>
                </div>
              </div>
              
              <p className="text-muted-foreground italic mb-3">
                "The video reading feature changed how I connect with clients. Being able to see reactions while sharing the same virtual space is magical."
              </p>
              
              <div className="flex items-center text-accent">
                <Star className="h-4 w-4 fill-accent" />
                <Star className="h-4 w-4 fill-accent" />
                <Star className="h-4 w-4 fill-accent" />
                <Star className="h-4 w-4 fill-accent" />
                <Star className="h-4 w-4 fill-accent" />
              </div>
            </motion.div>
            
            {/* Medium testimonial 2 */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="col-span-1 md:col-span-3 bg-teal/5 border border-teal/20 rounded-2xl p-6"
            >
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 rounded-full overflow-hidden mr-4 border-2 border-teal/20">
                  <img 
                    src="https://images.pexels.com/photos/1858175/pexels-photo-1858175.jpeg?auto=compress&cs=tinysrgb&w=1600" 
                    alt="Sophia Martinez" 
                    className="w-full h-full object-cover" 
                  />
                </div>
                <div>
                  <h4 className="font-medium">Sophia Martinez</h4>
                  <p className="text-sm text-muted-foreground">Tarot Collector</p>
                </div>
              </div>
              
              <p className="text-muted-foreground italic mb-3">
                "As a tarot enthusiast, I love being able to collect unique decks and get AI interpretations that help me learn the nuances of each card's meaning."
              </p>
              
              <div className="flex items-center text-teal">
                <Star className="h-4 w-4 fill-teal" />
                <Star className="h-4 w-4 fill-teal" />
                <Star className="h-4 w-4 fill-teal" />
                <Star className="h-4 w-4 fill-teal" />
                <Star className="h-4 w-4 fill-none stroke-teal" />
              </div>
            </motion.div>
          </div>
        </div>
      </section>
      
      {/* Bento Stats Section */}
      <section className="py-16 px-4 bg-card/30">
        <div className="container mx-auto max-w-6xl">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="bg-card border border-border rounded-2xl p-6 text-center group hover:border-primary/30 transition-all"
            >
              <Camera className="h-10 w-10 mx-auto text-primary mb-4 group-hover:scale-110 transition-transform" />
              <h3 className="text-3xl font-bold mb-2">10K+</h3>
              <p className="text-muted-foreground">Unique Decks</p>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="bg-card border border-border rounded-2xl p-6 text-center group hover:border-accent/30 transition-all"
            >
              <Download className="h-10 w-10 mx-auto text-accent mb-4 group-hover:scale-110 transition-transform" />
              <h3 className="text-3xl font-bold mb-2">250K+</h3>
              <p className="text-muted-foreground">Downloads</p>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="bg-card border border-border rounded-2xl p-6 text-center group hover:border-teal/30 transition-all"
            >
              <Users className="h-10 w-10 mx-auto text-teal mb-4 group-hover:scale-110 transition-transform" />
              <h3 className="text-3xl font-bold mb-2">50K+</h3>
              <p className="text-muted-foreground">Active Users</p>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="bg-card border border-border rounded-2xl p-6 text-center group hover:border-success/30 transition-all"
            >
              <Shield className="h-10 w-10 mx-auto text-success mb-4 group-hover:scale-110 transition-transform" />
              <h3 className="text-3xl font-bold mb-2">100%</h3>
              <p className="text-muted-foreground">Secure Platform</p>
            </motion.div>
          </div>
        </div>
      </section>
      
      {/* Bento-style CTA Section */}
      <section className="py-24 px-4">
        <div className="container mx-auto max-w-5xl">
          <motion.div 
            className="bg-gradient-to-br from-primary/90 via-teal/90 to-accent/90 rounded-2xl shadow-xl overflow-hidden"
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
          >
            <div className="grid grid-cols-1 md:grid-cols-5">
              {/* CTA Text Area */}
              <div className="p-8 md:p-12 md:col-span-3 flex flex-col justify-center">
                <div className="p-3 bg-white/20 rounded-xl w-fit mb-6">
                  <Sparkles className="h-8 w-8 text-white" />
                </div>
                
                <h2 className="text-3xl md:text-4xl font-serif font-bold mb-6 text-white">
                  Begin Your Mystical Journey
                </h2>
                <p className="text-xl mb-8 text-white/90">
                  Join our growing community of creators, readers, and collectors exploring the infinite 
                  possibilities of AI-generated tarot.
                </p>
                
                <div className="flex flex-col sm:flex-row gap-4">
                  <Link 
                    to="/signup" 
                    className="btn bg-white text-primary px-6 py-3 rounded-lg font-medium text-lg hover:bg-white/90 transition-colors flex items-center justify-center"
                  >
                    Create Free Account
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                  <Link 
                    to="/marketplace" 
                    className="btn btn-outline text-white border-white/30 px-6 py-3 rounded-lg font-medium text-lg hover:bg-white/10 transition-colors flex items-center justify-center"
                  >
                    Explore Marketplace
                  </Link>
                </div>
              </div>
              
              {/* CTA Image/Pattern Area */}
              <div className="hidden md:block md:col-span-2 relative bg-gradient-to-br from-primary to-accent/80 overflow-hidden">
                <div className="absolute inset-0 opacity-20">
                  <div className="absolute top-10 left-10 w-20 h-20 rounded-full bg-white"></div>
                  <div className="absolute bottom-20 right-10 w-32 h-32 rounded-full bg-white"></div>
                  <div className="absolute top-1/2 left-1/3 w-16 h-16 rounded-full bg-white"></div>
                </div>
                
                <div className="absolute inset-0 backdrop-blur-[2px]"></div>
                
                <div className="absolute inset-0 flex items-center justify-center">
                  <Sparkles className="h-32 w-32 text-white/80" />
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

// Feature Card Component
const FeatureCard = ({ 
  icon, 
  title, 
  description, 
  accent = false 
}: { 
  icon: React.ReactNode; 
  title: string; 
  description: string; 
  accent?: boolean;
}) => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      whileHover={{ y: -10, transition: { duration: 0.2 } }}
      className={`rounded-xl border ${accent ? 'border-accent/30' : 'border-border'} 
      ${accent ? 'bg-accent/5' : 'bg-card'} p-6 relative overflow-hidden h-full`}
    >
      <div className={`w-12 h-12 rounded-lg flex items-center justify-center mb-4 
      ${accent ? 'bg-accent/20 text-accent' : 'bg-primary/20 text-primary'}`}>
        {icon}
      </div>
      <h3 className="text-xl font-serif font-medium mb-3">{title}</h3>
      <p className="text-muted-foreground">{description}</p>
    </motion.div>
  );
};

// Testimonial Card Component
const TestimonialCard = ({ 
  quote, 
  name, 
  role, 
  avatarUrl, 
  primary = false 
}: { 
  quote: string; 
  name: string; 
  role: string; 
  avatarUrl: string; 
  primary?: boolean;
}) => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      whileHover={{ y: -5, transition: { duration: 0.2 } }}
      className={`rounded-xl border ${primary ? 'border-primary/30' : 'border-border'} 
      ${primary ? 'bg-primary/5' : 'bg-card'} p-6 relative overflow-hidden h-full`}
    >
      <div className="flex items-center mb-4">
        <div className="w-12 h-12 rounded-full overflow-hidden mr-4">
          <img src={avatarUrl} alt={name} className="w-full h-full object-cover" />
        </div>
        <div>
          <h4 className="font-medium">{name}</h4>
          <p className="text-sm text-muted-foreground">{role}</p>
        </div>
      </div>
      <p className="text-muted-foreground italic">"{quote}"</p>
    </motion.div>
  );
};

export default Home;