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
   * Release the lock if held by the specified component
   * @param componentId Unique identifier of the component releasing the lock
   * @returns Boolean indicating if lock was successfully released
   */
  public releaseLock(componentId: string): boolean {
    // Only the component that acquired the lock can release it
    if (!this.isLocked || this.activeComponentId !== componentId) {
      console.log(`[GoogleSignInLock] ${componentId} cannot release lock (not owner)`);
      return false;
    }

    console.log(`[GoogleSignInLock] ${componentId} released lock`);
    this.isLocked = false;
    this.activeComponentId = null;
    this.lockTimestamp = 0;
    
    // Notify next in queue on next tick to ensure clean state
    setTimeout(() => this.processQueue(), 0);
    return true;
  }

  /**
   * Force release the lock (use with caution)
   * @returns Boolean indicating if lock was force released
   */
  public forceReleaseLock(): boolean {
    if (!this.isLocked) return false;
    
    const previousOwner = this.activeComponentId;
    console.warn(`[GoogleSignInLock] Force releasing lock from ${previousOwner}`);
    
    this.isLocked = false;
    this.activeComponentId = null;
    this.lockTimestamp = 0;
    
    // Notify next in queue
    setTimeout(() => this.processQueue(), 0);
    return true;
  }

  /**
   * Check if a specific component holds the lock
   */
  public hasLock(componentId: string): boolean {
    return this.isLocked && this.activeComponentId === componentId;
  }

  /**
   * Check if the lock is currently held
   */
  public isLockHeld(): boolean {
    return this.isLocked;
  }

  /**
   * Get the ID of the component holding the lock
   */
  public getActiveComponentId(): string | null {
    return this.activeComponentId;
  }

  /**
   * Get the number of pending lock requests
   */
  public getQueueLength(): number {
    return this.waitQueue.length;
  }

  /**
   * Process the queue and grant lock to the next component
   */
  private processQueue(): void {
    this.cleanupExpiredLocks();
    
    // If lock is available and there are queued items
    if (!this.isLocked && this.waitQueue.length > 0) {
      const next = this.waitQueue.shift();
      if (next) {
        if (this.acquireLock(next.componentId)) {
          next.resolve(true);
        } else {
          // If we can't acquire the lock, put it back in the queue and retry
          this.waitQueue.unshift(next);
          setTimeout(() => this.processQueue(), 100);
        }
      }
    }
  }

  /**
   * Sort the queue based on priority and timestamp
   */
  private sortQueue(): void {
    this.waitQueue.sort((a, b) => {
      // First sort by priority (descending)
      if (a.priority !== b.priority) {
        return b.priority - a.priority;
      }
      // Then by timestamp (FIFO for same priority)
      return a.timestamp - b.timestamp;
    });
  }

  /**
   * Clean up expired locks and queue items
   */
  private cleanupExpiredLocks(): void {
    const now = Date.now();
    
    // Check if current lock is expired
    if (this.isLocked && (now - this.lockTimestamp > this.LOCK_TIMEOUT_MS)) {
      console.warn(`[GoogleSignInLock] Lock held by ${this.activeComponentId} expired`);
      this.forceReleaseLock();
    }
    
    // Clean up expired queue items
    const expiredItems = this.waitQueue.filter(
      item => now - item.timestamp > (item.timeout as any)[Symbol.toPrimitive]('number')
    );
    
    expiredItems.forEach(item => {
      clearTimeout(item.timeout);
      item.resolve(false);
    });
    
    if (expiredItems.length > 0) {
      this.waitQueue = this.waitQueue.filter(
        item => !expiredItems.includes(item)
      );
    }
  }
}

export default GoogleSignInLock.getInstance();
