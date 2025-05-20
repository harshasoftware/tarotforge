import { useEffect, useRef, useCallback, useState } from 'react';
import { useAuth } from '../../context/AuthContext';

// Define types for Google Identity Services response
type GoogleCredentialResponse = {
  credential: string;
  select_by?: string;
  clientId?: string;
};

// Global state to prevent duplicate script loading across HMR/rerenders
let isGoogleScriptLoading = false;
let scriptLoadAttempts = 0;
const MAX_SCRIPT_LOAD_ATTEMPTS = 3;

/**
 * Google One Tap sign-in component with FedCM support
 * Direct implementation using Google Identity Services API
 * Handles React/Vite edge cases and hot module replacement
 */
const GoogleOneTapContainer: React.FC = () => {
  const { user, handleGoogleOneTapCallback } = useAuth();
  const isProcessingRef = useRef(false);
  const oneTapContainerRef = useRef<HTMLDivElement | null>(null);
  const initTimeoutRef = useRef<number | null>(null);
  const [isGoogleScriptLoaded, setIsGoogleScriptLoaded] = useState(false);
  
  // Create a unique container ID to avoid conflicts during HMR
  const containerId = useRef(`g_id_onload_${Math.random().toString(36).substring(2, 11)}`);

  // Load Google Identity Services script with safeguards
  const loadGoogleScript = useCallback(() => {
    // Prevent duplicate loading during HMR and re-renders
    if (document.getElementById('google-one-tap-script') || isGoogleScriptLoading) {
      // Check if script already loaded but state not updated
      if (window.google?.accounts?.id && !isGoogleScriptLoaded) {
        setIsGoogleScriptLoaded(true);
      }
      return;
    }

    isGoogleScriptLoading = true;
    scriptLoadAttempts++;

    // Don't attempt too many script loads (prevents issues with Vite HMR loops)
    if (scriptLoadAttempts > MAX_SCRIPT_LOAD_ATTEMPTS) {
      console.warn('Max Google Identity Services script load attempts reached');
      return;
    }

    // Create and append script
    const script = document.createElement('script');
    script.id = 'google-one-tap-script';
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;

    script.onload = () => {
      console.log('Google Identity Services script loaded successfully');
      setIsGoogleScriptLoaded(true);
      isGoogleScriptLoading = false;
    };

    script.onerror = (error) => {
      console.error('Error loading Google Identity Services script:', error);
      isGoogleScriptLoading = false;
    };

    document.body.appendChild(script);
    console.log('Loading Google Identity Services API script');
  }, [isGoogleScriptLoaded]);

  // Safely remove the container element
  const cleanupContainer = useCallback(() => {
    if (oneTapContainerRef.current && document.body.contains(oneTapContainerRef.current)) {
      document.body.removeChild(oneTapContainerRef.current);
      oneTapContainerRef.current = null;
    }
    
    // Also check by ID in case the ref was lost during HMR
    const containerById = document.getElementById(containerId.current);
    if (containerById && document.body.contains(containerById)) {
      document.body.removeChild(containerById);
    }
  }, []);

  // Safely clear timeouts to prevent memory leaks
  const clearTimeouts = useCallback(() => {
    if (initTimeoutRef.current !== null) {
      window.clearTimeout(initTimeoutRef.current);
      initTimeoutRef.current = null;
    }
  }, []);

  // Initialize Google One Tap with error handling and HMR safeguards
  const initializeGoogleOneTap = useCallback(() => {
    // Cleanup previous instance (in case of HMR)
    cleanupContainer();
    clearTimeouts();

    // Only initialize when not logged in, script is loaded, and not already processing
    if (user || !isGoogleScriptLoaded || isProcessingRef.current) return;

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

    try {
      // Create a container div for One Tap
      const oneTapContainer = document.createElement('div');
      oneTapContainer.id = containerId.current;
      
      // Apply minimal styling - let browser control position as per FedCM guidelines
      oneTapContainer.style.position = 'fixed';
      oneTapContainer.style.zIndex = '9999';
      
      // Add FedCM compatible data attributes
      oneTapContainer.setAttribute('data-client_id', googleClientId.trim());
      oneTapContainer.setAttribute('data-login_uri', `${window.location.origin}/auth/callback`);
      oneTapContainer.setAttribute('data-use_fedcm', 'true');
      oneTapContainer.setAttribute('data-use_fedcm_for_prompt', 'true');
      oneTapContainer.setAttribute('data-context', 'signin');
      oneTapContainer.setAttribute('data-auto_select', 'false');
      oneTapContainer.setAttribute('data-itp_support', 'true');
      
      // Store reference for later cleanup
      oneTapContainerRef.current = oneTapContainer;
      
      // Add container to DOM
      document.body.appendChild(oneTapContainer);
      console.log('Google One Tap container configured with client ID:', googleClientId.substring(0, 5) + '...');

      // Handle successful authentication
      const handleCredentialResponse = async (response: GoogleCredentialResponse) => {
        if (response?.credential) {
          try {
            await handleGoogleOneTapCallback(response, nonce);
          } catch (error) {
            console.error('Error processing Google Identity response:', error);
          } finally {
            isProcessingRef.current = false;
          }
        }
      };

      // Initialize GSI with retry mechanism for race conditions
      const tryInitialize = () => {
        if (!window.google?.accounts?.id) {
          // Retry if Google object isn't available yet
          console.log('Waiting for Google Identity Services API...');
          initTimeoutRef.current = window.setTimeout(tryInitialize, 100) as unknown as number;
          return;
        }

        try {
          // Initialize with FedCM support
          window.google.accounts.id.initialize({
            client_id: googleClientId.trim(),
            callback: handleCredentialResponse,
            use_fedcm: true,
            use_fedcm_for_prompt: true,
            auto_select: false,
            cancel_on_tap_outside: true,
            context: 'signin'
          });
          
          // Call prompt without callback to avoid deprecated moment methods
          window.google.accounts.id.prompt();
          console.log('Google One Tap initialization complete');
        } catch (err) {
          console.error('Error initializing Google Identity Services:', err);
          isProcessingRef.current = false;
        }
      };

      // Start initialization process
      tryInitialize();
    } catch (error) {
      console.error('Failed to set up Google Identity Services:', error);
      isProcessingRef.current = false;
      cleanupContainer();
    }
  }, [user, handleGoogleOneTapCallback, isGoogleScriptLoaded, cleanupContainer, clearTimeouts]);

  // Load Google script when component mounts
  useEffect(() => {
    // Process might fail in SSR environment
    if (typeof window !== 'undefined') {
      loadGoogleScript();
    }
    
    // Cleanup on unmount
    return () => {
      cleanupContainer();
      clearTimeouts();
    };
  }, [loadGoogleScript, cleanupContainer, clearTimeouts]);

  // Initialize Google One Tap when dependencies are ready
  useEffect(() => {
    initializeGoogleOneTap();
    
    // Clean up on unmount or dependencies change
    return () => {
      isProcessingRef.current = false;
      cleanupContainer();
      clearTimeouts();
    };
  }, [initializeGoogleOneTap, cleanupContainer, clearTimeouts]);

  // Handle HMR for Vite development mode
  useEffect(() => {
    // This effect specifically handles hot module replacement
    if (import.meta.hot) {
      const handleHotUpdate = () => {
        cleanupContainer();
        clearTimeouts();
        isProcessingRef.current = false;
      };
      
      import.meta.hot.on('vite:beforeUpdate', handleHotUpdate);
      
      return () => {
        import.meta.hot?.off('vite:beforeUpdate', handleHotUpdate);
      };
    }
  }, [cleanupContainer, clearTimeouts]);

  // No need to render anything - Google Identity Services handles UI
  return null;
};

export default GoogleOneTapContainer;
