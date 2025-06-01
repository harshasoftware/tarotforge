import { useState, useEffect, useCallback } from 'react';
import { debounce } from 'lodash';

/**
 * @hook useDeviceAndOrientationDetection
 * @description React hook to detect device type (mobile, tablet) and screen orientation (landscape, portrait).
 * This hook listens to window resize and orientation change events to update the device status.
 * It also has a side effect of manipulating `document.body.style` to manage overflow and touch actions on mobile devices.
 * This hook does not take any parameters.
 *
 * @returns {{ isMobile: boolean, isTablet: boolean, isLandscape: boolean }} An object containing device and orientation status.
 * @property {boolean} isMobile - True if the device is detected as a mobile device (width < 768px).
 * @property {boolean} isTablet - True if the device is detected as a tablet device (width >= 768px and width < 1024px).
 * @property {boolean} isLandscape - True if the screen orientation is landscape (width > height).
 */
export const useDeviceAndOrientationDetection = () => {
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const [isLandscape, setIsLandscape] = useState(false);

  const checkDeviceAndOrientation = useCallback(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const width = window.innerWidth;
    const height = window.innerHeight;

    const isMobileDevice = width < 768;
    const isTabletDevice = width >= 768 && width < 1024;
    const landscape = width > height;
    
    setIsMobile(isMobileDevice);
    setIsTablet(isTabletDevice);
    setIsLandscape(landscape); // Generalized landscape detection
    
    // Manage body styles only on client-side for mobile devices
    if (typeof document !== 'undefined' && typeof document.body !== 'undefined') {
      if (isMobileDevice) {
        document.body.style.overflow = 'hidden';
        document.body.style.touchAction = 'none'; // Prevent iOS Safari bounce
      } else {
        document.body.style.overflow = '';
        document.body.style.touchAction = '';
      }
    }
  }, []); // No dependencies needed as it relies on global window/document

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const debouncedCheck = debounce(checkDeviceAndOrientation, 250);
    
    // Initial check
    checkDeviceAndOrientation();
    
    window.addEventListener('resize', debouncedCheck);
    window.addEventListener('orientationchange', debouncedCheck);
    
    return () => {
      window.removeEventListener('resize', debouncedCheck);
      window.removeEventListener('orientationchange', debouncedCheck);
      
      // Cleanup: restore normal scrolling when component unmounts (client-side only)
      if (typeof document !== 'undefined' && typeof document.body !== 'undefined') {
        document.body.style.overflow = '';
        document.body.style.touchAction = '';
      }
    };
  }, [checkDeviceAndOrientation]);

  return { isMobile, isTablet, isLandscape };
}; 