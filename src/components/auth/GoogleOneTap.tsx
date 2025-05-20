import { useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import googleOneTap from 'google-one-tap';

// Define types for Google One Tap response
type GoogleOneTapResponse = {
  credential: string;
  select_by?: string;
  clientId?: string;
};

type GoogleOneTapOptions = {
  client_id: string;
  auto_select?: boolean;
  cancel_on_tap_outside?: boolean;
  context?: 'signin' | 'signup' | 'use';
  prompt_parent_id?: string;
  login_uri?: string;
  callback?: (response: GoogleOneTapResponse) => void;
  error_callback?: (error: any) => void;
  // FedCM specific options
  use_fedcm?: boolean;
  use_fedcm_for_prompt?: boolean;
  fedcm_account_purge?: boolean;
  itp_support?: boolean;
  state_cookie_domain?: string;
  state_id_token?: string;
  ux_mode?: 'popup' | 'redirect';
};

const GoogleOneTapContainer: React.FC = () => {
  const { user, handleGoogleOneTapCallback } = useAuth();
  const isProcessingRef = useRef(false);

  const initializeGoogleOneTap = useCallback(() => {
    // Only show One Tap when user is not logged in and not already processing
    if (user || isProcessingRef.current) return;

    const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!googleClientId) {
      console.error('Google Client ID is not configured. One Tap sign-in is disabled.');
      return;
    }

    isProcessingRef.current = true;
    console.log('Initializing Google One Tap with client ID:', googleClientId.substring(0, 10) + '...');

    // Generate a secure nonce for CSRF protection
    const generateNonce = (): string => {
      const array = new Uint8Array(16);
      crypto.getRandomValues(array);
      return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    };

    const nonce = generateNonce();

    // Create a container for One Tap
    const oneTapContainer = document.createElement('div');
    oneTapContainer.id = 'g_id_onload';
    oneTapContainer.style.position = 'fixed';
    oneTapContainer.style.top = '10px';
    oneTapContainer.style.right = '10px';
    oneTapContainer.style.zIndex = '9999';
    document.body.appendChild(oneTapContainer);

    // Configure Google One Tap with FedCM support
    const googleOneTapConfig: GoogleOneTapOptions = {
      client_id: googleClientId,
      auto_select: false,
      cancel_on_tap_outside: true,
      context: 'signin',
      prompt_parent_id: 'g_id_onload',
      // FedCM specific options
      use_fedcm: true,               // Use FedCM when available
      use_fedcm_for_prompt: true,    // Use FedCM UI for prompt
      fedcm_account_purge: true,     // Allow for account purge if requested
      itp_support: true,             // Support for Intelligent Tracking Prevention
      state_cookie_domain: window.location.hostname, // Needed for state management
    };

    // Initialize Google One Tap using the latest approach
    try {
      // Set up callback for Google One Tap 
      const handleCredentialResponse = async (response: GoogleOneTapResponse) => {
        console.log('Google One Tap credential response received');
        if (response?.credential) {
          try {
            await handleGoogleOneTapCallback(response, nonce);
          } catch (error) {
            console.error('Error handling Google One Tap callback:', error);
          } finally {
            isProcessingRef.current = false;
          }
        }
      };
      
      // Set up error handling
      const handleError = (error: any) => {
        console.warn('Google One Tap error:', error);
        isProcessingRef.current = false;
      };
      
      // Initialize using the npm package - this is the recommended approach
      googleOneTap(
        googleOneTapConfig, 
        handleCredentialResponse,
        handleError // Pass the error handler directly
      );
      
      // As a fallback, also initialize with the native API if available
      if (window.google?.accounts?.id?.initialize) {
        // The native API uses different property names
        window.google.accounts.id.initialize({
          client_id: googleClientId,
          callback: handleCredentialResponse,
          // Native API uses this naming convention for error handling
          onerror: handleError
        });
      }

      // Show the prompt using FedCM-compatible approach
      const showPrompt = () => {
        if (window.google?.accounts?.id?.prompt) {
          // With FedCM, we should call prompt with configuration parameters
          // instead of using the deprecated callback for moment notifications
          window.google.accounts.id.prompt({
            // These parameters help control FedCM UI behaviors
            display: 'popup',   // Display as a popup UI
            native: true,       // Use native UI when available (FedCM)
            moment_listener: false // Don't use moment listeners (deprecated)
          });
          
          // Log for debugging
          console.log('Google One Tap prompt displayed with FedCM configuration');
        }
      };

      // Show prompt after a short delay to ensure everything is loaded
      const promptTimer = setTimeout(showPrompt, 1000);

      return () => {
        clearTimeout(promptTimer);
        if (document.body.contains(oneTapContainer)) {
          document.body.removeChild(oneTapContainer);
        }
        isProcessingRef.current = false;
      };
    } catch (error) {
      console.error('Failed to initialize Google One Tap:', error);
      isProcessingRef.current = false;
      if (document.body.contains(oneTapContainer)) {
        document.body.removeChild(oneTapContainer);
      }
    }
  }, [user, handleGoogleOneTapCallback]);

  // Initialize Google One Tap when component mounts and when user state changes
  useEffect(() => {
    initializeGoogleOneTap();
    
    // Cleanup function to handle component unmount
    return () => {
      isProcessingRef.current = false;
    };
  }, [initializeGoogleOneTap, user]);

  // No need to render anything - Google One Tap will handle the UI
  return null;
};

export default GoogleOneTapContainer;
