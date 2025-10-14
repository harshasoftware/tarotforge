import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePrivy } from '@privy-io/react-auth';
import { motion } from 'framer-motion';

/**
 * Login Page - Shows Privy authentication modal
 * Opens Privy's modal directly on the /login route
 */
const Login = () => {
  const navigate = useNavigate();
  const { login, authenticated, ready } = usePrivy();

  useEffect(() => {
    // Wait for Privy to be ready
    if (!ready) return;

    // If already authenticated, redirect to marketplace
    if (authenticated) {
      navigate('/marketplace');
      return;
    }

    // Store return path
    const returnPath = localStorage.getItem('authRedirectTo') || '/marketplace';
    localStorage.setItem('auth_return_path', returnPath);

    // Open Privy login modal automatically
    login();
  }, [ready, authenticated, navigate, login]);

  // Show loading state while Privy initializes or modal opens
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <motion.div
        className="w-full max-w-md text-center"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-3xl font-serif font-bold mb-4">Welcome Back</h1>
        <p className="text-muted-foreground mb-8">
          Opening sign-in options...
        </p>
        <div className="flex justify-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;
