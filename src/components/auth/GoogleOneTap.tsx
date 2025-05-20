import { useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import googleOneTap from 'google-one-tap';

// Define types for Google One Tap response
type GoogleOneTapResponse = {
  credential: string;
  select_by?: string;
  clientId?: string;
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

    // Double check that we have a valid client_id
    if (!googleClientId || googleClientId.trim() === '') {
      console.error('Valid Google Client ID is required for One Tap sign-in');
      isProcessingRef.current = false;
      return;
    }
    
    console.log('Using Google Client ID:', googleClientId.substring(0, 10) + '...');
    
    // Define FedCM configuration inline where needed
    

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
      
      // Initialize directly with the most essential parameters first
      // This approach helps ensure the client_id is properly recognized
      googleOneTap(
        // First pass only the most essential parameters
        {
          client_id: googleClientId.trim(),
          callback: handleCredentialResponse
        },
        // The npm package also accepts callback directly as second param
        handleCredentialResponse,
        // And error handler as third param
        handleError
      );
      
      console.log('Google One Tap initialized with simplified configuration');
      
      // As a fallback, also initialize with the native API if available
      if (window.google?.accounts?.id?.initialize) {
        // The native API initialization with FedCM options
        window.google.accounts.id.initialize({
          client_id: googleClientId.trim(), // Ensure trimmed client_id
          callback: handleCredentialResponse,
          onerror: handleError,
          // Include FedCM options for native API
          use_fedcm: true,
          use_fedcm_for_prompt: true,
          fedcm_account_purge: true,
          itp_support: true,
          state_cookie_domain: window.location.hostname,
          context: 'signin',
          auto_select: false,
          cancel_on_tap_outside: true
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
