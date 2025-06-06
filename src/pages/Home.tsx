import React, { useEffect, useState, useRef, useMemo } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Sparkles, Wand2, ShoppingBag, BookOpen, Hammer, ArrowRight, Zap, Video, Star, Camera, Users, Download, Shield, ChevronLeft, ChevronRight, RefreshCw, CreditCard, Check, Clock } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { useCredits } from '../context/CreditContext';
import JourneyAnimation from '../components/ui/JourneyAnimation';

import { generateThemeSuggestions } from '../lib/gemini-ai';
import TarotLogo from '../components/ui/TarotLogo';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { generateElaborateTheme } from '../lib/gemini-ai';
import { v4 as uuidv4 } from 'uuid';

// Define a type for the hovered NFT price information
interface HoveredNftInfo {
  deckId: string | null;
  displayText: string | null; 
}

const SOL_RATE_CACHE_KEY = 'solUsdRateData';
const CACHE_DURATION_MS = 60 * 60 * 1000; // 1 hour

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
    cover_image: 'https://api.tarotforge.xyz/storage/v1/object/sign/card-images/astraldeck/astral.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9jYTcyNDk2MC0yMGJjLTQ5MDYtOWJiYy01NThhOGRlMzQwMGUiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJjYXJkLWltYWdlcy9hc3RyYWxkZWNrL2FzdHJhbC5wbmciLCJpYXQiOjE3NDg4NjA5OTMsImV4cCI6NDkwMjQ2MDk5M30.sxD4yjam7IzkkFwCc8EwF6djhmUA8gfHDTlHwBI8F2g',
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
    title: 'Botanical Angels',
    description: 'Explore the botanical archetypes of the major arcana with this deck. Great for all experience levels.',
    theme: 'archetypes',
    style: 'watercolor',
    card_count: 22,
    price: 15.99,
    is_free: false,
    cover_image: 'https://api.tarotforge.xyz/storage/v1/object/sign/card-images/a8c392fb-7759-44bb-9515-8785280622d2/the-world-1747580504415.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9jYTcyNDk2MC0yMGJjLTQ5MDYtOWJiYy01NThhOGRlMzQwMGUiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJjYXJkLWltYWdlcy9hOGMzOTJmYi03NzU5LTQ0YmItOTUxNS04Nzg1MjgwNjIyZDIvdGhlLXdvcmxkLTE3NDc1ODA1MDQ0MTUucG5nIiwiaWF0IjoxNzQ4ODYwNjg1LCJleHAiOjQ5MDI0NjA2ODV9.hINMNHe0-Ml3eePg0bDob2V4kx_mMyavNlvZOhXBQm4',
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
    cover_image: 'https://api.tarotforge.xyz/storage/v1/object/sign/card-images/cyberpunkdeck/lovers.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9jYTcyNDk2MC0yMGJjLTQ5MDYtOWJiYy01NThhOGRlMzQwMGUiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJjYXJkLWltYWdlcy9jeWJlcnB1bmtkZWNrL2xvdmVycy5wbmciLCJpYXQiOjE3NDg4NjA0MTcsImV4cCI6NDkwMjQ2MDQxN30.5rnyBLaib_hIPEPcq3nJZaU9wk_H8urYDceCV4KgBzQ',
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
  'https://api.tarotforge.xyz/storage/v1/object/sign/card-images/cyberpunkdeck/lovers.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9jYTcyNDk2MC0yMGJjLTQ5MDYtOWJiYy01NThhOGRlMzQwMGUiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJjYXJkLWltYWdlcy9jeWJlcnB1bmtkZWNrL2xvdmVycy5wbmciLCJpYXQiOjE3NDg4NjA0MTcsImV4cCI6NDkwMjQ2MDQxN30.5rnyBLaib_hIPEPcq3nJZaU9wk_H8urYDceCV4KgBzQ',
  'https://api.tarotforge.xyz/storage/v1/object/sign/card-images/desertdeck/star.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9jYTcyNDk2MC0yMGJjLTQ5MDYtOWJiYy01NThhOGRlMzQwMGUiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJjYXJkLWltYWdlcy9kZXNlcnRkZWNrL3N0YXIucG5nIiwiaWF0IjoxNzQ4ODYwNDY0LCJleHAiOjQ5MDI0NjA0NjR9.UGJkA8bNr7QAO72ZMdEn5gvhSJjO5GeAoNOs4RUnsdI',
  'https://api.tarotforge.xyz/storage/v1/object/sign/card-images/astraldeck/astral.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9jYTcyNDk2MC0yMGJjLTQ5MDYtOWJiYy01NThhOGRlMzQwMGUiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJjYXJkLWltYWdlcy9hc3RyYWxkZWNrL2FzdHJhbC5wbmciLCJpYXQiOjE3NDg4NjA0OTEsImV4cCI6NDkwMjQ2MDQ5MX0.21MB3C3huzJswMX-08aHyHGlmoK8kK5GigdXipI2ANo',
  'https://api.tarotforge.xyz/storage/v1/object/sign/card-images/a8c392fb-7759-44bb-9515-8785280622d2/judgement-1747580310932.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9jYTcyNDk2MC0yMGJjLTQ5MDYtOWJiYy01NThhOGRlMzQwMGUiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJjYXJkLWltYWdlcy9hOGMzOTJmYi03NzU5LTQ0YmItOTUxNS04Nzg1MjgwNjIyZDIvanVkZ2VtZW50LTE3NDc1ODAzMTA5MzIucG5nIiwiaWF0IjoxNzQ4ODYwNTM0LCJleHAiOjQ5MDI0NjA1MzR9.PLuZHZ8W3Vh8gFH9P0cFtIyEDVUFJl9zWqlQSGwO0sk',
  'https://api.tarotforge.xyz/storage/v1/object/sign/card-images/a8c392fb-7759-44bb-9515-8785280622d2/the-world-1747580504415.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9jYTcyNDk2MC0yMGJjLTQ5MDYtOWJiYy01NThhOGRlMzQwMGUiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJjYXJkLWltYWdlcy9hOGMzOTJmYi03NzU5LTQ0YmItOTUxNS04Nzg1MjgwNjIyZDIvdGhlLXdvcmxkLTE3NDc1ODA1MDQ0MTUucG5nIiwiaWF0IjoxNzQ4ODYwNTY5LCJleHAiOjQ5MDI0NjA1Njl9.SXZUye2qPkMZbLVqWzwNTcU5UI_IJw1d22cPyne7aKI',
  'https://api.tarotforge.xyz/storage/v1/object/sign/card-images/a8c392fb-7759-44bb-9515-8785280622d2/the-world-1747580504415.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9jYTcyNDk2MC0yMGJjLTQ5MDYtOWJiYy01NThhOGRlMzQwMGUiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJjYXJkLWltYWdlcy9hOGMzOTJmYi03NzU5LTQ0YmItOTUxNS04Nzg1MjgwNjIyZDIvdGhlLXdvcmxkLTE3NDc1ODA1MDQ0MTUucG5nIiwiaWF0IjoxNzQ4ODYwNjg1LCJleHAiOjQ5MDI0NjA2ODV9.hINMNHe0-Ml3eePg0bDob2V4kx_mMyavNlvZOhXBQm4',
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

