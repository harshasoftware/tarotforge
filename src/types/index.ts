export interface User {
  id: string;
  email: string;
  username?: string;
  full_name?: string;
  avatar_url?: string;
  created_at: string;
  is_creator?: boolean;
  is_reader?: boolean;
  bio?: string;
  reader_since?: string;
  level_id?: string;
  average_rating?: number;
  completed_readings?: number;
  readerLevel?: ReaderLevel;
  custom_price_per_minute?: number | null | undefined;
}

export interface Deck {
  id: string;
  creator_id: string;
  creator_name: string;
  title: string;
  description: string;
  theme: string;
  style: string;
  card_count: number;
  price: number;
  cover_image: string;
  sample_images: string[];
  created_at: string;
  updated_at: string;
  purchase_count: number;
  rating?: number;
  is_nft?: boolean;
  is_free?: boolean;
  nft_address?: string;
  is_listed?: boolean; // Controls visibility in marketplace
  is_sellable?: boolean; // Controls if the deck can be purchased
  is_public?: boolean; // Controls general visibility
  attribution?: string; // Attribution for public domain or licensed content
}

export interface Card {
  id: string;
  deck_id: string;
  name: string;
  description: string;
  image_url: string;
  card_type: 'major' | 'minor';
  suit?: 'wands' | 'cups' | 'swords' | 'pentacles' | null;
  position?: string; // In ReadingCard this is more specific (upright/reversed)
  keywords: string[];
  order: number;
}

export interface Reading {
  id: string;
  user_id: string;
  deck_id: string;
  reader_id?: string;
  layout: string;
  question?: string;
  cards: ReadingCard[];
  interpretation?: string;
  created_at: string;
  is_public: boolean;
}

export interface ReadingCard {
  card_id: string;
  position: number;
  position_name: string;
  position_meaning: string;
  is_reversed: boolean;
}

export interface Purchase {
  id: string;
  user_id: string;
  deck_id: string;
  amount: number;
  currency: string;
  status: 'pending' | 'complete' | 'failed' | 'refunded';
  payment_method: 'stripe' | 'crypto';
  created_at: string;
}

export interface ReadingLayout {
  id: string;
  name: string;
  description: string;
  card_count: number;
  positions: {
    id: number;
    name: string;
    meaning: string;
    x: number;
    y: number;
    rotation?: number;
  }[];
}

// Interface for tarot quiz attempts
export interface QuizAttempt {
  id: string;
  user_id: string;
  score: number;
  passed: boolean;
  taken_at: string;
  expires_at: string;
  difficulty_level: QuizDifficultyLevel;
}

// Reader levels for ranking system
export interface ReaderLevel {
  id: string;
  name: string;
  description: string;
  min_rating?: number;
  min_readings?: number;
  base_price_per_minute: number;
  color_theme: string;
  icon: string;
  required_quiz_score: number;
  rank_order: number;
}

// Quiz difficulty levels
export type QuizDifficultyLevel = 'novice' | 'adept' | 'mystic' | 'oracle' | 'archmage';

// Interface for reader reviews
export interface ReaderReview {
  id: string;
  reader_id: string;
  client_id: string;
  rating: number;
  review?: string;
  reading_id?: string;
  created_at: string;
}

// Interface for reader certificates
export interface ReaderCertificate {
  id: string;
  user_id: string;
  certificate_url: string;
  level_name: string;
  certification_id: string;
  score: number;
  username: string;
  certification_date: string;
  metadata: Record<string, any>;
  created_at: string;
}

// Tarot quiz question format
export interface QuizQuestion {
  id: number;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation?: string;
}

/**
 * Type of generation methods supported by AI models
 */
export type GenerationMethod = 
  | 'generateContent' 
  | 'countTokens' 
  | 'createCachedContent' 
  | 'batchGenerateContent'
  | 'bidiGenerateContent'
  | 'embedText'
  | 'countTextTokens'
  | 'embedContent'
  | 'generateAnswer'
  | 'predict'
  | 'predictLongRunning'
  | 'createTunedModel';

/**
 * Detailed model information with properties from the API
 */
export interface AIModelInfo {
  name: string;
  version: string;
  displayName: string;
  description?: string;
  inputTokenLimit: number;
  outputTokenLimit: number;
  supportedGenerationMethods: GenerationMethod[];
  temperature?: number;
  topP?: number;
  topK?: number;
  maxTemperature?: number;
}

/**
 * Collection of model information organized by model family
 */
