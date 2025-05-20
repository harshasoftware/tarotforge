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

    console.log('Initializing Google One Tap with client ID:', googleClientId);

    // Generate a nonce for security
    const generateNonce = (): string => {
      const array = new Uint8Array(16);
      crypto.getRandomValues(array);
      return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    };
    
    const nonce = generateNonce();

    // Initialize Google One Tap using the npm package
    const googleOneTapConfig = {
      client_id: googleClientId,
      auto_select: false,
      cancel_on_tap_outside: true,
      context: 'signin',
      prompt_parent_id: 'g_id_onload', // Add a parent element ID
      callback: (response: any) => {
        console.log('Google One Tap callback triggered', response);
        if (response && response.credential) {
          console.log("Google One Tap response received, handling...");
          handleGoogleOneTapCallback(response, nonce);
        }
      },
    };

    // Add a div for One Tap to render into
    const oneTapDiv = document.createElement('div');
    oneTapDiv.id = 'g_id_onload';
    oneTapDiv.style.position = 'fixed';
    oneTapDiv.style.top = '10px';
    oneTapDiv.style.right = '10px';
    oneTapDiv.style.zIndex = '1000';
    document.body.appendChild(oneTapDiv);
    
    console.log('Google One Tap container added to DOM');

    // Initialize Google One Tap
    googleOneTap(googleOneTapConfig);
    console.log('Google One Tap initialized');

    return () => {
      // Clean up the container div when component unmounts
      if (document.getElementById('g_id_onload')) {
        document.body.removeChild(oneTapDiv);
      }
    };
  }, [user, handleGoogleOneTapCallback]);

  // Return a fixed positioned container for the one tap
  return null;
};

export default GoogleOneTapContainer;