import { useState, useCallback } from 'react';

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