import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import { uploadImageFromUrl } from './storage-utils';
import type { AIModel } from '../types';

// Google Generative AI configuration
const apiKey = import.meta.env.VITE_GOOGLE_AI_API_KEY || '';

// Log warning instead of error to avoid breaking the application
if (!apiKey) {
  console.warn('Google AI API key is missing. Tarot readings and descriptions will use fallback content.');
}

// Initialize Google Generative AI with a fallback for missing API key
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

export const getGeminiModel = (modelName: AIModel = 'gemini-pro') => {
  if (!genAI) {
    throw new Error('Google AI API key is not configured. Please add your API key to the .env file.');
  }
  return genAI.getGenerativeModel({ model: modelName });
};

export const generateCardDescription = async (
  cardName: string,
  deckTheme: string
) => {
  if (!apiKey) {
    // Return a fallback description when API key is missing
    return `The ${cardName} represents a powerful symbol in tarot. In the context of ${deckTheme}, it connects to themes of transformation and insight. Key symbols include mystical elements that resonate with the card's traditional meanings. When this card appears in a reading, consider how its energy might be guiding you forward.`;
  }
  
  try {
    const model = getGeminiModel();
    
    const prompt = `
      Create a mystical and evocative description for the "${cardName}" tarot card 
      that fits within a deck with the theme: "${deckTheme}".
      
      Include:
      - The card's traditional meaning
      - How it relates specifically to the "${deckTheme}" theme
      - Key symbols that should be included in the imagery
      - A short interpretation for readings
      
      Keep the response under 150 words and focus on imagery and symbolism.
    `;
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error('Error generating card description:', error);
    return `The ${cardName} represents a powerful symbol in tarot. In the context of ${deckTheme}, it connects to themes of transformation and insight. Key symbols include mystical elements that resonate with the card's traditional meanings. When this card appears in a reading, consider how its energy might be guiding you forward.`;
  }
};

