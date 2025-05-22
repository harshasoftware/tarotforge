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
      '2 complete decks (156 cards) per month',
      'Medium quality + style options',
      'Private deck option available',
      'Store up to 10 decks',
      'Basic seller profile (30% commission)',
      'Custom layouts + deck sharing',
      'Card regeneration (10 cards/month)'
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
      '3 complete decks (234 cards) per month',
      'Medium + High quality options',
      'Commercial use rights',
      'Full privacy controls',
      'Store up to 25 decks',
      'Enhanced seller profile (25% commission)',
      'Professional reader tools',
      'Unlimited card regeneration',
      'Batch deck generation'
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
      '5 complete decks (390 cards) per month',
      'High quality only with premium finishes',
      'Extended commercial + merchandising rights',
      'Content protection and complete privacy',
      'Unlimited deck storage',
      'Verified creator badge (15% commission)',
      'White-label reading room',
      'Priority generation queue',
      'Advanced customization options'
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
      '2 complete decks (156 cards) per month',
      'Medium quality + style options',
      'Private deck option available',
      'Store up to 10 decks',
      'Basic seller profile (30% commission)',
      'Custom layouts + deck sharing',
      'Card regeneration (10 cards/month)'
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
      '3 complete decks (234 cards) per month',
      'Medium + High quality options',
      'Commercial use rights',
      'Full privacy controls',
      'Store up to 25 decks',
      'Enhanced seller profile (25% commission)',
      'Professional reader tools',
      'Unlimited card regeneration',
      'Batch deck generation'
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
      '5 complete decks (390 cards) per month',
      'High quality only with premium finishes',
      'Extended commercial + merchandising rights',
      'Content protection and complete privacy',
      'Unlimited deck storage',
      'Verified creator badge (15% commission)',
      'White-label reading room',
      'Priority generation queue',
      'Advanced customization options'
    ]
  }
};

export default STRIPE_PRODUCTS;