import { useEffect, useState } from 'react';
import { useHybridAuth } from './useHybridAuth';

/**
 * Hook to manage wallet enhancement modal display logic.
 * Shows the modal after successful Web2 authentication if wallet is not connected.
 */
export const useWalletEnhancement = () => {
  const {
    isSupabaseAuthenticated,
    isWalletConnected,
    supabaseUser
  } = useHybridAuth();

  const [showEnhancementModal, setShowEnhancementModal] = useState(false);

  useEffect(() => {
    // Check if we should show the wallet enhancement modal
    // Only show if:
    // 1. User is authenticated with Supabase (not anonymous)
    // 2. User doesn't have a wallet connected
    // 3. User hasn't dismissed this modal before (check localStorage)
    // 4. User just logged in (check session storage flag)

    const hasSeenModal = localStorage.getItem('wallet_enhancement_seen');
    const justLoggedIn = sessionStorage.getItem('just_logged_in');

    if (
      isSupabaseAuthenticated &&
      !isWalletConnected &&
      !hasSeenModal &&
      justLoggedIn === 'true'
    ) {
      // Small delay to let the user see they're logged in first
      const timer = setTimeout(() => {
        setShowEnhancementModal(true);
        // Clear the just_logged_in flag
        sessionStorage.removeItem('just_logged_in');
      }, 1500);

      return () => clearTimeout(timer);
    }
  }, [isSupabaseAuthenticated, isWalletConnected, supabaseUser]);

  const handleCloseModal = () => {
    setShowEnhancementModal(false);
    // Mark that user has seen the modal
    localStorage.setItem('wallet_enhancement_seen', 'true');
  };

  const handleConnectWallet = () => {
    // The WalletEnhancementModal will handle the actual connection
    // We just need to close the modal after
    setShowEnhancementModal(false);
  };

  return {
    showEnhancementModal,
    setShowEnhancementModal,
    handleCloseModal,
    handleConnectWallet
  };
};

/**
 * Helper function to set the "just logged in" flag in session storage.
 * Call this after successful login to trigger the wallet enhancement modal.
 */
export const markJustLoggedIn = () => {
  sessionStorage.setItem('just_logged_in', 'true');
};
