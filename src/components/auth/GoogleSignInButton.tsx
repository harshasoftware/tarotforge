import React, { useEffect, useRef, useCallback, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import GoogleSignInLock from '../../utils/GoogleSignInLock';

// Define types for Google Identity Services response
type GoogleCredentialResponse = {
  credential: string;
  select_by?: string;
  clientId?: string;
};

interface GoogleSignInButtonProps {
  autoInit?: boolean;
  fallbackText?: string;
}

/**
 * Google Sign-In component with lock mechanism to prevent credential conflicts
 * Uses the Google Identity Services API with FedCM support
 */
const GoogleSignInButton: React.FC<GoogleSignInButtonProps> = ({ 
  autoInit = true,
  fallbackText = "Sign in with Google" 
}) => {
  const { user, handleGoogleOneTapCallback } = useAuth();
  const [isGoogleScriptLoaded, setIsGoogleScriptLoaded] = useState(false);
  const [showFallbackButton, setShowFallbackButton] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const isMounted = useRef(true);

  // Component ID for lock tracking
  const COMPONENT_ID = 'GoogleSignInButton';
  
  // Check if running in development environment
  const isDevelopmentEnvironment = useCallback(() => {
    return window.location.hostname === 'localhost' || 
           window.location.hostname === '127.0.0.1' ||
           window.location.port === '3000' || 
           window.location.port === '5173';
  }, []);

  // Load Google Identity Services script
  const loadGoogleScript = useCallback(() => {
    if (document.getElementById('google-gsi-script')) {
      if (window.google?.accounts?.id) {
        setIsGoogleScriptLoaded(true);
      }
      return;
    }
    
    console.log('Loading Google Identity Services script...');
    const script = document.createElement('script');
    script.id = 'google-gsi-script';
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    
    script.onload = () => {
      console.log('Google Identity Services script loaded successfully');
      setIsGoogleScriptLoaded(true);
    };
    
    script.onerror = (error) => {
      console.error('Failed to load Google Identity Services script:', error);
      setShowFallbackButton(true);
    };
    
    document.body.appendChild(script);
  }, []);

  // Manual sign-in handler - better for browsers with strict privacy settings
  const handleManualSignIn = useCallback(async () => {
    if (isProcessing || !isMounted.current) return;

    // Use the queuing lock mechanism
    const lockAcquired = await GoogleSignInLock.acquireLockWithQueue(COMPONENT_ID, {
      timeoutMs: 15000, // 15 seconds to acquire lock
      priority: 0, // Normal priority
    });

    if (!lockAcquired) {
      const error = new Error('Unable to acquire lock for Google Sign-In');
      console.warn(error.message);
      return;
    }

    try {
      setIsProcessing(true);
      
      // Validate client ID
      const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
      if (!googleClientId?.trim()) {
        console.error('Google Client ID not configured');
        setIsProcessing(false);
        GoogleSignInLock.releaseLock(COMPONENT_ID);
        return;
      }
      
      // Generate nonce for CSRF protection
      const generateNonce = (): string => {
        const array = new Uint8Array(16);
        crypto.getRandomValues(array);
        return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
      };
      const nonce = generateNonce();
      
      // Initialize without prompt
      if (!window.google?.accounts?.id) {
        console.error('Google Identity Services not loaded');
        setIsProcessing(false);
        GoogleSignInLock.releaseLock(COMPONENT_ID);
        return;
      }
      
      // Setup credential callback
      window.google.accounts.id.initialize({
        client_id: googleClientId.trim(),
        callback: async (response: GoogleCredentialResponse) => {
          if (response?.credential) {
            try {
              await handleGoogleOneTapCallback(response, nonce);
            } catch (error) {
              console.error('Error processing Google credential:', error);
            } finally {
              setIsProcessing(false);
              GoogleSignInLock.releaseLock(COMPONENT_ID);
            }
          }
        },
        cancel_on_tap_outside: false
      });
      
      // Show manual popup
      window.google.accounts.id.prompt((notification) => {
        // If not shown for any reason, show the fallback button
        if (notification && 
            ((notification.isNotDisplayed && notification.isNotDisplayed()) ||
             (notification.isSkippedMoment && notification.isSkippedMoment()))) {
          setShowFallbackButton(true);
          setIsProcessing(false);
          GoogleSignInLock.releaseLock(COMPONENT_ID);
        }
        // When dismissed, release lock
        else if (notification && notification.isDismissedMoment && notification.isDismissedMoment()) {
          setIsProcessing(false);
          GoogleSignInLock.releaseLock(COMPONENT_ID);
        }
      });
    } catch (error) {
      console.error('Error during Google Sign-In:', error);
      setIsProcessing(false);
      setShowFallbackButton(true);
      GoogleSignInLock.releaseLock(COMPONENT_ID);
    }
  }, [handleGoogleOneTapCallback, isProcessing]);

  // Load script when component mounts
  useEffect(() => {
    if (typeof window !== 'undefined' && !user) {
      loadGoogleScript();
    }
    
    return () => {
      isMounted.current = false;
      // Release the lock if this component had it
      try {
        if (GoogleSignInLock.hasLock(COMPONENT_ID)) {
          GoogleSignInLock.releaseLock(COMPONENT_ID);
        }
      } catch (e) {
        console.warn('Error releasing lock during cleanup:', e);
      }
    };
  }, [loadGoogleScript, user]);

  // Render a button that will trigger manual sign-in if needed
  if (!user && showFallbackButton) {
    return (
      <button
        onClick={handleManualSignIn}
        disabled={isProcessing}
        className="btn btn-primary w-full flex items-center justify-center space-x-2"
      >
        {isProcessing ? (
          <span>Processing...</span>
        ) : (
          <>
            <svg width="18" height="18" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
            </svg>
            <span>{fallbackText}</span>
          </>
        )}
      </button>
    );
  }
  
  // No visible UI by default, this is just for initialization
  return null;
};

export default GoogleSignInButton;
