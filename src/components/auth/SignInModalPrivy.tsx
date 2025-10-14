import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Mail, ArrowRight, AlertCircle } from 'lucide-react';
import { usePrivy } from '@privy-io/react-auth';
import { useAuthStore } from '../../stores/authStorePrivy';

interface SignInModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const SignInModal = ({ isOpen, onClose, onSuccess }: SignInModalProps) => {
  const { login, authenticated } = usePrivy();
  const { setShowSignInModal } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      setError(null);

      // Log current reading session state from readingSessionStore
      const readingSessionStore = (await import('../../stores/readingSessionStore')).useReadingSessionStore.getState();
      if (readingSessionStore.sessionState) {
        console.log(
          '🕵️‍♂️ SignInModal: Pre-login check: shuffledDeck length:',
          readingSessionStore.sessionState.shuffledDeck?.length,
          'selectedCards length:',
          readingSessionStore.sessionState.selectedCards?.length,
          'readingStep:',
          readingSessionStore.sessionState.readingStep
        );
      }

      // Store current path for post-auth redirect
      localStorage.setItem('auth_return_path', window.location.pathname + window.location.search);

      // Use Privy's login with Google
      await login();

      if (onSuccess) {
        onSuccess();
      }

      // Close modal on success
      setShowSignInModal(false);
    } catch (err: any) {
      console.error('Google sign-in error:', err);
      setError(err.message || 'An error occurred with Google sign-in');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailSignIn = async () => {
    try {
      setLoading(true);
      setError(null);

      // Store current path for post-auth redirect
      localStorage.setItem('auth_return_path', window.location.pathname + window.location.search);

      // Use Privy's login (email modal)
      await login();

      if (onSuccess) {
        onSuccess();
      }

      // Close modal on success
      setShowSignInModal(false);
    } catch (err: any) {
      console.error('Email sign-in error:', err);
      setError(err.message || 'An error occurred with email sign-in');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        className="bg-card rounded-xl overflow-hidden max-w-md w-full"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        transition={{ duration: 0.3 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between bg-primary/10 p-4 border-b border-border">
          <h3 className="font-serif font-bold">Sign In</h3>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6">
          {error && (
            <div className="p-3 border border-destructive/30 bg-destructive/10 rounded-lg flex items-start gap-2 mb-6">
              <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {/* Google Sign In Button */}
          <button
            onClick={handleGoogleSignIn}
            disabled={loading || authenticated}
            className="w-full btn btn-outline border-input hover:bg-secondary/50 py-2 mb-6 flex items-center justify-center relative"
          >
            {loading ? (
              <span className="flex items-center justify-center">
                <span className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin mr-2"></span>
                Connecting...
              </span>
            ) : (
              <>
                <svg viewBox="0 0 24 24" width="24" height="24" className="absolute left-3">
                  <g transform="matrix(1, 0, 0, 1, 27.009001, -39.238998)">
                    <path
                      fill="#4285F4"
                      d="M -3.264 51.509 C -3.264 50.719 -3.334 49.969 -3.454 49.239 L -14.754 49.239 L -14.754 53.749 L -8.284 53.749 C -8.574 55.229 -9.424 56.479 -10.684 57.329 L -10.684 60.329 L -6.824 60.329 C -4.564 58.239 -3.264 55.159 -3.264 51.509 Z"
                    />
                    <path
                      fill="#34A853"
                      d="M -14.754 63.239 C -11.514 63.239 -8.804 62.159 -6.824 60.329 L -10.684 57.329 C -11.764 58.049 -13.134 58.489 -14.754 58.489 C -17.884 58.489 -20.534 56.379 -21.484 53.529 L -25.464 53.529 L -25.464 56.619 C -23.494 60.539 -19.444 63.239 -14.754 63.239 Z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M -21.484 53.529 C -21.734 52.809 -21.864 52.039 -21.864 51.239 C -21.864 50.439 -21.724 49.669 -21.484 48.949 L -21.484 45.859 L -25.464 45.859 C -26.284 47.479 -26.754 49.299 -26.754 51.239 C -26.754 53.179 -26.284 54.999 -25.464 56.619 L -21.484 53.529 Z"
                    />
                    <path
                      fill="#EA4335"
                      d="M -14.754 43.989 C -12.984 43.989 -11.404 44.599 -10.154 45.789 L -6.734 42.369 C -8.804 40.429 -11.514 39.239 -14.754 39.239 C -19.444 39.239 -23.494 41.939 -25.464 45.859 L -21.484 48.949 C -20.534 46.099 -17.884 43.989 -14.754 43.989 Z"
                    />
                  </g>
                </svg>
                <span>Continue with Google</span>
              </>
            )}
          </button>

          <div className="relative flex items-center justify-center mb-6">
            <div className="border-t border-border w-full"></div>
            <span className="bg-card px-2 text-xs text-muted-foreground absolute">or</span>
          </div>

          {/* Email Sign In Button */}
          <button
            onClick={handleEmailSignIn}
            disabled={loading || authenticated}
            className="w-full btn btn-primary py-2 flex items-center justify-center"
          >
            <Mail className="h-5 w-5 mr-2" />
            <span>Continue with Email</span>
          </button>

          <p className="text-sm text-muted-foreground mt-4 text-center">
            Create an account or sign in to save your progress and access all features!
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default SignInModal;
