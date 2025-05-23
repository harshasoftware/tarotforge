import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS'
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      status: 204,
      headers: corsHeaders
    });
  }

  if (req.method !== 'GET') {
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

    // Get the user's current usage and plan limits
    const { data: usageData, error: usageError } = await supabase
      .from('user_deck_usage')
      .select(`
        *,
        limits:deck_generation_limits!inner(*)
      `)
      .eq('user_id', user.id)
      .single();
      
    if (usageError) {
      console.error('Error fetching user deck usage:', usageError);
      
      // If no record exists, create one with default values
      if (usageError.code === 'PGRST116') { // Row not found
        // Calculate next reset date (first day of next month)
        const nextResetDate = new Date();
        nextResetDate.setMonth(nextResetDate.getMonth() + 1);
        nextResetDate.setDate(1);
        nextResetDate.setHours(0, 0, 0, 0);
        
        // Insert a new record with default values
        const { error: insertError } = await supabase
          .from('user_deck_usage')
          .insert({
            user_id: user.id,
            plan_type: 'free',
            major_arcana_generated: 0,
            complete_decks_generated: 0,
            regenerations_used: 0,
            next_reset_date: nextResetDate.toISOString()
          });
          
        if (insertError) {
          console.error('Error creating user deck usage record:', insertError);
          return new Response(
            JSON.stringify({ error: 'Failed to initialize deck usage' }),
            { 
              status: 500,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          );
        }
        
        // Fetch the default limits for free plan
        const { data: limitsData, error: limitsError } = await supabase
          .from('deck_generation_limits')
          .select('*')
          .eq('plan_type', 'free')
          .single();
          
        if (limitsError) {
          console.error('Error fetching default limits:', limitsError);
          return new Response(
            JSON.stringify({ error: 'Failed to fetch default limits' }),
            { 
              status: 500,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          );
        }
        
        // Return the default values
        return new Response(
          JSON.stringify({
            usage: {
              majorArcanaGenerated: 0,
              completeDecksGenerated: 0,
              regenerationsUsed: 0,
              lastResetDate: null,
              nextResetDate: nextResetDate.toISOString(),
              planType: 'free'
            },
            limits: {
              majorArcanaLimit: limitsData.major_arcana_limit,
              completeDeckLimit: limitsData.complete_deck_limit,
              regenerationLimit: limitsData.regeneration_limit,
              qualityLevel: limitsData.quality_level,
              maxStorage: limitsData.max_storage
            },
            canGenerateMajorArcana: true,
            canGenerateCompleteDeck: false,
            canRegenerate: true
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }
      
      return new Response(
        JSON.stringify({ error: 'Failed to fetch deck usage' }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Format the response
    const response = {
      usage: {
        majorArcanaGenerated: usageData.major_arcana_generated,
        completeDecksGenerated: usageData.complete_decks_generated,
        regenerationsUsed: usageData.regenerations_used,
        lastResetDate: usageData.last_reset_date,
        nextResetDate: usageData.next_reset_date,
        planType: usageData.plan_type
      },
      limits: {
        majorArcanaLimit: usageData.limits.major_arcana_limit,
        completeDeckLimit: usageData.limits.complete_deck_limit,
        regenerationLimit: usageData.limits.regeneration_limit,
        qualityLevel: usageData.limits.quality_level,
        maxStorage: usageData.limits.max_storage
      },
      canGenerateMajorArcana: usageData.major_arcana_generated < usageData.limits.major_arcana_limit,
      canGenerateCompleteDeck: usageData.complete_decks_generated < usageData.limits.complete_deck_limit,
      canRegenerate: usageData.regenerations_used < usageData.limits.regeneration_limit
    };

    return new Response(
      JSON.stringify(response),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Error in get-deck-status function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});