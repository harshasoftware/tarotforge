import { useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';

const GoogleOneTap: React.FC = () => {
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

    // Initialize Google One Tap when the script is loaded
    const initializeOneTap = () => {
      if (typeof window !== 'undefined' && window.google && window.google.accounts) {
        // Initialize Google Identity Services
        window.google.accounts.id.initialize({
          client_id: googleClientId,
          callback: (response) => {
            if (response && response.credential) {
              // Handle the credential through Auth context
              handleGoogleOneTap();
            }
          },
          auto_select: false, // Don't auto-select to avoid conflicts with FedCM
          cancel_on_tap_outside: true,
          use_fedcm_for_prompt: true // Explicitly opt-in to FedCM
        });
        
        // Use FedCM-compatible approach to prompt - without callback parameter
        window.google.accounts.id.prompt();
        
        // Also render a Google Sign-In button as fallback
        if (buttonRef.current) {
          window.google.accounts.id.renderButton(buttonRef.current, {
            theme: 'outline',
            size: 'large',
            type: 'standard',
            text: 'continue_with',
            shape: 'rectangular',
            logo_alignment: 'left',
            width: 240
          });
        }
      }
    };

    // Check if Google script is already loaded
    if (window.google?.accounts) {
      initializeOneTap();
    } else {
      // Poll for Google script to be available
      const checkGoogleScript = setInterval(() => {
        if (window.google?.accounts) {
          clearInterval(checkGoogleScript);
          initializeOneTap();
        }
      }, 500);
      
      // Clean up interval
      return () => clearInterval(checkGoogleScript);
    }
  }, [user, handleGoogleOneTap, googleClientId]);

  // Don't render anything for logged in users
  if (user) return null;

  return (
    <div className="w-full mb-6 flex justify-center">
      <div 
        ref={buttonRef} 
        className="g_id_signin"
        data-use-fedcm-for-prompt="true" // FedCM opt-in for legacy browsers
      ></div>
    </div>
  );
};

export default GoogleOneTap;