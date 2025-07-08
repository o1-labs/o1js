/**
 * Pool Health Coordinator
 * 
 * Coordinates health reports from all workers and makes pool recycling decisions.
 * Critical insight: Since Rayon threads share state, if ANY thread needs to die,
 * the ENTIRE pool must be recycled - individual thread replacement is impossible.
 */

export interface WorkerHealthReport {
  workerId: string;
  memoryUsageMB: number;
  isMemoryCritical: boolean;
  timestamp: number;
}

export interface PoolRecyclingConfig {
  criticalMemoryMB: number;
  maxPoolAgeMs: number;
  healthCheckIntervalMs: number;
  gracefulShutdownTimeoutMs: number;
}

export interface PoolRecyclingCallbacks {
  exitThreadPool: () => Promise<void>;
  initThreadPool: () => Promise<void>;
}

/**
 * Coordinates health reports from all workers and makes pool recycling decisions
 */
export class PoolHealthCoordinator {
  private workerHealthReports = new Map<string, WorkerHealthReport>();
  private isRecycling = false;
  private poolStartTime = Date.now();
  private config: PoolRecyclingConfig;
  private recyclingPromise: Promise<void> | null = null;
  private recyclingCallbacks: PoolRecyclingCallbacks | null = null;

  constructor(config?: Partial<PoolRecyclingConfig>) {
    this.config = {
      criticalMemoryMB: this.detectCriticalMemoryLimit(),
      maxPoolAgeMs: 15 * 60 * 1000, // 15 minutes max pool age
      healthCheckIntervalMs: 5000,   // Check every 5 seconds
      gracefulShutdownTimeoutMs: 60000, // 60 seconds to finish current tasks
      ...config
    };
  }

  private detectCriticalMemoryLimit(): number {
    const isMobile = typeof window !== 'undefined' && /iPhone|iPad|Android/i.test(navigator.userAgent);
    return isMobile ? 800 : 3200; // 800MB mobile, 3200MB desktop
  }

  /**
   * Set the callbacks for actual thread pool recycling
   */
  setRecyclingCallbacks(callbacks: PoolRecyclingCallbacks): void {
    this.recyclingCallbacks = callbacks;
  }

  /**
   * Receive health report from a worker
   */
  receiveHealthReport(report: WorkerHealthReport): void {
    this.workerHealthReports.set(report.workerId, report);

    // Check if immediate pool recycling is needed
    if (this.shouldRecyclePool()) {
      this.triggerPoolRecycling('memory_critical');
    }
  }

  /**
   * Check if pool should be recycled
   */
  private shouldRecyclePool(): boolean {
    if (this.isRecycling) return false;

    // Check for critical memory in any worker
    for (const report of this.workerHealthReports.values()) {
      if (report.isMemoryCritical || report.memoryUsageMB > this.config.criticalMemoryMB) {
        return true;
      }
    }

    // Check pool age
    const poolAge = Date.now() - this.poolStartTime;
    if (poolAge > this.config.maxPoolAgeMs) {
      return true;
    }

    return false;
  }

  /**
   * Trigger pool recycling - this is the critical function
   */
  private triggerPoolRecycling(reason: string): Promise<void> {
    if (this.isRecycling) {
      return this.recyclingPromise!;
    }

    console.log(`[PoolHealth] TRIGGERING POOL RECYCLING: ${reason}`);
    this.isRecycling = true;

    this.recyclingPromise = this.executePoolRecycling(reason);
    return this.recyclingPromise;
  }

