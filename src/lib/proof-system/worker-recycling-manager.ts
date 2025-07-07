/**
 * Worker Recycling Manager
 * 
 * Orchestrates preemptive worker recycling to prevent memory exhaustion panics.
 * Wraps task execution with health monitoring, automatic retries, and graceful recovery.
 */

import { WorkerHealthMonitor, WorkerHealth } from './worker-health.js';

export interface RecyclingConfig {
  enabled: boolean;
  preemptiveRecycling: boolean;
  maxRetries: number;
  gracefulShutdownTimeoutMs: number;
  enableDetailedLogging: boolean;
}

export interface TaskOptions {
  estimatedMemoryMB: number;
  taskName?: string;
  retryCount?: number;
  timeoutMs?: number;
}

export interface RecyclingCallbacks {
  getCurrentWorkerId: () => string | undefined;
  requestWorkerShutdown: (workerId: string) => Promise<void>;
  waitForWorkerShutdown: (workerId: string) => Promise<void>;
  forceTerminateWorker: (workerId: string) => Promise<void>;
  createFreshWorker: () => Promise<string>;
  waitForHealthyWorker: () => Promise<string>;
}

/**
 * Manages the lifecycle of workers to prevent memory exhaustion
 */
export class WorkerRecyclingManager {
  private healthMonitor = new WorkerHealthMonitor();
  private recyclingQueue = new Set<string>();
  private config: RecyclingConfig;
  private callbacks: RecyclingCallbacks | null = null;
  private isInitialized = false;

  constructor(config?: Partial<RecyclingConfig>) {
    this.config = {
      enabled: true,
      preemptiveRecycling: true,
      maxRetries: 3,
      gracefulShutdownTimeoutMs: 5000,
      enableDetailedLogging: false,
      ...config
    };
  }

  /**
   * Initialize the recycling manager with backend-specific callbacks
   */
  initialize(callbacks: RecyclingCallbacks): void {
    this.callbacks = callbacks;
    this.isInitialized = true;
    
    if (this.config.enableDetailedLogging) {
      console.log('[WorkerRecycling] Initialized with config:', this.config);
    }
  }

  /**
   * Execute a task with automatic worker recycling and retry logic
   */
  async executeWithRecycling<T>(
    taskFn: () => Promise<T>,
    options: TaskOptions
  ): Promise<T> {
    if (!this.isInitialized || !this.callbacks) {
      throw new Error('WorkerRecyclingManager not initialized. Call initialize() first.');
    }

    if (!this.config.enabled) {
      // Recycling disabled, execute directly
      return await taskFn();
    }

    const { estimatedMemoryMB, taskName = 'unknown', retryCount = 0, timeoutMs } = options;
    const maxRetries = this.config.maxRetries;

    // Get current worker ID
    const workerId = this.callbacks.getCurrentWorkerId();
    if (!workerId) {
      throw new Error('No worker available for task execution');
    }

    // Check if worker should be preemptively recycled
    if (this.config.preemptiveRecycling && this.shouldRecycleWorker(workerId)) {
      if (this.config.enableDetailedLogging) {
        console.log(`[WorkerRecycling] Preemptively recycling worker ${workerId} for task: ${taskName}`);
      }
      
      await this.scheduleWorkerRecycling(workerId, 'preemptive');
      
      // Get a fresh worker for this task
      const freshWorkerId = await this.callbacks.waitForHealthyWorker();
      return this.executeWithRecycling(taskFn, { 
        ...options, 
        retryCount 
      });
    }

    // Track task start
    this.healthMonitor.recordTaskStart(workerId, estimatedMemoryMB);

    try {
      // Execute with timeout if specified
      const result = timeoutMs 
        ? await this.executeWithTimeout(taskFn, timeoutMs, workerId, taskName)
        : await taskFn();

      // Record successful completion
      this.healthMonitor.recordTaskComplete(workerId);

      if (this.config.enableDetailedLogging) {
        console.log(`[WorkerRecycling] Task ${taskName} completed successfully on worker ${workerId}`);
      }

      return result;

    } catch (error) {
      // Task failed - could be due to worker crash, timeout, or other error
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      console.error(`[WorkerRecycling] Task ${taskName} failed on worker ${workerId}:`, errorMessage);

      // Immediately mark worker for recycling since it's likely corrupted
      await this.scheduleWorkerRecycling(workerId, 'failure');

      // Retry with new worker if under retry limit
      if (retryCount < maxRetries) {
        const nextRetry = retryCount + 1;
        console.log(`[WorkerRecycling] Retrying task ${taskName} (attempt ${nextRetry}/${maxRetries})`);
        
        const freshWorkerId = await this.callbacks.waitForHealthyWorker();
        return this.executeWithRecycling(taskFn, {
          ...options,
          retryCount: nextRetry
        });
      }

      // Max retries exceeded
      throw new Error(`Task ${taskName} failed after ${maxRetries} retries: ${errorMessage}`);
    }
  }

  /**
   * Execute task with timeout protection
   */
  private async executeWithTimeout<T>(
    taskFn: () => Promise<T>,
    timeoutMs: number,
    workerId: string,
    taskName: string
  ): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      let isResolved = false;

      const timeoutId = setTimeout(() => {
        if (!isResolved) {
          isResolved = true;
          reject(new Error(`Task ${taskName} timed out after ${timeoutMs}ms on worker ${workerId}`));
        }
      }, timeoutMs);