export const generateCardImage = async (
  details: {
    cardName: string;
    theme: string;
    style: string;
    description: string;
    additionalPrompt?: string;
    deckId?: string; // Added for storage
  }
) => {
  if (!apiKey) {
    // Return a placeholder image URL if API key is missing
    const placeholderUrl = generatePlaceholderImageUrl(details.cardName, details.theme);
    
    // If deckId is provided, try to store the placeholder image
    if (details.deckId) {
      try {
        return await uploadImageFromUrl(
          placeholderUrl,
          details.deckId,
          details.cardName
        );
      } catch (error) {
        console.error('Error uploading placeholder image to storage:', error);
        return placeholderUrl;
      }
    }
    
    return placeholderUrl;
  }
  
  try {
    // Initialize the generative AI client with your API key - no need to recreate it if we already have genAI
    if (!genAI) {
      console.warn('Google AI client not initialized. Using placeholder images.');
      return generatePlaceholderImageUrl(details.cardName, details.theme);
    }
    
    // Create a detailed, theme-driven prompt using the provided template structure
    // Format: [Card Name] tarot card in [Theme/Style], featuring [main subject, symbolism, mood, key elements]. Include [colors, background, motifs]. Artistic, mystical, detailed, with border and card name at bottom.
    
    // Extract key elements from the description to highlight in the prompt
    const descriptionParts = details.description.split('.');
    const keySymbols = descriptionParts.find(part => part.toLowerCase().includes('symbol')) || descriptionParts[0];
    
    // Determine the main subject and mood based on the card name and theme
    let mainSubject = '';
    let mood = '';
    
    switch(details.cardName) {
      // Major Arcana (22 cards)
      case 'The Fool':
        mainSubject = 'a youthful figure stepping off a cliff with a small white dog';
        mood = 'carefree, spontaneous';
        break;
      case 'The Magician':
        mainSubject = 'a confident figure with tools of the elements arranged on a table';
        mood = 'focused, empowered';
        break;
      case 'The High Priestess':
        mainSubject = 'a serene woman seated between pillars with a scroll or book';
        mood = 'mysterious, intuitive';
        break;
      case 'The Empress':
        mainSubject = 'a fertile goddess figure in a lush garden with symbols of abundance';
        mood = 'nurturing, abundant';
        break;
      case 'The Emperor':
        mainSubject = 'a powerful ruler on a throne with rams head symbols';
        mood = 'authoritative, structured';
        break;
      case 'The Hierophant':
        mainSubject = 'a religious leader seated between two pillars with acolytes';
        mood = 'traditional, spiritual';
        break;
      case 'The Lovers':
        mainSubject = 'two figures in harmony with divine energy above them';
        mood = 'harmonious, connected';
        break;
      case 'The Chariot':
        mainSubject = 'a triumphant figure in a chariot drawn by sphinxes or horses';
        mood = 'determined, victorious';
        break;
      case 'Strength':
        mainSubject = 'a serene figure gently closing the mouth of a lion';
        mood = 'courageous, patient';
        break;
      case 'The Hermit':
        mainSubject = 'an old sage with a lantern on a mountain path';
        mood = 'introspective, solitary';
        break;
      case 'Wheel of Fortune':
        mainSubject = 'a cosmic wheel with mystical creatures at cardinal points';
        mood = 'cyclical, destined';
        break;
      case 'Justice':
        mainSubject = 'a figure with scales and sword seated on a throne';
        mood = 'balanced, fair';
        break;
      case 'The Hanged Man':
        mainSubject = 'a figure suspended upside-down from one foot with a halo';
        mood = 'surrendering, contemplative';
        break;
      case 'Death':
        mainSubject = 'a skeletal figure or phoenix symbolizing transformation';
        mood = 'transformative, renewing';
        break;
      case 'Temperance':
        mainSubject = 'an angelic figure mixing water between cups with one foot in water';
        mood = 'balanced, harmonious';
        break;
      case 'The Devil':
        mainSubject = 'a horned figure on a pedestal with chained figures below';
        mood = 'tempting, restrictive';
        break;
      case 'The Tower':
        mainSubject = 'a tower struck by lightning with figures falling';
        mood = 'chaotic, revelatory';
        break;
      case 'The Star':
        mainSubject = 'a nude figure kneeling by water pouring from vessels under stars';
        mood = 'hopeful, inspired';
        break;
      case 'The Moon':
        mainSubject = 'a moon with a face above a path with a wolf and dog howling';
        mood = 'mysterious, subconscious';
        break;
      case 'The Sun':
        mainSubject = 'a radiant sun shining on a child riding a white horse';
        mood = 'joyful, enlightened';
        break;
      case 'Judgement':
        mainSubject = 'an angel blowing a trumpet with figures rising from graves';
        mood = 'awakening, transformative';
        break;
      case 'The World':
        mainSubject = 'a dancing figure within a wreath with the four elements at corners';
        mood = 'fulfilled, complete';
        break;
        
      // Suit of Cups (14 cards) - Associated with emotions, relationships, intuition
      case 'Ace of Cups':
        mainSubject = 'an overflowing chalice with divine energy above it';
        mood = 'emotional, flowing';
        break;
      case 'Two of Cups':
        mainSubject = 'two figures exchanging cups in a ceremonial manner';
        mood = 'harmonious, connected';
        break;
      case 'Three of Cups':
        mainSubject = 'three figures dancing and raising cups in celebration';
        mood = 'joyful, celebratory';
        break;
      case 'Four of Cups':
        mainSubject = 'a contemplative figure with three cups before them and one being offered';
        mood = 'contemplative, dissatisfied';
        break;
      case 'Five of Cups':
        mainSubject = 'a cloaked figure mourning over three spilled cups with two still standing';
        mood = 'regretful, sorrowful';
        break;
      case 'Six of Cups':
        mainSubject = 'a child giving a cup with flowers to another child';
        mood = 'nostalgic, innocent';
        break;
      case 'Seven of Cups':
        mainSubject = 'a figure facing seven cups filled with various gifts and temptations';
        mood = 'dreamy, illusory';
        break;
      case 'Eight of Cups':
        mainSubject = 'a figure walking away from eight stacked cups toward mountains';
        mood = 'detached, seeking';
        break;
      case 'Nine of Cups':
        mainSubject = 'a satisfied figure seated before nine cups arranged in a curve';
        mood = 'satisfied, wishful';
        break;
      case 'Ten of Cups':
        mainSubject = 'a family with arms raised beneath a rainbow of ten cups';
        mood = 'fulfilled, harmonious';
        break;
      case 'Page of Cups':
        mainSubject = 'a youthful figure looking with wonder at a fish emerging from a cup';
        mood = 'imaginative, intuitive';
        break;
      case 'Knight of Cups':
        mainSubject = 'a knight riding slowly offering a cup, with wings on helmet or horse';
        mood = 'romantic, creative';
        break;
      case 'Queen of Cups':
        mainSubject = 'a serene queen on a throne by water holding an ornate cup';
        mood = 'compassionate, intuitive';
        break;
      case 'King of Cups':
        mainSubject = 'a mature king on a throne by turbulent water holding a cup calmly';
        mood = 'emotionally controlled, wise';
        break;
        
      // Suit of Pentacles/Coins (14 cards) - Associated with material world, wealth, body
      case 'Ace of Pentacles':
        mainSubject = 'a hand emerging from clouds holding a golden pentacle over a garden';
        mood = 'prosperous, opportunistic';
        break;
      case 'Two of Pentacles':
        mainSubject = 'a dancing figure juggling two pentacles connected by an infinity symbol';
        mood = 'balanced, adaptable';
        break;
      case 'Three of Pentacles':
        mainSubject = 'a craftsman consulting with architects or patrons in a cathedral';
        mood = 'collaborative, skillful';
        break;
      case 'Four of Pentacles':
        mainSubject = 'a figure clutching a pentacle with three more at their feet and crown';
        mood = 'protective, secure';
        break;
      case 'Five of Pentacles':
        mainSubject = 'two destitute figures walking in snow past a stained glass window';
        mood = 'challenging, impoverished';
        break;
      case 'Six of Pentacles':
        mainSubject = 'a wealthy figure distributing coins to kneeling recipients with scales';
        mood = 'generous, receiving';
        break;
      case 'Seven of Pentacles':
        mainSubject = 'a gardener leaning on a tool looking at a flourishing plant with pentacles';
        mood = 'patient, evaluative';
        break;
      case 'Eight of Pentacles':
        mainSubject = 'a craftsperson focused on carving pentacles at a workbench';
        mood = 'dedicated, skillful';
        break;
      case 'Nine of Pentacles':
        mainSubject = 'an elegant figure in a garden with a hooded bird and nine pentacles';
        mood = 'independent, luxurious';
        break;
      case 'Ten of Pentacles':
        mainSubject = 'a family scene with an elder, younger generations, dogs and pentacles';
        mood = 'wealthy, established';
        break;
      case 'Page of Pentacles':
        mainSubject = 'a youthful figure in a flowery meadow gazing at a pentacle';
        mood = 'studious, practical';
        break;
      case 'Knight of Pentacles':
        mainSubject = 'a knight on a stationary heavy horse holding a pentacle';
        mood = 'reliable, methodical';
        break;
      case 'Queen of Pentacles':
        mainSubject = 'a nurturing queen in a garden holding a pentacle with a rabbit nearby';
        mood = 'abundant, nurturing';
        break;
      case 'King of Pentacles':
        mainSubject = 'a successful king on an ornate throne surrounded by prosperity';
        mood = 'wealthy, established';
        break;
        
      // Suit of Swords (14 cards) - Associated with intellect, challenges, communication
      case 'Ace of Swords':
        mainSubject = 'a hand emerging from clouds holding a sword with a crown';
        mood = 'clear, decisive';
        break;
      case 'Two of Swords':
        mainSubject = 'a blindfolded figure balancing two crossed swords';
        mood = 'indecisive, balanced';
        break;
      case 'Three of Swords':
        mainSubject = 'a heart pierced by three swords with rain in background';
        mood = 'sorrowful, painful';
        break;
      case 'Four of Swords':
        mainSubject = 'a knight lying in repose on a tomb with three swords above and one below';
        mood = 'restful, recuperative';
        break;
      case 'Five of Swords':
        mainSubject = 'a smirking figure collecting swords as others walk away defeated';
        mood = 'conflicted, defeated';
        break;
      case 'Six of Swords':
        mainSubject = 'a ferryman taking passengers to distant shores with six swords in boat';
        mood = 'transitional, healing';
        break;
      case 'Seven of Swords':
        mainSubject = 'a figure sneaking away with five swords, leaving two behind';
        mood = 'strategic, deceptive';
        break;
      case 'Eight of Swords':
        mainSubject = 'a blindfolded figure bound loosely among eight swords';
        mood = 'restricted, trapped';
        break;
      case 'Nine of Swords':
        mainSubject = 'a figure sitting up in bed with hands covering face beneath nine swords';
        mood = 'anxious, nightmarish';
        break;
      case 'Ten of Swords':
        mainSubject = 'a figure lying face down with ten swords in their back under a dark sky';
        mood = 'painful, conclusive';
        break;
      case 'Page of Swords':
        mainSubject = 'a youthful figure holding a sword aloft on a windy hilltop';
        mood = 'curious, vigilant';
        break;
      case 'Knight of Swords':
        mainSubject = 'a knight charging forward on a fast horse with sword raised';
        mood = 'direct, intellectual';
        break;
      case 'Queen of Swords':
        mainSubject = 'a stern queen on a throne holding an upright sword with clouds behind';
        mood = 'perceptive, clear-minded';
        break;
      case 'King of Swords':
        mainSubject = 'a stern king on a throne holding an upright sword with butterflies';
        mood = 'analytical, ethical';
        break;
        
      // Suit of Wands (14 cards) - Associated with energy, passion, creativity
      case 'Ace of Wands':
        mainSubject = 'a hand emerging from clouds holding a flowering wand';
        mood = 'inspirational, potential';
        break;
      case 'Two of Wands':
        mainSubject = 'a figure holding a globe and staff looking out from battlements';
        mood = 'planning, decisive';
        break;
      case 'Three of Wands':
        mainSubject = 'a figure looking out over sea with ships, holding three wands';
        mood = 'expansive, visionary';
        break;
      case 'Four of Wands':
        mainSubject = 'a festive gathering beneath a floral canopy supported by four wands';
        mood = 'celebratory, stable';
        break;
      case 'Five of Wands':
        mainSubject = 'five figures wielding wands in a chaotic skirmish';
        mood = 'competitive, conflicted';
        break;
      case 'Six of Wands':
        mainSubject = 'a victorious rider with wreath and wand, surrounded by others';
        mood = 'triumphant, recognized';
        break;
      case 'Seven of Wands':
        mainSubject = 'a figure on high ground defending against six unseen challengers';
        mood = 'defensive, courageous';
        break;
      case 'Eight of Wands':
        mainSubject = 'eight wands flying through the air over a peaceful landscape';
        mood = 'swift, directed';
        break;
      case 'Nine of Wands':
        mainSubject = 'a wounded figure standing vigilant with a wand, eight wands behind';
        mood = 'resilient, cautious';
        break;
      case 'Ten of Wands':
        mainSubject = 'a figure struggling to carry ten heavy wands toward a distant town';
        mood = 'burdened, responsible';
        break;
      case 'Page of Wands':
        mainSubject = 'a youthful figure in open country gazing at a flowering wand';
        mood = 'enthusiastic, adventurous';
        break;
      case 'Knight of Wands':
        mainSubject = 'a knight on a rearing horse charging forward with a wand';
        mood = 'passionate, impulsive';
        break;
      case 'Queen of Wands':
        mainSubject = 'a confident queen on a throne with a wand and a black cat';
        mood = 'vibrant, confident';
        break;
      case 'King of Wands':
        mainSubject = 'a mature king on a throne with salamander imagery holding a flowering wand';
        mood = 'charismatic, visionary';
        break;
        
      default:
        mainSubject = 'a mystical figure embodying the essence of the card';
        mood = 'mystical, symbolic';
    }
    
    // Construct the final prompt following the template structure
    const prompt = `${details.cardName} tarot card in ${details.style} style with a ${details.theme} theme, featuring ${mainSubject} in a ${mood} atmosphere. ${keySymbols}. Include ${details.additionalPrompt ? details.additionalPrompt : 'rich symbolic colors and mystical elements'}. Artistic, mystical, detailed, with a decorative border and "${details.cardName}" written at the bottom.`;
    
    // Use Gemini's Imagen model for image generation
    // We need to use the imagen-3.0-generate-002 model which is available through the generativeModel call
    const model = genAI.getGenerativeModel({ model: 'imagen-3.0-generate-002' });
    
    // Generate the image using Imagen
    const imageResult = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.4,
        topK: 32,
        topP: 1,
        maxOutputTokens: 2048
      },
      safetySettings: [
        {
          category: HarmCategory.HARM_CATEGORY_HARASSMENT,
          threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH
        },
        {
          category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
          threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH
        },
        {
          category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
          threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH
        },
        {
          category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
          threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH
        }
      ]
    });
    
    // Extract the image data from the response
    const responseData = imageResult.response;
    
    // Add null checks to ensure candidates exists and has at least one element
    if (!responseData.candidates || responseData.candidates.length === 0) {
      throw new Error('No candidates found in the image generation response');
    }
    
    // Store the verified candidate to help TypeScript understand the null check
    const candidate = responseData.candidates[0];
    const imageParts = candidate.content.parts.filter((part: any) => part.inlineData && part.inlineData.mimeType.startsWith('image/'));
    
    let imageUrl = '';
    
    if (imageParts.length > 0) {
      // Convert base64 data to a URL or store directly
      const imageData = imageParts[0]?.inlineData?.data;
      // For browser display, we can use a data URL
      imageUrl = `data:${imageParts[0]?.inlineData?.mimeType};base64,${imageData}`;
      
      // If deckId is provided, store the image in Supabase or S3 based on environment configuration
      if (details.deckId) {
        try {
          // uploadImageFromUrl will handle S3 storage if environment variables are available
          // Using VITE_SUPABASE_S3_STORAGE and VITE_SUPABASE_S3_STORAGE_REGION
          const storageUrl = await uploadImageFromUrl(
            imageUrl,
            details.deckId,
            details.cardName
          );
          
          return storageUrl;
        } catch (error) {
          console.error('Error uploading image to storage:', error);
          return imageUrl; // Return the data URL if upload fails
        }
      }
      
      return imageUrl;
    } else {
      console.warn('No image data returned from Imagen model, using placeholder');
      return generatePlaceholderImageUrl(details.cardName, details.theme);
    }
  } catch (error) {
    console.error('Error generating card image with Imagen:', error);
    return generatePlaceholderImageUrl(details.cardName, details.theme);
  }
};