export const MODEL_INFO: Record<string, AIModelInfo> = {
  // Embedding models
  'embedding-gecko-001': {
    name: 'models/embedding-gecko-001',
    version: '001',
    displayName: 'Embedding Gecko',
    description: 'Obtain a distributed representation of a text.',
    inputTokenLimit: 1024,
    outputTokenLimit: 1,
    supportedGenerationMethods: [
      'embedText',
      'countTextTokens'
    ]
  },
  'embedding-001': {
    name: 'models/embedding-001',
    version: '001',
    displayName: 'Embedding 001',
    description: 'Obtain a distributed representation of a text.',
    inputTokenLimit: 2048,
    outputTokenLimit: 1,
    supportedGenerationMethods: [
      'embedContent'
    ]
  },
  'text-embedding-004': {
    name: 'models/text-embedding-004',
    version: '004',
    displayName: 'Text Embedding 004',
    description: 'Obtain a distributed representation of a text.',
    inputTokenLimit: 2048,
    outputTokenLimit: 1,
    supportedGenerationMethods: [
      'embedContent'
    ]
  },
  'gemini-embedding-exp-03-07': {
    name: 'models/gemini-embedding-exp-03-07',
    version: 'exp-03-07',
    displayName: 'Gemini Embedding Experimental 03-07',
    description: 'Obtain a distributed representation of a text.',
    inputTokenLimit: 8192,
    outputTokenLimit: 1,
    supportedGenerationMethods: [
      'embedContent',
      'countTextTokens'
    ]
  },
  'gemini-embedding-exp': {
    name: 'models/gemini-embedding-exp',
    version: 'exp-03-07',
    displayName: 'Gemini Embedding Experimental',
    description: 'Obtain a distributed representation of a text.',
    inputTokenLimit: 8192,
    outputTokenLimit: 1,
    supportedGenerationMethods: [
      'embedContent',
      'countTextTokens'
    ]
  },

  // Gemini 1.0 family models
  'gemini-1.0-pro-vision-latest': {
    name: 'models/gemini-1.0-pro-vision-latest',
    version: '001',
    displayName: 'Gemini 1.0 Pro Vision',
    description: 'The original Gemini 1.0 Pro Vision model version which was optimized for image understanding. Gemini 1.0 Pro Vision was deprecated on July 12, 2024. Move to a newer Gemini version.',
    inputTokenLimit: 12288,
    outputTokenLimit: 4096,
    supportedGenerationMethods: [
      'generateContent',
      'countTokens'
    ],
    temperature: 0.4,
    topP: 1,
    topK: 32
  },
  'gemini-pro-vision': {
    name: 'models/gemini-pro-vision',
    version: '001',
    displayName: 'Gemini 1.0 Pro Vision',
    description: 'The original Gemini 1.0 Pro Vision model version which was optimized for image understanding. Gemini 1.0 Pro Vision was deprecated on July 12, 2024. Move to a newer Gemini version.',
    inputTokenLimit: 12288,
    outputTokenLimit: 4096,
    supportedGenerationMethods: [
      'generateContent',
      'countTokens'
    ],
    temperature: 0.4,
    topP: 1,
    topK: 32
  },

  // Gemini 1.5 family models
  'gemini-1.5-pro-latest': {
    name: 'models/gemini-1.5-pro-latest',
    version: '001',
    displayName: 'Gemini 1.5 Pro Latest',
    description: 'Alias that points to the most recent production (non-experimental) release of Gemini 1.5 Pro, our mid-size multimodal model that supports up to 2 million tokens.',
    inputTokenLimit: 2000000,
    outputTokenLimit: 8192,
    supportedGenerationMethods: [
      'generateContent',
      'countTokens'
    ],
    temperature: 1,
    topP: 0.95,
    topK: 40,
    maxTemperature: 2
  },
  'gemini-1.5-pro-001': {
    name: 'models/gemini-1.5-pro-001',
    version: '001',
    displayName: 'Gemini 1.5 Pro 001',
    description: 'Stable version of Gemini 1.5 Pro, our mid-size multimodal model that supports up to 2 million tokens, released in May of 2024.',
    inputTokenLimit: 2000000,
    outputTokenLimit: 8192,
    supportedGenerationMethods: [
      'generateContent',
      'countTokens',
      'createCachedContent'
    ],
    temperature: 1,
    topP: 0.95,
    topK: 64,
    maxTemperature: 2
  },
  'gemini-1.5-pro-002': {
    name: 'models/gemini-1.5-pro-002',
    version: '002',
    displayName: 'Gemini 1.5 Pro 002',
    description: 'Stable version of Gemini 1.5 Pro, our mid-size multimodal model that supports up to 2 million tokens, released in September of 2024.',
    inputTokenLimit: 2000000,
    outputTokenLimit: 8192,
    supportedGenerationMethods: [
      'generateContent',
      'countTokens',
      'createCachedContent'
    ],
    temperature: 1,
    topP: 0.95,
    topK: 40,
    maxTemperature: 2
  },
  'gemini-1.5-pro': {
    name: 'models/gemini-1.5-pro',
    version: '001',
    displayName: 'Gemini 1.5 Pro',
    description: 'Stable version of Gemini 1.5 Pro, our mid-size multimodal model that supports up to 2 million tokens, released in May of 2024.',
    inputTokenLimit: 2000000,
    outputTokenLimit: 8192,
    supportedGenerationMethods: [
      'generateContent',
      'countTokens'
    ],
    temperature: 1,
    topP: 0.95,
    topK: 40,
    maxTemperature: 2
  },
  'gemini-1.5-flash-latest': {
    name: 'models/gemini-1.5-flash-latest',
    version: '001',
    displayName: 'Gemini 1.5 Flash Latest',
    description: 'Alias that points to the most recent production (non-experimental) release of Gemini 1.5 Flash, our fast and versatile multimodal model for scaling across diverse tasks.',
    inputTokenLimit: 1000000,
    outputTokenLimit: 8192,
    supportedGenerationMethods: [
      'generateContent',
      'countTokens'
    ],
    temperature: 1,
    topP: 0.95,
    topK: 40,
    maxTemperature: 2
  },
  'gemini-1.5-flash-001': {
    name: 'models/gemini-1.5-flash-001',
    version: '001',
    displayName: 'Gemini 1.5 Flash 001',
    description: 'Stable version of Gemini 1.5 Flash, our fast and versatile multimodal model for scaling across diverse tasks, released in May of 2024.',
    inputTokenLimit: 1000000,
    outputTokenLimit: 8192,
    supportedGenerationMethods: [
      'generateContent',
      'countTokens',
      'createCachedContent'
    ],
    temperature: 1,
    topP: 0.95,
    topK: 64,
    maxTemperature: 2
  },
  'gemini-1.5-flash-001-tuning': {
    name: 'models/gemini-1.5-flash-001-tuning',
    version: '001',
    displayName: 'Gemini 1.5 Flash 001 Tuning',
    description: 'Version of Gemini 1.5 Flash that supports tuning, our fast and versatile multimodal model for scaling across diverse tasks, released in May of 2024.',
    inputTokenLimit: 16384,
    outputTokenLimit: 8192,
    supportedGenerationMethods: [
      'generateContent',
      'countTokens',
      'createTunedModel'
    ],
    temperature: 1,
    topP: 0.95,
    topK: 64,
    maxTemperature: 2
  },
  'gemini-1.5-flash': {
    name: 'models/gemini-1.5-flash',
    version: '001',
    displayName: 'Gemini 1.5 Flash',
    description: 'Alias that points to the most recent stable version of Gemini 1.5 Flash, our fast and versatile multimodal model for scaling across diverse tasks.',
    inputTokenLimit: 1000000,
    outputTokenLimit: 8192,
    supportedGenerationMethods: [
      'generateContent',
      'countTokens'
    ],
    temperature: 1,
    topP: 0.95,
    topK: 40,
    maxTemperature: 2
  },
  'gemini-1.5-flash-002': {
    name: 'models/gemini-1.5-flash-002',
    version: '002',
    displayName: 'Gemini 1.5 Flash 002',
    description: 'Stable version of Gemini 1.5 Flash, our fast and versatile multimodal model for scaling across diverse tasks, released in September of 2024.',
    inputTokenLimit: 1000000,
    outputTokenLimit: 8192,
    supportedGenerationMethods: [
      'generateContent',
      'countTokens',
      'createCachedContent'
    ],
    temperature: 1,
    topP: 0.95,
    topK: 40,
    maxTemperature: 2
  },
  'gemini-1.5-flash-8b': {
    name: 'models/gemini-1.5-flash-8b',
    version: '001',
    displayName: 'Gemini 1.5 Flash-8B',
    description: 'Stable version of Gemini 1.5 Flash-8B, our smallest and most cost effective Flash model, released in October of 2024.',
    inputTokenLimit: 1000000,
    outputTokenLimit: 8192,
    supportedGenerationMethods: [
      'createCachedContent',
      'generateContent',
      'countTokens'
    ],
    temperature: 1,
    topP: 0.95,
    topK: 40,
    maxTemperature: 2
  },
  'gemini-1.5-flash-8b-001': {
    name: 'models/gemini-1.5-flash-8b-001',
    version: '001',
    displayName: 'Gemini 1.5 Flash-8B 001',
    description: 'Stable version of Gemini 1.5 Flash-8B, our smallest and most cost effective Flash model, released in October of 2024.',
    inputTokenLimit: 1000000,
    outputTokenLimit: 8192,
    supportedGenerationMethods: [
      'createCachedContent',
      'generateContent',
      'countTokens'
    ],
    temperature: 1,
    topP: 0.95,
    topK: 40,
    maxTemperature: 2
  },
  'gemini-1.5-flash-8b-latest': {
    name: 'models/gemini-1.5-flash-8b-latest',
    version: '001',
    displayName: 'Gemini 1.5 Flash-8B Latest',
    description: 'Alias that points to the most recent production (non-experimental) release of Gemini 1.5 Flash-8B, our smallest and most cost effective Flash model, released in October of 2024.',
    inputTokenLimit: 1000000,
    outputTokenLimit: 8192,
    supportedGenerationMethods: [
      'createCachedContent',
      'generateContent',
      'countTokens'
    ],
    temperature: 1,
    topP: 0.95,
    topK: 40,
    maxTemperature: 2
  },

  // Gemini 2.0 family models
  'gemini-2.0-flash-exp': {
    name: 'models/gemini-2.0-flash-exp',
    version: '2.0',
    displayName: 'Gemini 2.0 Flash Experimental',
    description: 'Gemini 2.0 Flash Experimental',
    inputTokenLimit: 1048576,
    outputTokenLimit: 8192,
    supportedGenerationMethods: [
      'generateContent',
      'countTokens',
      'bidiGenerateContent'
    ],
    temperature: 1,
    topP: 0.95,
    topK: 40,
    maxTemperature: 2
  },
  'gemini-2.0-flash': {
    name: 'models/gemini-2.0-flash',
    version: '2.0',
    displayName: 'Gemini 2.0 Flash',
    description: 'Gemini 2.0 Flash',
    inputTokenLimit: 1048576,
    outputTokenLimit: 8192,
    supportedGenerationMethods: [
      'generateContent',
      'countTokens',
      'createCachedContent',
      'batchGenerateContent'
    ],
    temperature: 1,
    topP: 0.95,
    topK: 40,
    maxTemperature: 2
  },
  'gemini-2.0-flash-001': {
    name: 'models/gemini-2.0-flash-001',
    version: '2.0',
    displayName: 'Gemini 2.0 Flash 001',
    description: 'Stable version of Gemini 2.0 Flash, our fast and versatile multimodal model for scaling across diverse tasks, released in January of 2025.',
    inputTokenLimit: 1048576,
    outputTokenLimit: 8192,
    supportedGenerationMethods: [
      'generateContent',
      'countTokens',
      'createCachedContent',
      'batchGenerateContent'
    ],
    temperature: 1,
    topP: 0.95,
    topK: 40,
    maxTemperature: 2
  },
  'gemini-2.0-flash-lite-001': {
    name: 'models/gemini-2.0-flash-lite-001',
    version: '2.0',
    displayName: 'Gemini 2.0 Flash-Lite 001',
    description: 'Stable version of Gemini 2.0 Flash Lite',
    inputTokenLimit: 1048576,
    outputTokenLimit: 8192,
    supportedGenerationMethods: [
      'generateContent',
      'countTokens',
      'createCachedContent',
      'batchGenerateContent'
    ],
    temperature: 1,
    topP: 0.95,
    topK: 40,
    maxTemperature: 2
  },
  'gemini-2.0-flash-lite': {
    name: 'models/gemini-2.0-flash-lite',
    version: '2.0',
    displayName: 'Gemini 2.0 Flash-Lite',
    description: 'Gemini 2.0 Flash-Lite',
    inputTokenLimit: 1048576,
    outputTokenLimit: 8192,
    supportedGenerationMethods: [
      'generateContent',
      'countTokens',
      'createCachedContent',
      'batchGenerateContent'
    ],
    temperature: 1,
    topP: 0.95,
    topK: 40,
    maxTemperature: 2
  },

  // Gemini 2.5 family models
  'gemini-2.5-pro-exp-03-25': {
    name: 'models/gemini-2.5-pro-exp-03-25',
    version: '2.5-exp-03-25',
    displayName: 'Gemini 2.5 Pro Experimental 03-25',
    description: 'Experimental release (March 25th, 2025) of Gemini 2.5 Pro',
    inputTokenLimit: 1048576,
    outputTokenLimit: 65536,
    supportedGenerationMethods: [
      'generateContent',
      'countTokens',
      'createCachedContent',
      'batchGenerateContent'
    ],
    temperature: 1,
    topP: 0.95,
    topK: 64,
    maxTemperature: 2
  },
  'gemini-2.5-pro-preview-03-25': {
    name: 'models/gemini-2.5-pro-preview-03-25',
    version: '2.5-preview-03-25',
    displayName: 'Gemini 2.5 Pro Preview 03-25',
    description: 'Gemini 2.5 Pro Preview 03-25',
    inputTokenLimit: 1048576,
    outputTokenLimit: 65536,
    supportedGenerationMethods: [
      'generateContent',
      'countTokens',
      'createCachedContent',
      'batchGenerateContent'
    ],
    temperature: 1,
    topP: 0.95,
    topK: 64,
    maxTemperature: 2
  },
  'gemini-2.5-flash-preview-04-17': {
    name: 'models/gemini-2.5-flash-preview-04-17',
    version: '2.5-preview-04-17',
    displayName: 'Gemini 2.5 Flash Preview 04-17',
    description: 'Preview release (April 17th, 2025) of Gemini 2.5 Flash',
    inputTokenLimit: 1048576,
    outputTokenLimit: 65536,
    supportedGenerationMethods: [
      'generateContent',
      'countTokens',
      'createCachedContent',
      'batchGenerateContent'
    ],
    temperature: 1,
    topP: 0.95,
    topK: 64,
    maxTemperature: 2
  },
  'gemini-2.5-pro-preview-05-06': {
    name: 'models/gemini-2.5-pro-preview-05-06',
    version: '2.5-preview-05-06',
    displayName: 'Gemini 2.5 Pro Preview 05-06',
    description: 'Preview release (May 6th, 2025) of Gemini 2.5 Pro',
    inputTokenLimit: 1048576,
    outputTokenLimit: 65536,
    supportedGenerationMethods: [
      'generateContent',
      'countTokens',
      'createCachedContent',
      'batchGenerateContent'
    ],
    temperature: 1,
    topP: 0.95,
    topK: 64,
    maxTemperature: 2
  },

  // Other models
  'aqa': {
    name: 'models/aqa',
    version: '001',
    displayName: 'Model that performs Attributed Question Answering.',
    description: 'Model trained to return answers to questions that are grounded in provided sources, along with estimating answerable probability.',
    inputTokenLimit: 7168,
    outputTokenLimit: 1024,
    supportedGenerationMethods: [
      'generateAnswer'
    ],
    temperature: 0.2,
    topP: 1,
    topK: 40
  },

  // Image generation models
  'imagen-3.0-generate-002': {
    name: 'models/imagen-3.0-generate-002',
    version: '002',
    displayName: 'Imagen 3.0 002 model',
    description: 'Vertex served Imagen 3.0 002 model',
    inputTokenLimit: 480,
    outputTokenLimit: 8192,
    supportedGenerationMethods: [
      'predict'
    ]
  },
  'veo-2.0-generate-001': {
    name: 'models/veo-2.0-generate-001',
    version: '2.0',
    displayName: 'Veo 2',
    description: 'Vertex served Veo 2 model.',
    inputTokenLimit: 480,
    outputTokenLimit: 8192,
    supportedGenerationMethods: [
      'predictLongRunning'
    ]
  }
};

