import React, { useState } from 'react';
import { useAuthStore } from '../../stores/authStore';

type GoogleSignInButtonProps = {
  fallbackText?: string;
};

/**
 * Google Sign-In component that uses the standard OAuth flow
 */
const GoogleSignInButton: React.FC<GoogleSignInButtonProps> = ({ 
  fallbackText = "Sign in with Google" 
}) => {
  const { signInWithGoogle } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  
  const handleSignIn = async () => {
    try {
      setIsLoading(true);
      await signInWithGoogle();
    } catch (err) {
      console.error('Error during Google Sign-In:', err);
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="google-sign-in-container">
      <button
        onClick={handleSignIn}
        disabled={isLoading}
        className="google-sign-in-fallback-button w-full flex items-center justify-center relative"
      >
        {isLoading ? (
          <span className="flex items-center justify-center">
            <span className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin mr-2"></span>
            Connecting...
          </span>
        ) : (
          <>{fallbackText}</>
        )}
      </button>
    </div>
  );
};

export default GoogleSignInButton;