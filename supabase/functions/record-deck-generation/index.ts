import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      status: 204,
      headers: corsHeaders
    });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { 
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
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

    // Get the request body
    const { deckType } = await req.json();
    
    if (!deckType || (deckType !== 'major_arcana' && deckType !== 'complete')) {
      return new Response(
        JSON.stringify({ error: 'Invalid deck type. Must be "major_arcana" or "complete"' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // First check if the user can generate this deck type
    const { data: checkData, error: checkError } = await supabase.rpc('check_deck_generation_limit', {
      user_id_param: user.id,
      deck_type: deckType
    });
    
    if (checkError) {
      console.error('Error checking deck generation limit:', checkError);
      return new Response(
        JSON.stringify({ error: 'Failed to check deck generation limit' }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // If the user can't generate this deck type, return an error
    if (!checkData.can_generate) {
      return new Response(
        JSON.stringify({ 
          error: 'Deck generation limit reached',
          reason: checkData.reason,
          planType: checkData.plan_type,
          currentUsage: checkData.current_usage,
          limit: checkData.limit
        }),
        { 
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Record the deck generation
    const updateField = deckType === 'major_arcana' ? 'major_arcana_generated' : 'complete_decks_generated';
    
    const { data, error } = await supabase.rpc('increment_deck_generation_counter', { 
      user_id_param: user.id, 
      field_name: updateField 
    });
    
    if (error) {
      console.error('Error recording deck generation:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to record deck generation' }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    return new Response(
      JSON.stringify({ success: true, recorded: deckType }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Error in record-deck-generation function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});