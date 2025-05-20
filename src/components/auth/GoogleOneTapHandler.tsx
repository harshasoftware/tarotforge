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
      
      isInitializedRef.current = true;
      
      // Generate a nonce for security
      const generateNonce = (): string => {
        const array = new Uint8Array(16);
        crypto.getRandomValues(array);
        return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
      };
      
      const nonce = generateNonce();
      
      // Add a small delay before initialization to avoid race conditions
      if (initTimeoutRef.current) {
        clearTimeout(initTimeoutRef.current);
      }
      
      initTimeoutRef.current = setTimeout(() => {
        try {
          // Initialize Google One Tap with proper error handling
          googleOneTap({
            client_id: googleClientId,
            auto_select: false,
            cancel_on_tap_outside: false, // Changed to false to prevent auto-dismissal
            context: 'signin',
            callback: (response) => {
              try {
                handleGoogleOneTapCallback(response, nonce);
              } catch (error) {
                console.error('Error handling Google One Tap callback:', error);
                isInitializedRef.current = false; // Reset for potential retry
              }
            },
            error_callback: (error) => {
              console.warn('Google One Tap error:', error);
              
              // Reset initialized flag to allow retry
              isInitializedRef.current = false;
              
              // Retry for different error conditions
              if (retryCount < MAX_RETRIES) {
                console.log(`Retrying Google One Tap (attempt ${retryCount + 1} of ${MAX_RETRIES})...`);
                
                const retryDelay = error?.type === 'tap_outside' ? 1000 : 3000;
                
                // Wait before retrying
                setTimeout(() => {
                  setRetryCount(prev => prev + 1);
                }, retryDelay);
              } else {
                console.log('Max retry attempts reached for Google One Tap');
              }
            }
          });
        } catch (initError) {
          console.error('Failed to initialize Google One Tap:', initError);
          isInitializedRef.current = false; // Reset for potential retry
        }
      }, 500); // Short delay before initialization
    } catch (error) {
      console.error('Error in Google One Tap setup:', error);
      isInitializedRef.current = false;
    }
  };

  return null; // This is a non-visual component
};

export default GoogleOneTapHandler;