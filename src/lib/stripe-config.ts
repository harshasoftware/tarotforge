/**
 * Stripe product configuration
 * 
 * This file contains the configuration for the Stripe products used in the application.
 * Each product must include priceId, name, description, and mode properties.
 */

export interface StripeProduct {
  priceId: string;
  name: string;
  description: string;
  mode: 'payment' | 'subscription';
  price?: number;
  currency?: string;
  interval?: 'month' | 'year';
  baseCredits?: number;
  premiumCredits?: number;
  maxRolloverCredits?: number;
  features?: string[];
  popular?: boolean;
  cardImageQuality?: 'medium' | 'high';
}

export const STRIPE_PRODUCTS: Record<string, StripeProduct> = {
  // Monthly Plans
  'mystic-monthly': {
    priceId: 'price_1ROxKkCzE3rkgdDIwV7o3c6S',
    name: 'Mystic',
    description: 'Perfect for beginners exploring tarot creation',
    mode: 'subscription',
    price: 12.99,
    currency: 'usd',
    interval: 'month',
    baseCredits: 22,
    premiumCredits: 0,
    maxRolloverCredits: 5,
    cardImageQuality: 'medium',
    features: [
      '22 monthly basic credits',
      'Create complete Major Arcana (22 cards)',
      'Medium quality image generation',
      'Rollover up to 5 unused credits',
      'Deck sharing capabilities'
    ]
  },
  'creator-monthly': {
    priceId: 'price_1RR3oICzE3rkgdDIAa5rt1Ds',
    name: 'Creator',
    description: 'For serious tarot enthusiasts and deck creators',
    mode: 'subscription',
    price: 29.99,
    currency: 'usd',
    interval: 'month',
    baseCredits: 78,
    premiumCredits: 0,
    maxRolloverCredits: 15,
    cardImageQuality: 'medium',
    features: [
      '78 monthly basic credits',
      'Create complete full tarot deck (78 cards)',
      'Medium quality image generation',
      'Rollover up to 15 unused credits',
      'Sell your decks in marketplace'
    ],
    popular: true
  },
  'visionary-monthly': {
    priceId: 'price_1RR3r8CzE3rkgdDIWbWO283C',
    name: 'Visionary',
    description: 'For professional creators and artists',
    mode: 'subscription',
    price: 79.99,
    currency: 'usd',
    interval: 'month',
    baseCredits: 0,
    premiumCredits: 118,
    maxRolloverCredits: 118,
    cardImageQuality: 'high',
    features: [
      '118 monthly premium credits',
      'High quality image generation',
      'Style consistency between cards',
      'Full rollover of unused credits',
      'Exclusive visionary-only decks'
    ]
  },
  
  // Yearly Plans
  'mystic-yearly': {
    priceId: 'price_1RR3kzCzE3rkgdDI9AYaw6Ts',
    name: 'Mystic (Yearly)',
    description: 'Perfect for beginners exploring tarot creation',
    mode: 'subscription',
    price: 124.00,
    currency: 'usd',
    interval: 'year',
    baseCredits: 264, // 22 * 12
    premiumCredits: 0,
    maxRolloverCredits: 22, // More rollover for yearly
    cardImageQuality: 'medium',
    features: [
      'Save 20% compared to monthly',
      '264 yearly basic credits',
      'Medium quality image generation',
      'Rollover up to 22 unused credits',
      'Deck sharing capabilities'
    ]
  },
  'creator-yearly': {
    priceId: 'price_1RR3oICzE3rkgdDIT9XhLhah',
    name: 'Creator (Yearly)',
    description: 'For serious tarot enthusiasts and deck creators',
    mode: 'subscription',
    price: 299.00,
    currency: 'usd',
    interval: 'year',
    baseCredits: 936, // 78 * 12
    premiumCredits: 0,
    maxRolloverCredits: 78, // More rollover for yearly
    cardImageQuality: 'medium',
    features: [
      'Save 17% compared to monthly',
      '936 yearly basic credits',
      'Medium quality image generation',
      'Rollover up to 78 unused credits',
      'Sell your decks in marketplace'
    ],
    popular: true
  },
  'visionary-yearly': {
    priceId: 'price_1RR3sACzE3rkgdDI72SXNpqb',
    name: 'Visionary (Yearly)',
    description: 'For professional creators and artists',
    mode: 'subscription',
    price: 767.99,
    currency: 'usd',
    interval: 'year',
    baseCredits: 0,
    premiumCredits: 1416, // 118 * 12
    maxRolloverCredits: 236, // More rollover for yearly
    cardImageQuality: 'high',
    features: [
      'Save 20% compared to monthly',
      '1,416 yearly premium credits',
      'High quality image generation',
      'Style consistency between cards',
      'Full rollover of unused credits',
      'Exclusive visionary-only decks'
    ]
  }
};

export default STRIPE_PRODUCTS;