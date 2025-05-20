import { useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';

const GoogleOneTap: React.FC = () => {
  const { user, handleGoogleOneTap } = useAuth();
  const buttonRef = useRef<HTMLDivElement>(null);
  const scriptRef = useRef<HTMLScriptElement | null>(null);
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  
  useEffect(() => {
    // Only show One Tap when user is not logged in
    if (user) return;

    // Check if Google client is available
    if (!googleClientId) {
      console.error('Google Client ID is not configured. One Tap sign-in is disabled.');
      return;
    }

    // Load Google script programmatically
    const loadGoogleScript = () => {
      if (!scriptRef.current && !window.google?.accounts) {
        const script = document.createElement('script');
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.defer = true;
        script.crossOrigin = 'anonymous';
        script.onload = initializeGoogleOneTap;
        script.onerror = (error) => {
          console.error('Error loading Google One Tap script:', error);
        };
        
        document.body.appendChild(script);
        scriptRef.current = script;
      } else if (window.google?.accounts) {
        initializeGoogleOneTap();
      }
    };

    // Initialize Google Identity Services
    const initializeGoogleOneTap = () => {
      if (typeof window !== 'undefined' && window.google?.accounts) {
        try {
          console.log("Initializing Google One Tap");
          
          // Initialize Google Identity Services
          window.google.accounts.id.initialize({
            client_id: googleClientId,
            callback: (response) => {
              if (response && response.credential) {
                console.log("Google One Tap credential received");
                handleGoogleOneTap();
              }
            },
            auto_select: false,
            cancel_on_tap_outside: true,
            use_fedcm_for_prompt: true, // Try FedCM first
          });
          
          // Render a Google Sign-In button as fallback
          if (buttonRef.current) {
            window.google.accounts.id.renderButton(buttonRef.current, {
              theme: 'outline',
              size: 'large',
              type: 'standard',
              text: 'continue_with',
              shape: 'rectangular',
              logo_alignment: 'left',
              width: 280
            });
          }
          
          // Display the One Tap prompt
          window.google.accounts.id.prompt((notification) => {
            // Log notification details for debugging
            if (notification) {
              if (notification.isNotDisplayed?.()) {
                console.log("One Tap not displayed reason:", 
                  notification.getNotDisplayedReason?.());
              } else if (notification.isSkippedMoment?.()) {
                console.log("One Tap skipped reason:", 
                  notification.getSkippedReason?.());
              } else if (notification.isDismissedMoment?.()) {
                console.log("One Tap dismissed reason:", 
                  notification.getDismissedReason?.());
              }
            }
          });
        } catch (error) {
          console.error("Error initializing Google One Tap:", error);
        }
      }
    };

    // Start the process
    loadGoogleScript();
    
    // Cleanup function
    return () => {
      // Cancel any ongoing Google prompts
      if (window.google?.accounts) {
        window.google.accounts.id.cancel();
      }
    };
  }, [user, handleGoogleOneTap, googleClientId]);

  // Don't render the One Tap button for logged-in users
  if (user) return null;

  return (
    <div 
      ref={buttonRef}
      className="w-full mb-6 flex justify-center"
      id="g_id_onload" 
      data-client_id={googleClientId}
      data-context="signin"
      data-ux_mode="popup"
      data-auto_prompt="false"
    ></div>
  );
};

export default GoogleOneTap;