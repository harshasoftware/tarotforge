import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import { supabase } from './supabase';
import type { AIModel, QuizQuestion } from '../types';

// Generate a placeholder image URL for cards when image generation fails
export function generatePlaceholderImageUrl(cardName: string, theme: string): string {
  // Simple implementation - in a real app, you might want to use a more sophisticated approach
  const baseUrl = 'https://placehold.co/600x900';
  const params = new URLSearchParams({
    text: `${cardName} (${theme} theme)`,
    font: 'montserrat',
    fontSize: '16',
    textColor: '333333',
    bgColor: 'f0f0f0',
    border: '1px solid #ccc'
  });
  return `${baseUrl}?${params.toString()}`;
}

// Google Generative AI configuration
const apiKey = import.meta.env.VITE_GOOGLE_AI_API_KEY || '';

// Initialize Google Generative AI client with validation check
let genAI: GoogleGenerativeAI | null = null;
try {
  // Only initialize if we have what appears to be a valid API key format
  if (apiKey && apiKey.length > 10) {
    genAI = new GoogleGenerativeAI(apiKey);
  } else {
    console.warn('Google AI API key is missing or too short. Tarot readings and descriptions will use fallback content.');
  }
} catch (error) {
  console.warn('Error initializing Google AI client:', error);
}

// Debug log environment variables
console.log('Environment variables:', {
  VITE_GOOGLE_AI_API_KEY: import.meta.env.VITE_GOOGLE_AI_API_KEY ? '***' : 'Not set',
  VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL ? 'Set' : 'Not set',
  VITE_SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY ? '***' : 'Not set',
  VITE_SUPABASE_S3_STORAGE: import.meta.env.VITE_SUPABASE_S3_STORAGE ? 'Set' : 'Not set',
  MODE: import.meta.env.MODE
});

// Log warning instead of error to avoid breaking the application
if (!apiKey) {
  console.warn('Google AI API key is missing. Tarot readings and descriptions will use fallback content.');
} else {
  console.log('Google AI API key is configured, length:', apiKey.length);
}

// Helper function to get the appropriate model
export const getGeminiModel = (modelName: AIModel = 'gemini-2.0-flash') => {
  if (!genAI) {
    throw new Error('Google AI API key is not configured or is invalid. Please check your API key in the .env file.');
  }
  return genAI.getGenerativeModel({ model: modelName });
};

// Function to check available models - note: direct listModels is not available in the client API
// This is a simplified version that logs the model we're trying to use
export const logModelInfo = (modelName: string): void => {
  if (!genAI) {
    console.warn('Google AI client not initialized. Cannot check models.');
    return;
  }
  
  console.log(`Attempting to use model: ${modelName}`);
  try {
    // Just get the model to see if it's available
    genAI.getGenerativeModel({ model: modelName });
    console.log(`Successfully initialized model: ${modelName}`);
  } catch (error) {
    console.error(`Error initializing model ${modelName}:`, error);
  }
};

interface GenerateCardDescriptionParams {
  cardName: string;
  deckTheme: string;
  onProgress?: (progress: number) => void;
}

