import { useState, useCallback } from 'react';

export const useGuestUpgrade = () => {
  const [showGuestUpgrade, setShowGuestUpgrade] = useState(false);

  // No longer need triggerGuestUpgradeOnInvite or hasShownInviteUpgrade state
  // The modal is now only shown when explicitly triggered by other actions.

  return {
    showGuestUpgrade,
    setShowGuestUpgrade,
  };
}; 