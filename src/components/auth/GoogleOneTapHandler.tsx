import React, { useEffect, useRef, useCallback, useState } from 'react';
import { useAuth } from '../../context/AuthContext';

// Define types for Google Identity Services response
type GoogleCredentialResponse = {
  credential: string;
  select_by?: string;
  clientId?: string;
};

interface GoogleOneTapHandlerProps {
  autoInit?: boolean;
}

// Global state to prevent duplicate script loading across HMR/rerenders
let isGoogleScriptLoading = false;
let scriptLoadAttempts = 0;
const MAX_SCRIPT_LOAD_ATTEMPTS = 3;

/**
 * Google One Tap sign-in component with adaptive FedCM support
 * Direct implementation using Google Identity Services API
 * Handles browser compatibility issues and FedCM limitations
 */
const GoogleOneTapHandler: React.FC<GoogleOneTapHandlerProps> = ({ autoInit = true }) => {
  const { user, handleGoogleOneTapCallback } = useAuth();
  const isProcessingRef = useRef(false);
  const oneTapContainerRef = useRef<HTMLDivElement | null>(null);
  const initTimeoutRef = useRef<number | null>(null);
  const retryTimeoutRef = useRef<number | null>(null);
  const [isGoogleScriptLoaded, setIsGoogleScriptLoaded] = useState(false);
  const [fedCmMode, setFedCmMode] = useState(true); // Start with FedCM mode, fallback if needed
  const isInitializedRef = useRef(false);
  const attemptCountRef = useRef(0);
  const MAX_ATTEMPTS = 2;
  
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

    // Also try to clean up any potential 'g_id_onload' container
    const defaultContainer = document.getElementById('g_id_onload');
    if (defaultContainer && document.body.contains(defaultContainer)) {
      document.body.removeChild(defaultContainer);
    }
  }, []);

  // Safely clear timeouts to prevent memory leaks
  const clearTimeouts = useCallback(() => {
    if (initTimeoutRef.current !== null) {
      window.clearTimeout(initTimeoutRef.current);
      initTimeoutRef.current = null;
    }

    if (retryTimeoutRef.current !== null) {
      window.clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
  }, []);

  // Handle the AbortError or other FedCM failures
  const handleFedCmFailure = useCallback(() => {
    console.log('FedCM mode failed, switching to standard mode');
    setFedCmMode(false);
    isInitializedRef.current = false;
    isProcessingRef.current = false;
    cleanupContainer();
    
    // Allow reinitialization
    retryTimeoutRef.current = window.setTimeout(() => {
      attemptCountRef.current = 0;
      initializeGoogleOneTap();
    }, 500);
  }, [cleanupContainer]);

  // Initialize Google One Tap with adaptive strategy
  const initializeGoogleOneTap = useCallback(() => {
    // Don't initialize if autoInit is false
    if (!autoInit) return;
    
    // Cleanup previous instance
    cleanupContainer();
    clearTimeouts();

    // Only initialize when not logged in, script is loaded, and not already processing
    if (user || !isGoogleScriptLoaded || isProcessingRef.current || isInitializedRef.current) return;

    // Track initialization attempts
    attemptCountRef.current += 1;
    if (attemptCountRef.current > MAX_ATTEMPTS) {
      console.log(`Max Google Sign-In initialization attempts (${MAX_ATTEMPTS}) reached`);
      return;
    }

    // Validate Google client ID
    const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!googleClientId?.trim()) {
      console.error('Google Client ID is not configured. One Tap sign-in is disabled.');
      return;
    }

    isProcessingRef.current = true;
    isInitializedRef.current = true;

    // Generate a secure nonce for CSRF protection
    const generateNonce = (): string => {
      const array = new Uint8Array(16);
      crypto.getRandomValues(array);
      return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    };
    const nonce = generateNonce();

    try {
      // Create container for FedCM if using that mode
      if (fedCmMode) {
        console.log('Initializing with FedCM mode');
        const oneTapContainer = document.createElement('div');
        oneTapContainer.id = containerId.current;
        
        // Apply minimal styling
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
        console.log('FedCM container configured with client ID:', googleClientId.substring(0, 5) + '...');
      } else {
        console.log('Initializing with standard mode (without FedCM)');
      }

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

      // Initialize Google Identity Services with error handling
      if (!window.google?.accounts?.id) {
        console.log('Google Identity Services not available yet, waiting...');
        initTimeoutRef.current = window.setTimeout(() => {
          isInitializedRef.current = false;
          isProcessingRef.current = false;
          initializeGoogleOneTap();
        }, 500) as unknown as number;
        return;
      }

      try {
        // Configure Google Identity Services
        window.google.accounts.id.initialize({
          client_id: googleClientId.trim(),
          callback: handleCredentialResponse,
          use_fedcm: fedCmMode,
          use_fedcm_for_prompt: fedCmMode,
          auto_select: false,
          cancel_on_tap_outside: true,
          context: 'signin'
        });

        // Start the prompt with error catching
        const promptListener = (notification: any) => {
          if (notification) {
            // Check for prompt not displayed
            if ((notification.isNotDisplayed && notification.isNotDisplayed()) ||
                (notification.isSkippedMoment && notification.isSkippedMoment())) {
              const reason = notification.getNotDisplayedReason?.() || 
                            notification.getSkippedReason?.() || 
                            'Unknown reason';
                            
              console.log(`Google Sign-In prompt not shown: ${reason}`);
              
              // If in FedCM mode and prompt failed, switch to standard mode
              if (fedCmMode && attemptCountRef.current < MAX_ATTEMPTS) {
                handleFedCmFailure();
              }
            } else if (notification.isDismissedMoment && notification.isDismissedMoment()) {
              console.log('Google Sign-In prompt dismissed by user');
            }
          }
        };

        try {
          // Trigger the prompt with notification handler
          window.google.accounts.id.prompt(promptListener);
          console.log('Google Sign-In prompt initialized');
        } catch (promptError: any) {
          console.error('Error prompting Google Sign-In:', promptError);
          
          // Check for AbortError which indicates FedCM issues
          if (promptError?.name === 'AbortError' && fedCmMode) {
            console.log('FedCM AbortError detected, falling back to standard mode');
            handleFedCmFailure();
          } else {
            isInitializedRef.current = false;
            isProcessingRef.current = false;
          }
        }
      } catch (initError) {
        console.error('Error initializing Google Identity Services:', initError);
        isInitializedRef.current = false;
        isProcessingRef.current = false;
      }
    } catch (error) {
      console.error('Failed to set up Google Identity Services:', error);
      isProcessingRef.current = false;
      isInitializedRef.current = false;
      cleanupContainer();
    }
  }, [user, handleGoogleOneTapCallback, isGoogleScriptLoaded, fedCmMode, autoInit, cleanupContainer, clearTimeouts, handleFedCmFailure]);

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
    if (isGoogleScriptLoaded) {
      initializeGoogleOneTap();
    }
    
    // Clean up on unmount or dependencies change
    return () => {
      isProcessingRef.current = false;
      isInitializedRef.current = false;
      cleanupContainer();
      clearTimeouts();
    };
  }, [isGoogleScriptLoaded, initializeGoogleOneTap, cleanupContainer, clearTimeouts]);

  // Handle HMR for Vite development mode
  useEffect(() => {
    // This effect specifically handles hot module replacement
    if (import.meta.hot) {
      const handleHotUpdate = () => {
        cleanupContainer();
        clearTimeouts();
        isProcessingRef.current = false;
        isInitializedRef.current = false;
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

export default GoogleOneTapHandler;