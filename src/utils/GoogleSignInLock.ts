/**
 * GoogleSignInLock: A singleton to manage Google Sign-In API access
 * Prevents multiple components from initializing the API simultaneously,
 * which causes the "Only one navigator.credentials.get request may be outstanding at one time" error
 */

class GoogleSignInLock {
  private static instance: GoogleSignInLock;
  private isLocked: boolean = false;
  private lockTimestamp: number = 0;
  private lockTimeoutMs: number = 5000; // Auto-release after 5 seconds
  private activeComponentId: string | null = null;
  
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
   * Try to acquire the lock
   * @param componentId Unique identifier for the component requesting the lock
   * @returns Boolean indicating if lock was acquired
   */
  public acquireLock(componentId: string): boolean {
    // If lock is held but expired, release it
    if (this.isLocked && (Date.now() - this.lockTimestamp > this.lockTimeoutMs)) {
      this.releaseLock(this.activeComponentId!);
    }
    
    // If already locked by another component, deny the request
    if (this.isLocked && this.activeComponentId !== componentId) {
      console.log(`GoogleSignInLock: ${componentId} denied lock (held by ${this.activeComponentId})`);
      return false;
    }
    
    // Either not locked or already locked by this component
    if (!this.isLocked) {
      this.isLocked = true;
      this.activeComponentId = componentId;
      this.lockTimestamp = Date.now();
      console.log(`GoogleSignInLock: ${componentId} acquired lock`);
    }
    
    return true;
  }
  
  /**
   * Release the lock if held by the specified component
   * @param componentId Unique identifier of the component releasing the lock
   * @returns Boolean indicating if lock was successfully released
   */
  public releaseLock(componentId: string): boolean {
    // Only the component that acquired the lock can release it
    if (this.isLocked && this.activeComponentId === componentId) {
      this.isLocked = false;
      this.activeComponentId = null;
      console.log(`GoogleSignInLock: ${componentId} released lock`);
      return true;
    }
    
    return false;
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
}

export default GoogleSignInLock.getInstance();
