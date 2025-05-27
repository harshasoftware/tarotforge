import { supabase } from '../lib/supabase';

class InviteCleanupService {
  private cleanupInterval: NodeJS.Timeout | null = null;
  private isRunning = false;

  /**
   * Start the cleanup service with periodic cleanup
   * @param intervalMinutes - How often to run cleanup (default: 15 minutes)
   */
  start(intervalMinutes: number = 15) {
    if (this.isRunning) {
      console.log('Invite cleanup service is already running');
      return;
    }

    this.isRunning = true;
    console.log(`Starting invite cleanup service (every ${intervalMinutes} minutes)`);

    // Run initial cleanup
    this.runCleanup();

    // Schedule periodic cleanup
    this.cleanupInterval = setInterval(() => {
      this.runCleanup();
    }, intervalMinutes * 60 * 1000);
  }

  /**
   * Stop the cleanup service
   */
  stop() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.isRunning = false;
    console.log('Invite cleanup service stopped');
  }

  /**
   * Run cleanup manually
   */
  async runCleanup(): Promise<number> {
    try {
      const { data, error } = await supabase.rpc('manual_cleanup_expired_invites');
      
      if (error) {
        console.error('Error running invite cleanup:', error);
        return 0;
      }

      const cleanupCount = data || 0;
      if (cleanupCount > 0) {
        console.log(`Cleaned up ${cleanupCount} expired invites`);
      }

      return cleanupCount;
    } catch (error) {
      console.error('Failed to run invite cleanup:', error);
      return 0;
    }
  }

  /**
   * Check if the service is running
   */
  get isActive(): boolean {
    return this.isRunning;
  }

  /**
   * Clean up expired invites for a specific session
   */
  async cleanupSessionInvites(sessionId: string): Promise<number> {
    try {
      const { data, error } = await supabase
        .from('session_invites')
        .update({ is_active: false })
        .eq('session_id', sessionId)
        .or('expires_at.lt.now(),and(max_clicks.not.is.null,click_count.gte.max_clicks)')
        .eq('is_active', true)
        .select('id');

      if (error) {
        console.error('Error cleaning up session invites:', error);
        return 0;
      }

      const cleanupCount = data?.length || 0;
      if (cleanupCount > 0) {
        console.log(`Cleaned up ${cleanupCount} expired invites for session ${sessionId}`);
      }

      return cleanupCount;
    } catch (error) {
      console.error('Failed to cleanup session invites:', error);
      return 0;
    }
  }

  /**
   * Get statistics about invites
   */
  async getInviteStats(): Promise<{
    total: number;
    active: number;
    expired: number;
    maxedOut: number;
  }> {
    try {
      const { data, error } = await supabase
        .from('session_invites')
        .select('is_active, expires_at, max_clicks, click_count');

      if (error) {
        console.error('Error fetching invite stats:', error);
        return { total: 0, active: 0, expired: 0, maxedOut: 0 };
      }

      const now = new Date();
      const stats = {
        total: data.length,
        active: 0,
        expired: 0,
        maxedOut: 0
      };

      data.forEach(invite => {
        if (invite.is_active) {
          stats.active++;
        } else {
          // Check why it's inactive
          const isExpired = invite.expires_at && new Date(invite.expires_at) < now;
          const isMaxedOut = invite.max_clicks && invite.click_count >= invite.max_clicks;
          
          if (isExpired) stats.expired++;
          if (isMaxedOut) stats.maxedOut++;
        }
      });

      return stats;
    } catch (error) {
      console.error('Failed to get invite stats:', error);
      return { total: 0, active: 0, expired: 0, maxedOut: 0 };
    }
  }
}

// Create singleton instance
export const inviteCleanupService = new InviteCleanupService();

// Auto-start the service when the module is imported
// Only start in browser environment
if (typeof window !== 'undefined') {
  // Start with a delay to avoid interfering with app initialization
  setTimeout(() => {
    inviteCleanupService.start();
  }, 5000); // 5 second delay
}

// Cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    inviteCleanupService.stop();
  });
} 