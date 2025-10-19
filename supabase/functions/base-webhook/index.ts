import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface WebhookEvent {
  type: string;
  userId?: string;
  action?: string;
  data?: any;
  timestamp?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Only accept POST requests
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        {
          status: 405,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Parse the request body
    const event: WebhookEvent = await req.json()

    // Initialize Supabase client (optional - only if you need to interact with the database)
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (supabaseUrl && supabaseServiceKey) {
      const supabase = createClient(supabaseUrl, supabaseServiceKey)

      // Log the webhook event (optional)
      const { error: logError } = await supabase
        .from('webhook_logs')
        .insert({
          event_type: event.type,
          user_id: event.userId,
          payload: event,
          created_at: new Date().toISOString(),
        })

      if (logError) {
        console.error('Error logging webhook:', logError)
      }
    }

    // Handle different event types from Base/Farcaster
    switch (event.type) {
      case 'user.authenticated':
        console.log(`User authenticated: ${event.userId}`)
        // Handle user authentication
        // You can create/update user profiles, sync wallet addresses, etc.
        break

      case 'user.interaction':
        console.log(`User interaction: ${event.action}`)
        // Handle user interactions within the mini app
        break

      case 'app.installed':
        console.log(`App installed by user: ${event.userId}`)
        // Track app installations
        break

      case 'app.uninstalled':
        console.log(`App uninstalled by user: ${event.userId}`)
        // Clean up user data if needed
        break

      case 'frame.action':
        console.log(`Frame action: ${event.action}`)
        // Handle Farcaster frame interactions
        break

      case 'cast.created':
        console.log(`Cast created with mini app mention`)
        // Handle when your mini app is mentioned in a cast
        break

      default:
        console.log(`Unknown event type: ${event.type}`)
    }

    // Return success response
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Webhook processed successfully',
        timestamp: new Date().toISOString(),
        eventType: event.type,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    console.error('Webhook error:', error)

    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})