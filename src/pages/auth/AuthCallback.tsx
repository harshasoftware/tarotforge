import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import LoadingScreen from '../../components/ui/LoadingScreen';
import { useAuth } from '../../context/AuthContext';
import { AlertCircle } from 'lucide-react';

const AuthCallback = () => {
  const navigate = useNavigate();
  const { checkAuth, handleGoogleRedirect } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [processingStep, setProcessingStep] = useState<string>('Initializing authentication...');
  
  // Handle auth callback
  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        console.log('Auth callback triggered');
        setProcessingStep('Processing authentication...');
        
        if (window.location.hash || window.location.search) {
          try {
            // Process authentication callback data
            if (window.location.search && window.location.search.includes('code=')) {
              console.log('Processing code exchange from query parameters');
              await handleGoogleRedirect();
            }
            
            // Force refresh the auth state
            setProcessingStep('Syncing your profile...');
            await checkAuth();
            
            setProcessingStep('Authentication successful! Redirecting...');
            
            // Clear URL parameters for security
            window.history.replaceState(null, '', '/');
            
            // Check for stored return preferences
            const returnToHome = localStorage.getItem('auth_return_to_home');
            const withDeckCreation = localStorage.getItem('auth_with_deck_creation');
            const returnPath = localStorage.getItem('auth_return_path');
            
            // Clear stored preferences
            localStorage.removeItem('auth_return_to_home');
            localStorage.removeItem('auth_with_deck_creation');
            localStorage.removeItem('auth_return_path');
            
            // Navigate based on stored preferences
            setTimeout(() => {
              if (returnToHome === 'true') {
                console.log('Redirecting to home with deck creation intent');
                if (withDeckCreation === 'true') {
                  // Navigate to home with intent to create a deck
                  navigate('/?createDeck=true');
                } else {
                  navigate('/');
                }
              } else if (returnPath) {
                console.log('Redirecting to previously stored path:', returnPath);
                navigate(returnPath);
              } else {
                console.log('No specific redirect found, going to home');
                navigate('/');
              }
            }, 500);
          } catch (authError) {
            console.error('Error processing authentication:', authError);
            setError(authError instanceof Error ? authError.message : 'Authentication failed. Please try again.');
            
            // Wait a moment before redirecting to login
            setTimeout(() => {
              navigate('/login?error=auth');
            }, 3000);
          }
        } else {
          // No authentication data found
          console.error('Auth callback reached but no valid tokens or code found');
          setError('No authentication data found. Please try signing in again.');
          
          // Wait a moment before redirecting
          setTimeout(() => {
            navigate('/login?error=auth');
          }, 3000);
        }
      } catch (error) {
        console.error('Error handling auth callback:', error);
        setError('An unexpected error occurred during authentication.');
        
        // Redirect after a delay
        setTimeout(() => {
          navigate('/login?error=auth');
        }, 3000);
      }
    };
    
    handleAuthCallback();
  }, [navigate, checkAuth, handleGoogleRedirect]);
  
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="bg-card border border-border rounded-lg p-6 max-w-md w-full text-center">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h2 className="text-2xl font-serif mb-2">Authentication Error</h2>
          <p className="text-muted-foreground mb-6">{error}</p>
          <p className="text-sm text-muted-foreground">Redirecting you to login...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <LoadingScreen />
      <div className="mt-8 max-w-md text-center">
        <h2 className="text-xl font-medium mb-2">Setting Up Your Account</h2>
        <p className="text-muted-foreground mb-4">{processingStep}</p>
        <div className="h-2 w-full bg-muted/30 rounded-full overflow-hidden">
          <div className="h-2 bg-primary rounded-full animate-pulse" style={{ width: '75%' }}></div>
        </div>
      </div>
    </div>
  );
};

export default AuthCallback;