export const generateCardDescription = async ({
  cardName,
  deckTheme,
  onProgress
}: GenerateCardDescriptionParams): Promise<string> => {
  // Update progress - starting
  onProgress?.(5);
  
  if (!genAI || !apiKey) {
    // Return a fallback description when API key is missing or invalid
    onProgress?.(100);
    return `The ${cardName} represents a powerful symbol in tarot. In the context of ${deckTheme}, it connects to themes of transformation and insight. Key symbols include mystical elements that resonate with the card's traditional meanings. When this card appears in a reading, consider how its energy might be guiding you forward.`;
  }
  
  // Update progress - API key check passed
  onProgress?.(15);
  
  try {
    // Explicitly use gemini-2.0-flash model
    const model = getGeminiModel('gemini-2.0-flash');
    
    // Define the prompt
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
    
    // Update progress - starting generation
    onProgress?.(25);
    
    // Split the generation into chunks to track progress
    const generationSteps = [
      { progress: 40, message: 'Analyzing card symbolism...' },
      { progress: 55, message: 'Connecting to theme...' },
      { progress: 70, message: 'Generating meanings...' },
      { progress: 85, message: 'Finalizing description...' }
    ];
    
    // Simulate progress for each step
    for (const step of generationSteps) {
      await new Promise(resolve => setTimeout(resolve, 200)); // Small delay between steps
      console.log(step.message);
      onProgress?.(step.progress);
    }
    
    // Make the actual API call
    const result = await model.generateContent({ contents: [{ role: 'user', parts: [{ text: prompt }] }] });
    const response = await result.response;
    const text = response.text();
    
    // Update progress - generation complete
    onProgress?.(95);
    
    // Small delay to ensure smooth progress bar animation
    await new Promise(resolve => setTimeout(resolve, 200));
    onProgress?.(100);
    
    return text;
  } catch (error) {
    console.error('Error generating card description:', error);
    onProgress?.(100);
    return `The ${cardName} card in the ${deckTheme} deck represents powerful forces at play. Its traditional meanings include transformation, change, and new beginnings. In the context of ${deckTheme}, it may indicate significant shifts or revelations.`;
  }
};

interface GenerateCardImageParams {
  cardName: string;
  theme: string;
  style: string;
  description: string;
  additionalPrompt?: string;
  deckId?: string;
  onProgress?: (progress: number, stage: 'generating' | 'uploading') => void;
}

