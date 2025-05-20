import { useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import googleOneTap from 'google-one-tap';

// Define types for Google One Tap response
type GoogleOneTapResponse = {
  credential: string;
  select_by?: string;
  clientId?: string;
};

/**
 * Google One Tap component that handles Google sign-in with FedCM support
 * Follows the migration guide from https://developers.google.com/identity/gsi/web/guides/fedcm-migration
 */
const GoogleOneTapContainer: React.FC = () => {
  const { user, handleGoogleOneTapCallback } = useAuth();
  const isProcessingRef = useRef(false);

  const initializeGoogleOneTap = useCallback(() => {
    // Only initialize when not logged in and not already processing
    if (user || isProcessingRef.current) return;

    // Validate Google client ID
    const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!googleClientId?.trim()) {
      console.error('Google Client ID is not configured. One Tap sign-in is disabled.');
      return;
    }

    isProcessingRef.current = true;

    // Generate a secure nonce for CSRF protection
    const generateNonce = (): string => {
      const array = new Uint8Array(16);
      crypto.getRandomValues(array);
      return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    };
    const nonce = generateNonce();

    // Create a container for One Tap UI
    const oneTapContainer = document.createElement('div');
    oneTapContainer.id = 'g_id_onload';
    oneTapContainer.style.position = 'fixed';
    oneTapContainer.style.top = '10px';
    oneTapContainer.style.right = '10px';
    oneTapContainer.style.zIndex = '9999';
    document.body.appendChild(oneTapContainer);

    try {
      // Handle successful authentication
      const handleCredentialResponse = async (response: GoogleOneTapResponse) => {
        if (response?.credential) {
          try {
            await handleGoogleOneTapCallback(response, nonce);
          } catch (error) {
            console.error('Error processing Google One Tap response:', error);
          } finally {
            isProcessingRef.current = false;
          }
        }
      };

      // Handle authentication errors
      const handleError = (error: any) => {
        console.warn('Google One Tap error:', error);
        isProcessingRef.current = false;
      };
      
      // Initialize Google One Tap with FedCM support
      googleOneTap(
        {
          client_id: googleClientId.trim(),
          auto_select: false,
          cancel_on_tap_outside: true,
          context: 'signin',
          use_fedcm: true,
          use_fedcm_for_prompt: true,
          prompt_parent_id: 'g_id_onload',
          itp_support: true
        },
        handleCredentialResponse,
        handleError
      );

      // Initialize with native API as fallback if available
      if (window.google?.accounts?.id?.initialize) {
        window.google.accounts.id.initialize({
          client_id: googleClientId.trim(),
          callback: handleCredentialResponse,
          onerror: handleError,
          // FedCM options
          use_fedcm: true,
          use_fedcm_for_prompt: true,
          itp_support: true,
          context: 'signin',
          auto_select: false,
          cancel_on_tap_outside: true
        });
      }

      // Show prompt using FedCM-compatible approach
      const showPrompt = () => {
        if (window.google?.accounts?.id?.prompt) {
          // Use parameters instead of deprecated moment callbacks
          window.google.accounts.id.prompt({
            display: 'popup',
            native: true,
            moment_listener: false // Don't use deprecated moment methods
          });
        }
      };

      // Show prompt after a short delay
      const promptTimer = setTimeout(showPrompt, 1000);

      // Cleanup function when effect is re-run or component unmounts
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

  // Initialize Google One Tap when component mounts or user state changes
  useEffect(() => {
    initializeGoogleOneTap();
    return () => { isProcessingRef.current = false; };
  }, [initializeGoogleOneTap]);

  // No need to render anything - Google One Tap handles UI
  return null;
};

export default GoogleOneTapContainer;
