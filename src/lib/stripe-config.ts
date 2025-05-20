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
  mystic: {
    priceId: 'price_1ROxKkCzE3rkgdDILMeJSI4D',
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
  creator: {
    priceId: 'price_1ROxKkCzE3rkgdDIZVPaqZHm',
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
  visionary: {
    priceId: 'price_1ROxKkCzE3rkgdDIFrJaFEtC',
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
  }
};

export default STRIPE_PRODUCTS;