  /**
   * Execute the actual pool recycling
   */
  private async executePoolRecycling(reason: string): Promise<void> {
    try {
      console.log(`[PoolHealth] Starting pool recycling due to: ${reason}`);

      // Step 1: Block new tasks from starting
      this.blockNewTasks();

      // Step 2: Wait for current tasks to finish (with timeout)
      await this.waitForCurrentTasksToComplete();

      // Step 3: Actually terminate and recreate the Rayon thread pool
      if (this.recyclingCallbacks) {
        console.log(`[PoolHealth] Terminating Rayon thread pool`);
        await this.recyclingCallbacks.exitThreadPool();
        
        console.log(`[PoolHealth] Recreating Rayon thread pool`);
        await this.recyclingCallbacks.initThreadPool();
      } else {
        console.error(`[PoolHealth] No recycling callbacks set - cannot recycle Rayon pool!`);
        // Fall back to old behavior
        await this.forceShutdownPool();
      }

      // Step 4: Reset state for new pool
      this.resetPoolState();

      console.log(`[PoolHealth] Pool recycling completed`);

    } catch (error) {
      console.error(`[PoolHealth] Error during pool recycling:`, error);
    } finally {
      this.isRecycling = false;
      this.recyclingPromise = null;
    }
  }

  /**
   * Block new tasks from starting
   */
  private blockNewTasks(): void {
    // Set global flag that withThreadPool() will check
    (globalThis as any).__o1js_pool_recycling = true;
  }

  /**
   * Wait for current tasks to complete
   */
  private async waitForCurrentTasksToComplete(): Promise<void> {
    const startTime = Date.now();
    const timeout = this.config.gracefulShutdownTimeoutMs;

    return new Promise<void>((resolve) => {
      const checkInterval = setInterval(() => {
        // Check if we can determine that all tasks are done
        // This would need integration with the withThreadPool reference counting
        const elapsed = Date.now() - startTime;
        
        if (elapsed > timeout) {
          console.warn(`[PoolHealth] Timeout waiting for tasks to complete, forcing shutdown`);
          clearInterval(checkInterval);
          resolve();
        }

        // TODO: Check actual task count from withThreadPool
        // For now, just wait the timeout period
        if (elapsed > timeout / 2) { // Give tasks half the timeout, then force
          clearInterval(checkInterval);
          resolve();
        }
      }, 100);
    });
  }

  /**
   * Force shutdown the entire pool
   */
  private async forceShutdownPool(): Promise<void> {
    // This will need to integrate with the backend worker management
    // Force the withThreadPool state machine to transition to 'exiting'
    (globalThis as any).__o1js_force_pool_shutdown = true;

    // The actual shutdown will be handled by the existing backend code
    // when it sees these flags
  }

  /**
   * Reset state for new pool
   */
  private resetPoolState(): void {
    this.workerHealthReports.clear();
    this.poolStartTime = Date.now();
    
    // Clear the blocking flags
    delete (globalThis as any).__o1js_pool_recycling;
    delete (globalThis as any).__o1js_force_pool_shutdown;
  }

  /**
   * Check if pool is currently being recycled
   */
  isPoolRecycling(): boolean {
    return this.isRecycling;
  }

  /**
   * Wait for any ongoing recycling to complete
   */
  async waitForRecyclingToComplete(): Promise<void> {
    if (this.recyclingPromise) {
      await this.recyclingPromise;
    }
  }

  /**
   * Get current pool health summary
   */
  getPoolHealthSummary() {
    const reports = Array.from(this.workerHealthReports.values());
    const poolAge = Date.now() - this.poolStartTime;
    const totalMemory = reports.reduce((sum, r) => sum + r.memoryUsageMB, 0);
    const criticalWorkers = reports.filter(r => r.isMemoryCritical).length;

    return {
      poolAge,
      totalWorkers: reports.length,
      totalMemoryMB: totalMemory,
      criticalWorkers,
      isRecycling: this.isRecycling,
      shouldRecycle: this.shouldRecyclePool()
    };
  }

  /**
   * Manually trigger pool recycling (for testing or emergency situations)
   */
  async forceRecycling(reason: string = 'manual'): Promise<void> {
    return this.triggerPoolRecycling(reason);
  }

  /**
   * Update configuration at runtime
   */
  updateConfig(newConfig: Partial<PoolRecyclingConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log(`[PoolHealth] Configuration updated:`, this.config);
  }

  /**
   * Get current configuration
   */
  getConfig(): PoolRecyclingConfig {
    return { ...this.config };
  }
}