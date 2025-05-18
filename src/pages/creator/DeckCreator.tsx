import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { 
  Save, 
  AlertTriangle, 
  CreditCard, 
  Check, 
  Loader,
  Info,
  ArrowRight,
  X,
  Zap,
  Eye,
  EyeOff,
  DollarSign
} from 'lucide-react';
import PromptEditor from '../../components/creator/PromptEditor';
import CardGallery from '../../components/creator/CardGallery';
import { generateCardDescription, generateCardImage, generatePlaceholderImageUrl } from '../../lib/gemini-ai';
import { Deck, Card } from '../../types';
import { v4 as uuidv4 } from 'uuid';
import { SHA256 } from 'crypto-js';
import { supabase } from '../../lib/supabase';

// Traditional tarot card names for major arcana
const MAJOR_ARCANA_CARDS = [
  'The Fool', 
  'The Magician', 
  'The High Priestess', 
  'The Empress', 
  'The Emperor',
  'The Hierophant', 
  'The Lovers', 
  'The Chariot', 
  'Strength', 
  'The Hermit',
  'Wheel of Fortune', 
  'Justice', 
  'The Hanged Man', 
  'Death', 
  'Temperance',
  'The Devil', 
  'The Tower', 
  'The Star', 
  'The Moon', 
  'The Sun',
  'Judgment', 
  'The World'
];

// Minor arcana suits and courts
const MINOR_ARCANA_SUITS = ['Wands', 'Cups', 'Swords', 'Pentacles'];
const COURT_CARDS = ['Page', 'Knight', 'Queen', 'King'];

interface CardToGenerate {
  name: string;
  order: number;
  cardType: 'major' | 'minor';
  suit?: 'wands' | 'cups' | 'swords' | 'pentacles' | null;
}

interface GeneratingCard {
  name: string;
  descriptionInProgress: boolean;
  imageInProgress: boolean;
  order: number;
  cardType: 'major' | 'minor';
  suit?: 'wands' | 'cups' | 'swords' | 'pentacles' | null;
  descriptionProgress: number;
  imageProgress: number;
  description?: string;
}

// Maximum number of concurrent generation tasks
const MAX_CONCURRENT_GENERATIONS = 3;

