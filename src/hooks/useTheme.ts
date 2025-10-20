import { useState, useCallback, useEffect } from 'react';

// Helper function to detect system theme preference
const getSystemThemePreference = (): boolean => {
  if (typeof window === 'undefined') return true; // Default to dark if no window

  // Check if user has a saved preference in localStorage
  const savedTheme = localStorage.getItem('theme-preference');
  if (savedTheme !== null) {
    return savedTheme === 'dark';
  }

  // Otherwise, check system preference
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return true; // System prefers dark mode
  }

  return false; // System prefers light mode
};

export const useTheme = (initialDarkMode?: boolean) => {
  // Use system preference if no initial value provided
  const [darkMode, setDarkMode] = useState(() => {
    return initialDarkMode !== undefined ? initialDarkMode : getSystemThemePreference();
  });

  // Listen for system theme changes
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    // Only update if user hasn't manually set a preference
    const handleChange = (e: MediaQueryListEvent) => {
      const savedTheme = localStorage.getItem('theme-preference');
      if (savedTheme === null) {
        // User hasn't set a preference, follow system
        setDarkMode(e.matches);
      }
    };

    // Add listener for system theme changes
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
    } else {
      // Fallback for older browsers
      mediaQuery.addListener(handleChange);
    }

    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleChange);
      } else {
        // Fallback for older browsers
        mediaQuery.removeListener(handleChange);
      }
    };
  }, []);

  useEffect(() => {
    // Apply theme class to body
    if (typeof document !== 'undefined') {
      if (darkMode) {
        document.body.classList.remove('light-theme');
      } else {
        document.body.classList.add('light-theme');
      }
    }
  }, [darkMode]);

  const toggleTheme = useCallback(() => {
    setDarkMode(prevMode => {
      const newMode = !prevMode;
      // Save user preference when manually toggled
      localStorage.setItem('theme-preference', newMode ? 'dark' : 'light');
      return newMode;
    });
  }, []);

  // Function to reset to system preference
  const resetToSystemTheme = useCallback(() => {
    localStorage.removeItem('theme-preference');
    const systemPreference = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    setDarkMode(systemPreference);
  }, []);

  return { darkMode, toggleTheme, resetToSystemTheme };
}; 