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
    const { count = 1 } = await req.json();
    
    if (typeof count !== 'number' || count < 1) {
      return new Response(
        JSON.stringify({ error: 'Invalid count. Must be a positive number' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Get current regeneration count and limit
    const { data: usageData, error: usageError } = await supabase
      .from('user_deck_usage')
      .select(`
        regenerations_used, 
        plan_type,
        limits:deck_generation_limits!inner(regeneration_limit)
      `)
      .eq('user_id', user.id)
      .single();
      
    if (usageError) {
      console.error('Error fetching user regeneration usage:', usageError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch regeneration usage' }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
    
    // Check if user has enough regenerations left
    if (usageData.regenerations_used + count > usageData.limits.regeneration_limit) {
      return new Response(
        JSON.stringify({ 
          error: 'Regeneration limit reached',
          currentUsage: usageData.regenerations_used,
          limit: usageData.limits.regeneration_limit,
          remaining: Math.max(0, usageData.limits.regeneration_limit - usageData.regenerations_used)
        }),
        { 
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Record the regenerations
    const { error: updateError } = await supabase
      .from('user_deck_usage')
      .update({
        regenerations_used: usageData.regenerations_used + count,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user.id);
      
    if (updateError) {
      console.error('Error recording regeneration usage:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to record regeneration usage' }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        recorded: count,
        currentUsage: usageData.regenerations_used + count,
        limit: usageData.limits.regeneration_limit,
        remaining: usageData.limits.regeneration_limit - (usageData.regenerations_used + count)
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Error in record-regeneration function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});