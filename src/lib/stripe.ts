import { supabase } from './supabase';

interface CheckoutSessionParams {
  priceId: string;
  mode: 'payment' | 'subscription';
  successUrl: string;
  cancelUrl: string;
}

/**
 * Creates a Stripe checkout session
 * @param params Checkout session parameters
 * @returns The checkout session URL
 */
export const createCheckoutSession = async (params: CheckoutSessionParams): Promise<{ sessionId: string; url: string }> => {
  try {
    const { priceId, mode, successUrl, cancelUrl } = params;
    
    // Get the user's JWT token for authentication
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      throw new Error('User not authenticated');
    }
    
    // Call the Supabase Edge Function to create a checkout session
    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-checkout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        price_id: priceId,
        success_url: successUrl,
        cancel_url: cancelUrl,
        mode,
      }),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to create checkout session');
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error creating checkout session:', error);
    throw error;
  }
};

/**
 * Fetches the user's current subscription status
 * @returns The subscription data
 */
export const getUserSubscription = async () => {
  try {
    const { data, error } = await supabase
      .from('stripe_user_subscriptions')
      .select('*')
      .maybeSingle();
    
    if (error) {
      throw error;
    }
    
    return data;
  } catch (error) {
    console.error('Error fetching user subscription:', error);
    return null;
  }
};

/**
 * Checks if the user has an active subscription
 * @returns Boolean indicating if the user has an active subscription
 */
export const hasActiveSubscription = async (): Promise<boolean> => {
  try {
    const subscription = await getUserSubscription();
    return subscription?.subscription_status === 'active' || subscription?.subscription_status === 'trialing';
  } catch (error) {
    console.error('Error checking subscription status:', error);
    return false;
  }
};