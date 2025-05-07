import { loadStripe } from '@stripe/stripe-js';

// Using a valid test publishable key format
export const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);