/**
 * Models available with current API key
 */
export type AIModel = 
  // Gemini 1.0 family models
  'gemini-pro-vision' | 'gemini-1.0-pro-vision' | 'gemini-1.0-pro-vision-latest' |
  // Gemini 1.5 family models 
  'gemini-1.5-pro' | 'gemini-1.5-pro-latest' | 'gemini-1.5-pro-001' | 'gemini-1.5-pro-002' |
  'gemini-1.5-flash' | 'gemini-1.5-flash-latest' | 'gemini-1.5-flash-001' | 'gemini-1.5-flash-002' |
  'gemini-1.5-flash-8b' | 'gemini-1.5-flash-8b-001' | 'gemini-1.5-flash-8b-latest' |
  // Gemini 2.0 family models
  'gemini-2.0-flash' | 'gemini-2.0-flash-001' | 'gemini-2.0-flash-exp' | 'gemini-2.0-flash-lite' | 'gemini-2.0-flash-lite-001' |
  // Gemini 2.5 family models
  'gemini-2.5-pro-exp-03-25' | 'gemini-2.5-pro-preview-03-25' | 'gemini-2.5-pro-preview-05-06' |
  'gemini-2.5-flash-preview-04-17' |
  // Image generation models
  'imagen-3.0-generate-002';

export interface ThemeOption {
  id: string;
  name: string;
  description: string;
  preview?: string;
}

export interface StyleOption {
  id: string;
  name: string;
  description: string;
  preview?: string;
}