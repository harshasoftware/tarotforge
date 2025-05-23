import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { UserPlus, Mail, Lock, X, Sparkles } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface GuestAccountUpgradeProps {
  onUpgradeSuccess: (userId: string) => void;
  onClose: () => void;
  showAsModal?: boolean;
  participantCount?: number;
  isInviteJoin?: boolean;
  onGuestNameSet?: (name: string) => void;
}

const GuestAccountUpgrade: React.FC<GuestAccountUpgradeProps> = ({ 
  onUpgradeSuccess, 
  onClose, 
  showAsModal = true,
  participantCount = 0,
  isInviteJoin = false,
  onGuestNameSet
}) => {
  const { signUp, signIn } = useAuth();
  const [isSignUp, setIsSignUp] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [guestName, setGuestName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSetGuestName, setHasSetGuestName] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      let result;
      if (isSignUp) {
        result = await signUp(email, password, username);
      } else {
        result = await signIn(email, password);
      }

      if (result.error) {
        throw new Error(result.error.message);
      }

      if (result.user) {
        onUpgradeSuccess(result.user.id);
        onClose();
      }
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGuestNameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (guestName.trim() && onGuestNameSet) {
      onGuestNameSet(guestName.trim());
      setHasSetGuestName(true);
      onClose();
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
              ? `Welcome! You've been invited to join this reading room${participantCount > 1 ? ` with ${participantCount - 1} other participant${participantCount > 2 ? 's' : ''}` : ''}. Create an account to unlock more features, or continue as a guest.`
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

        {/* Guest Name Section */}
        <div className="mb-6 p-4 bg-muted/30 rounded-lg border border-border">
          <h4 className="font-medium text-sm mb-2">First, let others know who you are:</h4>
          <form onSubmit={handleGuestNameSubmit} className="space-y-3">
            <div>
              <label htmlFor="guestName" className="block text-sm font-medium mb-1">
                Your Name
              </label>
              <input
                id="guestName"
                type="text"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                placeholder="Enter your name"
                className="w-full p-2 text-sm rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                required
              />
            </div>
            <button
              type="submit"
              className="w-full bg-accent text-accent-foreground py-3 rounded-md font-medium text-sm hover:bg-accent/90 transition-colors min-h-[44px]"
            >
              Continue as {guestName.trim() ? guestName.trim().slice(0, 12) + (guestName.trim().length > 12 ? '...' : '') : 'Guest'}
            </button>
          </form>
        </div>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border"></div>
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-2 text-muted-foreground">Or create an account</span>
          </div>
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

        <form onSubmit={handleSubmit} className="space-y-4">
          {isSignUp && (
            <div>
              <label htmlFor="username" className="block text-sm font-medium mb-1">
                Username
              </label>
              <div className="relative">
                <UserPlus className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Choose a username"
                  className="w-full pl-10 pr-4 py-2 text-sm rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                  required={isSignUp}
                />
              </div>
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-medium mb-1">
              Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                className="w-full pl-10 pr-4 py-2 text-sm rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                required
              />
            </div>
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium mb-1">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="w-full pl-10 pr-4 py-2 text-sm rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                required
              />
            </div>
          </div>

          {error && (
            <div className="text-xs text-destructive bg-destructive/10 p-2 rounded-md">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-primary text-primary-foreground py-3 rounded-md font-medium text-sm hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
          >
            {isLoading ? (
              <div className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin"></div>
                {isSignUp ? 'Creating Account...' : 'Signing In...'}
              </div>
            ) : (
              isSignUp ? 'Create Account & Continue' : 'Sign In & Continue'
            )}
          </button>
        </form>

        <p className="text-xs text-muted-foreground text-center mt-4">
          You'll remain in this reading room after {isSignUp ? 'creating your account' : 'signing in'}.
        </p>
      </div>
    </div>
  );

  if (showAsModal) {
    return (
      <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-2 md:p-4">
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