// Helper function to generate placeholder image URLs based on card names
// In a real implementation, this would be replaced with actual Gemini image responses
function generatePlaceholderImageUrl(cardName: string, theme: string): string {
  // Clean the card name to be URL-friendly
  const cleanName = cardName.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '');
  
  // Map of card names to thematically appropriate Pexels image URLs
  const cardImageMap: {[key: string]: string} = {
    'the-fool': 'https://images.pexels.com/photos/1619317/pexels-photo-1619317.jpeg?auto=compress&cs=tinysrgb&w=1600',
    'the-magician': 'https://images.pexels.com/photos/2693529/pexels-photo-2693529.jpeg?auto=compress&cs=tinysrgb&w=1600',
    'the-high-priestess': 'https://images.pexels.com/photos/3617457/pexels-photo-3617457.jpeg?auto=compress&cs=tinysrgb&w=1600',
    'the-empress': 'https://images.pexels.com/photos/936048/pexels-photo-936048.jpeg?auto=compress&cs=tinysrgb&w=1600',
    'the-emperor': 'https://images.pexels.com/photos/2559941/pexels-photo-2559941.jpeg?auto=compress&cs=tinysrgb&w=1600',
    'the-hierophant': 'https://images.pexels.com/photos/262771/pexels-photo-262771.jpeg?auto=compress&cs=tinysrgb&w=1600',
    'the-lovers': 'https://images.pexels.com/photos/888899/pexels-photo-888899.jpeg?auto=compress&cs=tinysrgb&w=1600',
    'the-chariot': 'https://images.pexels.com/photos/3408744/pexels-photo-3408744.jpeg?auto=compress&cs=tinysrgb&w=1600',
    'strength': 'https://images.pexels.com/photos/1252126/pexels-photo-1252126.jpeg?auto=compress&cs=tinysrgb&w=1600',
    'the-hermit': 'https://images.pexels.com/photos/2389157/pexels-photo-2389157.jpeg?auto=compress&cs=tinysrgb&w=1600',
    'wheel-of-fortune': 'https://images.pexels.com/photos/1727684/pexels-photo-1727684.jpeg?auto=compress&cs=tinysrgb&w=1600',
    'justice': 'https://images.pexels.com/photos/3765035/pexels-photo-3765035.jpeg?auto=compress&cs=tinysrgb&w=1600',
    'the-hanged-man': 'https://images.pexels.com/photos/2171283/pexels-photo-2171283.jpeg?auto=compress&cs=tinysrgb&w=1600',
    'death': 'https://images.pexels.com/photos/3651022/pexels-photo-3651022.jpeg?auto=compress&cs=tinysrgb&w=1600',
    'temperance': 'https://images.pexels.com/photos/2647933/pexels-photo-2647933.jpeg?auto=compress&cs=tinysrgb&w=1600',
    'the-devil': 'https://images.pexels.com/photos/2832046/pexels-photo-2832046.jpeg?auto=compress&cs=tinysrgb&w=1600',
    'the-tower': 'https://images.pexels.com/photos/2499846/pexels-photo-2499846.jpeg?auto=compress&cs=tinysrgb&w=1600',
    'the-star': 'https://images.pexels.com/photos/1252890/pexels-photo-1252890.jpeg?auto=compress&cs=tinysrgb&w=1600',
    'the-moon': 'https://images.pexels.com/photos/2670898/pexels-photo-2670898.jpeg?auto=compress&cs=tinysrgb&w=1600',
    'the-sun': 'https://images.pexels.com/photos/1275413/pexels-photo-1275413.jpeg?auto=compress&cs=tinysrgb&w=1600',
    'judgment': 'https://images.pexels.com/photos/315191/pexels-photo-315191.jpeg?auto=compress&cs=tinysrgb&w=1600',
    'the-world': 'https://images.pexels.com/photos/1851164/pexels-photo-1851164.jpeg?auto=compress&cs=tinysrgb&w=1600'
  };
  
  // Return the mapped image URL if it exists
  if (cardImageMap[cleanName]) {
    return cardImageMap[cleanName];
  }
  
  // Default placeholder using a cosmic theme from Pexels
  return 'https://images.pexels.com/photos/1274260/pexels-photo-1274260.jpeg?auto=compress&cs=tinysrgb&w=1600';
}

