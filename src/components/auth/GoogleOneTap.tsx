import { useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';

interface GoogleOneTapProps {
  clientId?: string;
}

const GoogleOneTap: React.FC<GoogleOneTapProps> = () => {
  const { user, handleGoogleOneTap } = useAuth();
  const buttonRef = useRef<HTMLDivElement>(null);
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  useEffect(() => {
    // Only show One Tap when user is not logged in
    if (user) return;

    // Check if Google client is available
    if (!googleClientId) {
      console.error('Google Client ID is not configured. One Tap sign-in is disabled.');
      return;
    }

    // Handle the case where script might not have loaded yet
    if (typeof window !== 'undefined' && window.google && window.google.accounts) {
      handleGoogleOneTap();

      // Also render a Google Sign-In button as fallback
      if (buttonRef.current) {
        window.google.accounts.id.renderButton(buttonRef.current, {
          theme: 'outline',
          size: 'large',
          type: 'standard',
          text: 'signin_with',
          shape: 'rectangular',
          logo_alignment: 'left',
          width: 240
        });
      }
    } else {
      // Try again after a short delay if the Google script hasn't loaded yet
      const timer = setTimeout(() => {
        handleGoogleOneTap();
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [user, handleGoogleOneTap, googleClientId]);

  // Don't render anything for logged in users
  if (user) return null;

  // Only render the fallback button container if Google Sign-In is available
  return (
    <div className="w-full flex justify-center">
      <div 
        ref={buttonRef} 
        className="g_id_signin my-4"
        data-type="standard"
        data-shape="rectangular"
        data-theme="outline"
        data-text="signin_with"
        data-size="large"
        data-logo_alignment="left"
      ></div>
    </div>
  );
};

export default GoogleOneTap;