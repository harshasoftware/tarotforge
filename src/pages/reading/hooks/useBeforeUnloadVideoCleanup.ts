import { useEffect } from 'react';
import { useVideoCall } from '../../../hooks/useVideoCall'; // Adjusted path

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