export const getReadingInterpretation = async (
  question: string,
  cards: { name: string, position: string, isReversed: boolean }[],
  deckTheme: string
) => {
  if (!apiKey) {
    // Return a fallback reading interpretation when API key is missing
    return `
      # Tarot Reading for: "${question}"
      
      ## Overall Energy
      The cards you've drawn suggest a period of reflection and potential change. The energies present encourage thoughtful consideration of your path forward.
      
      ## Key Insights
      ${cards.map(card => 
        `For the ${card.position} position, ${card.name} ${card.isReversed ? '(reversed)' : ''} indicates a need to examine your relationship with ${card.isReversed ? 'challenges' : 'opportunities'} in this area.`
      ).join('\n\n')}
      
      ## Guidance Moving Forward
      Consider how these energies interact in your life currently. Reflection and mindfulness will serve you well as you navigate the path ahead.
    `;
  }
  
  try {
    const model = getGeminiModel();
    
    const cardsInfo = cards.map(card => 
      `${card.name} (${card.isReversed ? 'reversed' : 'upright'}) in the ${card.position} position`
    ).join(', ');
    
    const prompt = `
      As an experienced tarot reader, interpret this ${cards.length}-card reading 
      for the question: "${question}"
      
      Cards drawn: ${cardsInfo}
      
      Deck Theme: ${deckTheme}
      
      Provide a cohesive interpretation that connects the cards together and addresses
      the question. Include both practical advice and spiritual insights.
      Format your response as a professional tarot reading with sections for:
      1. Overall Energy
      2. Key Insights (for each card position)
      3. Guidance Moving Forward
      
      Keep the total response under 600 words and use language that is mystical but accessible.
    `;
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error('Error generating reading interpretation:', error);
    return `
      # Tarot Reading for: "${question}"
      
      ## Overall Energy
      The cards you've drawn suggest a period of reflection and potential change. The energies present encourage thoughtful consideration of your path forward.
      
      ## Key Insights
      ${cards.map(card => 
        `For the ${card.position} position, ${card.name} ${card.isReversed ? '(reversed)' : ''} indicates a need to examine your relationship with ${card.isReversed ? 'challenges' : 'opportunities'} in this area.`
      ).join('\n\n')}
      
      ## Guidance Moving Forward
      Consider how these energies interact in your life currently. Reflection and mindfulness will serve you well as you navigate the path ahead.
    `;
  }
};

