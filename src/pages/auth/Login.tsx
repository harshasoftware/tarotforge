import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { motion } from 'framer-motion';
import { Mail, AlertCircle, ArrowRight, Check, Lock } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface LoginFormData {
  email: string;
  password: string;
}

const Login = () => {
  const { signIn, magicLinkSent, setMagicLinkSent, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
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
            
            <div className="relative flex items-center justify-center">
              <div className="border-t border-border w-full"></div>
              <span className="bg-background px-2 text-xs text-muted-foreground absolute">or</span>
            </div>
            
            <button
              type="button"
              onClick={() => navigate('/signup')}
              className="w-full btn btn-outline border-primary text-primary hover:bg-primary/10 py-2 flex items-center justify-center"
            >
              Create New Account
            </button>
          </form>
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