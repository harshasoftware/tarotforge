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

    // Check if Google script is loaded
    if (!window.google?.accounts) {
      console.log('Google script not loaded yet, will retry...');
      const timer = setTimeout(() => {
        if (window.google?.accounts?.id) {
          handleGoogleOneTap();
        }
      }, 1000);
      return () => clearTimeout(timer);
    }

    // Initialize Google One Tap when the script is loaded
    const initializeOneTap = () => {
      if (typeof window !== 'undefined' && window.google && window.google.accounts) {
        try {
          // Initialize Google Identity Services
          window.google.accounts.id.initialize({
            client_id: googleClientId,
            callback: (response) => {
              if (response && response.credential) {
                console.log("Google One Tap response received, handling...");
                handleGoogleOneTap();
              }
            },
            auto_select: false, // Don't auto-select to avoid conflicts with FedCM
            cancel_on_tap_outside: true,
            use_fedcm_for_prompt: false, // Disable FedCM to ensure compatibility
          });
          
          console.log("Google One Tap initialized, displaying prompt");
          
          // Display the One Tap prompt
          window.google.accounts.id.prompt((notification) => {
            if (notification) {
              if (notification.isNotDisplayed && notification.isNotDisplayed()) {
                console.log("One Tap not displayed reason:", notification.getNotDisplayedReason?.());
              }
              if (notification.isSkippedMoment && notification.isSkippedMoment()) {
                console.log("One Tap skipped reason:", notification.getSkippedReason?.());
              }
              if (notification.isDismissedMoment && notification.isDismissedMoment()) {
                console.log("One Tap dismissed reason:", notification.getDismissedReason?.());
              }
            }
          });
          
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
        } catch (error) {
          console.error("Error initializing Google One Tap:", error);
        }
      }
    };

    // Check if Google script is already loaded
    if (window.google?.accounts) {
      initializeOneTap();
    } else {
      // Poll for Google script to be available (with timeout)
      let attempts = 0;
      const maxAttempts = 20;
      const checkGoogleScript = setInterval(() => {
        attempts++;
        if (window.google?.accounts) {
          clearInterval(checkGoogleScript);
          initializeOneTap();
        }
        
        if (attempts > maxAttempts) {
          clearInterval(checkGoogleScript);
          console.error("Google One Tap script failed to load after multiple attempts");
          
          // Try adding the script programmatically as a fallback
          if (!document.querySelector('script[src*="gsi/client"]')) {
            const script = document.createElement('script');
            script.src = 'https://accounts.google.com/gsi/client';
            script.async = true;
            script.defer = true;
            script.crossOrigin = 'anonymous';
            script.onload = initializeOneTap;
            document.head.appendChild(script);
          }
        }
      }, 500);
      
      // Clean up interval
      return () => {
        clearInterval(checkGoogleScript);
      };
    }
  }, [user, handleGoogleOneTap, googleClientId]);

  // Don't render anything for logged in users
  if (user) return null;

  return (
    <div className="w-full mb-6 flex justify-center">
      <div 
        ref={buttonRef} 
        className="g_id_signin"
      ></div>
    </div>
  );
};

export default GoogleOneTap;