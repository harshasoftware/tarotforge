import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase URL or anon key. Please set environment variables.');
}

// Create Supabase client with specific configs to handle auth correctly
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'implicit' // Use implicit flow instead of PKCE for better compatibility
  },
  global: {
    fetch: (...args) => {
      // Add logging for debugging auth requests
      const [url, config] = args;
      if (typeof url === 'string' && url.includes('auth')) {
        console.log('Auth request to:', url);
      }
      return fetch(...args);
    }
  }
});

// Add listener to catch global fetch errors
window.addEventListener('unhandledrejection', (event) => {
  if (event.reason instanceof Error) {
    if (event.reason.message.includes('fetch') && event.reason.message.includes('auth')) {
      console.error('Unhandled Supabase fetch error:', event.reason);
    }
  }
});

export default supabase;