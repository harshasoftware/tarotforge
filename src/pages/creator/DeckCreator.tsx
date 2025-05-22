import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Wand2, Sparkles, Save, ArrowRight, AlertCircle, Check, Crown, TrendingUp } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSubscription } from '../../context/SubscriptionContext';
import { useDeckLimits } from '../../context/DeckLimitContext';
import CreatorOnboarding from '../../components/creator/CreatorOnboarding';
import PromptEditor from '../../components/creator/PromptEditor';
import CardGallery from '../../components/creator/CardGallery';
import DeckUsageEstimate from '../../components/creator/DeckUsageEstimate';
import { generateCardDescription, generateCardImage, generateThemeSuggestions } from '../../lib/gemini-ai';
import { supabase } from '../../lib/supabase';
import { v4 as uuidv4 } from 'uuid';
import { Card } from '../../types';
import TarotLogo from '../../components/ui/TarotLogo';

// Major Arcana card names
const majorArcanaCards = [
  'The Fool', 'The Magician', 'The High Priestess', 'The Empress', 'The Emperor',
  'The Hierophant', 'The Lovers', 'The Chariot', 'Strength', 'The Hermit',
  'Wheel of Fortune', 'Justice', 'The Hanged Man', 'Death', 'Temperance',
  'The Devil', 'The Tower', 'The Star', 'The Moon', 'The Sun',
  'Judgement', 'The World'
];

// Minor Arcana suits and values
const minorArcanaSuits = ['Wands', 'Cups', 'Swords', 'Pentacles'];
const minorArcanaValues = [
  'Ace', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
  'Page', 'Knight', 'Queen', 'King'
];

