import { supabase } from '../lib/supabase';

export class SessionCleanupService {
  private static instance: SessionCleanupService;
  private cleanupInterval: NodeJS.Timeout | null = null;
  private isRunning = false;

  private constructor() {}

  static getInstance(): SessionCleanupService {
    if (!SessionCleanupService.instance) {
      SessionCleanupService.instance = new SessionCleanupService();
    }
    return SessionCleanupService.instance;
  }

  /**
   * Start the background cleanup service
   * @param intervalMinutes How often to run cleanup (default: 15 minutes)
   */
  start(intervalMinutes: number = 15): void {
    if (this.isRunning) {
      console.log('Session cleanup service is already running');
      return;
    }

    console.log(`Starting session cleanup service (every ${intervalMinutes} minutes)`);
    
    // Run cleanup immediately
    this.runCleanup();
    
    // Set up periodic cleanup
    this.cleanupInterval = setInterval(() => {
      this.runCleanup();
    }, intervalMinutes * 60 * 1000);
    
    this.isRunning = true;
  }

  /**
   * Stop the background cleanup service
   */
  stop(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.isRunning = false;
    console.log('Session cleanup service stopped');
  }

  /**
   * Run cleanup manually
   */
  async runCleanup(): Promise<void> {
    try {
      console.log('Running session cleanup...');
      
      const { error } = await supabase.rpc('cleanup_inactive_sessions');
      
      if (error) {
        console.error('Error during session cleanup:', error);
      } else {
        console.log('Session cleanup completed successfully');
      }
    } catch (err) {
      console.error('Unexpected error during session cleanup:', err);
    }
  }

  /**
   * Check if a specific session should be expired
   */
  async checkSessionExpiry(sessionId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase.rpc('check_session_expiry', {
        session_id_param: sessionId
      });

      if (error) {
        console.error('Error checking session expiry:', error);
        return false;
      }

      return data === true;
    } catch (err) {
      console.error('Unexpected error checking session expiry:', err);
      return false;
    }
  }

  /**
   * Get cleanup statistics
   */
  async getCleanupStats(): Promise<{
    totalSessions: number;
    activeSessions: number;
    inactiveSessions: number;
    sessionsWithRecentActivity: number;
  }> {
    try {
      const { data: totalSessionsData } = await supabase
        .from('reading_sessions')
        .select('id', { count: 'exact', head: true });

      const { data: activeSessionsData } = await supabase
        .from('reading_sessions')
        .select('id', { count: 'exact', head: true })
        .eq('is_active', true);

      const { data: recentActivityData } = await supabase
        .from('session_participants')
        .select('session_id', { count: 'exact', head: true })
        .eq('is_active', true)
        .gte('last_seen_at', new Date(Date.now() - 60 * 60 * 1000).toISOString());

      return {
        totalSessions: totalSessionsData?.length || 0,
        activeSessions: activeSessionsData?.length || 0,
        inactiveSessions: (totalSessionsData?.length || 0) - (activeSessionsData?.length || 0),
        sessionsWithRecentActivity: recentActivityData?.length || 0
      };
    } catch (err) {
      console.error('Error getting cleanup stats:', err);
      return {
        totalSessions: 0,
        activeSessions: 0,
        inactiveSessions: 0,
        sessionsWithRecentActivity: 0
      };
    }
  }

  get isServiceRunning(): boolean {
    return this.isRunning;
  }
}

// Export singleton instance
export const sessionCleanupService = SessionCleanupService.getInstance(); 