import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import Stripe from 'npm:stripe@17.7.0';
import { createClient } from 'npm:@supabase/supabase-js@2.49.1';

const stripeSecret = Deno.env.get('STRIPE_SECRET_KEY')!;
const stripeWebhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')!;
const stripe = new Stripe(stripeSecret, {
  appInfo: {
    name: 'Tarot Forge',
    version: '1.0.0',
  },
});

const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

Deno.serve(async (req) => {
  try {
    // Handle OPTIONS request for CORS preflight
    if (req.method === 'OPTIONS') {
      return new Response(null, { 
        status: 204,
        headers: corsHeaders
      });
    }

    if (req.method !== 'POST') {
      return new Response('Method not allowed', { 
        status: 405,
        headers: corsHeaders
      });
    }

    // Get the signature from the header
    const signature = req.headers.get('stripe-signature');

    if (!signature) {
      return new Response('No signature found', { 
        status: 400,
        headers: corsHeaders
      });
    }

    // Get the raw body
    const body = await req.text();

    // Verify the webhook signature
    let event: Stripe.Event;

    try {
      event = await stripe.webhooks.constructEventAsync(body, signature, stripeWebhookSecret);
    } catch (error: any) {
      console.error(`Webhook signature verification failed: ${error.message}`);
      return new Response(`Webhook signature verification failed: ${error.message}`, { 
        status: 400,
        headers: corsHeaders
      });
    }

    // Process the event asynchronously
    EdgeRuntime.waitUntil(handleEvent(event));

    return Response.json({ received: true }, { headers: corsHeaders });
  } catch (error: any) {
    console.error('Error processing webhook:', error);
    return Response.json({ error: error.message }, { 
      status: 500,
      headers: corsHeaders
    });
  }
});

async function handleEvent(event: Stripe.Event) {
  const stripeData = event?.data?.object ?? {};

  if (!stripeData) {
    return;
  }

  if (!('customer' in stripeData)) {
    return;
  }

  // For one time payments, we only listen for the checkout.session.completed event
  if (event.type === 'payment_intent.succeeded' && event.data.object.invoice === null) {
    return;
  }

  const { customer: customerId } = stripeData;

  if (!customerId || typeof customerId !== 'string') {
    console.error(`No customer received on event: ${JSON.stringify(event)}`);
  } else {
    let isSubscription = true;

    if (event.type === 'checkout.session.completed') {
      const { mode } = stripeData as Stripe.Checkout.Session;

      isSubscription = mode === 'subscription';

      console.info(`Processing ${isSubscription ? 'subscription' : 'one-time payment'} checkout session`);
    }

    const { mode, payment_status } = stripeData as Stripe.Checkout.Session;

    if (isSubscription) {
      console.info(`Starting subscription sync for customer: ${customerId}`);
      await syncCustomerFromStripe(customerId);
    } else if (mode === 'payment' && payment_status === 'paid') {
      try {
        // Extract the necessary information from the session
        const {
          id: checkout_session_id,
          payment_intent,
          amount_subtotal,
          amount_total,
          currency,
        } = stripeData as Stripe.Checkout.Session;

        // Insert the order into the stripe_orders table
        const { error: orderError } = await supabase.from('stripe_orders').insert({
          checkout_session_id,
          payment_intent_id: payment_intent,
          customer_id: customerId,
          amount_subtotal,
          amount_total,
          currency,
          payment_status,
          status: 'completed', // assuming we want to mark it as completed since payment is successful
        });

        if (orderError) {
          console.error('Error inserting order:', orderError);
          return;
        }
        
        // Handle one-time payment for Explorer Plus
        // This is for upgrading a specific deck from Major Arcana to Complete
        if (stripeData.metadata && stripeData.metadata.deckId) {
          const deckId = stripeData.metadata.deckId;
          
          // Update the deck to allow complete deck generation
          const { error: deckError } = await supabase
            .from('decks')
            .update({
              card_count: 78, // Update to full deck count
              is_explorer_plus: true // Mark as Explorer Plus upgraded
            })
            .eq('id', deckId);
            
          if (deckError) {
            console.error('Error updating deck for Explorer Plus:', deckError);
          }
          
          // Get the user ID from the customer
          const { data: customerData } = await supabase
            .from('stripe_customers')
            .select('user_id')
            .eq('customer_id', customerId)
            .single();
            
          if (customerData && customerData.user_id) {
            // Update the user's deck usage to allow one complete deck
            const { error: usageError } = await supabase
              .from('user_deck_usage')
              .update({
                plan_type: 'explorer-plus',
                complete_decks_generated: 0, // Reset to allow generation
                updated_at: new Date().toISOString()
              })
              .eq('user_id', customerData.user_id);
              
            if (usageError) {
              console.error('Error updating user deck usage for Explorer Plus:', usageError);
            }
          }
        }
        
        console.info(`Successfully processed one-time payment for session: ${checkout_session_id}`);
      } catch (error) {
        console.error('Error processing one-time payment:', error);
      }
    }
  }
}

