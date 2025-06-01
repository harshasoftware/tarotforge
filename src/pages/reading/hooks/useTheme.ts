import { useState, useCallback, useEffect } from 'react';

/**
 * @hook useTheme
 * @description React hook to manage the application's theme (dark/light mode).
 * It initializes the theme based on an optional initial value and provides a function to toggle the theme.
 * A key side effect is the manipulation of `document.body.classList` to apply or remove
 * the 'light-theme' class, allowing CSS to style the application accordingly.
 *
 * @param {boolean} [initialDarkMode=true] - The initial state for dark mode. Defaults to true (dark mode).
 * @returns {{ darkMode: boolean, toggleTheme: function(): void }} An object containing the current theme state and a function to toggle it.
 * @property {boolean} darkMode - True if dark mode is currently active, false for light mode.
 * @property {function(): void} toggleTheme - Function to toggle between dark and light mode.
 */
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