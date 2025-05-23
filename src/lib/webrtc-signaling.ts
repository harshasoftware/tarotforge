import { supabase } from './supabase';

/**
 * Helper functions for WebRTC signaling using Supabase Realtime
 */

interface SignalData {
  type: 'offer' | 'answer' | 'ice-candidate';
  sender: string;
  recipient: string | null;
  sessionId: string;
  data: any;
}

/**
 * Send a WebRTC signal through the Supabase Edge Function
 * @param signal The signal data to send
 * @returns True if successful
 */
export const sendSignalThroughFunction = async (signal: SignalData): Promise<boolean> => {
  try {
    // Get the user's JWT token for authentication
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      console.error('No active session for signaling');
      return false;
    }
    
    // Call the Supabase Edge Function
    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/webrtc-signaling/signal`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        signal,
        sessionId: signal.sessionId
      }),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error('Error sending signal through function:', errorData);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error in sendSignalThroughFunction:', error);
    return false;
  }
};

/**
 * Create a Supabase Realtime channel for WebRTC signaling
 * @param sessionId The session ID to use for the channel
 * @param onSignal Callback function to handle incoming signals
 * @returns The channel object and a cleanup function
 */
export const createSignalingChannel = (
  sessionId: string,
  onSignal: (signal: SignalData) => void
) => {
  // Create a channel for this session
  const channel = supabase.channel(`webrtc:${sessionId}`, {
    config: {
      broadcast: {
        self: false,
      },
    }
  });
  
  // Subscribe to signals
  channel
    .on('broadcast', { event: 'signal' }, (payload) => {
      console.log('Received signal through channel:', payload);
      onSignal(payload.payload as SignalData);
    })
    .subscribe((status) => {
      console.log(`Signaling channel status: ${status}`);
    });
  
  // Return the channel and a cleanup function
  return {
    channel,
    cleanup: () => {
      channel.unsubscribe();
    }
  };
};

/**
 * Send a signal through a Supabase Realtime channel
 * @param channel The channel to send through
 * @param signal The signal data to send
 * @returns True if successful
 */
export const sendSignalThroughChannel = (
  channel: any,
  signal: SignalData
): boolean => {
  try {
    channel.send({
      type: 'broadcast',
      event: 'signal',
      payload: signal
    });
    return true;
  } catch (error) {
    console.error('Error sending signal through channel:', error);
    return false;
  }
};