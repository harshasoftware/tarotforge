import { useEffect, useRef, useCallback, useState, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import GoogleSignInLock from '../../utils/GoogleSignInLock';

/**
 * Google One Tap Sign-In Component
 * 
 * This component provides Google One Tap sign-in functionality with the following features:
 * - Automatic and manual initialization options
 * - Federated Credential Management (FedCM) fallback
 * - Script loading with retry mechanism
 * - Concurrency control using GoogleSignInLock
 * - Comprehensive error handling and recovery
 * 
 * @component
 * @param {Object} props - Component props
 * @param {boolean} [props.autoInit=true] - Whether to initialize automatically on mount
 * @param {boolean} [props.useFedCM=true] - Whether to use FedCM when available
 * @param {boolean} [props.enableLogging=false] - Enable detailed debug logging
 * @returns {JSX.Element} - Returns null (renders into a container)
 */

// Type definitions
type GoogleCredentialResponse = {
  credential: string;
  select_by?: string;
  clientId?: string;
};

type GoogleOneTapProps = {
  autoInit?: boolean;
  useFedCM?: boolean;
  enableLogging?: boolean;
};

// Global state for script loading
let isGoogleScriptLoading = false;
let scriptLoadAttempts = 0;
const MAX_SCRIPT_LOAD_ATTEMPTS = 3;
const SCRIPT_LOAD_TIMEOUT = 5000; // 5 seconds

// Error messages
const ERROR_MESSAGES = {
  SCRIPT_LOAD_FAILED: 'Failed to load Google Identity Services script',
  INIT_FAILED: 'Failed to initialize Google One Tap',
  CREDENTIALS_UNAVAILABLE: 'Google Sign-In is not available in this browser',
  FEDCM_NOT_SUPPORTED: 'Federated Credential Management is not supported in this browser',
  USER_CANCELLED: 'Sign in cancelled by user',
  POPUP_BLOCKED: 'Popup was blocked by the browser. Please allow popups for this site.',
  NETWORK_ERROR: 'Network error occurred. Please check your internet connection.',
  UNKNOWN_ERROR: 'An unknown error occurred during sign-in',
};

/**
 * Google One Tap sign-in component with FedCM support
 * Direct implementation using Google Identity Services API
 * Handles React/Vite edge cases and hot module replacement
 */
const GoogleOneTap: React.FC<GoogleOneTapProps> = ({
  autoInit = true,
  useFedCM = true,
  enableLogging = false
}) => {
  const { user, handleGoogleOneTapCallback } = useAuth();
  const [isScriptLoaded, setIsScriptLoaded] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fedCmMode, setFedCmMode] = useState<boolean | null>(null);
  const [isFedCmsupported, setIsFedCmsupported] = useState<boolean>(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const timeoutsRef = useRef<number[]>([]);
  const isMounted = useRef(true);
  const isInitialized = useRef(false);
  const isProcessing = useRef(false);
  const fedCmInitialized = useRef(false);
  const COMPONENT_ID = 'GoogleOneTap';

  // Cleanup function to clear timeouts and state
  const cleanup = useCallback(() => {
    if (!isMounted.current) return;
    
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];
    isInitialized.current = false;
    isProcessing.current = false;
    
    // Clean up Google One Tap UI if it exists
    if (window.google?.accounts?.id) {
      try {
        window.google.accounts.id.cancel();
        window.google.accounts.id.prompt();
      } catch (e) {
        if (enableLogging) {
          console.warn('Error cleaning up Google One Tap:', e);
        }
      }
    }
    
    // Release the lock
    try {
      GoogleSignInLock.releaseLock(COMPONENT_ID);
    } catch (e) {
      console.warn('Error releasing lock during cleanup:', e);
    }
  }, [enableLogging]);

  // Clear timeouts on unmount
  useEffect(() => {
    return () => {
      isMounted.current = false;
      cleanup();
    };
  }, [cleanup]);

  // Check if FedCM is supported
  useEffect(() => {
    if (useFedCM && typeof window !== 'undefined' && 'IdentityCredential' in window) {
      setIsFedCmsupported(true);
    }
  }, [useFedCM]);

  // Handle FedCM initialization
  const initializeFedCM = useCallback(async () => {
    if (!useFedCM || !isFedCmsupported || fedCmInitialized.current) return;
    
    try {
      fedCmInitialized.current = true;
      
      // @ts-ignore - FedCM is not in TypeScript's lib yet
      const cred = await navigator.credentials.get({
        identity: {
          providers: [{
            configURL: `https://accounts.google.com/config?client_id=${import.meta.env.VITE_GOOGLE_CLIENT_ID}`,
            clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID,
            nonce: crypto.randomUUID(),
          }]
        }
      });
      
      if (cred && 'token' in cred) {
        // Handle FedCM credential
        const response = {
          credential: cred.token,
          select_by: 'fedcm',
          clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID
        };
        
        await handleGoogleOneTapCallback(response as GoogleCredentialResponse, '');
      }
    } catch (error) {
      if (enableLogging) {
        console.warn('FedCM initialization failed, falling back to One Tap:', error);
      }
      setFedCmMode(false);
    }
  }, [useFedCM, isFedCmsupported, enableLogging]);

  // Load Google Identity Services script
  const loadGoogleScript = useCallback(() => {
    if (isGoogleScriptLoading || window.google?.accounts) {
      setIsScriptLoaded(true);
      return Promise.resolve();
    }

    return new Promise<void>((resolve, reject) => {
      if (scriptLoadAttempts >= MAX_SCRIPT_LOAD_ATTEMPTS) {
        reject(new Error(ERROR_MESSAGES.SCRIPT_LOAD_FAILED));
        return;
      }

      isGoogleScriptLoading = true;
      scriptLoadAttempts++;
      
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = () => {
        isGoogleScriptLoading = false;
        setIsScriptLoaded(true);
        resolve();
      };
      script.onerror = () => {
        isGoogleScriptLoading = false;
        const error = new Error(ERROR_MESSAGES.SCRIPT_LOAD_FAILED);
        setError(error.message);
        reject(error);
      };
      
      document.head.appendChild(script);
      
      // Add timeout for script loading
      const timeoutId = window.setTimeout(() => {
        if (!window.google?.accounts) {
          isGoogleScriptLoading = false;
          const error = new Error('Script load timeout');
          setError(ERROR_MESSAGES.SCRIPT_LOAD_FAILED);
          reject(error);
        }
      }, SCRIPT_LOAD_TIMEOUT);
      
      timeoutsRef.current.push(timeoutId);
    });
  }, []);

  // Initialize Google One Tap
  const initializeGoogleOneTap = useCallback(async () => {
    if (!window.google?.accounts?.id || !containerRef.current || isProcessing.current) {
      return;
    }
    
    // Use the queuing lock mechanism
    const lockAcquired = await GoogleSignInLock.acquireLockWithQueue(COMPONENT_ID, {
      timeoutMs: 15000, // 15 seconds to acquire lock
      priority: 1, // Higher priority than other components
    });

    if (!lockAcquired) {
      throw new Error('Unable to acquire lock for Google One Tap initialization');
    }

    try {
      isProcessing.current = true;
      setIsInitializing(true);
      setError(null);
      
      // Initialize Google One Tap
      window.google.accounts.id.initialize({
        client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
        callback: async (response: GoogleCredentialResponse) => {
          if (!response.credential) {
            setError(ERROR_MESSAGES.CREDENTIALS_UNAVAILABLE);
            return;
          }
          
          try {
            // Generate a nonce for CSRF protection
            const nonce = crypto.randomUUID();
            await handleGoogleOneTapCallback(response, nonce);
          } catch (error) {
            setError(error instanceof Error ? error.message : ERROR_MESSAGES.UNKNOWN_ERROR);
          }
        },
        prompt_parent_id: containerRef.current.id,
        cancel_on_tap_outside: false,
        use_fedcm_for_prompt: fedCmMode ?? undefined,
      });
      
      // Render the One Tap UI
      window.google.accounts.id.prompt((notification) => {
        if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
          if (fedCmMode === null && useFedCM && isFedCmsupported) {
            // Try FedCM if One Tap is not displayed
            setFedCmMode(true);
          } else {
            setError(ERROR_MESSAGES.USER_CANCELLED);
          }
        }
      });
      
      isInitialized.current = true;
    } catch (error) {
      setError(error instanceof Error ? error.message : ERROR_MESSAGES.INIT_FAILED);
    } finally {
      if (isMounted.current) {
        isProcessing.current = false;
        setIsInitializing(false);
      }
      // Release the lock
      try {
        GoogleSignInLock.releaseLock(COMPONENT_ID);
      } catch (e) {
        console.warn('Error releasing lock after initialization:', e);
      }
    }
  }, [fedCmMode, useFedCM, isFedCmsupported]);

  // Main initialization effect
  useEffect(() => {
    if (!autoInit || !isMounted.current || user || isInitialized.current || isProcessing.current) {
      return;
    }
    
    const init = async () => {
      try {
        await loadGoogleScript();
        
        if (fedCmMode === true) {
          await initializeFedCM();
        } else if (fedCmMode === false || fedCmMode === null) {
          await initializeGoogleOneTap();
        }
      } catch (error) {
        setError(error instanceof Error ? error.message : ERROR_MESSAGES.UNKNOWN_ERROR);
      }
    };
    
    init();
    
    return () => {
      cleanup();
    };
  }, [autoInit, user, loadGoogleScript, initializeGoogleOneTap, initializeFedCM, fedCmMode, cleanup]);

  // Handle FedCM mode changes
  useEffect(() => {
    if (fedCmMode === null || !isMounted.current) return;
    
    const initFedCM = async () => {
      if (fedCmMode) {
        await initializeFedCM();
      } else {
        await initializeGoogleOneTap();
      }
    };
    
    initFedCM();
  }, [fedCmMode, initializeFedCM, initializeGoogleOneTap]);

  // Manual initialization function
  const initialize = useCallback(async () => {
    if (isProcessing.current || !isMounted.current) return;
    
    try {
      await loadGoogleScript();
      
      if (fedCmMode === true) {
        await initializeFedCM();
      } else {
        await initializeGoogleOneTap();
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : ERROR_MESSAGES.UNKNOWN_ERROR);
      throw error;
    } finally {
      // Ensure lock is released after initialization
      try {
        GoogleSignInLock.releaseLock(COMPONENT_ID);
      } catch (e) {
        console.warn('Error releasing lock after initialization:', e);
      }
    }
  }, [loadGoogleScript, initializeFedCM, initializeGoogleOneTap, fedCmMode]);

  // Expose initialize function via ref for manual triggering
  const apiRef = useRef({
    initialize,
    cleanup
  });
  
  // Update ref when dependencies change
  useEffect(() => {
    apiRef.current = { initialize, cleanup };
  }, [initialize, cleanup]);
  
  // Expose API via window for debugging
  useEffect(() => {
    if (enableLogging && typeof window !== 'undefined') {
      (window as any).googleOneTap = apiRef.current;
      return () => {
        delete (window as any).googleOneTap;
      };
    }
  }, [enableLogging]);
  
  // Don't render anything if there's no container or if we're not initializing
  if (!containerRef.current && !isInitializing) return null;
  
  // Create a container for the One Tap UI if it doesn't exist
  return (
    <div
      ref={containerRef}
      id="google-one-tap-container"
      style={{ display: 'none' }}
      aria-hidden="true"
    />
  );
};

export default GoogleOneTap;
