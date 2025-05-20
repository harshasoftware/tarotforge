import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import googleOneTap from 'google-one-tap';

interface GoogleOneTapHandlerProps {
  autoInit?: boolean;
}

const GoogleOneTapHandler: React.FC<GoogleOneTapHandlerProps> = ({ autoInit = true }) => {
  const { user, handleGoogleOneTapCallback } = useAuth();
  const [retryCount, setRetryCount] = useState(0);
  const MAX_RETRIES = 2;
  
  useEffect(() => {
    // Only initialize if autoInit is true and user is not logged in
    if (autoInit && !user) {
      initializeGoogleOneTap();
    }
    
    return () => {
      // The package should handle cleanup
    };
  }, [autoInit, user, retryCount]);

  const initializeGoogleOneTap = () => {
    const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!googleClientId) {
      console.error('Google Client ID is not configured');
      return;
    }
    
    try {
      // Generate a nonce for security
      const generateNonce = (): string => {
        const array = new Uint8Array(16);
        crypto.getRandomValues(array);
        return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
      };
      
      const nonce = generateNonce();
      
      // Initialize Google One Tap with proper error handling
      googleOneTap({
        client_id: googleClientId,
        auto_select: false,
        cancel_on_tap_outside: true,
        context: 'signin',
        callback: (response) => {
          try {
            handleGoogleOneTapCallback(response, nonce);
          } catch (error) {
            console.error('Error handling Google One Tap callback:', error);
          }
        },
        error_callback: (error) => {
          console.warn('Google One Tap error:', error);
          
          // Implement a retry mechanism for network errors
          if (error?.type === 'network' && retryCount < MAX_RETRIES) {
            console.log(`Retrying Google One Tap (attempt ${retryCount + 1} of ${MAX_RETRIES})...`);
            
            // Wait a bit before retrying
            setTimeout(() => {
              setRetryCount(prev => prev + 1);
            }, 2000);
          }
        }
      });
    } catch (error) {
      console.error('Failed to initialize Google One Tap:', error);
    }
  };

  return null; // This is a non-visual component
};

export default GoogleOneTapHandler;