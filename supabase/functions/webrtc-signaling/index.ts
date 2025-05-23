// Follow this setup guide to integrate the Deno runtime and use supabase functions:
// https://supabase.com/docs/guides/functions

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
}

interface SignalPayload {
  type: 'offer' | 'answer' | 'ice-candidate';
  sender: string;
  recipient: string | null;
  sessionId: string;
  data: any;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { method } = req
    const url = new URL(req.url)
    const action = url.pathname.split('/').pop()

    // Get the request body
    const reqBody = await req.json()

    // Get the Supabase client from the request
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY') || ''

    if (!supabaseUrl || !supabaseKey) {
      return new Response(
        JSON.stringify({ error: 'Missing Supabase URL or key' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500 
        }
      )
    }

    // Validate input
    if (!reqBody || !reqBody.signal || !reqBody.sessionId) {
      return new Response(
        JSON.stringify({ error: 'Invalid request body. Expected signal and sessionId fields.' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      )
    }

    const { signal, sessionId } = reqBody
    
    if (action === 'signal') {
      // Validate the signal payload
      if (!signal.type || !signal.sender) {
        return new Response(
          JSON.stringify({ 
            error: 'Invalid signal format. Expected type and sender fields.' 
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400 
          }
        )
      }

      const signalPayload: SignalPayload = {
        type: signal.type,
        sender: signal.sender,
        recipient: signal.recipient || null,
        sessionId,
        data: signal.data
      }

      // Broadcast the signal to the appropriate channel
      const response = await fetch(`${supabaseUrl}/realtime/v1/broadcast`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`
        },
        body: JSON.stringify({
          channel: `webrtc:${sessionId}`,
          event: 'signal',
          payload: signalPayload
        })
      })

      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch (e) {
          errorData = { error: `Failed to parse error response: ${e.message}` };
        }
        
        return new Response(
          JSON.stringify({ error: 'Failed to broadcast signal', details: errorData }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500 
          }
        )
      }

      return new Response(
        JSON.stringify({ success: true, sessionId }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      )
    }

    // If action is not recognized
    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})