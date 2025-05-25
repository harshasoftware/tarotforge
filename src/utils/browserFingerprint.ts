/**
 * Browser Fingerprint Utility
 * 
 * Generates a persistent browser identifier for anonymous users to prevent
 * duplicate participant creation on page refresh. This creates a stable
 * identifier based on browser characteristics and stores it in localStorage.
 */

import { v4 as uuidv4 } from 'uuid';

const BROWSER_ID_KEY = 'tarotforge_browser_id';

/**
 * Generates a simple browser fingerprint based on available characteristics
 */
function generateBrowserFingerprint(): string {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  // Basic browser characteristics
  const characteristics = [
    navigator.userAgent,
    navigator.language,
    screen.width + 'x' + screen.height,
    screen.colorDepth,
    new Date().getTimezoneOffset(),
    navigator.platform,
    navigator.cookieEnabled ? '1' : '0'
  ];
  
  // Add canvas fingerprint if available
  if (ctx) {
    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.fillText('TarotForge Browser ID', 2, 2);
    characteristics.push(canvas.toDataURL());
  }
  
  // Create a simple hash from characteristics
  const combined = characteristics.join('|');
  let hash = 0;
  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  // Convert to positive hex string and pad
  const fingerprint = Math.abs(hash).toString(16).padStart(8, '0');
  return `browser_${fingerprint}`;
}

/**
 * Gets or creates a persistent browser identifier for anonymous users
 * This ensures the same browser always gets the same anonymous ID
 */
export function getPersistentBrowserId(): string {
  try {
    // Try to get existing ID from localStorage
    const existingId = localStorage.getItem(BROWSER_ID_KEY);
    if (existingId) {
      return existingId;
    }
    
    // Generate new browser fingerprint
    const browserId = generateBrowserFingerprint();
    
    // Store it for future use
    localStorage.setItem(BROWSER_ID_KEY, browserId);
    
    return browserId;
  } catch (error) {
    // Fallback if localStorage is not available
    console.warn('localStorage not available, using session-based ID:', error);
    
    // Use sessionStorage as fallback
    try {
      const sessionId = sessionStorage.getItem(BROWSER_ID_KEY);
      if (sessionId) {
        return sessionId;
      }
      
      const newSessionId = `session_${uuidv4().slice(0, 8)}`;
      sessionStorage.setItem(BROWSER_ID_KEY, newSessionId);
      return newSessionId;
    } catch (sessionError) {
      // Ultimate fallback - generate a UUID for this session only
      console.warn('No storage available, using temporary ID:', sessionError);
      return `temp_${uuidv4().slice(0, 8)}`;
    }
  }
}

/**
 * Clears the stored browser ID (useful for testing or privacy)
 */
export function clearBrowserId(): void {
  try {
    localStorage.removeItem(BROWSER_ID_KEY);
    sessionStorage.removeItem(BROWSER_ID_KEY);
  } catch (error) {
    console.warn('Could not clear browser ID:', error);
  }
}

/**
 * Checks if the current browser ID is persistent (stored in localStorage)
 */
export function isBrowserIdPersistent(): boolean {
  try {
    const storedId = localStorage.getItem(BROWSER_ID_KEY);
    return !!storedId;
  } catch (error) {
    return false;
  }
} 