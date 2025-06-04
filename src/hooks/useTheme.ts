import { useState, useCallback, useEffect } from 'react';

export const useTheme = (initialDarkMode = true) => {
  const [darkMode, setDarkMode] = useState(initialDarkMode);

  useEffect(() => {
    // This effect runs whenever darkMode changes, and also on initial mount.
    if (typeof document !== 'undefined') {
      if (darkMode) {
        document.body.classList.remove('light-theme');
      } else {
        document.body.classList.add('light-theme');
      }
    }
    // Optional: Return a cleanup function if you need to reset the class when the component using the hook unmounts,
    // though for a body class that persists, this might not be necessary unless you want to revert to a default.
    // return () => {
    //   if (typeof document !== 'undefined') {
    //     document.body.classList.remove('light-theme'); // Or set to a default state
    //   }
    // };
  }, [darkMode]); // Re-run when darkMode changes

  const toggleTheme = useCallback(() => {
    setDarkMode(prevMode => !prevMode);
  }, []);

  return { darkMode, toggleTheme };
}; 