const DeckCreator = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  
  // Extract parameters from location state if provided
  const locationState = location.state as {
    initialTheme?: string;
    autoGenerate?: boolean;
    startGenerating?: boolean;
  } | null;
  
  // Navigation guard - redirect if accessed directly via URL
  useEffect(() => {
    // If there's no location state, it means the user is trying to access this page directly
    if (!locationState) {
      // Redirect to home page
      navigate('/');
    }
  }, [locationState, navigate]);
  
  // Deck details state - these will be auto-generated
  const [deckTitle, setDeckTitle] = useState('Auto-Generated Tarot');
  const [deckDescription, setDeckDescription] = useState('A beautifully generated tarot deck with unique art style.');
  const [deckTheme, setDeckTheme] = useState('mystical');
  const [deckStyle, setDeckStyle] = useState('vibrant');
  
  // Visibility and sellability options
  const [isListed, setIsListed] = useState(true);
  const [isSellable, setIsSellable] = useState(false);
  const [deckPrice, setDeckPrice] = useState(9.99);
  
  // Card generation state
  const [generatedCards, setGeneratedCards] = useState<Card[]>([]);
  const [currentStep, setCurrentStep] = useState<'cards' | 'customize'>('cards');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [promptValue, setPromptValue] = useState('');
  const [fullDeck, setFullDeck] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [activeCard, setActiveCard] = useState<string | null>(null);
  const [deckId, setDeckId] = useState<string | null>(null);
  const [savingDeck, setSavingDeck] = useState(false);
  const [creationSuccess, setCreationSuccess] = useState(false);
  const [needsSignIn, setNeedsSignIn] = useState(false);
  
  // Progress tracking
  const [generationQueue, setGenerationQueue] = useState<CardToGenerate[]>([]);
  const [currentlyGenerating, setCurrentlyGenerating] = useState<GeneratingCard[]>([]);
  const [totalCardsToGenerate, setTotalCardsToGenerate] = useState(0);
  const [completedCards, setCompletedCards] = useState(0);
  
  // Reference for tracking active generation tasks
  const activeGenerationTasks = useRef<number>(0);
  
  // Navigation guard - redirect if accessed directly via URL
  useEffect(() => {
    // If there's no location state, it means the user is trying to access this page directly
    if (!locationState) {
      // Redirect to home page immediately
      navigate('/');
    }
  }, [locationState, navigate]);
  
  // Auto-generate theme based on location state - only runs when there's valid location state
  useEffect(() => {
    // Only proceed if there is valid location state
    if (!locationState) return;
    
    if (locationState.initialTheme) {
      const theme = locationState.initialTheme;
      const themeWords = theme.split(/\s+/);
      
      // Generate a title based on the theme
      const titleWords = themeWords
        .filter(word => word.length > 3)
        .slice(0, 3)
        .map(word => word.charAt(0).toUpperCase() + word.slice(1));
      const generatedTitle = titleWords.length > 0 
        ? titleWords.join(' ') + ' Tarot'
        : 'Mystic Journey Tarot';
        
      // Set theme components
      const mainTheme = themeWords.length > 2 ? themeWords.slice(0, 2).join(' ') : theme;
      const styleHint = themeWords.length > 3 ? themeWords.slice(-2).join(' ') : 'mystical';
      
      // Auto-populate the fields
      setDeckTitle(generatedTitle);
      setDeckTheme(mainTheme);
      setDeckStyle(styleHint);
      setDeckDescription(`A tarot deck exploring ${theme}. Each card captures the essence of ${mainTheme} with a ${styleHint} artistic style.`);
      
      // Start card generation automatically - with delay to ensure state is properly set
      setTimeout(() => {
        prepareCardGenerationQueue(false);
      }, 500);
    }
  }, [locationState, navigate]);
  
  // Check if the user is logged in
  useEffect(() => {
    if (!user) {
      setNeedsSignIn(true);
    }
  }, [user]);
  
  // Function to generate a unique deck ID based on timestamp and user ID
  const generateDeckId = (userId: string): string => {
    const timestamp = Date.now().toString();
    // Create a simple hash of user ID + timestamp using SHA256
    const hash = SHA256(`${userId}_${timestamp}`).toString().substring(0, 12); // Take first 12 chars of the hash
    return `deck_${timestamp}_${hash}`;
  };

  // Create deck ID upfront for storage purposes
  useEffect(() => {
    if (!deckId && user) {
      setDeckId(generateDeckId(user.id));
    }
  }, [user, deckId]);
  

  
  // Prepare the queue of cards to generate
  const prepareCardGenerationQueue = (includeMinor: boolean) => {
    let queue: CardToGenerate[] = [];
    let order = 0;
    
    // Add major arcana to the queue
    MAJOR_ARCANA_CARDS.forEach(name => {
      queue.push({
        name,
        order: order++,
        cardType: 'major'
      });
    });
    
    // Add minor arcana if fullDeck is true
    if (includeMinor) {
      MINOR_ARCANA_SUITS.forEach(suit => {
        // Pip cards (Ace through 10)
        for (let i = 1; i <= 10; i++) {
          const name = i === 1 ? `Ace of ${suit}` : `${i} of ${suit}`;
          queue.push({
            name,
            order: order++,
            cardType: 'minor',
            suit: suit.toLowerCase() as 'wands' | 'cups' | 'swords' | 'pentacles'
          });
        }
        
        // Court cards (Page, Knight, Queen, King)
        COURT_CARDS.forEach(court => {
          queue.push({
            name: `${court} of ${suit}`,
            order: order++,
            cardType: 'minor',
            suit: suit.toLowerCase() as 'wands' | 'cups' | 'swords' | 'pentacles'
          });
        });
      });
    }
    
    setGenerationQueue(queue);
    setTotalCardsToGenerate(queue.length);
    setFullDeck(includeMinor);
    
    // Start generating cards
    setIsGenerating(true);
  };
  
  // Process generation queue when it changes
  useEffect(() => {
    const startNextGenerations = async () => {
      // Immediately return if no location state or other required conditions are not met
      if (!locationState || !isGenerating || generationQueue.length === 0 || !deckId) return;
      
      // Calculate how many new generations we can start
      const availableSlots = MAX_CONCURRENT_GENERATIONS - activeGenerationTasks.current;
      
      if (availableSlots <= 0) return;
      
      // Take cards to fill available slots
      const cardsToGenerate = generationQueue.slice(0, availableSlots);
      
      if (cardsToGenerate.length === 0) return;
      
      // Update queue by removing the cards we're about to process
      setGenerationQueue(prevQueue => prevQueue.slice(availableSlots));
      
      // Update currently generating list
      const newGeneratingCards: GeneratingCard[] = cardsToGenerate.map(card => ({
        name: card.name,
        descriptionInProgress: true,
        imageInProgress: false,
        order: card.order,
        cardType: card.cardType,
        suit: card.suit,
        descriptionProgress: 0,
        imageProgress: 0
      }));
      
      setCurrentlyGenerating(prev => [...prev, ...newGeneratingCards]);
      
      // Increment counter for active generation tasks
      activeGenerationTasks.current += cardsToGenerate.length;
      
      // Start generation for each card
      cardsToGenerate.forEach(card => {
        generateCard(card);
      });
    };
    
    startNextGenerations();
  }, [generationQueue, isGenerating, currentlyGenerating, deckId, locationState]);
  
  // Generate a single card
  const generateCard = async (cardToGenerate: CardToGenerate) => {
    const { name, order, cardType, suit } = cardToGenerate;
    
    try {
      // Update progress state
      const updateGeneratingCardState = (
        updates: Partial<GeneratingCard>,
        cardName: string
      ) => {
        setCurrentlyGenerating(prev => 
          prev.map(card => 
            card.name === cardName 
              ? { ...card, ...updates } 
              : card
          )
        );
      };
      
      // Generate card description with progress tracking
      updateGeneratingCardState({
        descriptionInProgress: true,
        descriptionProgress: 0
      }, name);
      
      // Add progress callback for description generation
      const onDescriptionProgress = (progress: number) => {
        updateGeneratingCardState({
          descriptionProgress: progress
        }, name);
      };
      
      const description = await generateCardDescription({
        cardName: name,
        deckTheme,
        onProgress: onDescriptionProgress
      });
      
      updateGeneratingCardState({
        descriptionInProgress: false,
        descriptionProgress: 100,
        description,
        imageInProgress: true,
        imageProgress: 0
      }, name);
      
      // Generate card image with progress tracking
      const onImageProgress = (progress: number, stage: 'generating' | 'uploading') => {
        // Map the progress to a range (0-90 for generating, 90-100 for uploading)
        const mappedProgress = stage === 'generating' 
          ? Math.floor(progress * 0.9)  // First 90% for generation
          : 90 + Math.floor(progress * 0.1);  // Last 10% for upload
          
        updateGeneratingCardState({
          imageProgress: mappedProgress
        }, name);
      };
      
      // Generate randomized keywords based on card name and description
      const descriptionWords = description.split(/\s+/);
      const keywordsCount = 3 + Math.floor(Math.random() * 3); // 3-5 keywords
      const keywordsSet = new Set<string>();
      
      // Add standard keywords based on card type
      if (name === 'The Fool') {
        keywordsSet.add('beginnings');
        keywordsSet.add('spontaneity');
      } else if (name === 'Death') {
        keywordsSet.add('transformation');
        keywordsSet.add('change');
      } else if (name === 'The Lovers') {
        keywordsSet.add('harmony');
        keywordsSet.add('connection');
      }
      
      // Add some keywords from description
      while (keywordsSet.size < keywordsCount) {
        const word = descriptionWords[Math.floor(Math.random() * descriptionWords.length)]
          .toLowerCase()
          .replace(/[^a-z]/g, '');
          
        if (word.length > 4) {
          keywordsSet.add(word);
        }
      }
      
      const keywords = Array.from(keywordsSet);
      
      // Generate image URL using Gemini AI with progress tracking
      console.log(`Generating image for card: ${name} with theme: ${deckTheme}`);
      let imageUrl = '';
      
      try {
        const imagePrompt = await generateCardImage({
          cardName: name,
          theme: deckTheme,
          style: deckStyle,
          description: description,
          deckId: deckId || undefined,
          onProgress: onImageProgress
        });
        
        console.log(`Image generation successful for ${name}`, { imageUrl: imagePrompt });
        imageUrl = imagePrompt;
        
        // Ensure we show 100% progress when complete
        updateGeneratingCardState({
          imageProgress: 100,
          imageInProgress: false
        }, name);
        
      } catch (error) {
        console.error(`Error generating image for ${name}:`, error);
        
        // Only use placeholder if we don't have a deck ID
        if (!deckId) {
          throw error; // Re-throw to be caught by the outer catch
        }
        
        // Try to use a placeholder image
        imageUrl = generatePlaceholderImageUrl(name, deckTheme);
      }
      
      // Create the completed card
      const newCard: Card = {
        id: uuidv4(),
        deck_id: deckId || 'temp-deck-id', // This should be set before generating cards
        name,
        description,
        image_url: imageUrl,
        card_type: cardType,
        suit: suit || null,
        keywords,
        order
      };
      
      // Add to generated cards
      setGeneratedCards(prev => [...prev, newCard]);
      
      // Remove from currently generating
      setCurrentlyGenerating(prev => prev.filter(card => card.name !== name));
      
      // Update completed count
      setCompletedCards(prev => prev + 1);
      
      // Decrement active generation tasks counter
      activeGenerationTasks.current -= 1;
      
    } catch (error) {
      console.error(`Error generating card ${name}:`, error);
      
      // Remove from currently generating
      setCurrentlyGenerating(prev => prev.filter(card => card.name !== name));
      
      // Decrement active generation tasks counter
      activeGenerationTasks.current -= 1;
      
      setGenerationError(`Failed to generate ${name}. Please try again.`);
    }
  };
  
  // Regenerate a specific card
  const regenerateCard = async (cardId: string) => {
    // Find the card to regenerate
    const cardToRegenerate = generatedCards.find(card => card.id === cardId);
    if (!cardToRegenerate) return;
    
    // Set active card for UI indication
    setActiveCard(cardId);
    
    try {
      // Generate new description with progress tracking
      const onDescriptionProgress = (progress: number) => {
        setCurrentlyGenerating(prev => 
          prev.map(card => 
            card.name === cardToRegenerate.name
              ? { ...card, descriptionProgress: progress }
              : card
          )
        );
      };
      
      const description = await generateCardDescription({
        cardName: cardToRegenerate.name,
        deckTheme,
        onProgress: onDescriptionProgress
      });
      
      // Generate new image
      const imageUrl = await generateCardImage({
        cardName: cardToRegenerate.name,
        theme: deckTheme,
        style: deckStyle,
        description,
        additionalPrompt: promptValue,
        deckId: deckId || undefined
      });
      
      // Update the card in the state
      setGeneratedCards(prev => 
        prev.map(card => 
          card.id === cardId 
            ? { ...card, description, image_url: imageUrl } 
            : card
        )
      );
    } catch (error) {
      console.error('Error regenerating card:', error);
      setGenerationError('Failed to regenerate card. Please try again.');
    } finally {
      // Clear active card
      setActiveCard(null);
    }
  };
  
  // Apply prompt to all cards
  const applyGlobalPrompt = () => {
    // This would regenerate images for all cards
    // For implementation purposes, we'll show an upgrade modal
    if (generatedCards.length > 5) {
      setShowPaymentModal(true);
    } else {
      setGenerationError('Please generate some cards first before applying a global prompt.');
    }
  };
  
  // Check if all cards are generated
  useEffect(() => {
    if (isGenerating && generationQueue.length === 0 && currentlyGenerating.length === 0 && generatedCards.length > 0) {
      setIsGenerating(false);
      
      // Move to customize step when generation is complete
      if (!isGenerating && generatedCards.length > 0) {
        setCurrentStep('customize');
      }
    }
  }, [isGenerating, generationQueue, currentlyGenerating, generatedCards]);
  // Save deck to database
  const saveDeck = async () => {
    if (!user) {
      setNeedsSignIn(true);
      return;
    }
    
    if (generatedCards.length === 0) {
      setGenerationError('Please generate at least one card before saving your deck.');
      return;
    }
    
    if (!deckId) {
      setGenerationError('Failed to create deck ID. Please try again.');
      return;
    }
    
    setSavingDeck(true);
    
    try {
      // Create or update deck record
      let deckToSave: Deck = {
        id: deckId,
        creator_id: user.id,
        creator_name: user.username || user.email.split('@')[0],
        title: deckTitle,
        description: deckDescription,
        theme: deckTheme,
        style: deckStyle,
        card_count: generatedCards.length,
        price: isSellable ? deckPrice : 0,
        is_free: !isSellable,
        is_listed: isListed, // New property
        is_sellable: isSellable, // New property
        is_public: true, // Always public (can be viewed by direct link)
        cover_image: generatedCards[0]?.image_url || '',
        sample_images: generatedCards.slice(0, 3).map(card => card.image_url),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        purchase_count: 0
      };
      
      // Check if deck already exists
      const { data: existingDeck, error: checkError } = await supabase
        .from('decks')
        .select('id')
        .eq('id', deckId)
        .single();
      
      if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = 'Not Found'
        throw checkError;
      }
      
      if (!existingDeck) {
        // Create new deck
        const { error: insertError } = await supabase
          .from('decks')
          .insert([deckToSave]);
          
        if (insertError) throw insertError;
        
        // Update cards with deck_id
        const cardsToInsert = generatedCards.map(card => ({
          ...card,
          deck_id: deckId
        }));
        
        // Insert cards
        const { error: cardsError } = await supabase
          .from('cards')
          .insert(cardsToInsert);
          
        if (cardsError) throw cardsError;
      } else {
        // Update existing deck
        const { error: updateError } = await supabase
          .from('decks')
          .update(deckToSave)
          .eq('id', deckId);
          
        if (updateError) throw updateError;
        
        // First delete existing cards to avoid conflicts
        const { error: deleteError } = await supabase
          .from('cards')
          .delete()
          .eq('deck_id', deckId);
          
        if (deleteError) throw deleteError;
        
        // Insert updated cards
        const { error: insertError } = await supabase
          .from('cards')
          .insert(generatedCards.map(card => ({
            ...card,
            deck_id: deckId
          })));
          
        if (insertError) throw insertError;
      }
      
      setCreationSuccess(true);
      
    } catch (error) {
      console.error('Error saving deck:', error);
      setGenerationError('Failed to save deck. Please try again.');
    } finally {
      setSavingDeck(false);
    }
  };
  
  // Move to customize step
  const goToCustomizeStep = () => {
    if (generatedCards.length === 0) {
      setGenerationError('Please generate cards first before customizing your deck.');
      return;
    }
    
    setCurrentStep('customize');
  };
  
  // Go back to cards step
  const goToCardsStep = () => {
    setCurrentStep('cards');
  };

  // Calculate overall progress
  const calculateProgress = (): number => {
    const total = totalCardsToGenerate;
    const completed = completedCards;
    if (total === 0) return 0;
    return Math.round((completed / total) * 100);
  };
  
  // Handle 'Create Another Deck' action
  const handleCreateAnother = () => {
    // Reset all states
    setGeneratedCards([]);
    setDeckTitle('Auto-Generated Tarot');
    setDeckDescription('A beautifully generated tarot deck with unique art style.');
    setDeckTheme('mystical');
    setDeckStyle('vibrant');
    setGenerationError(null);
    setGenerationQueue([]);
    setCurrentlyGenerating([]);
    setCompletedCards(0);
    setTotalCardsToGenerate(0);
    setActiveCard(null);
    setIsGenerating(false);
    setFullDeck(false);
    setDeckId(null);
    setCreationSuccess(false);
    
    // Start card generation for the new deck
    setTimeout(() => {
      prepareCardGenerationQueue(false);
    }, 100);
  };
  
  // Handle upgrade to full deck
  const handleFullDeckUpgrade = () => {
    setShowPaymentModal(true);
  };
  
  // Mock payment process
  const processMockPayment = () => {
    setShowPaymentModal(false);
    // Continue with generating the full deck
    prepareCardGenerationQueue(true);
  };

  return (
    <div className="min-h-screen pt-12 pb-20">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-5xl">
          {/* Header */}
          <div className="mt-8 mb-10 text-center">
            <h1 className="text-3xl md:text-4xl font-serif font-bold mb-2">
              {currentStep === 'cards'
                ? 'Generating Your Tarot Cards' 
                : 'Customize Your Deck'}
            </h1>
            <p className="text-muted-foreground max-w-xl mx-auto">
              {currentStep === 'cards' 
                ? 'AI is generating unique cards based on your theme' 
                : 'Add finishing touches to your deck before publishing'}
            </p>
          </div>
          
          {/* Sign In Modal */}
          {needsSignIn && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-card border border-border p-8 rounded-xl max-w-md w-full">
                <h2 className="text-xl font-medium mb-4">Sign In Required</h2>
                <p className="mb-6 text-muted-foreground">Please sign in to create and save your tarot deck.</p>
                
                <div className="flex flex-col gap-3">
                  <button 
                    onClick={() => navigate('/login')}
                    className="btn btn-primary w-full py-2"
                  >
                    Sign In
                  </button>
                  
                  <button 
                    onClick={() => navigate('/signup')}
                    className="btn btn-outline w-full py-2"
                  >
                    Create Account
                  </button>
                  
                  <button 
                    onClick={() => setNeedsSignIn(false)}
                    className="text-sm text-muted-foreground hover:underline mt-2"
                  >
                    Continue as Guest (Limited Features)
                  </button>
                </div>
              </div>
            </div>
          )}
          
          {/* Success Modal */}
          {creationSuccess && (
            <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
              <motion.div 
                className="bg-card rounded-xl overflow-hidden max-w-md w-full"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className="p-8">
                  <div className="flex flex-col items-center mb-6">
                    <div className="w-16 h-16 flex items-center justify-center rounded-full bg-success/20 text-success mb-4">
                      <Check className="h-8 w-8" />
                    </div>
                    <h2 className="text-2xl font-serif font-bold">Deck Created!</h2>
                    <p className="text-muted-foreground text-center mt-2">
                      Your {deckTitle} deck has been successfully saved.
                    </p>
                  </div>
                  
                  <div className="flex flex-col gap-4">
                    <button 
                      onClick={() => {
                        setCreationSuccess(false);
                        navigate('/collection');
                      }}
                      className="btn btn-primary w-full py-2.5 flex items-center justify-center"
                    >
                      <Eye className="mr-2 h-5 w-5" />
                      View My Collection
                    </button>
                    
                    <button 
                      onClick={handleCreateAnother}
                      className="btn btn-secondary w-full py-2.5 flex items-center justify-center"
                    >
                      <Zap className="mr-2 h-5 w-5" />
                      Create Another Deck
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
          
          {/* Payment Modal for Full Deck */}
          {showPaymentModal && (
            <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
              <motion.div 
                className="bg-card rounded-xl overflow-hidden max-w-md w-full"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
              >
                <div className="flex items-center justify-between bg-primary/10 p-4 border-b border-border">
                  <h3 className="font-serif font-bold">Upgrade to Full Deck</h3>
                  <button onClick={() => setShowPaymentModal(false)}>
                    <X className="h-5 w-5 text-muted-foreground hover:text-foreground" />
                  </button>
                </div>
                
                <div className="p-6">
                  <div className="flex items-start gap-3 mb-6 bg-muted/30 p-4 rounded-lg">
                    <Info className="h-5 w-5 text-accent mt-0.5" />
                    <div>
                      <h4 className="font-medium mb-1">Premium Feature</h4>
                      <p className="text-sm text-muted-foreground">
                        Unlock the complete 78-card deck with all minor arcana. This includes cards for all four suits: Wands, Cups, Swords, and Pentacles.
                      </p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="border border-border p-4 rounded-lg">
                      <h4 className="font-medium mb-2">Basic Deck</h4>
                      <ul className="text-sm space-y-2 text-muted-foreground">
                        <li className="flex items-center">
                          <Check className="h-4 w-4 text-success mr-2" />
                          22 Major Arcana Cards
                        </li>
                        <li className="flex items-center">
                          <X className="h-4 w-4 text-muted-foreground mr-2" />
                          Minor Arcana Cards
                        </li>
                        <li className="flex items-center">
                          <Check className="h-4 w-4 text-success mr-2" />
                          Custom Theme & Style
                        </li>
                      </ul>
                      <p className="text-lg font-bold mt-4">Free</p>
                    </div>
                    
                    <div className="border border-primary p-4 rounded-lg bg-primary/5">
                      <h4 className="font-medium mb-2">Full Deck</h4>
                      <ul className="text-sm space-y-2 text-muted-foreground">
                        <li className="flex items-center">
                          <Check className="h-4 w-4 text-success mr-2" />
                          22 Major Arcana Cards
                        </li>
                        <li className="flex items-center">
                          <Check className="h-4 w-4 text-success mr-2" />
                          56 Minor Arcana Cards
                        </li>
                        <li className="flex items-center">
                          <Check className="h-4 w-4 text-success mr-2" />
                          Custom Theme & Style
                        </li>
                      </ul>
                      <p className="text-lg font-bold mt-4">$9.99</p>
                    </div>
                  </div>
                  
                  <button 
                    onClick={processMockPayment}
                    className="w-full btn btn-primary py-2 flex items-center justify-center"
                  >
                    <CreditCard className="mr-2 h-5 w-5" />
                    Upgrade to Full Deck
                  </button>
                  
                  <p className="text-xs text-center text-muted-foreground mt-4">
                    For demo purposes, clicking the button will simulate a payment and unlock the full deck without an actual charge.
                  </p>
                </div>
              </motion.div>
            </div>
          )}
          
          {/* Cards are automatically generated */}
          
          {/* Card Generation Step */}
          {currentStep === 'cards' && (
            <div className="space-y-8">
              {/* Progress and Controls Header */}
              <div className="bg-card border border-border p-6 rounded-xl">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-4">
                  <div>
                    <h2 className="text-xl font-serif font-bold">{deckTitle}</h2>
                    <p className="text-sm text-muted-foreground mt-1">{deckTheme} • {deckStyle}</p>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    {!isGenerating && generatedCards.length > 0 && (
                      <>
                        <button 
                          onClick={goToCustomizeStep}
                          className="btn btn-secondary px-4 py-2 flex items-center"
                        >
                          <ArrowRight className="mr-2 h-4 w-4" />
                          Next: Customize
                        </button>
                        
                        {!fullDeck && (
                          <button 
                            onClick={handleFullDeckUpgrade}
                            className="btn btn-secondary px-4 py-2 flex items-center"
                          >
                            <CreditCard className="mr-2 h-5 w-5" />
                            Upgrade to Full Deck
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
                
                {/* Generation Progress */}
                {isGenerating && (
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-sm text-muted-foreground">Generating cards...</div>
                      <div className="text-sm font-medium">
                        {completedCards} of {totalCardsToGenerate} cards
                      </div>
                    </div>
                    <div className="w-full bg-muted/30 rounded-full h-2.5 overflow-hidden">
                      <div 
                        className="bg-primary h-2.5 rounded-full transition-all duration-300"
                        style={{ width: `${calculateProgress()}%` }}
                      ></div>
                    </div>
                  </div>
                )}
                
                {/* Error Message */}
                {generationError && (
                  <div className="p-3 border border-destructive/30 bg-destructive/10 rounded-lg flex items-start gap-2 mt-4">
                    <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                    <p className="text-sm text-destructive">{generationError}</p>
                  </div>
                )}
              </div>
              
              {/* Cards Currently Being Generated */}
              {currentlyGenerating.length > 0 && (
                <div className="bg-card border border-border p-6 rounded-xl">
                  <h3 className="text-lg font-serif font-medium mb-4 flex items-center">
                    <Loader className="h-4 w-4 text-primary animate-spin mr-2" />
                    Cards in Progress
                  </h3>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {currentlyGenerating.map((card, index) => (
                      <div key={index} className="bg-muted/20 rounded-lg p-4 border border-input">
                        <h4 className="font-medium text-center mb-3">{card.name}</h4>
                        
                        <div className="space-y-3">
                          {/* Description Progress */}
                          <div>
                            <div className="flex justify-between text-xs mb-1">
                              <span>Description</span>
                              <span>{card.descriptionProgress}%</span>
                            </div>
                            <div className="w-full bg-muted/30 rounded-full h-1.5 overflow-hidden">
                              <div 
                                className="bg-primary h-1.5 rounded-full transition-all duration-300"
                                style={{ width: `${card.descriptionProgress}%` }}
                              ></div>
                            </div>
                          </div>
                          
                          {/* Image Progress - only show if description is done */}
                          {!card.descriptionInProgress && (
                            <div>
                              <div className="flex justify-between text-xs mb-1">
                                <span>Image</span>
                                <span>{card.imageProgress}%</span>
                              </div>
                              <div className="w-full bg-muted/30 rounded-full h-1.5 overflow-hidden">
                                <div 
                                  className="bg-accent h-1.5 rounded-full transition-all duration-300"
                                  style={{ width: `${card.imageProgress}%` }}
                                ></div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Enhancement Prompt */}
              <div className="bg-card border border-border p-6 rounded-xl">
                <h3 className="text-lg font-serif font-medium mb-4">Enhance Your Cards</h3>
                <PromptEditor
                  initialValue={promptValue}
                  onChange={setPromptValue}
                  onSubmit={applyGlobalPrompt}
                  disabled={isGenerating || generatedCards.length === 0}
                />
              </div>
              
              {/* Generated Cards Gallery */}
              {generatedCards.length > 0 ? (
                <div className="bg-card border border-border p-6 rounded-xl">
                  <h3 className="text-lg font-serif font-medium mb-6 flex items-center justify-between">
                    <span>Generated Cards ({generatedCards.length})</span>
                    
                    {!fullDeck && generatedCards.length >= MAJOR_ARCANA_CARDS.length && (
                      <button
                        onClick={handleFullDeckUpgrade}
                        className="text-sm btn btn-accent flex items-center"
                      >
                        <Zap className="mr-1 h-4 w-4" />
                        Upgrade to Full 78-Card Deck
                      </button>
                    )}
                  </h3>
                  
                  <CardGallery 
                    cards={generatedCards} 
                    onRegenerateCard={regenerateCard}
                    isRegenerating={!!activeCard}
                    activeCardId={activeCard}
                  />
                </div>
              ) : (
                <div className="bg-card border border-border p-6 rounded-xl text-center">
                  <div className="py-8">
                    <Loader className="h-10 w-10 text-primary animate-spin mx-auto mb-4" />
                    <p className="text-muted-foreground">
                      Your mystical deck is being crafted...
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Customize Step */}
          {currentStep === 'customize' && (
            <div className="space-y-8">
              <div className="bg-card border border-border p-6 rounded-xl">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                  <div>
                    <h2 className="text-xl font-serif font-bold">Deck Settings</h2>
                    <p className="text-sm text-muted-foreground mt-1">Control how your deck appears to others</p>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={goToCardsStep}
                      className="btn btn-ghost border border-input px-4 py-2 flex items-center"
                    >
                      Back to Cards
                    </button>
                  </div>
                </div>
                
                {/* Visibility and Sellability Options */}
                <div className="space-y-6 mb-6">
                  <div className="p-4 border border-border rounded-lg">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        {isListed ? (
                          <Eye className="h-5 w-5 text-success" />
                        ) : (
                          <EyeOff className="h-5 w-5 text-muted-foreground" />
                        )}
                        <div>
                          <h3 className="font-medium">Visibility</h3>
                          <p className="text-sm text-muted-foreground">
                            Control whether your deck appears in the marketplace
                          </p>
                        </div>
                      </div>
                      
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                          type="checkbox" 
                          className="sr-only peer" 
                          checked={isListed}
                          onChange={() => setIsListed(!isListed)}
                        />
                        <div className="w-11 h-6 bg-muted peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-muted after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                      </label>
                    </div>
                    
                    <div className="text-sm text-muted-foreground bg-muted/30 p-3 rounded-lg">
                      {isListed ? (
                        <p>Your deck will be visible in the marketplace for others to discover.</p>
                      ) : (
                        <p>Your deck will be hidden from the marketplace, but still accessible via direct link.</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="p-4 border border-border rounded-lg">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        {isSellable ? (
                          <DollarSign className="h-5 w-5 text-success" />
                        ) : (
                          <Zap className="h-5 w-5 text-accent" />
                        )}
                        <div>
                          <h3 className="font-medium">Pricing</h3>
                          <p className="text-sm text-muted-foreground">
                            Set whether your deck is free or paid
                          </p>
                        </div>
                      </div>
                      
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                          type="checkbox" 
                          className="sr-only peer" 
                          checked={isSellable}
                          onChange={() => setIsSellable(!isSellable)}
                        />
                        <div className="w-11 h-6 bg-muted peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-muted after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                      </label>
                    </div>
                    
                    <div className="text-sm text-muted-foreground bg-muted/30 p-3 rounded-lg mb-4">
                      {isSellable ? (
                        <p>Your deck will be available for purchase at the price you set.</p>
                      ) : (
                        <p>Your deck will be free for anyone to use.</p>
                      )}
                    </div>
                    
                    {isSellable && (
                      <div className="mt-4">
                        <label htmlFor="deckPrice" className="block text-sm font-medium mb-2">
                          Price (USD)
                        </label>
                        <div className="relative">
                          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">
                            <DollarSign className="h-4 w-4" />
                          </div>
                          <input
                            id="deckPrice"
                            type="number"
                            min="0.99"
                            step="0.01"
                            value={deckPrice}
                            onChange={(e) => setDeckPrice(parseFloat(e.target.value))}
                            className="w-full pl-9 pr-4 py-2 rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                            placeholder="9.99"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Save Deck Button */}
                <div className="flex justify-end">
                  <button 
                    onClick={saveDeck}
                    disabled={savingDeck}
                    className="btn btn-primary px-6 py-2 flex items-center"
                  >
                    {savingDeck ? (
                      <>
                        <span className="h-4 w-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin mr-2"></span>
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-5 w-5" />
                        Save Deck
                      </>
                    )}
                  </button>
                </div>
              </div>
              
              {/* Preview Section */}
              <div className="bg-card border border-border p-6 rounded-xl">
                <h3 className="text-lg font-serif font-medium mb-6">Deck Preview</h3>
                
                <div className="flex flex-col md:flex-row gap-6">
                  <div className="md:w-1/3">
                    <div className="rounded-lg overflow-hidden aspect-[3/4]">
                      <img 
                        src={generatedCards[0]?.image_url}
                        alt="Deck Cover"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>
                  
                  <div className="md:w-2/3">
                    <div className="mb-4">
                      <label htmlFor="deckTitle" className="block text-sm font-medium mb-1">
                        Deck Name
                      </label>
                      <input
                        id="deckTitle"
                        type="text"
                        value={deckTitle}
                        onChange={(e) => setDeckTitle(e.target.value)}
                        className="w-full p-2 rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                        placeholder="Enter deck name"
                      />
                    </div>
                    
                    <p className="text-muted-foreground text-sm mb-4">
                      {deckTheme} • {deckStyle}
                    </p>
                    
                    <div className="mb-4">
                      <label htmlFor="deckDescription" className="block text-sm font-medium mb-1">
                        Deck Description
                      </label>
                      <textarea
                        id="deckDescription"
                        value={deckDescription}
                        onChange={(e) => setDeckDescription(e.target.value)}
                        className="w-full p-2 rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary min-h-[100px]"
                        placeholder="Describe your deck"
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 mt-6">
                      <div className="border border-border p-3 rounded-lg">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                            {isListed ? (
                              <Eye className="h-4 w-4 text-primary" />
                            ) : (
                              <EyeOff className="h-4 w-4 text-muted-foreground" />
                            )}
                          </div>
                          <div>
                            <h5 className="text-sm font-medium">{isListed ? 'Listed' : 'Not Listed'}</h5>
                            <p className="text-xs text-muted-foreground">
                              {isListed ? 'Visible in marketplace' : 'Hidden from marketplace'}
                            </p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="border border-border p-3 rounded-lg">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                            {isSellable ? (
                              <DollarSign className="h-4 w-4 text-primary" />
                            ) : (
                              <Zap className="h-4 w-4 text-accent" />
                            )}
                          </div>
                          <div>
                            <h5 className="text-sm font-medium">{isSellable ? `$${deckPrice.toFixed(2)}` : 'Free'}</h5>
                            <p className="text-xs text-muted-foreground">
                              {isSellable ? 'Paid deck' : 'Free to use'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Generated Cards Preview */}
              <div className="bg-card border border-border p-6 rounded-xl">
                <h3 className="text-lg font-serif font-medium mb-4">Card Gallery</h3>
                
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
                  {generatedCards.map((card) => (
                    <div key={card.id} className="relative aspect-[2/3] rounded-md overflow-hidden">
                      <img 
                        src={card.image_url} 
                        alt={card.name}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                        <h4 className="text-white text-xs font-medium truncate">{card.name}</h4>
                      </div>
                    </div>
                  ))}
                  
                  {generatedCards.length > 12 && (
                    <div className="relative aspect-[2/3] rounded-md overflow-hidden bg-black/50 flex items-center justify-center">
                      <div className="text-center text-white">
                        <p className="text-lg font-bold">+{generatedCards.length - 12}</p>
                        <p className="text-xs">more cards</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DeckCreator;