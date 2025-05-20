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
  interval?: 'month' | 'year' | 'week' | 'day';
  features?: string[];
}

export const STRIPE_PRODUCTS: Record<string, StripeProduct> = {
  subscription: {
    priceId: 'price_1ROxKkCzE3rkgdDIwV7o3c6S',
    name: 'Premium Membership',
    description: 'Unlimited access to premium tarot decks, advanced AI readings, and exclusive reader sessions',
    mode: 'subscription',
    price: 9.99,
    currency: 'usd',
    interval: 'month',
    features: [
      'Unlimited access to premium decks',
      'Advanced AI reading interpretations',
      'Priority access to certified readers',
      'Exclusive member-only decks',
      'Save unlimited reading history'
    ]
  }
};

export default STRIPE_PRODUCTS;