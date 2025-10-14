import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Mail, ArrowRight, AlertCircle, Check, User, Wallet } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { useAuthStore } from '../../stores/authStore';
import { useHybridAuth } from '../../hooks/useHybridAuth';

interface SignInModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

interface SignInFormData {
  email: string;
  fullName?: string;
}

const SignInModal = ({ isOpen, onClose, onSuccess }: SignInModalProps) => {
  const {
    signIn,
    signUp,
    signInWithGoogle,
    linkWithEmail,
    linkWithGoogle,
    linkToExistingAccount,
    isAnonymous,
    magicLinkSent,
    setMagicLinkSent
  } = useAuthStore();
  const { connectWallet } = useHybridAuth();
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isWalletLoading, setIsWalletLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showExistingAccountPrompt, setShowExistingAccountPrompt] = useState<{email: string, anonymousUserId: string} | null>(null);

  // Check if current user is anonymous
  const isCurrentlyAnonymous = isAnonymous();
  
  const { 
    register, 
    handleSubmit, 
    formState: { errors } 
  } = useForm<SignInFormData>();
  
  const onSubmit = async (data: SignInFormData) => {
    try {
      setLoading(true);
      setError(null);
      
      let result;
      
      // Handle linking to existing account flow
      if (showExistingAccountPrompt) {
        // User confirmed they want to link to existing account via magic link
        result = await linkToExistingAccount(showExistingAccountPrompt.email, showExistingAccountPrompt.anonymousUserId);
        
        if (!result.error) {
          console.log('✅ Magic link sent to existing account');
          setShowExistingAccountPrompt(null);
          setMagicLinkSent(true); // Show magic link sent message
          setLoading(false);
          return;
        }
      } else if (isCurrentlyAnonymous) {
        // User is anonymous - handle differently based on sign up vs sign in
        if (isSignUp) {
          // Anonymous user creating new account - use linking
          console.log('🔗 Using account linking flow for new account');
          result = await linkWithEmail(data.email, 'temp-password-123');
        } else {
          // Anonymous user trying to sign in to existing account
          // Try regular sign in - if account exists we'll get EXISTING_ACCOUNT error and handle it
          console.log('🔗 Anonymous user attempting sign in - will handle existing account if needed');
          result = await signIn(data.email);
        }
      } else {
        // Regular authentication flow
        if (isSignUp) {
          // Sign up with auto-generated username
          result = await signUp(data.email, undefined, data.fullName);
        } else {
          // Sign in
          result = await signIn(data.email);
        }
      }
      
      if (result.error) {
        // Handle special case where email belongs to existing account
        if (result.error.message?.startsWith('EXISTING_ACCOUNT:')) {
          const [, email, anonymousUserId] = result.error.message.split(':');
          setShowExistingAccountPrompt({ email, anonymousUserId });
          setError(null); // Clear the error since we'll show the password prompt
          setLoading(false);
          return;
        }
        
        // Handle specific linking errors
        if (result.error.message?.includes('Identity is already linked to another user')) {
          setError('This email is already associated with another account. Please sign in to that account instead.');
          return;
        }
        throw new Error(result.error.message || 'Authentication failed');
      }
      
      // Don't close yet - show the magic link sent message
      setLoading(false);
      
      if (onSuccess) {
        onSuccess();
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setIsGoogleLoading(true);
      setError(null);

      // Add a small delay to ensure no concurrent credential requests
      await new Promise(resolve => setTimeout(resolve, 100));

      let result;

      // Get the LATEST anonymous status AT THE MOMENT OF CLICK
      const stillAnonymousOnClick = useAuthStore.getState().isAnonymous();

      if (stillAnonymousOnClick) { // Use the fresh value for the condition
        // User is anonymous - use linking
        console.log('🔗 Using Google account linking flow');

        // Log current reading session state from readingSessionStore
        const readingSessionStore = (await import('../../stores/readingSessionStore')).useReadingSessionStore.getState();
        if (readingSessionStore.sessionState) {
          console.log(
            '🕵️‍♂️ SignInModal: Pre-linkWithGoogle check: shuffledDeck length:',
            readingSessionStore.sessionState.shuffledDeck?.length,
            'selectedCards length:',
            readingSessionStore.sessionState.selectedCards?.length,
            'readingStep:',
            readingSessionStore.sessionState.readingStep
          );
        } else {
          console.log('🕵️‍♂️ SignInModal: Pre-linkWithGoogle check: No active reading session state.');
        }

        result = await linkWithGoogle();
      } else {
        // Regular Google sign in OR anonymous user who is no longer anonymous in the store
        console.log('🔗 NOT using Google linking flow. stillAnonymousOnClick was false. User may have changed or was never anonymous here.');
        result = await signInWithGoogle();
      }

      if (result.error) {
        // Handle specific linking errors
        if (result.error.message?.includes('Identity is already linked to another user')) {
          setError('This Google account is already associated with another user. Please sign in to that account instead.');
          setIsGoogleLoading(false);
          return;
        }
        throw new Error(result.error.message || 'Failed to sign in with Google');
      }

      // The Google flow will redirect to Google's auth page
    } catch (err: any) {
      setError(err.message || 'An error occurred with Google sign-in');
      setIsGoogleLoading(false);
    }
  };

  const handleWalletConnect = async () => {
    try {
      setIsWalletLoading(true);
      setError(null);

      await connectWallet();

      // Close modal after successful wallet connection
      onClose();

      if (onSuccess) {
        onSuccess();
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred connecting wallet');
      setIsWalletLoading(false);
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
          <h3 className="font-serif font-bold">
            {isSignUp ? 'Create Account' : 'Sign In'}
          </h3>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <div className="p-6">
          {showExistingAccountPrompt ? (
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center mx-auto mb-4">
                <Mail className="h-8 w-8 text-blue-600" />
              </div>
              <h2 className="text-xl font-medium mb-2">Account Already Exists</h2>
              <p className="mb-4 text-muted-foreground">
                We found an existing account with <strong>{showExistingAccountPrompt.email}</strong>. 
                We'll send you a magic link to sign in and merge your current session data.
              </p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setShowExistingAccountPrompt(null)}
                  className="btn btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => {
                    const data = { email: showExistingAccountPrompt.email };
                    onSubmit(data as SignInFormData);
                  }}
                  disabled={loading}
                  className="btn btn-primary flex-1"
                >
                  {loading ? (
                    <span className="flex items-center justify-center">
                      <span className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin mr-2"></span>
                      Sending...
                    </span>
                  ) : (
                    'Send Magic Link'
                  )}
                </button>
              </div>
            </div>
          ) : magicLinkSent ? (
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-success/20 flex items-center justify-center mx-auto mb-4">
                <Check className="h-8 w-8 text-success" />
              </div>
              <h2 className="text-xl font-medium mb-2">Magic Link Sent!</h2>
              <p className="mb-4">
                We've sent a sign-in link to your email address. Please check your inbox (and spam folder) to continue.
              </p>
              <button 
                onClick={() => setMagicLinkSent(false)}
                className="btn btn-primary w-full py-2"
              >
                Back to Sign In
              </button>
            </div>
          ) : (
            <>
              {/* Google Sign In Button */}
              <button
                onClick={handleGoogleSignIn}
                disabled={isGoogleLoading}
                className="w-full btn btn-outline border-input hover:bg-secondary/50 py-2 mb-4 flex items-center justify-center relative"
              >
                {isGoogleLoading ? (
                  <span className="flex items-center justify-center">
                    <span className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin mr-2"></span>
                    Connecting...
                  </span>
                ) : (
                  <>
                    <svg viewBox="0 0 24 24" width="24" height="24" className="absolute left-3">
                      <g transform="matrix(1, 0, 0, 1, 27.009001, -39.238998)">
                        <path fill="#4285F4" d="M -3.264 51.509 C -3.264 50.719 -3.334 49.969 -3.454 49.239 L -14.754 49.239 L -14.754 53.749 L -8.284 53.749 C -8.574 55.229 -9.424 56.479 -10.684 57.329 L -10.684 60.329 L -6.824 60.329 C -4.564 58.239 -3.264 55.159 -3.264 51.509 Z" />
                        <path fill="#34A853" d="M -14.754 63.239 C -11.514 63.239 -8.804 62.159 -6.824 60.329 L -10.684 57.329 C -11.764 58.049 -13.134 58.489 -14.754 58.489 C -17.884 58.489 -20.534 56.379 -21.484 53.529 L -25.464 53.529 L -25.464 56.619 C -23.494 60.539 -19.444 63.239 -14.754 63.239 Z" />
                        <path fill="#FBBC05" d="M -21.484 53.529 C -21.734 52.809 -21.864 52.039 -21.864 51.239 C -21.864 50.439 -21.724 49.669 -21.484 48.949 L -21.484 45.859 L -25.464 45.859 C -26.284 47.479 -26.754 49.299 -26.754 51.239 C -26.754 53.179 -26.284 54.999 -25.464 56.619 L -21.484 53.529 Z" />
                        <path fill="#EA4335" d="M -14.754 43.989 C -12.984 43.989 -11.404 44.599 -10.154 45.789 L -6.734 42.369 C -8.804 40.429 -11.514 39.239 -14.754 39.239 C -19.444 39.239 -23.494 41.939 -25.464 45.859 L -21.484 48.949 C -20.534 46.099 -17.884 43.989 -14.754 43.989 Z" />
                      </g>
                    </svg>
                    <span>Continue with Google</span>
                  </>
                )}
              </button>

              {/* NEW: Wallet Connect Button */}
              <button
                onClick={handleWalletConnect}
                disabled={isWalletLoading}
                className="w-full btn btn-outline border-primary/50 hover:bg-primary/10 py-2 mb-6 flex items-center justify-center relative mystical-gradient-border"
                style={{
                  background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(236, 72, 153, 0.1) 100%)'
                }}
              >
                {isWalletLoading ? (
                  <span className="flex items-center justify-center">
                    <span className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin mr-2"></span>
                    Connecting...
                  </span>
                ) : (
                  <>
                    <Wallet className="h-5 w-5 mr-2 text-primary" />
                    <span className="bg-gradient-to-r from-primary to-pink-500 bg-clip-text text-transparent font-semibold">
                      Connect Wallet
                    </span>
                  </>
                )}
              </button>

              <div className="relative flex items-center justify-center mb-6">
                <div className="border-t border-border w-full"></div>
                <span className="bg-card px-2 text-xs text-muted-foreground absolute">or</span>
              </div>
              
              <form onSubmit={handleSubmit(onSubmit)}>
                <div className="space-y-6">
                  {error && (
                    <div className="p-3 border border-destructive/30 bg-destructive/10 rounded-lg flex items-start gap-2">
                      <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                      <p className="text-sm text-destructive">{error}</p>
                    </div>
                  )}
                  
                  <div className="space-y-2">
                    <label htmlFor="modal-email" className="block text-sm font-medium">
                      Email
                    </label>
                    <div className="relative">
                      <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">
                        <Mail className="h-5 w-5" />
                      </div>
                      <input
                        id="modal-email"
                        type="email"
                        {...register('email', { 
                          required: 'Email is required', 
                          pattern: {
                            value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                            message: 'Invalid email address'
                          }
                        })}
                        className={`w-full pl-10 pr-4 py-2 rounded-md bg-card border ${
                          errors.email ? 'border-destructive' : 'border-input'
                        } focus:outline-none focus:ring-2 focus:ring-primary`}
                        placeholder="you@example.com"
                      />
                    </div>
                    {errors.email && (
                      <p className="text-sm text-destructive mt-1">{errors.email.message}</p>
                    )}
                  </div>
                  
                  {/* Only show full name field when creating account */}
                  {isSignUp && (
                    <div className="space-y-2">
                      <label htmlFor="modal-fullName" className="block text-sm font-medium">
                        Full Name <span className="text-xs text-muted-foreground">(optional)</span>
                      </label>
                      <div className="relative">
                        <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">
                          <User className="h-5 w-5" />
                        </div>
                        <input
                          id="modal-fullName"
                          type="text"
                          {...register('fullName')}
                          className="w-full pl-10 pr-4 py-2 rounded-md bg-card border border-input focus:outline-none focus:ring-2 focus:ring-primary"
                          placeholder="Your Name"
                        />
                      </div>
                    </div>
                  )}
                  
                  <p className="text-sm text-muted-foreground">
                    {isCurrentlyAnonymous ? (
                      "Create an account to save your progress and access all features!"
                    ) : (
                      `We'll send you a magic link to ${isSignUp ? 'create your account' : 'sign in'}. 
                      ${isSignUp ? " A mystical username will be automatically generated for you, which you can change later." : ""}`
                    )}
                  </p>
                  
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full btn btn-primary py-2 mt-2 disabled:opacity-70"
                  >
                    {loading ? (
                      <span className="flex items-center justify-center">
                        <span className="w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin mr-2"></span>
                        {isSignUp ? 'Creating Account...' : 'Sending Link...'}
                      </span>
                    ) : (
                      <span className="flex items-center justify-center">
                        {isSignUp ? 'Create Account' : 'Send Magic Link'}
                        <ArrowRight className="ml-2 h-5 w-5" />
                      </span>
                    )}
                  </button>
                  
                  <div className="text-center">
                    <button
                      type="button" 
                      onClick={() => setIsSignUp(!isSignUp)}
                      className="text-primary hover:underline text-sm"
                    >
                      {isSignUp ? 'Already have an account? Sign in' : 'Need an account? Create one'}
                    </button>
                  </div>
                </div>
              </form>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default SignInModal;