// NEW FUNCTIONS FOR THEME SUGGESTIONS

export const generateThemeSuggestions = async (count: number = 10): Promise<string[]> => {
  if (!apiKey) {
    // Return fallback theme suggestions when API key is missing
    return [
      "Celestial Voyage", "Ancient Mythology", "Enchanted Forest", 
      "Cybernetic Dreams", "Elemental Forces", "Oceanic Mysteries",
      "Astral Projections", "Crystal Energies", "Gothic Shadows", 
      "Shamanic Vision"
    ];
  }
  
  try {
    const model = getGeminiModel();
    
    const prompt = `
      Generate ${count} unique and creative theme ideas for tarot decks. 
      Each theme should be a short, evocative phrase (2-3 words) that could inspire 
      a beautiful and mystical tarot deck design.
      
      The themes should span different aesthetics, mythologies, and spiritual traditions.
      
      Format your response as a simple list with each theme on a new line.
      Do not include numbering or bullet points.
    `;
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    
    // Parse the response into individual themes
    const themes = response.text().split('\n')
      .map(theme => theme.trim())
      .filter(theme => theme.length > 0);
    
    return themes.slice(0, count);
  } catch (error) {
    console.error('Error generating theme suggestions:', error);
    return [
      "Celestial Voyage", "Ancient Mythology", "Enchanted Forest", 
      "Cybernetic Dreams", "Elemental Forces", "Oceanic Mysteries",
      "Astral Projections", "Crystal Energies", "Gothic Shadows", 
      "Shamanic Vision"
    ];
  }
};