// Based on the excellent https://github.com/t3dotgg/stripe-recommendations
async function syncCustomerFromStripe(customerId: string) {
  try {
    // Fetch latest subscription data from Stripe
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      limit: 1,
      status: 'all',
      expand: ['data.default_payment_method'],
    });

    if (subscriptions.data.length === 0) {
      console.info(`No active subscriptions found for customer: ${customerId}`);
      const { error: noSubError } = await supabase.from('stripe_subscriptions').upsert(
        {
          customer_id: customerId,
          subscription_status: 'not_started',
        },
        {
          onConflict: 'customer_id',
        },
      );

      if (noSubError) {
        console.error('Error updating subscription status:', noSubError);
        throw new Error('Failed to update subscription status in database');
      }
      
      return;
    }

    // Assumes that a customer can only have a single subscription
    const subscription = subscriptions.data[0];

    // Store subscription state
    const { error: subError } = await supabase.from('stripe_subscriptions').upsert(
      {
        customer_id: customerId,
        subscription_id: subscription.id,
        price_id: subscription.items.data[0].price.id,
        current_period_start: subscription.current_period_start,
        current_period_end: subscription.current_period_end,
        cancel_at_period_end: subscription.cancel_at_period_end,
        ...(subscription.default_payment_method && typeof subscription.default_payment_method !== 'string'
          ? {
              payment_method_brand: subscription.default_payment_method.card?.brand ?? null,
              payment_method_last4: subscription.default_payment_method.card?.last4 ?? null,
            }
          : {}),
        status: subscription.status,
      },
      {
        onConflict: 'customer_id',
      },
    );

    if (subError) {
      console.error('Error syncing subscription:', subError);
      throw new Error('Failed to sync subscription in database');
    }
    
    // If subscription is active or trialing, update the user's deck usage plan
    if (subscription.status === 'active' || subscription.status === 'trialing') {
      // Get the user ID from the customer
      const { data: customerData } = await supabase
        .from('stripe_customers')
        .select('user_id')
        .eq('customer_id', customerId)
        .single();
        
      if (customerData && customerData.user_id) {
        // Determine plan type based on price ID
        const priceId = subscription.items.data[0].price.id;
        let planType = 'free';
        
        if (priceId.includes('mystic')) {
          planType = 'mystic';
        } else if (priceId.includes('creator')) {
          planType = 'creator';
        } else if (priceId.includes('visionary')) {
          planType = 'visionary';
        }
        
        // Calculate next reset date based on subscription period end
        const nextResetDate = new Date(subscription.current_period_end * 1000);
        
        // Update the user's deck usage plan
        const { error: usageError } = await supabase
          .from('user_deck_usage')
          .update({
            plan_type: planType,
            next_reset_date: nextResetDate.toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('user_id', customerData.user_id);
          
        if (usageError) {
          console.error('Error updating user deck usage plan:', usageError);
        }
      }
    }
    
    console.info(`Successfully synced subscription for customer: ${customerId}`);
  } catch (error) {
    console.error(`Failed to sync subscription for customer ${customerId}:`, error);
    throw error;
  }
}