      taskFn()
        .then(result => {
          if (!isResolved) {
            isResolved = true;
            clearTimeout(timeoutId);
            resolve(result);
          }
        })
        .catch(error => {
          if (!isResolved) {
            isResolved = true;
            clearTimeout(timeoutId);
            reject(error);
          }
        });
    });
  }

  /**
   * Check if a worker should be recycled
   */
  shouldRecycleWorker(workerId: string): boolean {
    return this.healthMonitor.shouldRecycleWorker(workerId);
  }

  /**
   * Schedule a worker for recycling
   */
  async scheduleWorkerRecycling(
    workerId: string, 
    reason: 'preemptive' | 'failure' | 'manual'
  ): Promise<void> {
    if (this.recyclingQueue.has(workerId)) {
      // Already being recycled
      return;
    }

    this.recyclingQueue.add(workerId);
    this.healthMonitor.markRecycling(workerId);

    console.log(`[WorkerRecycling] Scheduling worker ${workerId} for recycling (reason: ${reason})`);

    try {
      if (!this.callbacks) {
        throw new Error('Callbacks not initialized');
      }

      // Attempt graceful shutdown first
      const shutdownPromise = this.performGracefulShutdown(workerId);
      const timeoutPromise = new Promise<void>(resolve => 
        setTimeout(resolve, this.config.gracefulShutdownTimeoutMs)
      );

      // Wait for graceful shutdown or timeout
      await Promise.race([shutdownPromise, timeoutPromise]);

    } catch (error) {
      console.warn(`[WorkerRecycling] Graceful shutdown failed for worker ${workerId}:`, error);
    } finally {
      // Force terminate if still alive
      try {
        if (this.callbacks) {
          await this.callbacks.forceTerminateWorker(workerId);
        }
      } catch (error) {
        console.error(`[WorkerRecycling] Force termination failed for worker ${workerId}:`, error);
      }
      
      // Clean up tracking
      this.healthMonitor.untrackWorker(workerId);
      this.recyclingQueue.delete(workerId);
    }
  }

  /**
   * Attempt graceful shutdown of a worker
   */
  private async performGracefulShutdown(workerId: string): Promise<void> {
    if (!this.callbacks) return;

    // Request worker to finish current work and shut down
    await this.callbacks.requestWorkerShutdown(workerId);

    // Wait for worker to confirm shutdown
    await this.callbacks.waitForWorkerShutdown(workerId);
  }

  /**
   * Track a new worker
   */
  trackWorker(workerId: string, backend: 'node' | 'web'): void {
    this.healthMonitor.trackWorker(workerId, backend);
  }

  /**
   * Stop tracking a worker
   */
  untrackWorker(workerId: string): void {
    this.healthMonitor.untrackWorker(workerId);
    this.recyclingQueue.delete(workerId);
  }

  /**
   * Get health summary for monitoring
   */
  getHealthSummary() {
    const health = this.healthMonitor.getHealthSummary();
    const config = this.getConfiguration();
    const limits = this.healthMonitor.getLimits();
    const environment = this.healthMonitor.getEnvironment();

    return {
      health,
      config,
      limits,
      environment,
      recyclingQueue: Array.from(this.recyclingQueue)
    };
  }

  /**
   * Get current configuration
   */
  getConfiguration(): RecyclingConfig {
    return { ...this.config };
  }

  /**
   * Update configuration at runtime
   */
  updateConfiguration(updates: Partial<RecyclingConfig>): void {
    this.config = { ...this.config, ...updates };
    
    if (this.config.enableDetailedLogging) {
      console.log('[WorkerRecycling] Configuration updated:', this.config);
    }
  }

  /**
   * Get detailed worker health information
   */
  getWorkerHealth(workerId?: string) {
    if (workerId) {
      return this.healthMonitor.getWorkerHealth(workerId);
    }
    return this.healthMonitor.getAllWorkerHealth();
  }

  /**
   * Estimate memory usage for different types of operations
   */
  static estimateMemoryUsage(operationType: string, circuitSize?: 'small' | 'medium' | 'large'): number {
    // Heuristic memory estimation based on operation type and circuit size
    const baseMemory = {
      compile: 150,
      prove: 200,
      verify: 50,
      recursive_prove: 300,
      recursive_verify: 100
    };

    const sizeMultiplier = {
      small: 1.0,
      medium: 1.5,
      large: 2.0
    };

    const base = baseMemory[operationType as keyof typeof baseMemory] ?? 100;
    const multiplier = circuitSize ? sizeMultiplier[circuitSize] : 1.0;

    return Math.floor(base * multiplier);
  }

  /**
   * Create a task-specific timeout based on operation type
   */
  static calculateTimeout(operationType: string, circuitSize?: 'small' | 'medium' | 'large'): number {
    const baseTimeout = {
      compile: 30000,   // 30s
      prove: 45000,     // 45s
      verify: 10000,    // 10s
      recursive_prove: 120000,  // 2min
      recursive_verify: 30000   // 30s
    };

    const sizeMultiplier = {
      small: 1.0,
      medium: 2.0,
      large: 3.0
    };

    const base = baseTimeout[operationType as keyof typeof baseTimeout] ?? 45000;
    const multiplier = circuitSize ? sizeMultiplier[circuitSize] : 1.0;

    return Math.floor(base * multiplier);
  }
}