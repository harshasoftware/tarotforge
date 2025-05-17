import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Mail, ArrowRight, AlertCircle, Check } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { useAuth } from '../../context/AuthContext';

interface SignInModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

interface SignInFormData {
  email: string;
}

const SignInModal = ({ isOpen, onClose, onSuccess }: SignInModalProps) => {
  const { signIn, signUp, magicLinkSent, setMagicLinkSent } = useAuth();
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
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
      if (isSignUp) {
        // Sign up with auto-generated username
        result = await signUp(data.email);
      } else {
        // Sign in
        result = await signIn(data.email);
      }
      
      if (result.error) {
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
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
      <motion.div 
        className="bg-card rounded-xl overflow-hidden max-w-md w-full"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        transition={{ duration: 0.3 }}
      >
        <div className="flex items-center justify-between bg-primary/10 p-4 border-b border-border">
          <h3 className="font-serif font-bold">{isSignUp ? 'Create Account' : 'Sign In'}</h3>
          <button 
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <div className="p-6">
          {magicLinkSent ? (
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
                
                <p className="text-sm text-muted-foreground">
                  We'll send you a magic link to {isSignUp ? 'create your account' : 'sign in'}. No password needed!
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
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default SignInModal;