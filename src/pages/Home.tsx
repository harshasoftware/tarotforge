import { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Search, Filter, Zap, TrendingUp, Clock, Star, XCircle, AlertCircle, ArrowRight, ChevronLeft, ChevronRight, RefreshCw, Sparkles } from 'lucide-react';
import DeckPreview from '../components/ui/DeckPreview';
import { Deck } from '../types';
import { useAuth } from '../context/AuthContext';
import { generateThemeSuggestions, generateElaborateTheme } from '../lib/gemini-ai';
import TarotLogo from '../components/ui/TarotLogo';

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
// const allThemeSuggestions = [ ... ];

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
    console.error('Error generating theme suggestions:', error);
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
        if (newThemes && newThemes.length > 0) {
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
    if (themePrompt.trim() && !isGeneratingElaboration) {
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

  const selectSuggestion = async (suggestion: string) => {
    // First set the basic suggestion and indicate loading
    setThemePrompt(suggestion);
    setIsGeneratingElaboration(true);
    
    try {
      // Then generate and append an elaboration
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
        
        {/* Floating Tarot Cards in Background - Memoized */}
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
                    className={`w-full p-3 rounded-lg bg-card border border-input focus:outline-none focus:ring-2 focus:ring-primary min-h-[80px] resize-none ${
                      isGeneratingElaboration ? 'opacity-70 cursor-wait' : ''
                    }`}
                    disabled={isGeneratingElaboration}
                  />
                </div>
                
                <div className="relative mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs text-muted-foreground">Theme inspiration:</p>
                    <button
                      type="button"
                      onClick={handleGenerateThemes}
                      disabled={isGeneratingThemes || isGeneratingElaboration}
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
                                    ${isGeneratingElaboration ? 'opacity-70 cursor-wait' : ''}`}
                        >
                          {isGeneratingElaboration ? (
                            <span className="flex items-center">
                              <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                              {suggestion}
                            </span>
                          ) : (
                            suggestion
                          )}
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
                  disabled={!themePrompt.trim() || isGeneratingElaboration}
                  className="w-full btn btn-primary py-3 disabled:opacity-70 relative"
                >
                  {isGeneratingElaboration ? (
                    <span className="flex items-center justify-center">
                      <span className="h-5 w-5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin mr-2"></span>
                      Generating Theme Description...
                    </span>
                  ) : (
                    <>
                      Forge a Deck
                      <Hammer className="ml-2 h-4 w-4">🔨</Hammer>
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
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-4 w-4 mr-2"
                >
                  <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <path d="M16 10a4 4 0 0 1-8 0" />
                </svg>
                Browse Marketplace
              </Link>
              {user ? (
                <Link 
                  to="/reading-room" 
                  className="py-4 flex items-center justify-center text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/20 transition-colors"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-4 w-4 mr-2"
                  >
                    <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
                  </svg>
                  Try Free Reading
                </Link>
              ) : (
                <button 
                  onClick={() => setShowSignInModal(true)}
                  className="py-4 flex items-center justify-center text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/20 transition-colors"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-4 w-4 mr-2"
                  >
                    <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
                  </svg>
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
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="h-8 w-8 text-primary"
                    >
                      <path d="M15 4V2" />
                      <path d="M15 16v-2" />
                      <path d="M8 9h2" />
                      <path d="M20 9h2" />
                      <path d="M17.8 11.8 19 13" />
                      <path d="M15 9h0" />
                      <path d="M17.8 6.2 19 5" />
                      <path d="m3 21 9-9" />
                      <path d="M12.2 6.2 11 5" />
                    </svg>
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
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-6 w-6 text-accent"
                >
                  <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <path d="M16 10a4 4 0 0 1-8 0" />
                </svg>
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
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-6 w-6 text-teal"
                >
                  <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
                </svg>
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
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-6 w-6 text-primary"
                >
                  <polygon points="23 7 16 12 23 17 23 7" />
                  <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                </svg>
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
              
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-10 w-10 text-primary mb-6"
              >
                <path d="M15 4V2" />
                <path d="M15 16v-2" />
                <path d="M8 9h2" />
                <path d="M20 9h2" />
                <path d="M17.8 11.8 19 13" />
                <path d="M15 9h0" />
                <path d="M17.8 6.2 19 5" />
                <path d="m3 21 9-9" />
                <path d="M12.2 6.2 11 5" />
              </svg>
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
              
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-10 w-10 text-accent mb-6"
              >
                <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <path d="M16 10a4 4 0 0 1-8 0" />
              </svg>
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
              
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-10 w-10 text-teal mb-6"
              >
                <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path>
                <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>
              </svg>
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
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="mr-2 h-4 w-4"
                >
                  <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <path d="M16 10a4 4 0 0 1-8 0" />
                </svg>
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
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              className="h-3 w-3"
                            >
                              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                              <circle cx="12" cy="7" r="4"></circle>
                            </svg>
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
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-10 w-10 mx-auto text-primary mb-4 group-hover:scale-110 transition-transform"
              >
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                <circle cx="12" cy="13" r="4"></circle>
              </svg>
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
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-10 w-10 mx-auto text-accent mb-4 group-hover:scale-110 transition-transform"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7 10 12 15 17 10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
              </svg>
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
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-10 w-10 mx-auto text-teal mb-4 group-hover:scale-110 transition-transform"
              >
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                <circle cx="9" cy="7" r="4"></circle>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
              </svg>
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
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-10 w-10 mx-auto text-success mb-4 group-hover:scale-110 transition-transform"
              >
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
              </svg>
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
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-8 w-8 text-white"
                  >
                    <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"></path>
                    <path d="M19 6.3a9 9 0 0 1 1.8 3.8"></path>
                  </svg>
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
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-32 w-32 text-white/80"
                  >
                    <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"></path>
                    <path d="M19 6.3a9 9 0 0 1 1.8 3.8"></path>
                  </svg>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default Home;