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
  use_fedcm_for_prompt?: boolean;
  prompt_parent_id?: string;
  itp_support?: boolean;
  login_uri?: string;
  callback?: (response: GoogleOneTapResponse) => void;
  error_callback?: (error: any) => void;
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
      use_fedcm_for_prompt: true, // Enable FedCM for better privacy
      prompt_parent_id: 'g_id_onload',
      itp_support: true,
    };

    // Initialize Google One Tap
    try {
      googleOneTap(googleOneTapConfig, async (response: GoogleOneTapResponse) => {
        console.log('Google One Tap response received');
        if (response?.credential) {
          try {
            await handleGoogleOneTapCallback(response, nonce);
          } catch (error) {
            console.error('Error handling Google One Tap callback:', error);
          } finally {
            isProcessingRef.current = false;
          }
        }
      });

      // Set up error handling
      const handleError = (error: any) => {
        console.warn('Google One Tap error:', error);
        isProcessingRef.current = false;
      };

      // Add error callback if available
      if (window.google?.accounts?.id?.initialize) {
        window.google.accounts.id.initialize({
          ...googleOneTapConfig,
          callback: () => {
            // This will be handled by the npm package callback
          },
        });
      }

      // Show the prompt after a short delay
      const showPrompt = () => {
        if (window.google?.accounts?.id?.prompt) {
          window.google.accounts.id.prompt((notification) => {
            if (notification?.isDismissedMoment?.()) {
              console.log('User dismissed the One Tap prompt');
              isProcessingRef.current = false;
            }
          });
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
