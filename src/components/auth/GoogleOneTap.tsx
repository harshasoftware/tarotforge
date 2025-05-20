import { useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';

const GoogleOneTap: React.FC = () => {
  const { user, signInWithGoogle } = useAuth();
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  
  // Handle credential response
  const handleCredentialResponse = useCallback(async (response: any) => {
    if (response && response.credential) {
      try {
        console.log("Google One Tap response received");
        // Use the Supabase OAuth flow instead of ID token
        // This avoids CORS issues and security challenges
        await signInWithGoogle(false);
      } catch (error) {
        console.error("Error processing Google credential:", error);
      }
    }
  }, [signInWithGoogle]);
  
  useEffect(() => {
    // Only show One Tap when user is not logged in
    if (user) return;

    // Check if Google client is available
    if (!googleClientId) {
      console.warn('Google Client ID is not configured. One Tap sign-in is disabled.');
      return;
    }

    // Handle loading Google Identity script dynamically
    const loadGoogleScript = () => {
      // Skip if already loaded
      if (document.querySelector('script[src="https://accounts.google.com/gsi/client"]')) {
        initializeGoogleOneTap();
        return;
      }
      
      const script = document.createElement('script');
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;
      script.onload = initializeGoogleOneTap;
      script.onerror = (error) => console.error("Error loading Google Identity script:", error);
      document.head.appendChild(script);
    };

    // Initialize Google One Tap
    const initializeGoogleOneTap = () => {
      if (window.google?.accounts?.id) {
        try {
          console.log("Initializing Google One Tap...");
          
          // Cleanup any previous instances
          window.google.accounts.id.cancel();
          
          // Initialize Identity Services
          window.google.accounts.id.initialize({
            client_id: googleClientId,
            callback: handleCredentialResponse,
            auto_select: false,
            cancel_on_tap_outside: true,
            use_fedcm_for_prompt: true // Use FedCM to help avoid CORS issues
          });
          
          // Render a sign-in button somewhere in the UI (optional)
          const buttonContainer = document.getElementById('google-one-tap-button');
          if (buttonContainer) {
            window.google.accounts.id.renderButton(
              buttonContainer,
              { 
                type: 'standard',
                theme: 'outline',
                size: 'large',
                text: 'continue_with',
                shape: 'rectangular',
                width: 250
              }
            );
          }
          
          // Display the One Tap prompt
          window.google.accounts.id.prompt();
        } catch (error) {
          console.error("Error initializing Google One Tap:", error);
        }
      } else {
        console.warn("Google accounts API not available yet");
      }
    };

    // Load the script
    loadGoogleScript();
    
    // Cleanup
    return () => {
      if (window.google?.accounts?.id) {
        window.google.accounts.id.cancel();
      }
    };
  }, [user, handleCredentialResponse, googleClientId]);

  // Container for the Google Sign-In button
  return (
    <div className="w-full mb-6 flex justify-center">
      <div id="google-one-tap-button"></div>
      
      {/* Additional sign in with Google button - part of the UI for fallback */}
      <button
        onClick={() => signInWithGoogle()}
        className="hidden w-full btn btn-outline border-input hover:bg-secondary/50 py-2 mb-6 flex items-center justify-center relative"
      >
        <svg viewBox="0 0 24 24" width="24" height="24" className="absolute left-3">
          <g transform="matrix(1, 0, 0, 1, 27.009001, -39.238998)">
            <path fill="#4285F4" d="M -3.264 51.509 C -3.264 50.719 -3.334 49.969 -3.454 49.239 L -14.754 49.239 L -14.754 53.749 L -8.284 53.749 C -8.574 55.229 -9.424 56.479 -10.684 57.329 L -10.684 60.329 L -6.824 60.329 C -4.564 58.239 -3.264 55.159 -3.264 51.509 Z" />
            <path fill="#34A853" d="M -14.754 63.239 C -11.514 63.239 -8.804 62.159 -6.824 60.329 L -10.684 57.329 C -11.764 58.049 -13.134 58.489 -14.754 58.489 C -17.884 58.489 -20.534 56.379 -21.484 53.529 L -25.464 53.529 L -25.464 56.619 C -23.494 60.539 -19.444 63.239 -14.754 63.239 Z" />
            <path fill="#FBBC05" d="M -21.484 53.529 C -21.734 52.809 -21.864 52.039 -21.864 51.239 C -21.864 50.439 -21.724 49.669 -21.484 48.949 L -21.484 45.859 L -25.464 45.859 C -26.284 47.479 -26.754 49.299 -26.754 51.239 C -26.754 53.179 -26.284 54.999 -25.464 56.619 L -21.484 53.529 Z" />
            <path fill="#EA4335" d="M -14.754 43.989 C -12.984 43.989 -11.404 44.599 -10.154 45.789 L -6.734 42.369 C -8.804 40.429 -11.514 39.239 -14.754 39.239 C -19.444 39.239 -23.494 41.939 -25.464 45.859 L -21.484 48.949 C -20.534 46.099 -17.884 43.989 -14.754 43.989 Z" />
          </g>
        </svg>
        <span>Continue with Google</span>
      </button>
    </div>
  );
};

export default GoogleOneTap;