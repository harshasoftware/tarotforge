import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UserPlus, Mail, X, Sparkles, AlertCircle, Check, User, ArrowRight, Users, Star } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { useForm } from 'react-hook-form';
import LoadingSpinner from './LoadingSpinner';

interface GuestAccountUpgradeProps {
  onUpgradeSuccess: (userId: string) => void;
  onClose: () => void;
  showAsModal?: boolean;
  participantCount?: number;
  isInviteJoin?: boolean;
  onGuestNameSet?: (name: string) => void;
}

interface SignInFormData {
  email: string;
  fullName?: string;
}

const GuestAccountUpgrade: React.FC<GuestAccountUpgradeProps> = ({ 
  onUpgradeSuccess, 
  onClose, 
  showAsModal = true,
  participantCount = 0,
  isInviteJoin = false,
  onGuestNameSet
}) => {
  console.log('GuestAccountUpgrade rendered with props:', {
    showAsModal,
    participantCount,
    isInviteJoin,
    hasOnGuestNameSet: !!onGuestNameSet
  });

  const { signIn, signUp, signInWithGoogle, magicLinkSent, setMagicLinkSent } = useAuthStore();
  const [isSignUp, setIsSignUp] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { 
    register, 
    handleSubmit, 
    formState: { errors } 
  } = useForm<SignInFormData>();

  const onSubmit = async (data: SignInFormData) => {
    try {
      setIsLoading(true);
      setError(null);
      
      let result;
      if (isSignUp) {
        // Sign up with auto-generated username
        result = await signUp(data.email, undefined, data.fullName);
      } else {
        // Sign in
        result = await signIn(data.email);
      }
      
      if (result.error) {
        throw new Error(result.error.message || 'Authentication failed');
      }
      
      // Don't close yet - show the magic link sent message
      setIsLoading(false);
      
      // On successful authentication, call onUpgradeSuccess
      if (result && 'user' in result && result.user && typeof result.user === 'object' && 'id' in result.user) {
        onUpgradeSuccess(result.user.id as string);
        onClose();
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setIsGoogleLoading(true);
      setError(null);
      
      // Add a small delay to ensure no concurrent credential requests
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const { error } = await signInWithGoogle();
      
      if (error) {
        throw new Error(error.message || 'Failed to sign in with Google');
      }
      
      // The Google flow will redirect to Google's auth page
    } catch (err: any) {
      setError(err.message || 'An error occurred with Google sign-in');
      setIsGoogleLoading(false);
    }
  };

  const benefits = [
    'Save your reading sessions',
    'Host your own rooms',
    'Access reading history',
    'Customize your profile'
  ];

  const content = (
    <div className="bg-card border border-border rounded-xl overflow-hidden shadow-xl w-full">
      <div className="bg-gradient-to-r from-primary/10 to-accent/10 p-3 md:p-4 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 md:h-5 md:w-5 text-primary" />
            <h3 className="font-serif font-bold text-base md:text-lg">Upgrade Your Experience</h3>
          </div>
          <button 
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors p-1 -m-1"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="p-4 md:p-6">
        <div className="mb-4 md:mb-6">
          <p className="text-xs md:text-sm text-muted-foreground mb-3 leading-relaxed">
            {isInviteJoin 
              ? `Welcome! You've been invited to join this reading room${participantCount > 1 ? ` with ${participantCount - 1} other participant${participantCount > 2 ? 's' : ''}` : ''}. Create an account to unlock more features.`
              : `You're currently in the reading room as a guest${participantCount > 1 ? ` with ${participantCount - 1} other participant${participantCount > 2 ? 's' : ''}` : ''}. Create an account to unlock more features!`
            }
          </p>
          
          <div className="grid grid-cols-2 gap-2 mb-4">
            {benefits.map((benefit, index) => (
              <div key={index} className="flex items-center gap-2 text-xs text-muted-foreground">
                <div className="w-1.5 h-1.5 bg-primary rounded-full"></div>
                {benefit}
              </div>
            ))}
          </div>
        </div>

        {magicLinkSent ? (
          <div className="text-center mt-6">
            <div className="w-16 h-16 rounded-full bg-success/20 flex items-center justify-center mx-auto mb-4">
              <Check className="h-8 w-8 text-success" />
            </div>
            <h2 className="text-xl font-medium mb-2">Magic Link Sent!</h2>
            <p className="mb-4 text-sm text-muted-foreground">
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
              className="w-full btn btn-outline border-input hover:bg-secondary/50 py-2 mt-6 mb-6 flex items-center justify-center relative"
            >
              {isGoogleLoading ? (
                <span className="flex items-center justify-center">
                  <LoadingSpinner size="sm" className="mr-2" />
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
            
            <div className="relative flex items-center justify-center mb-6">
              <div className="border-t border-border w-full"></div>
              <span className="bg-card px-2 text-xs text-muted-foreground absolute">or</span>
            </div>

            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setIsSignUp(true)}
                className={`flex-1 py-2 px-3 text-sm rounded-md transition-colors ${
                  isSignUp 
                    ? 'bg-primary text-primary-foreground' 
                    : 'bg-muted text-muted-foreground hover:text-foreground'
                }`}
              >
                Sign Up
              </button>
              <button
                onClick={() => setIsSignUp(false)}
                className={`flex-1 py-2 px-3 text-sm rounded-md transition-colors ${
                  !isSignUp 
                    ? 'bg-primary text-primary-foreground' 
                    : 'bg-muted text-muted-foreground hover:text-foreground'
                }`}
              >
                Sign In
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
                    className={`w-full pl-10 pr-4 py-2 rounded-md bg-background border ${
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
                      className="w-full pl-10 pr-4 py-2 rounded-md bg-background border border-input focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="Your Name"
                    />
                  </div>
                </div>
              )}
              
              <p className="text-sm text-muted-foreground">
                We'll send you a magic link to {isSignUp ? 'create your account' : 'sign in'}. 
                {isSignUp && " A mystical username will be automatically generated for you, which you can change later."}
              </p>
              
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-primary text-primary-foreground py-3 rounded-md font-medium text-sm hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
              >
                {isLoading ? (
                  <div className="flex items-center justify-center gap-2">
                    <LoadingSpinner size="sm" />
                    {isSignUp ? 'Creating Account...' : 'Sending Link...'}
                  </div>
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
            </form>
          </>
        )}

        <p className="text-xs text-muted-foreground text-center mt-4">
          You'll remain in this reading room after {isSignUp ? 'creating your account' : 'signing in'}.
        </p>
      </div>
    </div>
  );

  if (showAsModal) {
    return (
      <div className="fixed inset-0 z-[100] bg-black/70 flex items-center justify-center p-2 md:p-4">
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          transition={{ duration: 0.2 }}
          className="w-full max-w-sm md:max-w-md max-h-[90vh] overflow-y-auto"
        >
          {content}
        </motion.div>
      </div>
    );
  }

  return content;
};

export default GuestAccountUpgrade; 