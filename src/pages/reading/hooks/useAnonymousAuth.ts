import { useEffect, useState } from 'react';
import { useAuthStore } from '../../../stores/authStore';

interface UseAnonymousAuthProps {
  onAuthError?: (message: string) => void;
}

/**
 * @hook useAnonymousAuth
 * @description React hook to handle anonymous user authentication.
 * This hook attempts to sign in a user anonymously if no authenticated user is found.
 * It manages the state of the anonymous authentication attempt and any errors that occur.
 *
 * @param {UseAnonymousAuthProps} props - The properties for the hook.
 * @param {function(message: string): void} [props.onAuthError] - Optional callback function that is called when an authentication error occurs.
 *
 * @returns {{ isReady: boolean, error: string | null }} An object containing the authentication status.
 * @property {boolean} isReady - True if the anonymous authentication process is complete (either successfully or with an error), or if a user is already authenticated.
 * @property {string | null} error - An error message if anonymous authentication failed, otherwise null.
 */
export function useAnonymousAuth({ onAuthError }: UseAnonymousAuthProps = {}) {
  const { user, signInAnonymously } = useAuthStore();
  const [isAnonymousAuthAttempted, setIsAnonymousAuthAttempted] = useState(false);
  const [anonymousAuthError, setAnonymousAuthError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const attemptAnonymousSignIn = async () => {
      if (!user && !isAnonymousAuthAttempted) {
        console.log('🎭 No authenticated user found, attempting anonymous sign-in...');
        setIsAnonymousAuthAttempted(true); // Mark attempt before async call
        try {
          const result = await signInAnonymously();
          if (isMounted) {
            if (result.error) {
              console.error('❌ Failed to create anonymous user:', result.error);
              const errorMsg = 'Failed to authenticate. Please refresh the page and try again.';
              setAnonymousAuthError(errorMsg);
              if (onAuthError) {
                onAuthError(errorMsg);
              }
            } else {
              console.log('✅ Anonymous user created successfully');
              setAnonymousAuthError(null);
              // Small delay to ensure auth state is updated in stores/components
              await new Promise(resolve => setTimeout(resolve, 300));
            }
          }
        } catch (error) {
          if (isMounted) {
            console.error('❌ Error creating anonymous user:', error);
            const errorMsg = 'Authentication failed. Please refresh the page and try again.';
            setAnonymousAuthError(errorMsg);
            if (onAuthError) {
              onAuthError(errorMsg);
            }
          }
        }
      } else if (user) {
         // If user becomes available, clear any previous anonymous auth error
        setAnonymousAuthError(null);
      }
    };

    attemptAnonymousSignIn();

    return () => {
      isMounted = false;
    };
  }, [user, signInAnonymously, onAuthError, isAnonymousAuthAttempted]);

  return { 
    isReady: !!user || (isAnonymousAuthAttempted && !anonymousAuthError), 
    error: anonymousAuthError 
  };
} 