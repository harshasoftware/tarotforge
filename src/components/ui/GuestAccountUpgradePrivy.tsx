import React from 'react';
import { motion } from 'framer-motion';
import { UserPlus, X, Sparkles, Users } from 'lucide-react';
import { usePrivy } from '@privy-io/react-auth';

interface GuestAccountUpgradeProps {
  onUpgradeSuccess?: (userId: string) => void;
  onClose: () => void;
  showAsModal?: boolean;
  participantCount?: number;
  isInviteJoin?: boolean;
  onGuestNameSet?: (name: string) => void;
}

/**
 * GuestAccountUpgrade - Privy Version
 *
 * Prompts guest/anonymous users to create an account using Privy's modal.
 * Simpler than the old version since Privy handles auth flow automatically.
 */
const GuestAccountUpgrade: React.FC<GuestAccountUpgradeProps> = ({
  onUpgradeSuccess,
  onClose,
  showAsModal = true,
  participantCount = 0,
  isInviteJoin = false,
}) => {
  const { login, authenticated } = usePrivy();

  const handleCreateAccount = async () => {
    try {
      console.log('🔗 GuestAccountUpgrade: Opening Privy login modal');

      // Store current path for post-auth redirect
      const currentPath = window.location.pathname + window.location.search;
      localStorage.setItem('auth_return_path', currentPath);

      // Open Privy's login modal
      await login();

      // If authentication succeeds, Privy will trigger the auth flow
      // The onUpgradeSuccess callback will be handled by the auth state change
      if (authenticated && onUpgradeSuccess) {
        // Note: We don't have the user ID immediately here
        // The parent component should listen to auth state changes
        console.log('✅ GuestAccountUpgrade: Authentication successful');
      }
    } catch (err: any) {
      console.error('❌ GuestAccountUpgrade: Error during authentication:', err);
    }
  };

  const benefits = [
    'Save your reading sessions',
    'Host your own rooms',
    'Access reading history',
    'Customize your profile',
  ];

  const content = (
    <div className="bg-card border border-border rounded-xl overflow-hidden shadow-xl w-full">
      <div className="bg-gradient-to-r from-primary/10 to-accent/10 p-3 md:p-4 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 md:h-5 md:w-5 text-primary" />
            <h3 className="font-serif font-bold text-base md:text-lg">Create Your Account</h3>
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
              ? `Welcome! You've been invited to join this reading room${
                  participantCount > 1 ? ` with ${participantCount - 1} other participant${participantCount > 2 ? 's' : ''}` : ''
                }. Create an account to unlock all features and save your progress.`
              : `Create an account to unlock all features and save your reading sessions${
                  participantCount > 1 ? `. You're currently in this room with ${participantCount - 1} other participant${participantCount > 2 ? 's' : ''}` : ''
                }!`}
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

        <button
          onClick={handleCreateAccount}
          className="w-full bg-primary text-primary-foreground py-3 rounded-md font-medium text-sm hover:bg-primary/90 transition-colors min-h-[44px] flex items-center justify-center gap-2"
        >
          <UserPlus className="h-5 w-5" />
          Create Account
        </button>

        <p className="text-xs text-muted-foreground text-center mt-4">
          You'll remain in this reading room after creating your account.
        </p>

        {participantCount > 1 && (
          <div className="mt-4 p-3 bg-primary/5 rounded-lg flex items-center gap-2 text-xs text-muted-foreground">
            <Users className="h-4 w-4 text-primary" />
            <span>
              {participantCount} participant{participantCount > 1 ? 's' : ''} in this session
            </span>
          </div>
        )}
      </div>
    </div>
  );

  if (showAsModal) {
    return (
      <div
        className="fixed inset-0 z-[100] bg-black/70 flex items-center justify-center p-2 md:p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          transition={{ duration: 0.2 }}
          className="w-full max-w-sm md:max-w-md max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {content}
        </motion.div>
      </div>
    );
  }

  return content;
};

export default GuestAccountUpgrade;
