import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';

// Type for Google Identity Services response
interface GoogleCredentialResponse {
  credential: string;
  clientId?: string;
  select_by?: string;
}

interface GoogleOneTapLoaderProps {
  autoInit?: boolean;
}

/**
 * GoogleOneTapLoader component that loads Google Identity Services script
 * and initializes Google Sign-In with hybrid support for both FedCM and traditional flows
 */
const GoogleOneTapLoader: React.FC<GoogleOneTapLoaderProps> = ({ autoInit = true }) => {
  const { user, handleGoogleOneTapCallback } = useAuth();
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [fedCmFailed, setFedCmFailed] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const initialized = useRef(false);
  const timeoutRef = useRef<number | null>(null);
  
  // Load the Google Identity Services script
  const loadGoogleScript = useCallback(() => {
    if (document.getElementById('google-gsi-script')) {
      // Script already loaded
      if (window.google?.accounts?.id) {
        setScriptLoaded(true);
      }
      return;
    }

    console.log('Loading Google Identity Services script...');
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.id = 'google-gsi-script';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      console.log('Google Identity Services script loaded successfully');
      setScriptLoaded(true);
    };
    script.onerror = (error) => {
      console.error('Failed to load Google Identity Services script:', error);
    };
    document.body.appendChild(script);
  }, []);

  // Clean up function for component unmount
  const cleanup = useCallback(() => {
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    // Clean up container if exists
    if (containerRef.current && document.body.contains(containerRef.current)) {
      document.body.removeChild(containerRef.current);
      containerRef.current = null;
    }

    // Also try to find by ID (in case of lost ref)
    const containerById = document.getElementById('g_id_onload');
    if (containerById && document.body.contains(containerById)) {
      document.body.removeChild(containerById);
    }

    initialized.current = false;
  }, []);

  // Initialize Google One Tap with hybrid approach
  const initializeGoogleSignIn = useCallback(() => {
    // Don't proceed if not auto-initializing or already initialized
    if (!autoInit || initialized.current || !scriptLoaded || user) return;

    const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!googleClientId) {
      console.error('Google Client ID is not configured');
      return;
    }

    console.log('Initializing Google Sign-In...');
    initialized.current = true;

    // Generate a secure nonce
    const generateNonce = (): string => {
      const array = new Uint8Array(16);
      crypto.getRandomValues(array);
      return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    };
    const nonce = generateNonce();

    try {
      // Callback for handling credential response
      const handleCredentialResponse = (response: GoogleCredentialResponse) => {
        if (response?.credential) {
          handleGoogleOneTapCallback(response, nonce);
        }
      };

      // Define the approach based on FedCM support status
      const useFedCm = !fedCmFailed;

      if (useFedCm) {
        console.log('Using FedCM approach for Google Sign-In');
        
        // Create container for FedCM
        const container = document.createElement('div');
        container.id = 'g_id_onload';
        container.style.position = 'fixed';
        container.style.zIndex = '9999';
        container.setAttribute('data-client_id', googleClientId.trim());
        container.setAttribute('data-login_uri', `${window.location.origin}/auth/callback`);
        container.setAttribute('data-use_fedcm', 'true');
        container.setAttribute('data-use_fedcm_for_prompt', 'true');
        container.setAttribute('data-context', 'signin');
        container.setAttribute('data-auto_select', 'false');
        container.setAttribute('data-itp_support', 'true');
        document.body.appendChild(container);
        containerRef.current = container;
      }

      // Initialize Google Identity Services with configuration
      window.google.accounts.id.initialize({
        client_id: googleClientId.trim(),
        callback: handleCredentialResponse,
        use_fedcm: useFedCm,
        use_fedcm_for_prompt: useFedCm,
        auto_select: false,
        cancel_on_tap_outside: true,
        context: 'signin'
      });

      // Clear existing timeout
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
      }

      // Prompt with error catching
      timeoutRef.current = window.setTimeout(() => {
        try {
          console.log('Prompting Google Sign-In...');
          window.google.accounts.id.prompt((notification) => {
            // Handle the notification
            if (notification?.isNotDisplayed?.() || notification?.isSkippedMoment?.()) {
              const reason = notification.getNotDisplayedReason?.() || notification.getSkippedReason?.();
              console.log('Google Sign-In prompt not shown:', reason);
              
              // If FedCM failed, try again with traditional approach
              if (useFedCm && !fedCmFailed) {
                console.log('FedCM approach failed, falling back to traditional approach');
                setFedCmFailed(true);
                cleanup();
                initialized.current = false;
                
                // Retry with traditional approach after a short delay
                timeoutRef.current = window.setTimeout(() => {
                  initializeGoogleSignIn();
                }, 1000);
              }
            }
          });
        } catch (error) {
          console.error('Error prompting Google Sign-In:', error);
          initialized.current = false;
          
          // If using FedCM and it failed, try again with traditional approach
          if (useFedCm && !fedCmFailed) {
            console.log('FedCM approach error, falling back to traditional approach');
            setFedCmFailed(true);
            cleanup();
            
            // Retry with traditional approach after a short delay
            timeoutRef.current = window.setTimeout(() => {
              initializeGoogleSignIn();
            }, 1000);
          }
        }
      }, 1000);
    } catch (error) {
      console.error('Error setting up Google Sign-In:', error);
      initialized.current = false;
    }
  }, [autoInit, scriptLoaded, fedCmFailed, user, handleGoogleOneTapCallback, cleanup]);

  // Load script when component mounts
  useEffect(() => {
    if (typeof window !== 'undefined') {
      loadGoogleScript();
    }
    
    return cleanup;
  }, [loadGoogleScript, cleanup]);

  // Initialize Google Sign-In when script is loaded
  useEffect(() => {
    if (scriptLoaded) {
      initializeGoogleSignIn();
    }
    
    return () => {
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
      }
    };
  }, [scriptLoaded, initializeGoogleSignIn]);

  return null; // Non-visual component
};

export default GoogleOneTapLoader;