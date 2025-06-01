import { useEffect } from 'react';
import { useVideoCall } from '../../../hooks/useVideoCall'; // Adjusted path

/**
 * @hook useBeforeUnloadVideoCleanup
 * @description React hook to ensure video call cleanup before the page unloads.
 * This hook listens for the 'beforeunload' event and, if the user is in a video call,
 * ends the call to prevent orphaned connections or states.
 * It does not take any parameters and does not return any value.
 * Its primary side effect is the management of a 'beforeunload' event listener on the window.
 */
export function useBeforeUnloadVideoCleanup() {
  const { isInCall, endCall } = useVideoCall();

  useEffect(() => {
    const handleBeforeUnload = () => {
      if (isInCall) {
        console.log('[BeforeUnloadCleanup] Ending video call before page unload...');
        endCall();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    console.log('[BeforeUnloadCleanup] Added beforeunload event listener.');

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      console.log('[BeforeUnloadCleanup] Removed beforeunload event listener.');
      // No need to call endCall() here as the main ReadingRoom cleanup will handle it
      // if the component unmounts normally.
    };
  }, [isInCall, endCall]);
} 