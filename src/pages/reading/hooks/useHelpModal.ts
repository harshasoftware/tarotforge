import { useState, useCallback } from 'react';

/**
 * @hook useHelpModal
 * @description React hook to manage the visibility of a help modal.
 * This hook provides state and functions to control whether a help modal should be displayed.
 *
 * @param {boolean} [initialState=false] - The initial visibility state of the help modal. Defaults to false.
 *
 * @returns {{ showHelpModal: boolean, setShowHelpModal: function(show: boolean): void, toggleHelpModal: function(): void }} An object containing the visibility state and functions to control the help modal.
 * @property {boolean} showHelpModal - Flag indicating whether the help modal should be shown.
 * @property {function(show: boolean): void} setShowHelpModal - Function to directly set the visibility of the help modal.
 * @property {function(): void} toggleHelpModal - Function to toggle the visibility of the help modal.
 */
export const useHelpModal = (initialState = false) => {
  const [showHelpModal, setShowHelpModal] = useState(initialState);

  const toggleHelpModal = useCallback(() => {
    setShowHelpModal(prev => !prev);
  }, []);

  // setShowHelpModal is still exposed for direct control, e.g., closing with Escape key
  return {
    showHelpModal,
    setShowHelpModal,
    toggleHelpModal,
  };
}; 