import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const GoogleAuthCallback: React.FC = () => {
  const { handleGoogleRedirect } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const processRedirect = async () => {
      try {
        const { error } = await handleGoogleRedirect();
        if (error) {
          setError(typeof error === 'string' ? error : JSON.stringify(error));
          // Redirect to login page after a delay if there's an error
          setTimeout(() => navigate('/'), 3000);
        } else {
          // Successful login, redirect to home or dashboard
          navigate('/');
        }
      } catch (err) {
        console.error('Error in callback processing:', err);
        setError('An unexpected error occurred');
        setTimeout(() => navigate('/'), 3000);
      }
    };

    processRedirect();
  }, [handleGoogleRedirect, navigate]);

  return (
    <div className="auth-callback-container flex flex-col items-center justify-center min-h-screen p-4">
      {error ? (
        <div className="error-message text-center">
          <h2 className="text-xl font-bold text-red-500 mb-2">Authentication Error</h2>
          <p className="mb-4">{error}</p>
          <p>Redirecting to home page...</p>
        </div>
      ) : (
        <div className="loading-message text-center">
          <h2 className="text-xl font-bold mb-2">Completing Authentication</h2>
          <p>Please wait while we complete the authentication process...</p>
          <div className="mt-4 w-12 h-12 border-4 border-t-blue-500 border-r-transparent border-b-blue-500 border-l-transparent rounded-full animate-spin"></div>
        </div>
      )}
    </div>
  );
};

export default GoogleAuthCallback;
