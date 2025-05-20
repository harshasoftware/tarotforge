/**
 * GoogleSignInLock: A singleton to manage Google Sign-In API access
 * Prevents multiple components from initializing the API simultaneously,
 * which causes the "Only one navigator.credentials.get request may be outstanding at one time" error
 * 
 * Features:
 * - Queuing system for pending requests
 * - Automatic lock timeout
 * - Priority-based queue (FIFO by default)
 * - Deadlock prevention
 */

type QueueItem = {
  componentId: string;
  resolve: (value: boolean) => void;
  timeout: NodeJS.Timeout;
  priority: number;
  timestamp: number;
};

class GoogleSignInLock {
  private static instance: GoogleSignInLock;
  private isLocked: boolean = false;
  private lockTimestamp: number = 0;
  private readonly LOCK_TIMEOUT_MS = 30000; // 30 seconds for sign-in operations
  private activeComponentId: string | null = null;
  private waitQueue: QueueItem[] = [];
  private readonly DEFAULT_PRIORITY = 0;
  
  private constructor() {}
  
  /**
   * Get the singleton instance
   */
  public static getInstance(): GoogleSignInLock {
    if (!GoogleSignInLock.instance) {
      GoogleSignInLock.instance = new GoogleSignInLock();
    }
    return GoogleSignInLock.instance;
  }

  /**
   * Check if a component currently holds the lock
   * @param componentId Component ID to check
   * @returns Boolean indicating if component holds the lock
   */
  public hasLock(componentId: string): boolean {
    return this.isLocked && this.activeComponentId === componentId;
  }

  /**
   * Release the lock if held by the specified component
   * @param componentId Component ID that holds the lock
   */
  public releaseLock(componentId: string): void {
    if (this.isLocked && this.activeComponentId === componentId) {
      this.isLocked = false;
      this.activeComponentId = null;
      this.lockTimestamp = 0;
      console.log(`[GoogleSignInLock] ${componentId} released lock`);
      this.processQueue();
    }
  }

  /**
   * Try to acquire the lock immediately
   * @param componentId Unique identifier for the component requesting the lock
   * @returns Boolean indicating if lock was acquired
   */
  public acquireLock(componentId: string): boolean {
    this.cleanupExpiredLocks();
    
    // If lock is available, acquire it
    if (!this.isLocked) {
      this.isLocked = true;
      this.activeComponentId = componentId;
      this.lockTimestamp = Date.now();
      console.log(`[GoogleSignInLock] ${componentId} acquired lock`);
      return true;
    }
    
    // Already held by this component
    if (this.activeComponentId === componentId) {
      console.log(`[GoogleSignInLock] ${componentId} already holds the lock`);
      return true;
    }
    
    console.log(`[GoogleSignInLock] ${componentId} denied lock (held by ${this.activeComponentId})`);
    return false;
  }

  /**
   * Try to acquire the lock with queuing support
   * @param componentId Unique identifier for the component requesting the lock
   * @param options Configuration options
   * @returns Promise that resolves when lock is acquired or timeout occurs
   */
  public acquireLockWithQueue(
    componentId: string, 
    options: {
      timeoutMs?: number;
      priority?: number;
      signal?: AbortSignal;
    } = {}
  ): Promise<boolean> {
    const {
      timeoutMs = 10000, // 10 seconds default wait time
      priority = this.DEFAULT_PRIORITY,
      signal
    } = options;

    // If already locked by this component, resolve immediately
    if (this.isLocked && this.activeComponentId === componentId) {
      return Promise.resolve(true);
    }

    // Try to acquire lock immediately
    if (this.acquireLock(componentId)) {
      return Promise.resolve(true);
    }

    console.log(`[GoogleSignInLock] ${componentId} queued for lock (priority: ${priority})`);
    
    return new Promise<boolean>((resolve, reject) => {
      // Handle abort signal if provided
      const onAbort = () => {
        cleanup();
        resolve(false);
      };
      signal?.addEventListener('abort', onAbort);

      // Set up timeout
      const timeoutId = setTimeout(() => {
        cleanup();
        console.log(`[GoogleSignInLock] ${componentId} lock request timed out`);
        resolve(false);
      }, timeoutMs);

      // Cleanup function
      const cleanup = () => {
        clearTimeout(timeoutId);
        signal?.removeEventListener('abort', onAbort);
        this.waitQueue = this.waitQueue.filter(item => item.timeout !== timeoutId);
      };

      // Add to queue
      const queueItem: QueueItem = {
        componentId,
        resolve: (value) => {
          cleanup();
          resolve(value);
        },
        timeout: timeoutId,
        priority,
        timestamp: Date.now()
      };
      
      this.waitQueue.push(queueItem);
      this.sortQueue();
    });
  }

  /**
   * Clean up expired locks and queue items
   */
  private cleanupExpiredLocks(): void {
    const now = Date.now();
    
    // Release expired locks
    if (this.isLocked && now - this.lockTimestamp > this.LOCK_TIMEOUT_MS) {
      console.log(`[GoogleSignInLock] Lock expired for ${this.activeComponentId}`);
      this.isLocked = false;
      this.activeComponentId = null;
      this.lockTimestamp = 0;
    }
    
    // Clean up expired queue items
    this.waitQueue = this.waitQueue.filter(item => {
      const isExpired = now - item.timestamp > this.LOCK_TIMEOUT_MS;
      if (isExpired) {
        clearTimeout(item.timeout);
        item.resolve(false);
      }
      return !isExpired;
    });
  }

  /**
   * Sort the queue by priority and timestamp
   */
  private sortQueue(): void {
    this.waitQueue.sort((a, b) => {
      if (a.priority !== b.priority) {
        return b.priority - a.priority; // Higher priority first
      }
      return a.timestamp - b.timestamp; // Earlier timestamp first
    });
  }

  /**
   * Process the next item in the queue
   */
  private processQueue(): void {
    if (this.isLocked || this.waitQueue.length === 0) return;
    
    const nextItem = this.waitQueue.shift();
    if (nextItem) {
      if (this.acquireLock(nextItem.componentId)) {
        nextItem.resolve(true);
      } else {
        // If we couldn't acquire the lock, put it back in the queue
        this.waitQueue.unshift(nextItem);
      }
    }
  }
}

export default GoogleSignInLock.getInstance();