export const generateElaborateTheme = async (themeTitle: string): Promise<string> => {
  if (!apiKey) {
    // Return fallback elaborate theme when API key is missing
    return `A mystical ${themeTitle} tarot deck featuring rich symbolism and evocative imagery. The deck explores the profound connection between consciousness and the spiritual realm, with elements of cosmic energies, ancient wisdom, and transformative journeys. Each card contains detailed symbolism that reflects both traditional tarot meanings and the unique essence of the ${themeTitle} theme.`;
  }
  
  try {
    const model = getGeminiModel();
    
    const prompt = `
      Create an elaborate and detailed description for a tarot deck with the theme "${themeTitle}".
      The description should be useful as a creative prompt for generating tarot card imagery.
      
      Include:
      - The overall aesthetic and mood of the deck
      - Key visual elements and symbols that should appear throughout the cards
      - Color palette suggestions
      - Stylistic inspiration (e.g., art movements, cultural influences)
      - Thematic connections to the tarot's spiritual meanings
      
      Make the description evocative, detailed, and specific enough to guide the creation of a cohesive deck.
      The description should be 2-3 sentences, focused and rich in imagery.
    `;
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error('Error generating elaborate theme:', error);
    return `A mystical ${themeTitle} tarot deck featuring rich symbolism and evocative imagery. The deck explores the profound connection between consciousness and the spiritual realm, with elements of cosmic energies, ancient wisdom, and transformative journeys. Each card contains detailed symbolism that reflects both traditional tarot meanings and the unique essence of the ${themeTitle} theme.`;
  }
};

export default genAI;