import React, { useEffect, useRef, useCallback, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import GoogleSignInLock from '../../utils/GoogleSignInLock';

// Define types for Google Identity Services response
type GoogleCredentialResponse = {
  credential: string;
  select_by?: string;
  clientId?: string;
};

type GoogleSignInButtonProps = {
  autoInit?: boolean;
  fallbackText?: string;
};

/**
 * Google Sign-In component with lock mechanism to prevent credential conflicts
 * Uses the Google Identity Services API
 */
const GoogleSignInButton: React.FC<GoogleSignInButtonProps> = ({ 
  autoInit = true,
  fallbackText = "Sign in with Google" 
}) => {
  const { user, signInWithGoogle } = useAuth();
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

  // Manual sign-in handler
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
              await signInWithGoogle();
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
  }, [signInWithGoogle, isProcessing]);

  // Load script on mount if autoInit is true
  useEffect(() => {
    if (autoInit && !user && !isGoogleScriptLoaded) {
      loadGoogleScript();
    }
  }, [autoInit, user, isGoogleScriptLoaded, loadGoogleScript]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMounted.current = false;
      if (GoogleSignInLock.hasLock(COMPONENT_ID)) {
        GoogleSignInLock.releaseLock(COMPONENT_ID);
      }
    };
  }, []);

  // Render the sign-in button
  return (
    <div className="google-sign-in-container">
      {showFallbackButton ? (
        <button
          onClick={handleManualSignIn}
          disabled={isProcessing}
          className="google-sign-in-fallback-button"
        >
          {fallbackText}
        </button>
      ) : (
        <div id="google-sign-in-button" />
      )}
    </div>
  );
};

export default GoogleSignInButton;
