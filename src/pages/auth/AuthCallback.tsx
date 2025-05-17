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
  
  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        console.log('Auth callback triggered');
        
        // First check if we're processing a hash fragment from magic link
        if (window.location.hash && window.location.hash.includes('access_token=')) {
          console.log('Processing URL hash with access token');
          
          try {
            // Directly extract the session manually to avoid race conditions
            const params = new URLSearchParams(window.location.hash.substring(1));
            const accessToken = params.get('access_token');
            const refreshToken = params.get('refresh_token');
            
            if (accessToken && refreshToken) {
              // Manually set the session in Supabase
              await supabase.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken
              });
              
              // Force refresh the auth state
              await checkAuth();
              
              setProcessedAuth(true);
              
              // Navigate after a small delay to ensure state updates
              setTimeout(() => {
                console.log('Redirecting to marketplace after auth');
                navigate('/marketplace');
              }, 500);
              return;
            }
          } catch (hashError) {
            console.error('Error processing auth hash:', hashError);
            setError('Failed to process authentication. Please try again.');
          }
        } 
        // Then check for query params from other auth flows
        else if (window.location.search) {
          console.log('Processing code exchange');
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
              await checkAuth();
              
              setProcessedAuth(true);
              
              // Navigate to marketplace
              navigate('/marketplace');
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
  
  return <LoadingScreen />;
};

export default AuthCallback;