export const generateCardImage = async (details: GenerateCardImageParams): Promise<string> => {
  const { onProgress } = details;
  
  // Helper function to update progress
  const updateProgress = (progress: number, stage: 'generating' | 'uploading') => {
    if (onProgress) {
      onProgress(progress, stage);
    }
  };
  
  // Initial progress update
  updateProgress(5, 'generating');
  if (!genAI || !apiKey) {
    // Return a placeholder image URL if API key is missing or invalid
    console.warn('Google AI API key is missing or invalid. Using placeholder image.');
    return generatePlaceholderImageUrl(details.cardName, details.theme);
  }
  
  try {
    // Initialize the generative AI client with your API key - no need to recreate it if we already have genAI
    if (!genAI) {
      const errorMsg = 'Google AI client not initialized. Check if VITE_GOOGLE_AI_API_KEY is properly set in your .env file.';
      console.error(errorMsg);
      throw new Error(errorMsg);
    }
    
    console.log('Starting image generation for:', details.cardName);
    
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
    
    // Update progress after starting model initialization
    updateProgress(20, 'generating');
    
    // Log model info to help with debugging
    if (import.meta.env.DEV) {
      // Use the specified imagen model
      logModelInfo('imagen-3.0-generate-002');
    }
    
    // Use the imagen-3.0-generate-002 model for image generation as specified
    const modelName: AIModel = 'imagen-3.0-generate-002';
    const model = getGeminiModel(modelName);
    
    console.log('Imagen 3.0 Generate 002 model initialized successfully');
    
    // Generate the image using Imagen 3
    console.log('Sending prompt to Imagen API:', prompt.substring(0, 100) + '...');
    
    // For Imagen 3.0 Fast, enhance the prompt with specific parameters
    // Create a text prompt that includes the image generation parameters in natural language
    const enhancedPrompt = `${prompt}

Create a high-quality tarot card with portrait orientation (3:4 aspect ratio). Include rich colors, clear lines, and sharp details with vibrant contrast. Add decorative borders typical of traditional tarot cards. Make the text at the bottom clear and legible.`;
    
    // Use the standard generateContent method which is compatible with the SDK
    const imageResult = await model.generateContent({
      contents: [
        {
          role: 'user',
          parts: [
            { text: enhancedPrompt },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.4,
        topK: 32,
        topP: 1
      },
      // For Imagen 3.0 Fast, we'll handle the specific parameters through the prompt
      // and rely on enhanced prompt to specify aspect ratio and other details
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
    
    // Update progress after generation
    updateProgress(90, 'generating');
    
    // Extract the image data from the response
    console.log('Received response from Imagen API');
    const response = imageResult.response;
    
    // Debug log the full response structure
    console.log('Full response structure:', JSON.stringify(response, null, 2));
    
    // Define types for the response data structure
    interface InlineData {
      mimeType: string;
      data: string;
    }

    interface Part {
      inlineData?: InlineData;
      text?: string;
    }

    interface Content {
      role: string;
      parts: Part[];
    }

    interface Candidate {
      content: Content;
      finishReason: string;
      index: number;
      safetyRatings: Array<{
        category: string;
        probability: string;
      }>;
    }

    // Type guard to check if the response has the expected structure
    function isCandidateArray(candidates: unknown): candidates is Candidate[] {
      return Array.isArray(candidates) && 
             candidates.every(candidate => 
               candidate && 
               typeof candidate === 'object' &&
               'content' in candidate &&
               Array.isArray((candidate as any).content?.parts)
             );
    }

    // Safely extract candidates from the response
    const candidates = (response as { candidates?: unknown })?.candidates;
    
    // Validate the candidates array
    if (!isCandidateArray(candidates) || candidates.length === 0) {
      const errorMsg = 'No valid candidates found in the image generation response. Check if the API key has the correct permissions.';
      console.error(errorMsg, { response });
      throw new Error(errorMsg);
    }
    
    console.log('Found candidates in response, count:', candidates.length);
    
    // Store the verified candidate to help TypeScript understand the null check
    const candidate = candidates[0];
    
    // Verify the candidate has the expected structure
    if (!candidate?.content?.parts?.[0]?.inlineData) {
      const errorMsg = 'Invalid response format from image generation API. Missing inlineData in the response.';
      console.error(errorMsg, { candidate });
      throw new Error(errorMsg);
    }
    
    console.log('Examining candidate content parts:', candidate.content.parts.length);
    
    // Type guard to check if a part has inline data
    const hasInlineData = (part: Part): part is { inlineData: InlineData } => {
      return !!(part.inlineData?.mimeType && part.inlineData?.data);
    };
    
    // Filter parts to find those with inline data
    const imageParts = candidate.content.parts.filter(hasInlineData);
    
    console.log(`Found ${imageParts.length} image parts in response`);
    
    if (imageParts.length === 0) {
      const errorMsg = 'No valid image data found in the response. Check if the API key has the correct permissions.';
      console.error(errorMsg, { parts: candidate.content.parts });
      throw new Error(errorMsg);
    }
    
    // Process the first valid image part
    const imagePart = imageParts[0];
    const imageData = imagePart.inlineData;
    
    // Create a data URL from the base64-encoded image data
    const imageUrl = `data:${imageData.mimeType};base64,${imageData.data}`;
    console.log('Generated data URL for image');
    
    // If we have a deckId, upload the image to Supabase Storage
    if (details.deckId) {
      try {
        // Update progress - starting upload
        updateProgress(5, 'uploading');
        
        // First, convert the data URL to a blob
        const response = await fetch(imageUrl);
        const blob = await response.blob();
        
        // Update progress - blob created
        updateProgress(20, 'uploading');
        
        // Upload to Supabase Storage
        const fileExt = imageData.mimeType.split('/')[1] || 'png';
        const fileName = `${details.deckId}/${details.cardName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.${fileExt}`;
        
        // Update progress - starting upload
        updateProgress(30, 'uploading');
        
        // Upload with progress tracking using the Supabase Storage API directly
        const formData = new FormData();
        formData.append('file', blob, fileName);
        
        // Track upload progress using XMLHttpRequest for better progress tracking
        const xhr = new XMLHttpRequest();
        
        // Create a promise to handle the upload
        const uploadPromise = new Promise<{error: any, publicUrl: string}>((resolve) => {
          xhr.upload.addEventListener('progress', (event) => {
            if (event.lengthComputable) {
              // Calculate progress percentage (30% to 90% of upload phase)
              const uploadProgress = 30 + (event.loaded / event.total * 60);
              updateProgress(Math.floor(uploadProgress), 'uploading');
            }
          });
          
          xhr.addEventListener('load', () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              // Get the public URL after successful upload
              const { data: { publicUrl } } = supabase.storage
                .from('card-images')
                .getPublicUrl(fileName);
              resolve({ error: null, publicUrl });
            } else {
              resolve({ error: new Error('Upload failed'), publicUrl: '' });
            }
          });
          
          xhr.addEventListener('error', () => {
            resolve({ error: new Error('Upload failed'), publicUrl: '' });
          });
        });
        
        // Get the upload URL
        const { data: uploadData, error: urlError } = await supabase.storage
          .from('card-images')
          .createSignedUrl(fileName, 3600);
          
        if (urlError || !uploadData?.signedUrl) {
          throw urlError || new Error('Failed to get upload URL');
        }
        
        // Start the upload
        xhr.open('PUT', uploadData.signedUrl, true);
        xhr.setRequestHeader('Content-Type', 'image/png');
        xhr.setRequestHeader('x-upsert', 'true');
        xhr.send(blob);
        
        // Wait for upload to complete
        const uploadResult = await uploadPromise;
          
        if (uploadResult.error || !uploadResult.publicUrl) {
          console.error('Error uploading image to Supabase:', uploadResult.error);
          // Fallback to data URL if upload fails
          updateProgress(100, 'uploading');
          return imageUrl;
        }
        
        console.log('Image uploaded to Supabase:', uploadResult.publicUrl);
        
        // Final progress update
        updateProgress(100, 'uploading');
        return uploadResult.publicUrl;
        
      } catch (error) {
        console.error('Error uploading image to Supabase:', error);
        // Fallback to data URL if upload fails
        return imageUrl;
      }
    }
    
    return imageUrl;
  } catch (error) {
    const errorMsg = `Error generating card image for ${details.cardName}: ${error instanceof Error ? error.message : String(error)}`;
    console.error(errorMsg, error);
    
    // Only use placeholder if explicitly configured to do so
    if (import.meta.env.VITE_USE_PLACEHOLDER_IMAGES !== 'false') {
      console.warn('Falling back to placeholder image');
      return generatePlaceholderImageUrl(details.cardName, details.theme);
    }
    
    // Re-throw the error to be handled by the caller
    throw new Error(errorMsg);
  }
};

// The generatePlaceholderImageUrl function is now defined at the top of the file

/**
 * Generates inspired questions for different life areas using Gemini Flash
 * @param category The life area category (love, career, finance, relationships, spiritual-growth, past-lives)
 * @param count Number of questions to generate (default 4)
 * @returns Array of question strings
 */
export const generateInspiredQuestions = async (
  category: string,
  count: number = 4
): Promise<string[]> => {
  if (!genAI || !apiKey) {
    // Return fallback questions when API key is missing or invalid
    const fallbackQuestions = {
      love: [
        "What are their true feelings for me?",
        "How can I attract my soulmate?", 
        "Will I find love soon?",
        "What blocks me from finding love?"
      ],
      career: [
        "What career path aligns with my purpose?",
        "Will I get the promotion I'm seeking?",
        "Should I change careers?",
        "What skills should I develop next?"
      ],
      finance: [
        "Will my financial situation improve?",
        "What investment opportunities should I consider?",
        "How can I manifest abundance?",
        "What blocks my financial growth?"
      ],
      relationships: [
        "Is there a future for our relationship?",
        "How can I improve my relationships?",
        "What do I need to know about my family dynamics?",
        "Who can I trust in my social circle?"
      ],
      'spiritual-growth': [
        "What is my soul's purpose?",
        "How can I deepen my spiritual practice?",
        "What spiritual lessons am I learning?",
        "How can I develop my intuition?"
      ],
      'past-lives': [
        "Who was I in my past life?",
        "What karma am I healing?",
        "What past life influences my current relationships?",
        "What talents did I bring from past lives?"
      ]
    };
    
    return fallbackQuestions[category as keyof typeof fallbackQuestions] || fallbackQuestions.love;
  }

  try {
    // Use Gemini 2.0 Flash for fast question generation
    const model = getGeminiModel('gemini-2.0-flash');
    
    const categoryDescriptions = {
      love: "romantic love, relationships, soulmates, dating, marriage, and matters of the heart",
      career: "professional life, job opportunities, business ventures, work relationships, and career growth",
      finance: "money, wealth, investments, financial planning, abundance, and material prosperity", 
      relationships: "family dynamics, friendships, social connections, and interpersonal relationships",
      'spiritual-growth': "spiritual development, personal evolution, consciousness, enlightenment, and soul purpose",
      'past-lives': "past life connections, karmic lessons, soul history, and past life influences on current life"
    };

    const categoryDescription = categoryDescriptions[category as keyof typeof categoryDescriptions] || categoryDescriptions.love;
    
    const prompt = `
      Generate ${count} mystical and insightful tarot reading questions about ${categoryDescription}.
      
      The questions should be:
      - Deeply meaningful and thought-provoking
      - Written in a mystical, intuitive style that resonates with tarot readers
      - Focused on personal insight and guidance rather than yes/no answers
      - Varied in scope from personal to broader life themes
      - Emotionally resonant and spiritually aligned
      
      Format your response as a simple JSON array of strings, with no additional text or markdown.
      
      Example format:
      ["Question 1 text", "Question 2 text", "Question 3 text", "Question 4 text"]
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const responseText = response.text();
    
    try {
      // Extract JSON from response
      const jsonMatch = responseText.match(/\[\s*".*"\s*\]/s);
      const jsonString = jsonMatch ? jsonMatch[0] : responseText;
      const questions = JSON.parse(jsonString);
      
      if (Array.isArray(questions) && questions.length > 0) {
        return questions.slice(0, count).map(q => String(q).trim());
      } else {
        throw new Error('Invalid response format');
      }
    } catch (parseError) {
      console.warn('Error parsing generated questions, using fallbacks:', parseError);
      throw new Error('Failed to parse generated questions');
    }
  } catch (error) {
    console.error('Error generating inspired questions:', error);
    // Return fallback questions for the category
    const fallbackQuestions = {
      love: [
        "What are their true feelings for me?",
        "How can I attract my soulmate?", 
        "Will I find love soon?",
        "What blocks me from finding love?"
      ],
      career: [
        "What career path aligns with my purpose?",
        "Will I get the promotion I'm seeking?",
        "Should I change careers?",
        "What skills should I develop next?"
      ],
      finance: [
        "Will my financial situation improve?",
        "What investment opportunities should I consider?",
        "How can I manifest abundance?",
        "What blocks my financial growth?"
      ],
      relationships: [
        "Is there a future for our relationship?",
        "How can I improve my relationships?",
        "What do I need to know about my family dynamics?",
        "Who can I trust in my social circle?"
      ],
      'spiritual-growth': [
        "What is my soul's purpose?",
        "How can I deepen my spiritual practice?",
        "What spiritual lessons am I learning?",
        "How can I develop my intuition?"
      ],
      'past-lives': [
        "Who was I in my past life?",
        "What karma am I healing?",
        "What past life influences my current relationships?",
        "What talents did I bring from past lives?"
      ]
    };
    
    return fallbackQuestions[category as keyof typeof fallbackQuestions] || fallbackQuestions.love;
  }
};

export const getReadingInterpretation = async (
  question: string,
  cards: { name: string, position: string, isReversed: boolean }[],
  deckTheme: string
) => {
  if (!genAI || !apiKey) {
    // Return a fallback reading interpretation when API key is missing or invalid
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
  // Return fallback suggestions immediately if the API key is missing or invalid
  if (!genAI || !apiKey) {
    console.warn('Using fallback theme suggestions due to missing or invalid Google AI API key');
    // Return fallback theme suggestions
    return [
      "Celestial Voyage", "Ancient Mythology", "Enchanted Forest", 
      "Cybernetic Dreams", "Elemental Forces", "Oceanic Mysteries",
      "Astral Projections", "Crystal Energies", "Gothic Shadows", 
      "Shamanic Vision"
    ];
  }
  
  try {
    // Explicitly use gemini-2.0-flash model for theme suggestions
    const model = getGeminiModel('gemini-2.0-flash');
    
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
    // Log error for debugging but don't display it to users
    console.warn('Error generating theme suggestions, using fallbacks:', error);
    return [
      "Celestial Voyage", "Ancient Mythology", "Enchanted Forest", 
      "Cybernetic Dreams", "Elemental Forces", "Oceanic Mysteries",
      "Astral Projections", "Crystal Energies", "Gothic Shadows", 
      "Shamanic Vision"
    ];
  }
};

export const generateElaborateTheme = async (themeTitle: string): Promise<string> => {
  if (!genAI || !apiKey) {
    // Return fallback elaborate theme when API key is missing or invalid
    return `A mystical ${themeTitle} tarot deck featuring rich symbolism and evocative imagery. The deck explores the profound connection between consciousness and the spiritual realm, with elements of cosmic energies, ancient wisdom, and transformative journeys. Each card contains detailed symbolism that reflects both traditional tarot meanings and the unique essence of the ${themeTitle} theme.`;
  }
  
  try {
    // Explicitly use gemini-2.0-flash model
    const model = getGeminiModel('gemini-2.0-flash');
    
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
    console.warn('Error generating elaborate theme, using fallback:', error);
    return `A mystical ${themeTitle} tarot deck featuring rich symbolism and evocative imagery. The deck explores the profound connection between consciousness and the spiritual realm, with elements of cosmic energies, ancient wisdom, and transformative journeys. Each card contains detailed symbolism that reflects both traditional tarot meanings and the unique essence of the ${themeTitle} theme.`;
  }
};

/**
 * Generate a mystical username for a new user based on their email or name
 * @param emailOrName The user's email address or name to use as inspiration
 * @returns A mystical-themed username
 */
export const generateMysticalUsername = async (emailOrName: string): Promise<string> => {
  // Extract base name from email if it's an email address
  const baseName = emailOrName.includes('@') 
    ? emailOrName.split('@')[0]
    : emailOrName;
    
  // Remove numbers and special characters for cleaner input
  const cleanName = baseName.replace(/[^a-zA-Z]/g, '');
  
  if (!genAI || !apiKey) {
    // Fallback to basic username generation if API key is missing or invalid
    return generateFallbackUsername(cleanName);
  }
  
  try {
    // Use Gemini 2.0 Flash for faster response
    const model = getGeminiModel('gemini-2.0-flash');
    
    const prompt = `
      Create a unique, mystical-sounding username for a user of a tarot app.
      
      Use this name or email as inspiration: "${baseName}"
      
      Guidelines:
      - Create a single, unique username (not a list of options)
      - The username should have mystical, spiritual, or cosmic themes
      - Make it 5-15 characters long
      - No spaces allowed, but can use underscores or hyphens
      - Should be pronounceable
      - No numbers unless they have mystical significance (like 7, 9, or 13)
      - Related to tarot, divination, spirituality, or mysticism
      - Do not simply reuse the original name
      
      Respond with ONLY the username, nothing else.
    `;
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    
    // Clean up the response to ensure it's a valid username
    let username = response.text().trim().replace(/\s+/g, '_');
    
    // If the username is empty or too long, fallback to a simpler approach
    if (!username || username.length > 20 || username.length < 3) {
      console.warn('Generated username was empty or invalid, using fallback');
      return generateFallbackUsername(cleanName);
    }
    
    return username;
  } catch (error) {
    console.warn('Error generating mystical username, using fallback:', error);
    // Fallback to a simpler approach if Gemini fails
    return generateFallbackUsername(cleanName);
  }
};

/**
 * Generate a fallback username if AI generation fails
 * @param baseName The user's base name to use as inspiration
 * @returns A mystical-themed username
 */
const generateFallbackUsername = (baseName: string): string => {
  const mysticalAdjectives = ['Mystic', 'Cosmic', 'Astral', 'Ethereal', 'Divine', 'Arcane', 'Celestial', 'Enchanted', 'Sacred', 'Crystal'];
  const mysticalNouns = ['Voyager', 'Oracle', 'Seeker', 'Guardian', 'Reader', 'Seer', 'Keeper', 'Diviner', 'Sage', 'Weaver'];
  
  // Get first letter of base name if available
  const firstLetter = baseName.charAt(0).toUpperCase();
  
  // Choose random elements
  const adjective = mysticalAdjectives[Math.floor(Math.random() * mysticalAdjectives.length)];
  const noun = mysticalNouns[Math.floor(Math.random() * mysticalNouns.length)];
  
  // Include first letter if available, otherwise use fixed style
  if (firstLetter) {
    return `${adjective}${firstLetter}${noun}`;
  } else {
    return `${adjective}${noun}${Math.floor(Math.random() * 1000)}`;
  }
};

/**
 * Generates tarot quiz questions for the reader certification exam
 * @param count Number of questions to generate (1-15)
 * @param difficulty Difficulty level of the quiz (novice, adept, mystic, oracle, archmage)
 * @returns Array of quiz questions
 */
export const generateTarotQuiz = async (count: number = 10, difficulty: string = 'novice'): Promise<QuizQuestion[]> => {
  // Validate count
  const questionCount = Math.min(Math.max(1, count), 15);
  
  if (!genAI || !apiKey) {
    // Return fallback quiz questions when API key is missing or invalid
    return Array(questionCount).fill(null).map((_, index) => ({
      id: index,
      question: `What is the traditional meaning of ${getRandomTarotCard()}?`,
      options: [
        'Transformation and renewal',
        'Joy and fulfillment',
        'Conflict and challenges',
        'Intuition and mystery'
      ],
      correctAnswer: Math.floor(Math.random() * 4),
      explanation: 'Understanding traditional tarot meanings is essential for providing accurate readings.'
    }));
  }
  
  try {
    // Use Gemini 1.5 Pro for quiz generation
    const model = getGeminiModel('gemini-1.5-pro');
    
    // Create a difficulty-appropriate prompt
    const difficultyDescriptions = {
      novice: 'beginners with basic knowledge of major arcana cards',
      adept: 'intermediate readers familiar with all cards and basic spreads',
      mystic: 'experienced readers with solid knowledge of symbolism and card interactions',
      oracle: 'advanced readers with deep knowledge of tarot history and complex interpretations',
      archmage: 'master-level readers with expert knowledge of esoteric systems and advanced techniques'
    };
    
    const difficultyDescription = difficultyDescriptions[difficulty as keyof typeof difficultyDescriptions] || difficultyDescriptions.novice;
    
    // Create a chat session for better context management
    const chat = model.startChat({
      history: [
        {
          role: 'user',
          parts: [{
            text: `You are a tarot expert creating a certification quiz. Generate ${questionCount} multiple-choice questions for ${difficultyDescription}.`
          }]
        },
        {
          role: 'model',
          parts: [{
            text: `I'll create a quiz with ${questionCount} questions for ${difficultyDescription}. Please provide the difficulty level and any specific topics you'd like to emphasize.`
          }]
        }
      ],
      generationConfig: {
        temperature: 0.7,
        topK: 1,
        topP: 0.95,
        maxOutputTokens: 4096,
      },
    });
    
    // Generate the quiz with specific instructions
    const prompt = `
      Create a tarot quiz with exactly ${questionCount} multiple-choice questions for ${difficultyDescription}.
      
      IMPORTANT: Format your response as a valid JSON array of question objects with these exact properties:
      - id: number (0-based index)
      - question: string (the question text)
      - options: string[] (exactly 4 options)
      - correctAnswer: number (0-3 index of the correct option)
      - explanation: string (brief explanation of the correct answer)
      
      Requirements:
      1. Each question must be unique and test different aspects of tarot knowledge
      2. All options should be plausible but only one should be correct
      3. Questions should cover a variety of tarot topics
      4. Format the response as a JSON array with no additional text or markdown
      
      Example format:
      [
        {
          "id": 0,
          "question": "What does The Fool card typically represent?",
          "options": [
            "Foolishness and recklessness",
            "New beginnings and potential",
            "The end of a journey",
            "Financial success"
          ],
          "correctAnswer": 1,
          "explanation": "The Fool represents new beginnings, potential, and stepping into the unknown with optimism."
        }
      ]
    `;
    
    const result = await chat.sendMessage(prompt);
    const response = result.response;
    const responseText = response.text();
    
    // Clean the response to extract just the JSON
    const jsonMatch = responseText.match(/\[\s*\{.*\}\s*\]/s);
    const jsonString = jsonMatch ? jsonMatch[0] : responseText;
    
    try {
      const quizData = JSON.parse(jsonString);
      
      // Validate the response structure
      if (!Array.isArray(quizData) || quizData.length === 0) {
        throw new Error('Invalid response format: expected an array of questions');
      }
      
      // Process and validate each question
      const validQuestions: QuizQuestion[] = [];
      
      for (let i = 0; i < Math.min(quizData.length, questionCount); i++) {
        const q = quizData[i];
        
        // Skip if required fields are missing or invalid
        if (!q || !q.question || !Array.isArray(q.options) || q.options.length !== 4 || 
            typeof q.correctAnswer !== 'number' || q.correctAnswer < 0 || q.correctAnswer > 3) {
          console.warn(`Invalid question format at index ${i}`, q);
          continue;
        }
        
        validQuestions.push({
          id: i,
          question: String(q.question).trim(),
          options: q.options.map((opt: any) => String(opt).trim()),
          correctAnswer: Math.max(0, Math.min(3, Number(q.correctAnswer))), // Ensure it's 0-3
          explanation: String(q.explanation || 'No explanation provided').trim()
        });
      }
      
      if (validQuestions.length === 0) {
        throw new Error('No valid questions were generated');
      }
      
      return validQuestions;
    } catch (parseError) {
      console.warn('Error parsing quiz questions, using fallbacks:', parseError);
      throw new Error('Failed to parse generated quiz questions');
    }
  } catch (error) {
    console.warn('Error generating tarot quiz questions, using fallbacks:', error);
    // Return fallback questions
    return Array(count).fill(null).map((_, index) => ({
      id: index,
      question: `What is the traditional meaning of ${getRandomTarotCard()}?`,
      options: [
        'Transformation and renewal',
        'Joy and fulfillment',
        'Conflict and challenges',
        'Intuition and mystery'
      ],
      correctAnswer: Math.floor(Math.random() * 4),
      explanation: 'Understanding traditional tarot meanings is essential for providing accurate readings.'
    }));
  }
};

/**
 * Helper function to get a random tarot card name
 * @returns A random tarot card name
 */
const getRandomTarotCard = (): string => {
  const majorArcana = [
    'The Fool', 'The Magician', 'The High Priestess', 'The Empress', 'The Emperor',
    'The Hierophant', 'The Lovers', 'The Chariot', 'Strength', 'The Hermit',
    'Wheel of Fortune', 'Justice', 'The Hanged Man', 'Death', 'Temperance',
    'The Devil', 'The Tower', 'The Star', 'The Moon', 'The Sun',
    'Judgement', 'The World'
  ];
  
  return majorArcana[Math.floor(Math.random() * majorArcana.length)];
};

export default genAI;