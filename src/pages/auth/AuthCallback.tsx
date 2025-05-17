import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import LoadingScreen from '../../components/ui/LoadingScreen';
import { useAuth } from '../../context/AuthContext';
import { AlertCircle } from 'lucide-react';

const AuthCallback = () => {
  const navigate = useNavigate();
  const { checkAuth } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [processedAuth, setProcessedAuth] = useState(false);
  const [processingStep, setProcessingStep] = useState<string>('Initializing authentication...');
  
  // Handle auth callback
  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        console.log('Auth callback triggered');
        
        // First check if we're processing a hash fragment from implicit flow
        if (window.location.hash && window.location.hash.includes('access_token=')) {
          console.log('Processing URL hash with access token (Implicit Flow)');
          setProcessingStep('Processing access token...');
          
          try {
            // Extract the tokens from the URL fragment
            const params = new URLSearchParams(window.location.hash.substring(1));
            const accessToken = params.get('access_token');
            const idToken = params.get('id_token'); // Also get the ID token from Google
            
            if (!accessToken) {
              throw new Error('No access token found in URL hash');
            }
            
            // Use the token with Google identity provider
            setProcessingStep('Setting up your session...');
            console.log('Authenticating with Google token');
            
            // Use the token from Google to authenticate with Supabase
            const { data, error: signInError } = await supabase.auth.signInWithIdToken({
              provider: 'google',
              token: idToken || accessToken,
            });
            
            if (signInError) {
              console.error('Error signing in with ID token:', signInError);
              throw signInError;
            }
            
            // Force refresh the auth state
            setProcessingStep('Syncing your profile...');
            console.log('Checking auth state after Google sign-in');
            await checkAuth();
            
            setProcessedAuth(true);
            setProcessingStep('Authentication successful! Redirecting...');
            
            // Clear the hash from URL for security
            window.history.replaceState(null, '', '/');
            
            // Navigate to root after a small delay
            setTimeout(() => {
              console.log('Redirecting to root URL after auth');
              navigate('/');
            }, 500);
            return;
          } catch (hashError) {
            console.error('Error processing auth hash:', hashError);
            setError('Failed to process authentication tokens. Please try again.');
          }
        } 
        // Then check for query params from other auth flows
        else if (window.location.search) {
          console.log('Processing code exchange');
          setProcessingStep('Processing authentication code...');
          
          try {
            const { data, error } = await supabase.auth.exchangeCodeForSession(window.location.search);
            
            if (error) {
              console.error('Error exchanging code for session:', error);
              setError(error.message || 'Authentication failed. Please try again.');
              
              // Wait a moment before redirecting to login
              setTimeout(() => {
                navigate('/login?error=auth');
              }, 3000);
              return;
            }
            
            if (data.session) {
              console.log('Successfully authenticated via code exchange');
              // Force refresh the auth state
              setProcessingStep('Syncing your profile...');
              await checkAuth();
              
              setProcessedAuth(true);
              setProcessingStep('Authentication successful! Redirecting...');
              
              // Navigate to root
              setTimeout(() => {
                navigate('/');
              }, 500);
              return;
            }
          } catch (codeError) {
            console.error('Error in code exchange:', codeError);
            setError('Failed to complete authentication. Please try again.');
            
            // Wait a moment before redirecting
            setTimeout(() => {
              navigate('/login?error=auth');
            }, 3000);
            return;
          }
        }
        
        // If we get here and haven't processed anything, something went wrong
        if (!processedAuth) {
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
  }, [navigate, checkAuth, processedAuth]);
  
  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
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
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
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