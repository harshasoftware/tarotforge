import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../context/AuthContext';

interface GoogleOneTapHandlerProps {
  autoInit?: boolean;
}

// Interface for Google One Tap response
interface GoogleOneTapResponse {
  credential: string;
  select_by: string;
  clientId: string;
}

// Declare global Google types
declare global {
  interface Window {
    google?: {
      accounts?: {
        id?: {
          initialize: (config: any) => void;
          prompt: (callback: (notification: any) => void) => void;
          cancel: () => void;
        }
      }
    }
  }
}

const GoogleOneTapHandler: React.FC<GoogleOneTapHandlerProps> = ({ autoInit = true }) => {
  const { user, handleGoogleOneTapCallback } = useAuth();
  const [isScriptLoaded, setIsScriptLoaded] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const scriptLoadRetryCount = useRef(0);
  const nonceRef = useRef<string>('');
  const maxRetries = 3;
  
  // Generate a cryptographically secure random nonce
  const generateNonce = (): string => {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  };
  
  // Load Google One Tap script dynamically
  const loadGoogleScript = (): Promise<void> => {
    return new Promise((resolve, reject) => {
      // If script is already loaded, resolve immediately
      if (window.google?.accounts?.id) {
        setIsScriptLoaded(true);
        return resolve();
      }
      
      // Check if script is already being loaded
      const existingScript = document.getElementById('google-one-tap-script');
      if (existingScript) {
        // Script is loading, wait for it
        existingScript.addEventListener('load', () => {
          setIsScriptLoaded(true);
          resolve();
        });
        existingScript.addEventListener('error', (e) => reject(e));
        return;
      }
      
      // Create and append script
      const script = document.createElement('script');
      script.id = 'google-one-tap-script';
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.crossOrigin = 'anonymous';
      
      script.onload = () => {
        console.log('Google One Tap script loaded successfully');
        setIsScriptLoaded(true);
        resolve();
      };
      
      script.onerror = (error) => {
        console.error('Error loading Google One Tap script:', error);
        reject(error);
      };
      
      document.head.appendChild(script);
    });
  };
  
  // Initialize Google One Tap
  const initializeGoogleOneTap = async (): Promise<void> => {
    try {
      if (isInitialized || user) return;
      
      const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
      if (!googleClientId) {
        console.error('Google Client ID is not configured');
        return;
      }
      
      // Ensure script is loaded
      if (!isScriptLoaded) {
        await loadGoogleScript();
      }
      
      // Double-check that Google API is available
      if (!window.google?.accounts?.id) {
        throw new Error('Google accounts API not available after script load');
      }
      
      console.log("Initializing Google One Tap with client ID:", googleClientId);
      
      // Generate a secure nonce for this sign-in attempt
      nonceRef.current = generateNonce();
      
      // Initialize Google Identity
      window.google.accounts.id.initialize({
        client_id: googleClientId,
        callback: (response: GoogleOneTapResponse) => {
          handleGoogleOneTapCallback(response, nonceRef.current);
        },
        auto_select: false,
        cancel_on_tap_outside: true,
        use_fedcm_for_prompt: false, // Disable FedCM to ensure compatibility
      });
      
      // Add a small delay to ensure the API is fully ready
      setTimeout(() => {
        try {
          // Display the One Tap prompt
          window.google?.accounts?.id.prompt((notification) => {
            if (notification) {
              const status = [
                notification.isNotDisplayed?.() ? 'Not displayed' : '',
                notification.isSkippedMoment?.() ? 'Skipped' : '',
                notification.isDismissedMoment?.() ? 'Dismissed' : ''
              ].filter(Boolean).join(', ');
              
              console.log("Google One Tap prompt status:", status || 'Displayed');
              
              if (notification.isNotDisplayed?.()) {
                const reason = notification.getNotDisplayedReason?.();
                console.log("One Tap not displayed reason:", reason);
              }
              
              if (notification.isSkippedMoment?.()) {
                console.log("One Tap skipped reason:", notification.getSkippedReason?.());
              }
              
              if (notification.isDismissedMoment?.()) {
                console.log("One Tap dismissed reason:", notification.getDismissedReason?.());
              }
            }
          });
          
          setIsInitialized(true);
          console.log("Google One Tap initialized successfully");
        } catch (error) {
          console.error("Error showing Google One Tap prompt:", error);
        }
      }, 100);
    } catch (error) {
      console.error("Error initializing Google One Tap:", error);
      
      // Retry with exponential backoff
      if (scriptLoadRetryCount.current < maxRetries) {
        const retryCount = scriptLoadRetryCount.current;
        scriptLoadRetryCount.current++;
        
        console.log(`Retrying Google One Tap initialization (${retryCount + 1}/${maxRetries})...`);
        
        const delay = Math.min(1000 * Math.pow(2, retryCount), 5000); // Exponential backoff, max 5s
        setTimeout(() => {
          initializeGoogleOneTap();
        }, delay);
      } else {
        console.error("Max retries reached for Google One Tap initialization");
      }
    }
  };
  
  useEffect(() => {
    if (autoInit && !user) {
      initializeGoogleOneTap();
    }
    
    return () => {
      // Clean up if needed
      if (window.google?.accounts?.id) {
        window.google.accounts.id.cancel();
      }
    };
  }, [autoInit, user]);

  return null; // This is a non-visual component
};

export default GoogleOneTapHandler;
