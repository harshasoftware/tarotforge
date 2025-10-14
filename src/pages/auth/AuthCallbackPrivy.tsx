import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePrivy } from '@privy-io/react-auth';
import { useAuthStore } from '../../stores/authStorePrivy';
import MagicWandLoader from '../../components/ui/MagicWandLoader';
import { AlertCircle } from 'lucide-react';

/**
 * AuthCallback - Privy Version
 *
 * Handles post-authentication redirects for Privy.
 * Privy automatically handles OAuth callbacks, but this page provides
 * a loading state and handles return path redirects.
 */
const AuthCallback = () => {
  const navigate = useNavigate();
  const { ready, authenticated, user: privyUser } = usePrivy();
  const { user: tarotUser } = useAuthStore();
  const [error, setError] = useState<string | null>(null);
  const [processingStep, setProcessingStep] = useState<string>('Whispers from the Ether: Awakening Your Connection...');

  useEffect(() => {
    // Wait for Privy to be ready
    if (!ready) {
      return;
    }

    const handleCallback = async () => {
      try {
        setProcessingStep('Celestial Alignment: Confirming Your Star Chart...');

        // Check if user is authenticated
        if (!authenticated || !privyUser) {
          console.warn('⚠️ AuthCallback: User not authenticated after callback');
          setError('Authentication failed. Please try again.');
          return;
        }

        setProcessingStep('The Veil Thins: Your Path is Illuminated!');

        // Small delay for UI
        await new Promise(resolve => setTimeout(resolve, 500));

        // Check for stored return path
        const returnPath = localStorage.getItem('auth_return_path');

        if (returnPath) {
          console.log('✅ AuthCallback: Redirecting to stored path:', returnPath);
          localStorage.removeItem('auth_return_path');
          navigate(returnPath, { replace: true });
        } else {
          // Default redirect based on user type
          console.log('✅ AuthCallback: No return path, redirecting to default');
          const defaultPath = tarotUser?.is_creator ? '/create-deck' : '/marketplace';
          navigate(defaultPath, { replace: true });
        }
      } catch (err) {
        console.error('❌ AuthCallback error:', err);
        setError('An error occurred during authentication. Please try again.');
      }
    };

    handleCallback();
  }, [ready, authenticated, privyUser, tarotUser, navigate]);

  // Error state
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="bg-card border border-border rounded-lg p-6 max-w-md w-full text-center">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h2 className="text-2xl font-serif mb-2">Authentication Error</h2>
          <p className="text-muted-foreground mb-6">{error}</p>
          <button
            onClick={() => navigate('/')}
            className="btn btn-primary w-full"
          >
            Return Home
          </button>
        </div>
      </div>
    );
  }

  // Loading state
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <MagicWandLoader size="md" className="mb-4" />
      <div className="mt-8 max-w-md text-center">
        <h2 className="text-xl font-medium mb-2">Unveiling Your Destiny</h2>
        <p className="text-muted-foreground mb-4">{processingStep}</p>
        <div className="h-2 w-full bg-muted/30 rounded-full overflow-hidden">
          <div
            className="h-2 bg-primary rounded-full transition-all duration-500 ease-in-out animate-pulse"
            style={{ width: '80%' }}
          ></div>
        </div>
      </div>
    </div>
  );
};

export default AuthCallback;
