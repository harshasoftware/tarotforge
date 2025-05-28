import { useVideoCallStore } from '../stores/videoCallStore';

/**
 * Hook that provides video call functionality using Zustand store
 * This replaces the React Context approach for better performance and consistency
 */
export const useVideoCall = () => {
  return useVideoCallStore();
}; 