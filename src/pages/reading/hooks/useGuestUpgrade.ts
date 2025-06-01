import { useState, useCallback } from 'react';

/**
 * @hook useGuestUpgrade
 * @description React hook to manage the visibility of a guest upgrade modal.
 * This hook provides state and a setter to control whether a modal prompting a guest user to upgrade their account should be displayed.
 * This hook does not take any parameters.
 *
 * @returns {{ showGuestUpgrade: boolean, setShowGuestUpgrade: function(show: boolean): void }} An object containing the visibility state and a setter for the guest upgrade modal.
 * @property {boolean} showGuestUpgrade - Flag indicating whether the guest upgrade modal should be shown.
 * @property {function(show: boolean): void} setShowGuestUpgrade - Function to set the visibility of the guest upgrade modal.
 */
export const useGuestUpgrade = () => {
  const [showGuestUpgrade, setShowGuestUpgrade] = useState(false);

  // No longer need triggerGuestUpgradeOnInvite or hasShownInviteUpgrade state
  // The modal is now only shown when explicitly triggered by other actions.

  return {
    showGuestUpgrade,
    setShowGuestUpgrade,
  };
}; 