const DeckCreator: React.FC = () => {
  const { user } = useAuth();
  const { isSubscribed } = useSubscription();
  const { canGenerateMajorArcana, canGenerateCompleteDeck } = useDeckLimits();
  const navigate = useNavigate();
  
  // Onboarding state
  const [showOnboarding, setShowOnboarding] = useState(true);
  
  // Deck creation state
  const [deckId, setDeckId] = useState<string>('');
  const [deckTitle, setDeckTitle] = useState('');
  const [deckDescription, setDeckDescription] = useState('');
  const [deckTheme, setDeckTheme] = useState('');
  const [deckStyle, setDeckStyle] = useState('');
  const [imageQuality, setImageQuality] = useState<'medium' | 'high'>('medium');
  const [themeSuggestions, setThemeSuggestions] = useState<string[]>([]);
  
  // Card generation state
  const [generatingCard, setGeneratingCard] = useState(false);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [generatedCards, setGeneratedCards] = useState<Card[]>([]);
  const [regeneratingCardId, setRegeneratingCardId] = useState<string | null>(null);
  const [cardPrompt, setCardPrompt] = useState('');
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generationStage, setGenerationStage] = useState<'description' | 'image'>('description');
  
  // Saving state
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setError] = useState<string | null>(null);
  
  // Upgrade modal state
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  
  // Load theme suggestions on mount
  useEffect(() => {
    const loadThemeSuggestions = async () => {
      try {
        const suggestions = await generateThemeSuggestions(8);
        setThemeSuggestions(suggestions);
      } catch (error) {
        console.error('Error loading theme suggestions:', error);
      }
    };
    
    loadThemeSuggestions();
  }, []);
  
  // Handle onboarding completion
  const handleOnboardingComplete = () => {
    setShowOnboarding(false);
    // Generate a new deck ID
    setDeckId(uuidv4());
  };
  
  // Start card generation process
  const startCardGeneration = async () => {
    if (!deckTitle || !deckTheme || !deckStyle) {
      alert('Please fill in all required fields');
      return;
    }
    
    try {
      // Create the deck in the database first
      const { data: deck, error: deckError } = await supabase
        .from('decks')
        .insert([{
          creator_id: user?.id,
          title: deckTitle,
          description: deckDescription || `A ${deckTheme} themed tarot deck with ${deckStyle} style.`,
          theme: deckTheme,
          style: deckStyle,
          card_count: isSubscribed || canGenerateCompleteDeck ? 78 : 22,
          price: 0,
          is_free: true,
          is_public: true,
          is_listed: false,
          is_sellable: false,
          cover_image: 'https://images.pexels.com/photos/6044266/pexels-photo-6044266.jpeg', // Placeholder
          sample_images: []
        }])
        .select()
        .single();
        
      if (deckError) {
        throw deckError;
      }
      
      // Update the deck ID
      setDeckId(deck.id);
      
      // Start generating the first card
      generateNextCard(deck.id, 0);
    } catch (error) {
      console.error('Error creating deck:', error);
      setError('Failed to create deck. Please try again.');
    }
  };
  
  // Generate the next card in sequence
  const generateNextCard = async (deckId: string, index: number) => {
    // Determine if we're generating Major or Minor Arcana
    const isMajorArcana = index < majorArcanaCards.length;
    
    // Check if we should stop at Major Arcana (22 cards) for free users
    if (index >= majorArcanaCards.length && !(isSubscribed || canGenerateCompleteDeck)) {
      setShowUpgradeModal(true);
      return;
    }
    
    // Get the card name
    let cardName = '';
    if (isMajorArcana) {
      cardName = majorArcanaCards[index];
    } else {
      const suitIndex = Math.floor((index - majorArcanaCards.length) / minorArcanaValues.length);
      const valueIndex = (index - majorArcanaCards.length) % minorArcanaValues.length;
      cardName = `${minorArcanaValues[valueIndex]} of ${minorArcanaSuits[suitIndex]}`;
    }
    
    setGeneratingCard(true);
    setCurrentCardIndex(index);
    setGenerationStage('description');
    setGenerationProgress(0);
    
    try {
      // Generate card description
      const description = await generateCardDescription(cardName, index);
      
      // Generate card image
      const imageUrl = await generateCardImage(cardName, description);
      
      // Create a new card object
      const newCard: Card = {
        id: uuidv4(),
        deck_id: deckId,
        name: cardName,
        description,
        image_url: imageUrl,
        card_type: isMajorArcana ? 'major' : 'minor',
        suit: isMajorArcana ? undefined : minorArcanaSuits[Math.floor((index - majorArcanaCards.length) / minorArcanaValues.length)].toLowerCase() as any,
        keywords: extractKeywords(description),
        order: index
      };
      
      // Add the card to the generated cards array
      setGeneratedCards(prev => [...prev, newCard]);
      
      // Save the card to the database
      const { error: cardError } = await supabase
        .from('cards')
        .insert([{
          id: newCard.id,
          deck_id: deckId,
          name: newCard.name,
          description: newCard.description,
          image_url: newCard.image_url,
          card_type: newCard.card_type,
          suit: newCard.suit,
          keywords: newCard.keywords,
          order: newCard.order
        }]);
        
      if (cardError) {
        console.error('Error saving card:', cardError);
      }
      
      // If this is the first card, update the deck cover image
      if (index === 0) {
        const { error: updateError } = await supabase
          .from('decks')
          .update({
            cover_image: newCard.image_url,
            sample_images: [newCard.image_url]
          })
          .eq('id', deckId);
          
        if (updateError) {
          console.error('Error updating deck cover:', updateError);
        }
      }
      
      // Move to the next card or finish
      setGeneratingCard(false);
      
      // Determine if we should continue generating cards
      const cardLimit = isSubscribed || canGenerateCompleteDeck ? 78 : 22;
      if (index + 1 < cardLimit) {
        // Generate the next card after a short delay
        setTimeout(() => {
          generateNextCard(deckId, index + 1);
        }, 500);
      }
    } catch (error) {
      console.error('Error generating card:', error);
      setGeneratingCard(false);
      setError('Failed to generate card. Please try again.');
    }
  };
  
  // Generate card description
  const generateCardDescription = async (cardName: string, cardIndex: number): Promise<string> => {
    try {
      // Update progress for description generation
      const updateDescriptionProgress = (progress: number) => {
        setGenerationProgress(progress / 2); // Description is first half of progress
      };
      
      // Generate the description
      const description = await generateCardDescription({
        cardName,
        deckTheme: deckTheme,
        onProgress: updateDescriptionProgress
      });
      
      setGenerationStage('image');
      setGenerationProgress(50); // Start image generation at 50%
      
      return description;
    } catch (error) {
      console.error('Error generating description:', error);
      return `The ${cardName} represents a powerful symbol in tarot. In the context of ${deckTheme}, it connects to themes of transformation and insight.`;
    }
  };
  
  // Generate card image
  const generateCardImage = async (cardName: string, description: string): Promise<string> => {
    try {
      // Update progress for image generation
      const updateImageProgress = (progress: number, stage: 'generating' | 'uploading') => {
        // Image is second half of progress (50-100%)
        const baseProgress = 50;
        const adjustedProgress = baseProgress + (progress / 2);
        setGenerationProgress(adjustedProgress);
      };
      
      // Generate the image
      const imageUrl = await generateCardImage({
        cardName,
        theme: deckTheme,
        style: deckStyle,
        description,
        additionalPrompt: cardPrompt,
        deckId,
        onProgress: updateImageProgress
      });
      
      return imageUrl;
    } catch (error) {
      console.error('Error generating image:', error);
      // Return a placeholder image
      return `https://placehold.co/600x900?text=${encodeURIComponent(cardName)}`;
    }
  };
  
  // Extract keywords from description
  const extractKeywords = (description: string): string[] => {
    // Simple keyword extraction - split by commas and periods, then clean up
    const words = description.split(/[,.;]/).map(word => word.trim());
    const keywords = words
      .filter(word => word.length > 3 && word.length < 20)
      .slice(0, 5);
    
    return keywords;
  };
  
  // Regenerate a specific card
  const handleRegenerateCard = async (cardId: string) => {
    // Find the card to regenerate
    const cardToRegenerate = generatedCards.find(card => card.id === cardId);
    if (!cardToRegenerate) return;
    
    setRegeneratingCardId(cardId);
    setGenerationStage('description');
    setGenerationProgress(0);
    
    try {
      // Generate new description
      const description = await generateCardDescription(cardToRegenerate.name, cardToRegenerate.order);
      
      // Generate new image
      const imageUrl = await generateCardImage(cardToRegenerate.name, description);
      
      // Update the card
      const updatedCard = {
        ...cardToRegenerate,
        description,
        image_url: imageUrl,
        keywords: extractKeywords(description)
      };
      
      // Update the generated cards array
      setGeneratedCards(prev => 
        prev.map(card => card.id === cardId ? updatedCard : card)
      );
      
      // Update the card in the database
      const { error: updateError } = await supabase
        .from('cards')
        .update({
          description: updatedCard.description,
          image_url: updatedCard.image_url,
          keywords: updatedCard.keywords
        })
        .eq('id', cardId);
        
      if (updateError) {
        console.error('Error updating card:', updateError);
      }
      
      // If this is the first card, update the deck cover image
      if (cardToRegenerate.order === 0) {
        const { error: deckUpdateError } = await supabase
          .from('decks')
          .update({
            cover_image: updatedCard.image_url,
            sample_images: [updatedCard.image_url]
          })
          .eq('id', deckId);
          
        if (deckUpdateError) {
          console.error('Error updating deck cover:', deckUpdateError);
        }
      }
    } catch (error) {
      console.error('Error regenerating card:', error);
      setError('Failed to regenerate card. Please try again.');
    } finally {
      setRegeneratingCardId(null);
    }
  };
  
  // Save the deck
  const saveDeck = async () => {
    if (!deckId) return;
    
    setIsSaving(true);
    setError(null);
    
    try {
      // Update the deck in the database
      const { error: updateError } = await supabase
        .from('decks')
        .update({
          title: deckTitle,
          description: deckDescription,
          theme: deckTheme,
          style: deckStyle,
          is_listed: true, // Make it visible in the marketplace
          updated_at: new Date().toISOString()
        })
        .eq('id', deckId);
        
      if (updateError) {
        throw updateError;
      }
      
      setSaveSuccess(true);
      
      // Navigate to the deck details page after a delay
      setTimeout(() => {
        navigate(`/marketplace/${deckId}`);
      }, 2000);
    } catch (error) {
      console.error('Error saving deck:', error);
      setError('Failed to save deck. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };
  
  // If showing onboarding, render the onboarding component
  if (showOnboarding) {
    return <CreatorOnboarding onComplete={handleOnboardingComplete} />;
  }
  
  return (
    <div className="min-h-screen pt-12 pb-20">
      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-serif font-bold mb-6 mt-8">Create Your Tarot Deck</h1>
          
          {/* Deck Setup Form */}
          {generatedCards.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="bg-card border border-border rounded-xl p-6 mb-8"
            >
              <h2 className="text-xl font-serif font-bold mb-4">Deck Details</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label htmlFor="deckTitle" className="block text-sm font-medium mb-1">
                      Deck Title <span className="text-destructive">*</span>
                    </label>
                    <input
                      id="deckTitle"
                      type="text"
                      value={deckTitle}
                      onChange={(e) => setDeckTitle(e.target.value)}
                      placeholder="Enter a name for your deck"
                      className="w-full p-2 rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                      required
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="deckDescription" className="block text-sm font-medium mb-1">
                      Description
                    </label>
                    <textarea
                      id="deckDescription"
                      value={deckDescription}
                      onChange={(e) => setDeckDescription(e.target.value)}
                      placeholder="Describe your deck's concept and inspiration"
                      className="w-full p-2 rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                      rows={3}
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="imageQuality" className="block text-sm font-medium mb-1">
                      Image Quality
                    </label>
                    <select
                      id="imageQuality"
                      value={imageQuality}
                      onChange={(e) => setImageQuality(e.target.value as 'medium' | 'high')}
                      className="w-full p-2 rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="medium">Medium (Standard)</option>
                      <option value="high" disabled={!isSubscribed}>High (Premium)</option>
                    </select>
                    {!isSubscribed && (
                      <p className="text-xs text-muted-foreground mt-1">
                        High quality requires Creator or Visionary subscription
                      </p>
                    )}
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label htmlFor="deckTheme" className="block text-sm font-medium mb-1">
                      Theme <span className="text-destructive">*</span>
                    </label>
                    <input
                      id="deckTheme"
                      type="text"
                      value={deckTheme}
                      onChange={(e) => setDeckTheme(e.target.value)}
                      placeholder="e.g., Celestial, Gothic, Nature, Steampunk"
                      className="w-full p-2 rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                      required
                    />
                    
                    {/* Theme suggestions */}
                    <div className="flex flex-wrap gap-2 mt-2">
                      {themeSuggestions.map((theme, index) => (
                        <button
                          key={index}
                          onClick={() => setDeckTheme(theme)}
                          className="text-xs bg-primary/20 hover:bg-primary/30 text-primary-foreground px-2 py-1 rounded-full transition-colors"
                        >
                          {theme}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <label htmlFor="deckStyle" className="block text-sm font-medium mb-1">
                      Art Style <span className="text-destructive">*</span>
                    </label>
                    <input
                      id="deckStyle"
                      type="text"
                      value={deckStyle}
                      onChange={(e) => setDeckStyle(e.target.value)}
                      placeholder="e.g., Watercolor, Digital, Art Nouveau, Minimalist"
                      className="w-full p-2 rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                      required
                    />
                    
                    {/* Style suggestions */}
                    <div className="flex flex-wrap gap-2 mt-2">
                      {['Watercolor', 'Digital Art', 'Art Nouveau', 'Minimalist', 'Oil Painting', 'Surrealist', 'Photorealistic', 'Anime'].map((style, index) => (
                        <button
                          key={index}
                          onClick={() => setDeckStyle(style)}
                          className="text-xs bg-accent/20 hover:bg-accent/30 text-accent-foreground px-2 py-1 rounded-full transition-colors"
                        >
                          {style}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  <PromptEditor
                    initialValue={cardPrompt}
                    onChange={setCardPrompt}
                    onSubmit={() => {}}
                  />
                </div>
              </div>
              
              {/* Deck usage estimate */}
              <DeckUsageEstimate 
                imageQuality={imageQuality} 
                cardCount={isSubscribed || canGenerateCompleteDeck ? 78 : 22} 
              />
              
              <div className="flex justify-end">
                <button
                  onClick={startCardGeneration}
                  disabled={!deckTitle || !deckTheme || !deckStyle}
                  className="btn btn-primary py-2 px-6 flex items-center"
                >
                  <Wand2 className="mr-2 h-5 w-5" />
                  Start Generating Cards
                </button>
              </div>
            </motion.div>
          ) : (
            <>
              {/* Card Generation Progress */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="bg-card border border-border rounded-xl p-6 mb-8"
              >
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-serif font-bold">{deckTitle}</h2>
                  <div className="text-sm text-muted-foreground">
                    {generatedCards.length} of {isSubscribed || canGenerateCompleteDeck ? 78 : 22} cards generated
                  </div>
                </div>
                
                {/* Generation progress bar */}
                {generatingCard && (
                  <div className="mb-6">
                    <div className="flex justify-between text-sm mb-2">
                      <span>Generating: {majorArcanaCards.includes(generatedCards.length < majorArcanaCards.length ? majorArcanaCards[generatedCards.length] : 'Minor Arcana')}</span>
                      <span className="text-primary">{generationStage === 'description' ? 'Creating description' : 'Creating image'}</span>
                    </div>
                    <div className="w-full h-2 bg-muted/30 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary rounded-full transition-all duration-300"
                        style={{ width: `${generationProgress}%` }}
                      ></div>
                    </div>
                  </div>
                )}
                
                {/* Generated cards gallery */}
                <CardGallery 
                  cards={generatedCards} 
                  onRegenerateCard={handleRegenerateCard}
                  isRegenerating={!!regeneratingCardId}
                  activeCardId={regeneratingCardId}
                />
                
                {/* Save deck button */}
                {generatedCards.length > 0 && !generatingCard && (
                  <div className="mt-6 pt-6 border-t border-border flex justify-between items-center">
                    {saveSuccess ? (
                      <div className="flex items-center text-success">
                        <Check className="h-5 w-5 mr-2" />
                        <span>Deck saved successfully! Redirecting...</span>
                      </div>
                    ) : saveError ? (
                      <div className="flex items-center text-destructive">
                        <AlertCircle className="h-5 w-5 mr-2" />
                        <span>{saveError}</span>
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground">
                        {generatedCards.length === (isSubscribed || canGenerateCompleteDeck ? 78 : 22) 
                          ? 'All cards have been generated!' 
                          : 'Cards are being generated automatically...'}
                      </div>
                    )}
                    
                    <button
                      onClick={saveDeck}
                      disabled={isSaving || generatingCard}
                      className="btn btn-primary py-2 px-6 flex items-center"
                    >
                      {isSaving ? (
                        <>
                          <span className="h-5 w-5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin mr-2"></span>
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
                )}
              </motion.div>
            </>
          )}
        </div>
      </div>
      
      {/* Upgrade Modal */}
      {showUpgradeModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <motion.div 
            className="bg-card rounded-xl overflow-hidden max-w-md w-full"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
          >
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-warning/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Crown className="h-8 w-8 text-warning" />
              </div>
              <h2 className="text-2xl font-serif font-bold mb-2">Upgrade to Continue</h2>
              <p className="text-muted-foreground mb-6">
                You've generated all 22 Major Arcana cards. To generate the remaining 56 Minor Arcana cards, you'll need to upgrade.
              </p>
              
              <div className="space-y-3">
                <a
                  href={`/subscription?plan=explorer-plus&deckId=${deckId}`}
                  className="btn btn-warning w-full py-2 flex items-center justify-center"
                >
                  <TrendingUp className="mr-2 h-5 w-5" />
                  Upgrade This Deck ($5)
                </a>
                
                <a
                  href="/subscription"
                  className="btn btn-primary w-full py-2 flex items-center justify-center"
                >
                  <Crown className="mr-2 h-5 w-5" />
                  View Subscription Plans
                </a>
                
                <button
                  onClick={() => setShowUpgradeModal(false)}
                  className="btn btn-ghost border border-input w-full py-2"
                >
                  Continue with Major Arcana Only
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default DeckCreator;