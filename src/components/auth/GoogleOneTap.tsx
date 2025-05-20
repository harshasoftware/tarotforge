import { useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';

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

    // Create a container for One Tap UI with all required attributes
    const oneTapContainer = document.createElement('div');
    oneTapContainer.id = 'g_id_onload';
    
    // Style attributes
    oneTapContainer.style.position = 'fixed';
    oneTapContainer.style.top = '10px';
    oneTapContainer.style.right = '10px';
    oneTapContainer.style.zIndex = '9999';
    
    // Required data attributes for FedCM support
    oneTapContainer.setAttribute('data-client_id', googleClientId.trim());
    oneTapContainer.setAttribute('data-login_uri', `${window.location.origin}/auth/callback`);
    oneTapContainer.setAttribute('data-use_fedcm', 'true');
    oneTapContainer.setAttribute('data-use_fedcm_for_prompt', 'true');
    
    // Add container to DOM
    document.body.appendChild(oneTapContainer);
    console.log('Google One Tap container configured with absolute login_uri:', `${window.location.origin}/auth/callback`);

    try {
      // Handle successful authentication - used in the native API initialization
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
      
      // The google-one-tap library doesn't need to be explicitly initialized
      // Instead, we rely on the container's data attributes and the native API
      // This approach is recommended in the FedCM migration guide
      try {
        // Load the Google Identity Services API script if not already loaded
        if (!window.google?.accounts?.id) {
          console.log('Waiting for Google Identity Services API to load...');
        } else {
          console.log('Google Identity Services API already loaded');
        }
      } catch (err) {
        console.error('Error accessing Google Identity Services:', err);
        isProcessingRef.current = false;
      }

      // Initialize with native API which provides FedCM support
      if (window.google?.accounts?.id?.initialize) {
        // The native API initialization with full FedCM support
        window.google.accounts.id.initialize({
          client_id: googleClientId.trim(),
          callback: handleCredentialResponse,
          // FedCM-required options
          use_fedcm: true,
          use_fedcm_for_prompt: true,
          // Standard configuration
          auto_select: false,
          cancel_on_tap_outside: true,
          context: 'signin'
        });
        console.log('Google Identity Services API initialized with FedCM flags');
      }

      // Show prompt using FedCM-compatible approach
      const showPrompt = () => {
        if (window.google?.accounts?.id?.prompt) {
          // IMPORTANT: Call prompt() without any callback to avoid deprecated moment methods
          // As per migration guide: https://developers.google.com/identity/gsi/web/guides/fedcm-migration
          window.google.accounts.id.prompt();
          
          // Note: All display moment notifications are no longer returned with FedCM
          // The prompt position is controlled by the browser and cannot be customized
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
