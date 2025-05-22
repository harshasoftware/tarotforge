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
  interval?: 'month' | 'year' | 'once';
  baseCredits?: number;
  premiumCredits?: number;
  maxRolloverCredits?: number;
  features?: string[];
  popular?: boolean;
  cardImageQuality?: 'medium' | 'high';
}

export const STRIPE_PRODUCTS: Record<string, StripeProduct> = {
  // One-time payment
  'explorer-plus': {
    priceId: 'price_1SXplrCzE3rkgdDIwV7o3c6T',
    name: 'Explorer Plus',
    description: 'Upgrade from Major Arcana to a complete 78-card deck',
    mode: 'payment',
    price: 5.00,
    currency: 'usd',
    interval: 'once',
    baseCredits: 56, // Enough to complete a deck from Major Arcana (78-22)
    premiumCredits: 0,
    maxRolloverCredits: 0,
    cardImageQuality: 'medium',
    features: [
      'Upgrade any Major Arcana to a complete 78-card deck',
      '56 additional cards for one deck',
      '5 card regenerations per upgraded deck',
      'Medium quality cards',
      'Personal use only',
      'Option to make upgraded decks private',
      'Upgrade any free deck anytime'
    ]
  },

  // Monthly Plans
  'mystic-monthly': {
    priceId: 'price_1ROxKkCzE3rkgdDIwV7o3c6S',
    name: 'Mystic',
    description: 'For enthusiasts creating multiple themed decks',
    mode: 'subscription',
    price: 12.99,
    currency: 'usd',
    interval: 'month',
    baseCredits: 156,
    premiumCredits: 0,
    maxRolloverCredits: 20,
    cardImageQuality: 'medium',
    features: [
      '2 complete decks (156 cards) per month',
      'Medium quality + enhanced style options',
      'Personal use + limited commercial rights',
      'Public or private deck visibility',
      'Save up to 15 complete decks',
      'Seller profile (30% platform fee)',
      'Custom layouts + deck sharing',
      'Unlimited card regenerations',
      'All free decks upgrade to full automatically'
    ]
  },
  'creator-monthly': {
    priceId: 'price_1RR3oICzE3rkgdDIAa5rt1Ds',
    name: 'Creator',
    description: 'For professional readers and serious deck creators',
    mode: 'subscription',
    price: 29.99,
    currency: 'usd',
    interval: 'month',
    baseCredits: 234,
    premiumCredits: 78,
    maxRolloverCredits: 50,
    cardImageQuality: 'medium',
    features: [
      '4 complete decks (312 cards) per month',
      'Medium + High quality options',
      'Full commercial rights',
      'Complete privacy controls',
      'Store up to 50 decks',
      'Enhanced seller profile (25% fee)',
      'Professional reader tools',
      'Unlimited card regeneration',
      'Batch deck generation',
      'Style consistency engine',
      'Custom card back designs',
      'Priority generation queue'
    ],
    popular: true
  },
  'visionary-monthly': {
    priceId: 'price_1RR3r8CzE3rkgdDIWbWO283C',
    name: 'Visionary',
    description: 'For studios, publishers, and established professionals',
    mode: 'subscription',
    price: 79.99,
    currency: 'usd',
    interval: 'month',
    baseCredits: 312,
    premiumCredits: 312,
    maxRolloverCredits: 200,
    cardImageQuality: 'high',
    features: [
      '8 complete decks (624 cards) per month',
      'High quality cards with premium finishes',
      'Extended commercial + merchandising rights',
      'Advanced content protection',
      'Unlimited deck storage',
      'Verified creator badge (15% fee)',
      'White-label reading room',
      'Priority generation queue',
      'Advanced AI customization options',
      'Animated card effects',
      'Style transfer from uploaded images',
      'API access for integrations',
      'Dedicated account support'
    ]
  },
  
  // Yearly Plans
  'mystic-yearly': {
    priceId: 'price_1RR3kzCzE3rkgdDI9AYaw6Ts',
    name: 'Mystic (Yearly)',
    description: 'For enthusiasts creating multiple themed decks',
    mode: 'subscription',
    price: 124.70,
    currency: 'usd',
    interval: 'year',
    baseCredits: 1872, // 156 * 12
    premiumCredits: 0,
    maxRolloverCredits: 156, // More rollover for yearly
    cardImageQuality: 'medium',
    features: [
      'Save 20% compared to monthly',
      '2 complete decks (156 cards) per month',
      'Medium quality + enhanced style options',
      'Personal use + limited commercial rights',
      'Public or private deck visibility',
      'Save up to 15 complete decks',
      'Seller profile (30% platform fee)',
      'Custom layouts + deck sharing',
      'Unlimited card regenerations',
      'All free decks upgrade to full automatically'
    ]
  },
  'creator-yearly': {
    priceId: 'price_1RR3oICzE3rkgdDIT9XhLhah',
    name: 'Creator (Yearly)',
    description: 'For professional readers and serious deck creators',
    mode: 'subscription',
    price: 287.90,
    currency: 'usd',
    interval: 'year',
    baseCredits: 2808, // 234 * 12
    premiumCredits: 936, // 78 * 12
    maxRolloverCredits: 312, // More rollover for yearly
    cardImageQuality: 'medium',
    features: [
      'Save 20% compared to monthly',
      '4 complete decks (312 cards) per month',
      'Medium + High quality options',
      'Full commercial rights',
      'Complete privacy controls',
      'Store up to 50 decks',
      'Enhanced seller profile (25% fee)',
      'Professional reader tools',
      'Unlimited card regeneration',
      'Batch deck generation',
      'Style consistency engine',
      'Custom card back designs',
      'Priority generation queue'
    ],
    popular: true
  },
  'visionary-yearly': {
    priceId: 'price_1RR3sACzE3rkgdDI72SXNpqb',
    name: 'Visionary (Yearly)',
    description: 'For studios, publishers, and established professionals',
    mode: 'subscription',
    price: 767.99,
    currency: 'usd',
    interval: 'year',
    baseCredits: 3744, // 312 * 12
    premiumCredits: 3744, // 312 * 12
    maxRolloverCredits: 624, // More rollover for yearly
    cardImageQuality: 'high',
    features: [
      'Save 20% compared to monthly',
      '8 complete decks (624 cards) per month',
      'High quality cards with premium finishes',
      'Extended commercial + merchandising rights',
      'Advanced content protection',
      'Unlimited deck storage',
      'Verified creator badge (15% fee)',
      'White-label reading room',
      'Priority generation queue',
      'Advanced AI customization options',
      'Animated card effects',
      'Style transfer from uploaded images',
      'API access for integrations',
      'Dedicated account support'
    ]
  }
};

export default STRIPE_PRODUCTS;