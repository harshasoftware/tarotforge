import { loadStripe } from '@stripe/stripe-js';

// Stripe configuration
const stripePublicKey = import.meta.env.VITE_STRIPE_PUBLIC_KEY || '';

if (!stripePublicKey) {
  console.error('Missing Stripe public key. Please set environment variables.');
}

// Initialize Stripe
export const stripePromise = loadStripe(stripePublicKey);