// Random loading messages to display while generating elaborate theme
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
  const navigate = useNavigate();
  const location = useLocation();
  const { user, setShowSignInModal } = useAuthStore();
  const { credits } = useCredits();
  const { signInAnonymously } = useAuthStore();
  
  // Function to navigate to reading room and create session there
  const navigateToReadingRoom = () => {
    // Navigate immediately with a flag to create a new session
    navigate('/reading-room?create=true');
  };
  const [themePrompt, setThemePrompt] = useState("");
  const [themeSuggestions, setThemeSuggestions] = useState<string[]>([]);
  const [isGeneratingThemes, setIsGeneratingThemes] = useState(false);
  const [isGeneratingElaboration, setIsGeneratingElaboration] = useState(false);
  const [autoScrollPaused, setAutoScrollPaused] = useState(false);
  const [lastLoadedIndex, setLastLoadedIndex] = useState(0);
  const [loadingMessage, setLoadingMessage] = useState(loadingMessages[0]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [videoEnded, setVideoEnded] = useState(false);
  
  // State for SOL to USD rate and hovered NFT info
  const [solUsdRate, setSolUsdRate] = useState<number | null>(null);
  const [solUsdRateTimestamp, setSolUsdRateTimestamp] = useState<number | null>(null);
  const [isFetchingSolRate, setIsFetchingSolRate] = useState<boolean>(false);
  const [hoveredNftInfo, setHoveredNftInfo] = useState<HoveredNftInfo>({
    deckId: null,
    displayText: null,
  });

  // Cookie for tracking if first-time user has used their credits
  const [hasUsedCredits, setHasUsedCredits] = useState(() => {
    const cookie = localStorage.getItem('hasUsedCredits');
    return cookie === 'true';
  });

  // Update cookie when hasUsedCredits changes
  useEffect(() => {
    localStorage.setItem('hasUsedCredits', String(hasUsedCredits));
  }, [hasUsedCredits]);
  
  // Load SOL to USD rate from cache on component mount
  useEffect(() => {
    const cachedDataRaw = localStorage.getItem(SOL_RATE_CACHE_KEY);
    if (cachedDataRaw) {
      try {
        const cachedData = JSON.parse(cachedDataRaw);
        if (cachedData && typeof cachedData.rate === 'number' && typeof cachedData.timestamp === 'number') {
          if (Date.now() - cachedData.timestamp < CACHE_DURATION_MS) {
            setSolUsdRate(cachedData.rate);
            setSolUsdRateTimestamp(cachedData.timestamp);
            console.log('Loaded SOL/USD rate from cache:', cachedData.rate);
          } else {
            localStorage.removeItem(SOL_RATE_CACHE_KEY); // Stale data
            console.log('Cleared stale SOL/USD rate cache.');
          }
        } else {
          localStorage.removeItem(SOL_RATE_CACHE_KEY); // Invalid data format
        }
      } catch (error) {
        console.error('Error parsing SOL rate from cache:', error);
        localStorage.removeItem(SOL_RATE_CACHE_KEY); // Corrupted data
      }
    }
  }, []);
  
  // Random loading message interval
  useEffect(() => {
    let intervalId: number | null = null;
    
    if (isGeneratingElaboration) {
      intervalId = window.setInterval(() => {
        const randomIndex = Math.floor(Math.random() * loadingMessages.length);
        setLoadingMessage(loadingMessages[randomIndex]);
      }, 2000);
    }
    
    return () => {
      if (intervalId !== null) {
        clearInterval(intervalId);
      }
    };
  }, [isGeneratingElaboration]);
  
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
  
  const handleThemeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (themePrompt.trim()) {
      if (user) {
        // User is authenticated (real or anonymous), proceed directly to deck creation
        navigate('/create-deck', { 
          state: {
            initialTheme: themePrompt,
            autoGenerate: true,
            startGenerating: true
          }
        });
      } else {
        // No user - create anonymous account and proceed
        try {
          console.log('🎭 Creating user session for deck creation');
          const result = await signInAnonymously();
          
          if (!result.error) {
            console.log('✅ User session created, proceeding to deck creation');
            navigate('/create-deck', { 
              state: {
                initialTheme: themePrompt,
                autoGenerate: true,
                startGenerating: true
              }
            });
          } else {
            console.error('❌ Failed to create user session:', result.error);
            // Show error to user or proceed anyway
            alert('Unable to create user session. You can still browse without saving progress.');
            navigate('/create-deck', { 
              state: {
                initialTheme: themePrompt,
                autoGenerate: true,
                startGenerating: true
              }
            });
          }
        } catch (error) {
          console.error('❌ Error in user session creation:', error);
          // Fallback: navigate anyway but show warning
          alert('Unable to create user session. You can still browse without saving progress.');
          navigate('/create-deck', { 
            state: {
              initialTheme: themePrompt,
              autoGenerate: true,
              startGenerating: true
            }
          });
        }
      }
      
      // Update the used credits flag after navigating
      if (!hasUsedCredits) {
        setHasUsedCredits(true);
      }
    }
  };

  const selectSuggestion = async (suggestion: string) => {    
    // Generate and append an elaboration
    // clear existing text
    setThemePrompt('');

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
  
  // Get the available credits for the user
  const getAvailableCredits = () => {
    // For logged in users, show their actual credits
    if (user && credits) {
      return credits.majorArcanaQuota + credits.completeDeckQuota;
    }
    
    // For non-logged in users who haven't used credits yet, show 5
    if (!hasUsedCredits) {
      return 5;
    }
    
    // For non-logged in users who have used credits, show 0
    return 0;
  };
  
  const performSolRateFetch = async () => {
    if (isFetchingSolRate) {
      return; // Another fetch is already in progress
    }
    // Also, if rate is somehow now current, don't fetch
    if (solUsdRate && solUsdRateTimestamp && (Date.now() - solUsdRateTimestamp < CACHE_DURATION_MS)) {
      return;
    }

    setIsFetchingSolRate(true);
    try {
      const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd');
      if (!response.ok) {
        throw new Error('Failed to fetch SOL price from CoinGecko');
      }
      const data = await response.json();
      if (data.solana && data.solana.usd) {
        const newRate = data.solana.usd;
        const newTimestamp = Date.now();
        setSolUsdRate(newRate);
        setSolUsdRateTimestamp(newTimestamp);
        localStorage.setItem(SOL_RATE_CACHE_KEY, JSON.stringify({ rate: newRate, timestamp: newTimestamp }));
        console.log('Fetched and cached SOL/USD rate:', newRate);
      } else {
        console.error('SOL price not found in API response:', data);
      }
    } catch (error) {
      console.error('Error fetching SOL price:', error);
    } finally {
      setIsFetchingSolRate(false);
    }
  };

  const handleNftMouseEnter = (deck: typeof featuredDecks[0]) => {
    if (!deck.is_nft || !deck.price) return;

    // Set this deck as the hovered one. Display text will be determined by render logic.
    setHoveredNftInfo({
      deckId: deck.id,
      displayText: null, // Render logic will determine what to show based on solUsdRate state
    });

    const isRateCurrentlyValid = solUsdRate && solUsdRateTimestamp && (Date.now() - solUsdRateTimestamp < CACHE_DURATION_MS);

    if (!isRateCurrentlyValid && !isFetchingSolRate) {
      // If rate is not valid and no fetch is in progress, start one.
      performSolRateFetch();
    }
    // If rate is valid, render logic will use it.
    // If fetch is in progress, render logic will show "Loading...".
  };

  const handleNftMouseLeave = () => {
    setHoveredNftInfo({ deckId: null, displayText: null });
  };

  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <motion.section 
        id="#"
        className="relative h-[calc(100vh-4rem)] min-h-[600px] flex flex-col items-center justify-center px-4 pt-0 pb-12 md:py-6 overflow-hidden"
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
              <h4 className="text-xl md:text-2xl font-serif font-bold mb-2 text-center">
                Create Your Tarot Deck Now
              </h4>
              
              <form onSubmit={handleThemeSubmit}>
                <div className="mb-5">
                  <div className="relative">
                    <textarea
                      id="deck-theme-input"
                      value={themePrompt}
                      onChange={(e) => setThemePrompt(e.target.value)}
                      placeholder={isGeneratingElaboration ? loadingMessage : "Describe your deck's theme or concept (e.g., Cosmic journey through ancient mythology...)"}
                      className="w-full p-3 rounded-lg bg-card border border-input focus:outline-none focus:ring-2 focus:ring-primary min-h-[80px] resize-none"
                      disabled={isGeneratingElaboration}
                    />
                    
                    {/* Deck badge */}
                    { !user && (
                      <div className="absolute -top-3 right-3 bg-card border border-yellow-500 px-2 py-1 rounded-full shadow-sm flex items-center">
                        <CreditCard className="h-3 w-3 text-yellow-500 mr-1" />
                        <span className="text-xs font-medium">1 free deck</span>
                      </div>
                    )}
                  </div>
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
                          <LoadingSpinner size="sm" className="mr-1" />
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
                  disabled={!themePrompt.trim() || isGeneratingElaboration}
                  className="w-full btn btn-primary py-3 disabled:opacity-70"
                >
                  {isGeneratingElaboration ? (
                    <>
                      <LoadingSpinner size="sm" className="mr-2" />
                      Generating Description...
                    </>
                  ) : (
                    <>
                      Forge a Deck
                      <Hammer className="ml-2 h-4 w-4" />
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
              <button 
                onClick={navigateToReadingRoom}
                className="py-4 flex items-center justify-center text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/20 transition-colors w-full"
              >
                <BookOpen className="h-4 w-4 mr-2" />
                Try Free Reading
              </button>
            </div>
          </div>
        </motion.div>
      </motion.section>
      {/* Features Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto">
          <motion.div 
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-3xl md:text-4xl font-serif font-bold mb-4">Unleash Your Tarot Creativity</h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Create, collect, and experience tarot in ways never before possible
            </p>
          </motion.div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <motion.div
              className="bg-card border border-border rounded-xl p-6 hover:shadow-lg transition-shadow"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true }}
            >
              <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center mb-4">
                <Wand2 className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-serif font-bold mb-2">AI-Powered Creation</h3>
              <p className="text-muted-foreground mb-4">
                Design unique tarot decks with our AI generation tools. Customize every aspect from artwork style to card symbolism.
              </p>
              <Link to="/" className="text-primary hover:underline flex items-center text-sm">
                Create Your Deck
                <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </motion.div>
            
            {/* Feature 2 */}
            <motion.div
              className="bg-card border border-border rounded-xl p-6 hover:shadow-lg transition-shadow"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              viewport={{ once: true }}
            >
              <div className="w-12 h-12 bg-accent/20 rounded-full flex items-center justify-center mb-4">
                <ShoppingBag className="h-6 w-6 text-accent" />
              </div>
              <h3 className="text-xl font-serif font-bold mb-2">Vibrant Marketplace</h3>
              <p className="text-muted-foreground mb-4">
                Discover and collect unique decks created by artists worldwide. From traditional to avant-garde, find your perfect match.
              </p>
              <Link to="/marketplace" className="text-primary hover:underline flex items-center text-sm">
                Explore Marketplace
                <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </motion.div>
            
            {/* Feature 3 */}
            <motion.div
              className="bg-card border border-border rounded-xl p-6 hover:shadow-lg transition-shadow"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              viewport={{ once: true }}
            >
              <div className="w-12 h-12 bg-teal/20 rounded-full flex items-center justify-center mb-4">
                <BookOpen className="h-6 w-6 text-teal" />
              </div>
              <h3 className="text-xl font-serif font-bold mb-2">Interactive Readings</h3>
              <p className="text-muted-foreground mb-4">
                Experience immersive tarot readings with AI interpretations or connect with professional readers for personalized guidance.
              </p>
              <button 
                onClick={navigateToReadingRoom}
                className="text-primary hover:underline flex items-center text-sm"
              >
                Try a Reading
                <ArrowRight className="ml-1 h-4 w-4" />
              </button>
            </motion.div>
          </div>
        </div>
      </section>
      
      {/* Featured Decks Section */}
      <section className="py-20 px-4 bg-gradient-to-b from-background to-primary/5 mt-8">
        <div className="container mx-auto">
          <motion.div 
            className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12"
            initial={{ opacity:  0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
          >
            <div>
              <h2 className="text-3xl md:text-4xl font-serif font-bold mb-2">Featured Decks</h2>
              <p className="text-xl text-muted-foreground">
                Discover popular decks from our community
              </p>
            </div>
            <Link to="/marketplace" className="mt-4 md:mt-0 btn btn-primary py-2 px-4 flex items-center">
              View All Decks
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </motion.div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {featuredDecks.map((deck, index) => {
              const isHoveredNft = hoveredNftInfo.deckId === deck.id && deck.is_nft;
              const priceBadgeClassName = `absolute top-3 right-3 font-medium px-3 py-1 rounded-full text-sm transition-colors duration-200 ${ 
                isHoveredNft && solUsdRate ? 'bg-violet-600 text-white' : 'bg-accent/90 text-accent-foreground'
              }`;
              
              let priceBadgeText;
              if (isHoveredNft) {
                const isRateValidForHover = solUsdRate && solUsdRateTimestamp && (Date.now() - solUsdRateTimestamp < CACHE_DURATION_MS);
                if (isRateValidForHover && deck.price && solUsdRate) {
                    priceBadgeText = (deck.price / solUsdRate).toFixed(4) + ' SOL';
                } else if (isFetchingSolRate) {
                    priceBadgeText = 'Loading SOL...';
                } else {
                    priceBadgeText = 'Error'; // Fallback if rate not valid and not fetching (e.g. previous fetch failed)
                }
              } else if (deck.price) {
                priceBadgeText = `$${deck.price.toFixed(2)}`;
              }

              return (
                <motion.div
                  key={deck.id}
                  className="bg-card border border-border rounded-xl hover:shadow-xl transition-all"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  viewport={{ once: true }}
                  whileHover={{ y: -5 }}
                >
                  <div className="aspect-[3/4] relative overflow-hidden rounded-xl">
                    <img 
                      src={deck.cover_image} 
                      alt={deck.title} 
                      className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                    />
                    {deck.is_free ? (
                      <div className="absolute top-3 right-3 bg-success/90 text-success-foreground font-medium px-3 py-1 rounded-full text-sm flex items-center">
                        <Zap className="h-3 w-3 mr-1" />
                        Free
                      </div>
                    ) : (
                      <div 
                        className={priceBadgeClassName}
                        onMouseEnter={deck.is_nft ? () => handleNftMouseEnter(deck) : undefined}
                        onMouseLeave={deck.is_nft ? handleNftMouseLeave : undefined}
                      >
                        {priceBadgeText}
                      </div>
                    )}
                    {deck.is_nft && (
                      <div className="absolute top-3 left-3 bg-primary/90 text-primary-foreground font-medium px-3 py-1 rounded-full text-xs">
                        NFT
                      </div>
                    )}
                  </div>
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-serif text-xl font-bold">{deck.title}</h3>
                      {deck.rating && (
                        <div className="flex items-center text-accent">
                          <Star className="h-4 w-4 fill-current" />
                          <span className="ml-1 font-medium">{deck.rating.toFixed(1)}</span>
                        </div>
                      )}
                    </div>
                    <p className="text-muted-foreground text-sm mb-4 line-clamp-2">
                      {deck.description}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">By {deck.creator_name}</span>
                      <Link 
                        to={`/marketplace/${deck.id}`} 
                        className="btn btn-secondary py-1 px-3 text-xs hidden"
                      >
                        View Deck
                      </Link>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>
      
      {/* Reader Section */}
      <section className="py-20 px-4 bg-gradient-to-b from-background to-primary/5">
        <div className="container mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true }}
            >
              <h2 className="text-3xl md:text-4xl font-serif font-bold mb-4">Connect with Professional Readers</h2>
              <p className="text-xl text-muted-foreground mb-6">
                Get personalized tarot readings from certified professionals using your custom decks
              </p>
              
              <div className="space-y-4 mb-8">
                <div className="flex items-start">
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center mt-0.5 mr-3">
                    <Check className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium">Video Reading Sessions</h3>
                    <p className="text-sm text-muted-foreground">Connect face-to-face for immersive reading experiences</p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center mt-0.5 mr-3">
                    <Check className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium">Certified Tarot Experts</h3>
                    <p className="text-sm text-muted-foreground">All readers pass rigorous certification requirements</p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center mt-0.5 mr-3">
                    <Check className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium">Use Your Custom Decks</h3>
                    <p className="text-sm text-muted-foreground">Readers can use your created decks for deeper personal connections</p>
                  </div>
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <Link to="/readers" className="btn btn-primary py-2 px-6 flex items-center justify-center">
                  <Users className="mr-2 h-5 w-5" />
                  Find a Reader
                </Link>
                <Link to="/become-reader" className="btn btn-secondary py-2 px-6 flex items-center justify-center">
                  <Star className="mr-2 h-5 w-5" />
                  Become a Reader
                </Link>
              </div>
            </motion.div>
            
            <motion.div
              className="relative"
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              viewport={{ once: true }}
            >
              <div className="aspect-video bg-card border border-border rounded-xl overflow-hidden shadow-xl">
                <div className="relative w-full h-full">
                  <img 
                    src="https://api.tarotforge.xyz/storage/v1/object/public/assets//readingroom.webp" 
                    alt="Tarot reading session" 
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent flex flex-col justify-end p-6">
                    <div className="flex items-center mb-3">
                      <div className="w-10 h-10 rounded-full bg-primary/20 border-2 border-primary flex items-center justify-center mr-3">
                        <Video className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="text-white font-medium">Live Reading Session</h3>
                        <p className="text-white/80 text-sm">Professional tarot guidance</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <div className="bg-card/30 backdrop-blur-xs px-2 py-1 rounded text-xs text-white flex items-center">
                        <Star className="h-3 w-3 fill-yellow-500 text-yellow-500 mr-1" />
                        4.9 (128 reviews)
                      </div>
                      <div className="bg-card/30 backdrop-blur-xs px-2 py-1 rounded text-xs text-white flex items-center">
                        <Clock className="h-3 w-3 mr-1" />
                        30 min sessions
                      </div>
                    </div>
                  </div>
                  
                  {/* Play button overlay */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div 
                      className={`w-16 h-16 rounded-full ${isPlaying ? 'bg-primary' : 'bg-primary/80'} flex items-center justify-center cursor-pointer hover:bg-primary transition-colors`}
                      onClick={() => setIsPlaying(!isPlaying)}
                    >
                      {isPlaying ? (
                        <div className="w-4 h-10 flex justify-center">
                          <div className="w-1.5 h-10 bg-white rounded-sm mr-1"></div>
                          <div className="w-1.5 h-10 bg-white rounded-sm"></div>
                        </div>
                      ) : (
                        <div className="w-0 h-0 border-t-[10px] border-t-transparent border-b-[10px] border-b-transparent border-l-[16px] border-l-white ml-1"></div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Floating card elements */}
              {/* Left card */}
              <motion.div
                className="absolute -bottom-6 -left-6 w-32 h-48 rounded-lg overflow-hidden shadow-xl"
                initial={{ x: 0, y: 0, opacity: 1 }}
                animate={{ 
                  y: [0, -5, 0],
                  x: isPlaying ? -200 : 0,
                  opacity: isPlaying ? window.innerWidth < 768 ? 0.3 : 0.3 : 1
                }}
                transition={{ 
                  y: { repeat: Infinity, duration: 3, ease: "easeInOut" },
                  x: { duration: 0.7, ease: isPlaying ? "easeOut" : "easeIn" },
                  opacity: { duration: 0.5 }
                }}
              >
                <img 
                  src="https://api.tarotforge.xyz/storage/v1/object/sign/card-images/a8c392fb-7759-44bb-9515-8785280622d2/the-world-1747580504415.png?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6InN0b3JhZ2UtdXJsLXNpZ25pbmcta2V5X2NhNzI0OTYwLTIwYmMtNDkwNi05YmJjLTU1OGE4ZGUzNDAwZSJ9.eyJ1cmwiOiJjYXJkLWltYWdlcy9hOGMzOTJmYi03NzU5LTQ0YmItOTUxNS04Nzg1MjgwNjIyZDIvdGhlLXdvcmxkLTE3NDc1ODA1MDQ0MTUucG5nIiwiaWF0IjoxNzQ3OTQ0MzYxLCJleHAiOjE5MDU2MjQzNjF9.azpqLKtzVOzu5y-Brjr9tRsaAkwtuxng0px-sSdjKDI" 
                  alt="Tarot card" 
                  className="w-full h-full object-cover"
                />
              </motion.div>
              
              {/* Right card */}
              <motion.div
                className="absolute -top-6 -right-6 w-32 h-48 rounded-lg overflow-hidden shadow-xl"
                initial={{ x: 0, y: 0, opacity: 1 }}
                animate={{ 
                  y: [0, 5, 0],
                  x: isPlaying ? 200 : 0,
                  opacity: isPlaying ? window.innerWidth < 768 ? 0.3 : 0.3 : 1
                }}
                transition={{ 
                  y: { repeat: Infinity, duration: 4, ease: "easeInOut" },
                  x: { duration: 0.7, ease: isPlaying ? "easeOut" : "easeIn" },
                  opacity: { duration: 0.5 }
                }}
              >
                <img 
                  src="https://api.tarotforge.xyz/storage/v1/object/sign/card-images/a8c392fb-7759-44bb-9515-8785280622d2/judgement-1747580310932.png?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6InN0b3JhZ2UtdXJsLXNpZ25pbmcta2V5X2NhNzI0OTYwLTIwYmMtNDkwNi05YmJjLTU1OGE4ZGUzNDAwZSJ9.eyJ1cmwiOiJjYXJkLWltYWdlcy9hOGMzOTJmYi03NzU5LTQ0YmItOTUxNS04Nzg1MjgwNjIyZDIvanVkZ2VtZW50LTE3NDc1ODAzMTA5MzIucG5nIiwiaWF0IjoxNzQ3OTQ0NTE1LCJleHAiOjE5MDU2MjQ1MTV9.DKPpgchmlQNcAfD-B4LztQaF8G53F52El9PgZnguVQc" 
                  alt="Tarot card" 
                  className="w-full h-full object-cover"
                />
              </motion.div>
              
              {/* Video element (hidden) to simulate video playback */}
              <video 
                className="hidden"
                onEnded={() => {
                  setIsPlaying(false);
                  setVideoEnded(true);
                }}
                onPause={() => {
                  if (!videoEnded) setIsPlaying(false);
                }}
                ref={(el) => {
                  if (el && isPlaying) {
                    el.currentTime = 0;
                    el.play().catch(e => console.log("Auto-play prevented:", e));
                  } else if (el && !isPlaying) {
                    el.pause();
                  }
                }}
              >
                <source src="about:blank" type="video/mp4" />
              </video>
            </motion.div>
          </div>
        </div>
      </section>
      
      {/* Testimonials Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto">
          <motion.div 
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl md:text-4xl font-serif font-bold mb-4">What Our Users Say</h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Join thousands of tarot enthusiasts already creating and connecting on our platform
            </p>
          </motion.div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Testimonial 1 */}
            <motion.div
              className="bg-card border border-border rounded-xl p-6"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true }}
            >
              <div className="flex items-center text-accent mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-current" />
                ))}
              </div>
              <p className="text-muted-foreground mb-6">
                "I've created three custom decks that perfectly capture my spiritual aesthetic. The AI generation is incredible, and I love that I can sell my creations to others!"
              </p>
              <div className="flex items-center">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center mr-3">
                  <span className="font-medium text-primary">MA</span>
                </div>
                <div>
                  <p className="font-medium">MysticArtisan</p>
                  <p className="text-xs text-muted-foreground">Deck Creator</p>
                </div>
              </div>
            </motion.div>
            
            {/* Testimonial 2 */}
            <motion.div
              className="bg-card border border-border rounded-xl p-6"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              viewport={{ once: true }}
            >
              <div className="flex items-center text-accent mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-current" />
                ))}
              </div>
              <p className="text-muted-foreground mb-6">
                "The video reading feature has transformed my practice. I can now connect with clients worldwide using their own custom decks, creating a deeply personal experience."
              </p>
              <div className="flex items-center">
                <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center mr-3">
                  <span className="font-medium text-accent">CS</span>
                </div>
                <div>
                  <p className="font-medium">CelestialSeer</p>
                  <p className="text-xs text-muted-foreground">Professional Reader</p>
                </div>
              </div>
            </motion.div>
            
            {/* Testimonial 3 */}
            <motion.div
              className="bg-card border border-border rounded-xl p-6"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              viewport={{ once: true }}
            >
              <div className="flex items-center text-accent mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-current" />
                ))}
              </div>
              <p className="text-muted-foreground mb-6">
                "I started with the free plan and was so impressed that I upgraded to Creator. The quality of the AI-generated artwork is stunning, and the community is incredibly supportive."
              </p>
              <div className="flex items-center">
                <div className="w-10 h-10 rounded-full bg-teal/20 flex items-center justify-center mr-3">
                  <span className="font-medium text-teal">EW</span>
                </div>
                <div>
                  <p className="font-medium">EtherealWanderer</p>
                  <p className="text-xs text-muted-foreground">Collector & Creator</p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>
      
      {/* CTA Section */}
      <section className="py-20 px-4 bg-gradient-to-b from-background to-primary/5">
        <div className="container mx-auto">
          <motion.div
            className="bg-card/70 backdrop-blur-sm border border-border rounded-xl p-8 md:p-12 text-center max-w-4xl mx-auto shadow-2xl"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
          >
            <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <JourneyAnimation size="sm" />
            </div>
            <h2 className="text-3xl md:text-4xl font-serif font-bold mb-4">Ready to Begin Your Journey?</h2>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Join our community of creators, readers, and collectors to explore the mystical world of tarot like never before.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/#"
                onClick={e => {
                  e.preventDefault();
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }} className="btn btn-primary py-3 px-8 text-lg flex items-                 center justify-center">
                <Wand2 className="mr-2 h-5 w-5" />
                Create Your First Deck
              </Link>
              <Link to="/marketplace" className="btn btn-secondary py-3 px-8 text-lg flex items-center justify-center">
                <ShoppingBag className="mr-2 h-5 w-5" />
                Explore Marketplace
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default Home;