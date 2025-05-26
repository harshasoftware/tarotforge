import { supabase } from './supabase';
import { useAuthStore } from '../stores/authStore';

// How long to consider a reader "online" (in minutes)
const ONLINE_THRESHOLD_MINUTES = 5;

// How often to update presence (in milliseconds)
const PRESENCE_UPDATE_INTERVAL = 60000; // 1 minute

class ReaderPresenceService {
  private presenceInterval: NodeJS.Timeout | null = null;
  private isTracking = false;

  /**
   * Start tracking presence for the current user if they're a reader
   */
  startTracking() {
    const { user } = useAuthStore.getState();
    
    if (!user?.is_reader || this.isTracking) {
      return;
    }

    this.isTracking = true;
    
    // Update presence immediately
    this.updatePresence();
    
    // Set up interval to update presence regularly
    this.presenceInterval = setInterval(() => {
      this.updatePresence();
    }, PRESENCE_UPDATE_INTERVAL);

    // Update presence when the page becomes visible
    document.addEventListener('visibilitychange', this.handleVisibilityChange);
    
    // Update presence before page unload
    window.addEventListener('beforeunload', this.handleBeforeUnload);
  }

  /**
   * Stop tracking presence
   */
  stopTracking() {
    if (!this.isTracking) {
      return;
    }

    this.isTracking = false;

    if (this.presenceInterval) {
      clearInterval(this.presenceInterval);
      this.presenceInterval = null;
    }

    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    window.removeEventListener('beforeunload', this.handleBeforeUnload);

    // Mark as offline when stopping tracking
    this.setOffline();
  }

  /**
   * Update the current user's presence timestamp
   */
  private async updatePresence() {
    const { user } = useAuthStore.getState();
    
    if (!user?.is_reader) {
      return;
    }

    try {
      await supabase
        .from('users')
        .update({ 
          last_seen_at: new Date().toISOString(),
          is_online: true 
        })
        .eq('id', user.id);
    } catch (error) {
      console.error('Error updating reader presence:', error);
    }
  }

  /**
   * Mark the current user as offline
   */
  private async setOffline() {
    const { user } = useAuthStore.getState();
    
    if (!user?.is_reader) {
      return;
    }

    try {
      await supabase
        .from('users')
        .update({ is_online: false })
        .eq('id', user.id);
    } catch (error) {
      console.error('Error setting reader offline:', error);
    }
  }

  /**
   * Handle page visibility changes
   */
  private handleVisibilityChange = () => {
    if (document.visibilityState === 'visible') {
      this.updatePresence();
    }
  };

  /**
   * Handle before page unload
   */
  private handleBeforeUnload = () => {
    // Use sendBeacon for reliable offline status update
    const { user } = useAuthStore.getState();
    if (user?.is_reader) {
      navigator.sendBeacon(
        `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/users?id=eq.${user.id}`,
        JSON.stringify({ is_online: false })
      );
    }
  };

  /**
   * Get online status for a list of readers
   */
  static async getReadersOnlineStatus(readerIds: string[]): Promise<Record<string, boolean>> {
    if (readerIds.length === 0) {
      return {};
    }

    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, is_online, last_seen_at')
        .in('id', readerIds)
        .eq('is_reader', true);

      if (error) {
        console.error('Error fetching reader online status:', error);
        return {};
      }

      const onlineStatus: Record<string, boolean> = {};
      const now = new Date();

      data?.forEach(reader => {
        // Consider online if explicitly marked online and last seen within threshold
        const lastSeen = reader.last_seen_at ? new Date(reader.last_seen_at) : null;
        const minutesSinceLastSeen = lastSeen 
          ? (now.getTime() - lastSeen.getTime()) / (1000 * 60)
          : Infinity;

        onlineStatus[reader.id] = reader.is_online && minutesSinceLastSeen <= ONLINE_THRESHOLD_MINUTES;
      });

      return onlineStatus;
    } catch (error) {
      console.error('Error in getReadersOnlineStatus:', error);
      return {};
    }
  }

  /**
   * Check if a specific reader is online
   */
  static async isReaderOnline(readerId: string): Promise<boolean> {
    const status = await this.getReadersOnlineStatus([readerId]);
    return status[readerId] || false;
  }
}

// Export singleton instance
export const readerPresenceService = new ReaderPresenceService();

// Export static methods for convenience
export const getReadersOnlineStatus = ReaderPresenceService.getReadersOnlineStatus;
export const isReaderOnline = ReaderPresenceService.isReaderOnline; 