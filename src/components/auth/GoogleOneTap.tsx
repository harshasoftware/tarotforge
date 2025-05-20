import { useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import googleOneTap from 'google-one-tap';

const GoogleOneTapContainer: React.FC = () => {
  const { user, handleGoogleOneTapCallback } = useAuth();

  useEffect(() => {
    // Only show One Tap when user is not logged in
    if (user) return;

    // Check if Google client is available
    const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!googleClientId) {
      console.error('Google Client ID is not configured. One Tap sign-in is disabled.');
      return;
    }

    // Generate a nonce for security
    const generateNonce = (): string => {
      const array = new Uint8Array(16);
      crypto.getRandomValues(array);
      return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    };
    
    const nonce = generateNonce();

    // Initialize Google One Tap using the npm package
    googleOneTap({
      client_id: googleClientId,
      auto_select: false,
      cancel_on_tap_outside: true,
      context: 'signin',
      callback: (response) => {
        if (response && response.credential) {
          console.log("Google One Tap response received, handling...");
          handleGoogleOneTapCallback(response, nonce);
        }
      },
    });

    return () => {
      // The package should handle cleanup
    };
  }, [user, handleGoogleOneTapCallback]);

  // Don't render anything for logged in users
  if (user) return null;

  return null; // The one-tap package handles the UI
};

export default GoogleOneTapContainer;