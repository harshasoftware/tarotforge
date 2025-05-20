import React, { useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import googleOneTap from 'google-one-tap';

interface GoogleOneTapLoaderProps {
  autoInit?: boolean;
}

const GoogleOneTapLoader: React.FC<GoogleOneTapLoaderProps> = ({ autoInit = true }) => {
  const { handleGoogleOneTapCallback } = useAuth();
  
  useEffect(() => {
    if (autoInit) {
      const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
      if (!googleClientId) {
        console.error('Google Client ID is not configured');
        return;
      }
      
      // Generate a nonce for security
      const generateNonce = (): string => {
        const array = new Uint8Array(16);
        crypto.getRandomValues(array);
        return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
      };
      
      const nonce = generateNonce();
      
      // Initialize Google One Tap using the package
      googleOneTap({
        client_id: googleClientId,
        auto_select: false,
        cancel_on_tap_outside: true,
        context: 'signin',
        callback: (response) => {
          handleGoogleOneTapCallback(response, nonce);
        },
      });
    }
    
    return () => {
      // The package should handle cleanup
    };
  }, [autoInit, handleGoogleOneTapCallback]);

  return null; // This is a non-visual component
};

export default GoogleOneTapLoader;