import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
};

interface DeckLimitResponse {
  canGenerate: boolean;
  reason: string;
  limitReached: boolean;
  planType: string;
  currentUsage?: number;
  limit?: number;
  remaining?: number;
  nextResetDate?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      status: 204,
      headers: corsHeaders
    });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { 
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Get the user from the token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { 
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Get the deck type from the URL
    const url = new URL(req.url);
    const deckType = url.searchParams.get('deckType') || 'major_arcana';
    
    if (deckType !== 'major_arcana' && deckType !== 'complete') {
      return new Response(
        JSON.stringify({ error: 'Invalid deck type. Must be "major_arcana" or "complete"' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Call the RPC function to check the limit
    const { data, error } = await supabase.rpc('check_deck_generation_limit', {
      user_id_param: user.id,
      deck_type: deckType
    });
    
    if (error) {
      console.error('Error checking deck generation limit:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to check deck generation limit' }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Format the response
    const response: DeckLimitResponse = {
      canGenerate: data.can_generate,
      reason: data.reason,
      limitReached: data.limit_reached,
      planType: data.plan_type,
      currentUsage: data.current_usage,
      limit: data.limit,
      remaining: data.remaining
    };

    // If there's a next reset date, include it
    if (data.next_reset_date) {
      response.nextResetDate = data.next_reset_date;
    }

    return new Response(
      JSON.stringify(response),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Error in check-deck-limits function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});