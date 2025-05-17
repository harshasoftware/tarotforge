export interface User {
  id: string;
  email: string;
  username?: string;
  avatar_url?: string;
  created_at: string;
  is_creator?: boolean;
  is_reader?: boolean;
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
}

export interface Card {
  id: string;
  deck_id: string;
  name: string;
  description: string;
  image_url: string;
  card_type: 'major' | 'minor';
  suit?: 'wands' | 'cups' | 'swords' | 'pentacles' | null;
  position?: 'upright' | 'reversed';
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

export type AIModel = 'gemini-pro' | 'gemini-pro-vision' | 'gemini-flash' | 'gemini-2.0-flash' | 'imagen-3' | 'imagen-3.0-fast-generate-001';

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