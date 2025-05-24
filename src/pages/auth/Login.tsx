import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { motion } from 'framer-motion';
import { Mail, AlertCircle, ArrowRight, Check, Eye, EyeOff } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';

interface LoginFormData {
  email: string;
}

const Login = () => {
  const { signIn, signInWithGoogle, magicLinkSent, setMagicLinkSent, user } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  
  const { 
    register, 
    handleSubmit, 
    formState: { errors } 
  } = useForm<LoginFormData>();
  
  // Check for error in URL
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const errorParam = params.get('error');
    
    if (errorParam === 'auth') {
      setError('Authentication failed. Please try again.');
    }
  }, [location]);
  
  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      navigate('/marketplace');
    }
  }, [user, navigate]);
  
  const onSubmit = async (data: LoginFormData) => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Send magic link to user's email
      const { error } = await signIn(data.email);
      
      if (error) {
        throw new Error(error.message || 'Failed to sign in');
      }
      
      // After sending magic link we don't redirect yet - we show a success message
      setIsLoading(false);
    } catch (err: any) {
      setError(err.message || 'An error occurred during sign in');
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setIsGoogleLoading(true);
      setError(null);
      
      const { error } = await signInWithGoogle();
      
      if (error) {
        throw new Error(error.message || 'Failed to sign in with Google');
      }
      
      // Don't need to do anything else as Google sign-in redirects to Google
    } catch (err: any) {
      setError(err.message || 'An error occurred during Google sign in');
      setIsGoogleLoading(false);
    }
  };
  
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <motion.div 
        className="w-full max-w-md"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="text-center mb-8">
          <h1 className="text-3xl font-serif font-bold mb-2">Welcome Back</h1>
          <p className="text-muted-foreground">Sign in to access your mystical collection</p>
        </div>
        
        {error && (
          <div className="mb-6 p-4 border border-destructive/30 bg-destructive/10 rounded-lg flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}
        
        {magicLinkSent ? (
          <div className="mb-6 p-6 border border-success/30 bg-success/10 rounded-lg text-center">
            <div className="w-16 h-16 rounded-full bg-success/20 flex items-center justify-center mx-auto mb-4">
              <Check className="h-8 w-8 text-success" />
            </div>
            <h2 className="text-xl font-medium mb-2">Magic Link Sent!</h2>
            <p className="mb-4">We've sent a sign-in link to your email address. Please check your inbox (and spam folder) to continue.</p>
            <button 
              onClick={() => setMagicLinkSent(false)}
              className="btn btn-primary w-full py-2"
            >
              Back to Sign In
            </button>
          </div>
        ) : (
          <>
            {/* Traditional Google Sign In */}
            <button
              onClick={handleGoogleSignIn}
              disabled={isGoogleLoading}
              className="w-full btn btn-outline border-input hover:bg-secondary/50 py-2 mb-6 flex items-center justify-center relative"
            >
              {isGoogleLoading ? (
                <span className="flex items-center justify-center">
                  <span className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin mr-2"></span>
                  Connecting to Google...
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
              <span className="bg-background px-2 text-xs text-muted-foreground absolute">or</span>
            </div>
            
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="space-y-2">
                <label htmlFor="email" className="block text-sm font-medium">
                  Email
                </label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">
                    <Mail className="h-5 w-5" />
                  </div>
                  <input
                    id="email"
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
              
              <button
                type="submit"
                disabled={isLoading}
                className="w-full btn btn-primary py-2 disabled:opacity-70"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center">
                    <span className="w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin mr-2"></span>
                    Authenticating...
                  </span>
                ) : (
                  <span className="flex items-center justify-center">
                    Sign In with Magic Link
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </span>
                )}
              </button>
              
              <div className="flex justify-between items-center">
                <button
                  type="button"
                  onClick={() => navigate('/signup')}
                  className="text-primary hover:underline text-sm"
                >
                  Create New Account
                </button>
              </div>
            </form>
          </>
        )}
        
        <div className="mt-6 text-center">
          <p className="text-xs text-muted-foreground">
            By signing in, you agree to our 
            <Link to="#" className="text-primary hover:underline ml-1">
              Terms of Service
            </Link> and 
            <Link to="#" className="text-primary hover:underline ml-1">
              Privacy Policy
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;