import { useEffect, useRef, useCallback, useState, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import GoogleSignInLock from '../../utils/GoogleSignInLock';
import { 
  GoogleSignInErrorType, 
  trackError, 
  isRetryableError, 
  getRetryDelay,
  getUserFriendlyMessage 
} from '../../utils/errorTracking';

/**
 * Google One Tap Sign-In Component
 * 
 * This component provides Google One Tap sign-in functionality with the following features:
 * - Automatic and manual initialization options
 * - Federated Credential Management (FedCM) fallback
 * - Script loading with retry mechanism
 * - Concurrency control using GoogleSignInLock
 * - Comprehensive error handling and recovery
 * - Development environment detection and handling
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

  // Check if we're in a development environment
  const isDevelopmentEnvironment = useCallback(() => {
    if (typeof window === 'undefined') return false;
    
    // Check for development URLs or localhost
    const isLocalhost = window.location.hostname === 'localhost' || 
                        window.location.hostname === '127.0.0.1' ||
                        window.location.hostname.includes('webcontainer');
    // Check for development ports
    const isDevelopmentPort = window.location.port === '3000' || 
                            window.location.port === '5173' || 
                            window.location.port === '8080';
    // Look for other dev indicators
    const hasDevInUrl = window.location.hostname.includes('dev') || 
                       window.location.hostname.includes('local');
                       
    return isLocalhost || isDevelopmentPort || hasDevInUrl;
  }, []);

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
      if (GoogleSignInLock.hasLock(COMPONENT_ID)) {
        GoogleSignInLock.releaseLock(COMPONENT_ID);
      }
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
      
      // Type definition for FedCM request
      type FedCMRequest = {
        identity: {
          providers: Array<{
            configURL: string;
            clientId: string;
            nonce: string;
          }>;
        };
      };
      
      console.log('[GoogleOneTap] Initializing FedCM...');
      const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
      if (!googleClientId?.trim()) {
        console.error('[GoogleOneTap] FedCM initialization failed: Missing Google Client ID');
        return;
      }

      // @ts-ignore - FedCM is not in TypeScript's lib yet
      const cred = await navigator.credentials.get({
        identity: {
          providers: [{
            configURL: `https://accounts.google.com/config?client_id=${googleClientId}`,
            clientId: googleClientId,
            nonce: crypto.randomUUID(),
          }]
        }
      } as FedCMRequest);
      
      if (cred && 'token' in cred) {
        console.log('[GoogleOneTap] FedCM credential received');
        // Handle FedCM credential
        const response = {
          credential: cred.token,
          select_by: 'fedcm',
          clientId: googleClientId
        };
        
        await handleGoogleOneTapCallback(response as GoogleCredentialResponse, '');
      } else {
        console.warn('[GoogleOneTap] FedCM credential missing token');
      }
    } catch (error) {
      if (enableLogging) {
        console.warn('[GoogleOneTap] FedCM initialization failed:', error);
      }
      setFedCmMode(false);
    }
  }, [useFedCM, isFedCmsupported, enableLogging, handleGoogleOneTapCallback]);

  // Load Google Identity Services script
  const loadGoogleScript = useCallback(() => {
    if (isGoogleScriptLoading || window.google?.accounts) {
      console.log('[GoogleOneTap] Script already loading or loaded');
      setIsScriptLoaded(true);
      return Promise.resolve();
    }

    return new Promise<void>((resolve, reject) => {
      if (scriptLoadAttempts >= MAX_SCRIPT_LOAD_ATTEMPTS) {
        const error = new Error('Max script load attempts reached');
        trackError(error, GoogleSignInErrorType.SCRIPT_LOAD_FAILED, {
          attempts: scriptLoadAttempts,
          maxAttempts: MAX_SCRIPT_LOAD_ATTEMPTS
        });
        reject(error);
        return;
      }

      console.log(`[GoogleOneTap] Loading script (attempt ${scriptLoadAttempts + 1}/${MAX_SCRIPT_LOAD_ATTEMPTS})`);
      isGoogleScriptLoading = true;
      scriptLoadAttempts++;
      
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = () => {
        console.log('[GoogleOneTap] Script loaded successfully');
        isGoogleScriptLoading = false;
        setIsScriptLoaded(true);
        resolve();
      };
      script.onerror = (scriptError) => {
        console.error('[GoogleOneTap] Script load error:', scriptError);
        isGoogleScriptLoading = false;
        const loadError = new Error('Script load failed');
        trackError(loadError, GoogleSignInErrorType.SCRIPT_LOAD_FAILED, {
          attempt: scriptLoadAttempts,
          error: scriptError
        });
        setError(getUserFriendlyMessage(GoogleSignInErrorType.SCRIPT_LOAD_FAILED));
        reject(loadError);
      };
      
      document.head.appendChild(script);
      
      // Add timeout for script loading
      const timeoutId = window.setTimeout(() => {
        if (!window.google?.accounts) {
          console.warn('[GoogleOneTap] Script load timeout');
          isGoogleScriptLoading = false;
          const error = new Error('Script load timeout');
          trackError(error, GoogleSignInErrorType.SCRIPT_LOAD_FAILED, {
            attempt: scriptLoadAttempts,
            timeout: SCRIPT_LOAD_TIMEOUT
          });
          setError(getUserFriendlyMessage(GoogleSignInErrorType.SCRIPT_LOAD_FAILED));
          reject(error);
        }
      }, SCRIPT_LOAD_TIMEOUT);
      
      timeoutsRef.current.push(timeoutId);
    });
  }, []);

  // Initialize Google One Tap
  const initializeGoogleOneTap = useCallback(async () => {
    // Validate Google client ID
    const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!googleClientId?.trim()) {
      const error = new Error('Missing Google Client ID');
      trackError(error, GoogleSignInErrorType.INITIALIZATION_FAILED, {
        hasClientId: !!googleClientId
      });
      setError(getUserFriendlyMessage(GoogleSignInErrorType.INITIALIZATION_FAILED));
      return;
    }

    // Check if Google Identity Services is available
    if (!window.google?.accounts?.id) {
      console.log('[GoogleOneTap] Google Identity Services not available yet, waiting...');
      timeoutsRef.current.push(
        window.setTimeout(() => {
          initializeGoogleOneTap();
        }, 500)
      );
      return;
    }

    // Don't initialize if already processing
    if (isProcessing.current) {
      console.log('[GoogleOneTap] Already processing, skipping initialization');
      return;
    }
    
    console.log('[GoogleOneTap] Attempting to acquire lock...');
    // Use the queuing lock mechanism
    const lockAcquired = await GoogleSignInLock.acquireLockWithQueue(COMPONENT_ID, {
      timeoutMs: 15000,
      priority: 1,
    });

    if (!lockAcquired) {
      console.log('[GoogleOneTap] Unable to acquire lock, will retry...');
      const error = new Error('Lock acquisition failed');
      trackError(error, GoogleSignInErrorType.LOCK_ACQUISITION_FAILED, {
        componentId: COMPONENT_ID
      });
      setError(getUserFriendlyMessage(GoogleSignInErrorType.LOCK_ACQUISITION_FAILED));
      
      if (isRetryableError(GoogleSignInErrorType.LOCK_ACQUISITION_FAILED)) {
        timeoutsRef.current.push(
          window.setTimeout(() => {
            initializeGoogleOneTap();
          }, getRetryDelay(GoogleSignInErrorType.LOCK_ACQUISITION_FAILED))
        );
      }
      return;
    }

    console.log('[GoogleOneTap] Lock acquired, initializing...');
    try {
      isProcessing.current = true;
      setIsInitializing(true);
      setError(null);
      
      // Initialize Google One Tap
      window.google.accounts.id.initialize({
        client_id: googleClientId.trim(),
        callback: async (response: GoogleCredentialResponse) => {
          console.log('[GoogleOneTap] Received credential response');
          if (!response.credential) {
            console.warn('[GoogleOneTap] No credential in response');
            const error = new Error('No credential in response');
            trackError(error, GoogleSignInErrorType.CREDENTIALS_UNAVAILABLE, {
              responseType: response.select_by
            });
            setError(getUserFriendlyMessage(GoogleSignInErrorType.CREDENTIALS_UNAVAILABLE));
            GoogleSignInLock.releaseLock(COMPONENT_ID);
            return;
          }
          
          try {
            const nonce = crypto.randomUUID();
            console.log('[GoogleOneTap] Processing credential...');
            await handleGoogleOneTapCallback(response, nonce);
            console.log('[GoogleOneTap] Credential processed successfully');
          } catch (error) {
            console.error('[GoogleOneTap] Error processing credential:', error);
            trackError(error as Error, GoogleSignInErrorType.UNKNOWN_ERROR, {
              responseType: response.select_by
            });
            setError(getUserFriendlyMessage(GoogleSignInErrorType.UNKNOWN_ERROR));
          } finally {
            console.log('[GoogleOneTap] Releasing lock after credential processing');
            GoogleSignInLock.releaseLock(COMPONENT_ID);
          }
        },
        prompt_parent_id: containerRef.current?.id,
        cancel_on_tap_outside: false,
        use_fedcm_for_prompt: fedCmMode ?? undefined,
      });
      
      console.log('[GoogleOneTap] Prompting user...');
      // Render the One Tap UI
      window.google.accounts.id.prompt((notification) => {
        if (notification?.isNotDisplayed?.() || notification?.isSkippedMoment?.()) {
          console.log('[GoogleOneTap] Prompt not displayed or skipped');
          if (fedCmMode === null && useFedCM && isFedCmsupported) {
            console.log('[GoogleOneTap] Attempting FedCM fallback');
            setFedCmMode(true);
          } else {
            console.log('[GoogleOneTap] No fallback available, marking as cancelled');
            const error = new Error('User cancelled or prompt not displayed');
            trackError(error, GoogleSignInErrorType.USER_CANCELLED, {
              notificationType: notification?.isNotDisplayed?.() ? 'not_displayed' : 'skipped'
            });
            setError(getUserFriendlyMessage(GoogleSignInErrorType.USER_CANCELLED));
          }
          GoogleSignInLock.releaseLock(COMPONENT_ID);
        } else if (notification?.isDismissedMoment?.()) {
          console.log('[GoogleOneTap] Prompt dismissed by user');
          const error = new Error('Prompt dismissed by user');
          trackError(error, GoogleSignInErrorType.USER_CANCELLED, {
            notificationType: 'dismissed'
          });
          setError(getUserFriendlyMessage(GoogleSignInErrorType.USER_CANCELLED));
          GoogleSignInLock.releaseLock(COMPONENT_ID);
        }
      });
      
      isInitialized.current = true;
      console.log('[GoogleOneTap] Initialization complete');
    } catch (error) {
      console.error('[GoogleOneTap] Initialization error:', error);
      trackError(error as Error, GoogleSignInErrorType.INITIALIZATION_FAILED, {
        fedCmMode,
        isFedCmsupported
      });
      setError(getUserFriendlyMessage(GoogleSignInErrorType.INITIALIZATION_FAILED));
      GoogleSignInLock.releaseLock(COMPONENT_ID);
    } finally {
      if (isMounted.current) {
        isProcessing.current = false;
        setIsInitializing(false);
      }
    }
  }, [fedCmMode, useFedCM, isFedCmsupported, handleGoogleOneTapCallback]);

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
