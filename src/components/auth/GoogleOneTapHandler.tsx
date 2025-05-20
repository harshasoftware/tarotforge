import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import googleOneTap from 'google-one-tap';

interface GoogleOneTapHandlerProps {
  autoInit?: boolean;
}

const GoogleOneTapHandler: React.FC<GoogleOneTapHandlerProps> = ({ autoInit = true }) => {
  const { user, handleGoogleOneTapCallback } = useAuth();
  const [retryCount, setRetryCount] = useState(0);
  const MAX_RETRIES = 3;
  const isInitializedRef = useRef(false);
  const initTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  useEffect(() => {
    // Only initialize if autoInit is true and user is not logged in
    if (autoInit && !user && !isInitializedRef.current) {
      initializeGoogleOneTap();
    }
    
    return () => {
      // Cleanup timeout on unmount
      if (initTimeoutRef.current) {
        clearTimeout(initTimeoutRef.current);
      }
    };
  }, [autoInit, user, retryCount]);

  const initializeGoogleOneTap = () => {
    const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!googleClientId) {
      console.error('Google Client ID is not configured');
      return;
    }
    
    try {
      // Prevent multiple initializations
      if (isInitializedRef.current) {
        console.log('Google One Tap already initialized, skipping');
        return;
      }
      
      console.log('Initializing Google One Tap...');
      
      // Generate a nonce for security
      const generateNonce = (): string => {
        const array = new Uint8Array(16);
        crypto.getRandomValues(array);
        return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
      };
      
      const nonce = generateNonce();
      const origin = window.location.origin;
      
      // Create or update the placeholder in the DOM
      let googleOneTapContainer = document.getElementById('g_id_onload');
      
      if (!googleOneTapContainer) {
        // Create container if it doesn't exist
        console.log('Creating new Google One Tap container');
        googleOneTapContainer = document.createElement('div');
        googleOneTapContainer.id = 'g_id_onload';
        googleOneTapContainer.style.position = 'fixed';
        googleOneTapContainer.style.top = '10px';
        googleOneTapContainer.style.right = '10px';
        googleOneTapContainer.style.zIndex = '9999';
        document.body.appendChild(googleOneTapContainer);
      }
      
      // Set attributes with absolute URL
      googleOneTapContainer.setAttribute('data-client_id', googleClientId);
      googleOneTapContainer.setAttribute('data-context', 'signin');
      googleOneTapContainer.setAttribute('data-ux_mode', 'popup');
      googleOneTapContainer.setAttribute('data-login_uri', `${origin}/auth/callback`);
      googleOneTapContainer.setAttribute('data-auto_prompt', 'false');
      googleOneTapContainer.style.display = 'block';
      
      console.log('Google One Tap container configured with absolute login_uri:', `${origin}/auth/callback`);
      
      // Mark as initialized
      isInitializedRef.current = true;
      
      // Initialize with a slight delay to ensure DOM is ready
      if (initTimeoutRef.current) {
        clearTimeout(initTimeoutRef.current);
      }
      
      initTimeoutRef.current = setTimeout(() => {
        try {
          console.log('Initializing Google One Tap with client ID:', googleClientId.substring(0, 5) + '...');
          
          // Initialize Google One Tap
          googleOneTap({
            client_id: googleClientId,
            auto_select: false,
            cancel_on_tap_outside: true,
            context: 'signin',
            itp_support: true,
            login_uri: `${origin}/auth/callback`, // Set absolute URL here too
            callback: (response) => {
              console.log('Google One Tap callback received');
              if (response && response.credential) {
                handleGoogleOneTapCallback(response, nonce);
              }
            },
            error_callback: (error) => {
              console.warn('Google One Tap error:', error);
              
              // For debugging what happens
              if (typeof error === 'object' && error !== null) {
                console.log('Error details:', JSON.stringify(error, null, 2));
              }
              
              // Reset initialized flag to allow retry
              isInitializedRef.current = false;
              
              // Retry for different error conditions
              if (retryCount < MAX_RETRIES) {
                console.log(`Retrying Google One Tap (attempt ${retryCount + 1} of ${MAX_RETRIES})...`);
                
                // Different delay based on error type
                const retryDelay = 2000 + (retryCount * 1000); // Increasing delay with each retry
                
                // Wait before retrying
                setTimeout(() => {
                  setRetryCount(prev => prev + 1);
                }, retryDelay);
              } else {
                console.log('Max retry attempts reached for Google One Tap');
              }
            }
          });
          
          console.log('Google One Tap initialization complete');
          
          // Force prompt to show
          if (window.google && window.google.accounts && window.google.accounts.id) {
            console.log('Explicitly prompting Google One Tap to show');
            window.google.accounts.id.prompt((notification) => {
              console.log('Google One Tap prompt notification:', notification);
              
              // Log detailed information about why the prompt might not be showing
              if (notification) {
                if (notification.isNotDisplayed && notification.isNotDisplayed()) {
                  console.warn('Google One Tap not displayed. Reason:', notification.getNotDisplayedReason?.());
                } else if (notification.isSkippedMoment && notification.isSkippedMoment()) {
                  console.warn('Google One Tap moment skipped. Reason:', notification.getSkippedReason?.());
                } else if (notification.isDismissedMoment && notification.isDismissedMoment()) {
                  console.log('Google One Tap moment dismissed. Reason:', notification.getDismissedReason?.());
                }
                console.log('Moment type:', notification.getMomentType?.());
              }
            });
          } else {
            console.warn('Google accounts API not available for prompting');
          }
        } catch (initError) {
          console.error('Failed to initialize Google One Tap:', initError);
          isInitializedRef.current = false; // Reset for potential retry
        }
      }, 1000);
    } catch (error) {
      console.error('Error in Google One Tap setup:', error);
      isInitializedRef.current = false;
    }
  };

  return (
    <div id="google-one-tap-handler" style={{ display: 'none' }}>
      {/* This is a non-visual component */}
    </div>
  );
};

export default GoogleOneTapHandler;