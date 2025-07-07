/**
 * Worker Health Monitoring System
 * 
 * Tracks the health of WASM workers to prevent memory exhaustion panics
 * through preemptive recycling based on task count, memory usage, and age.
 */

export interface WorkerHealth {
  id: string;
  created: number;
  taskCount: number;
  estimatedMemoryMB: number;
  lastActivityMs: number;
  backend: 'node' | 'web';
  state: 'healthy' | 'warning' | 'critical' | 'recycling';
}

export interface WorkerLimits {
  maxTasksPerWorker: number;
  maxLifetimeMs: number;
  maxMemoryMB: number;
  taskTimeoutMs: number;
  recycleWarningThreshold: number;
}

export interface EnvironmentInfo {
  platform: 'web' | 'node';
  isMobile: boolean;
  maxMemoryMB: number;
  hardwareConcurrency: number;
}

/**
 * Monitors the health of individual workers and determines when they should be recycled
 */
export class WorkerHealthMonitor {
  private healthMap = new Map<string, WorkerHealth>();
  private limits: WorkerLimits;
  private environment: EnvironmentInfo;

  constructor() {
    this.environment = this.detectEnvironment();
    this.limits = this.calculateOptimalLimits();
  }

  /**
   * Detect the current runtime environment and capabilities
   */
  private detectEnvironment(): EnvironmentInfo {
    const platform = typeof window !== 'undefined' ? 'web' : 'node';
    
    let isMobile = false;
    let maxMemoryMB = 4096; // Default 4GB
    let hardwareConcurrency = 1;

    if (platform === 'web') {
      // Detect mobile browsers
      isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      
      // iOS devices have 1GB memory limit, others have 4GB
      maxMemoryMB = isMobile ? 1024 : 4096;
      
      hardwareConcurrency = navigator.hardwareConcurrency ?? 1;
    } else {
      // Node.js environment
      try {
        const os = require('os');
        hardwareConcurrency = os.cpus().length;
        
        // Estimate available memory (use 80% of total to be safe)
        const totalMemoryMB = Math.floor(os.totalmem() / (1024 * 1024));
        maxMemoryMB = Math.floor(totalMemoryMB * 0.8);
      } catch (e) {
        // Fallback if os module not available
        hardwareConcurrency = 4;
        maxMemoryMB = 4096;
      }
    }

    return {
      platform,
      isMobile,
      maxMemoryMB,
      hardwareConcurrency
    };
  }

  /**
   * Calculate optimal limits based on the current environment
   */
  private calculateOptimalLimits(): WorkerLimits {
    const { isMobile, maxMemoryMB } = this.environment;
    
    // Conservative limits to prevent memory exhaustion
    // Assume each task leaks ~200MB on average
    const estimatedMemoryPerTaskMB = 200;
    const safetyMarginRatio = 0.8; // Use only 80% of available memory
    
    const availableMemoryMB = Math.floor(maxMemoryMB * safetyMarginRatio);
    const maxTasksFromMemory = Math.floor(availableMemoryMB / estimatedMemoryPerTaskMB);
    
    return {
      // Conservative task limits based on memory constraints
      maxTasksPerWorker: Math.max(3, Math.min(isMobile ? 8 : 15, maxTasksFromMemory)),
      
      // Shorter lifetimes on mobile due to memory pressure
      maxLifetimeMs: isMobile ? 3 * 60 * 1000 : 8 * 60 * 1000, // 3min mobile, 8min desktop
      
      // Leave buffer below memory limits
      maxMemoryMB: Math.floor(availableMemoryMB * 0.9), // Additional 10% buffer
      
      // Timeout for individual tasks
      taskTimeoutMs: 45 * 1000, // 45 seconds
      
      // Recycle at 80% of limits to be proactive
      recycleWarningThreshold: 0.8
    };
  }

  /**
   * Start tracking a new worker
   */
  trackWorker(workerId: string, backend: 'node' | 'web'): void {
    this.healthMap.set(workerId, {
      id: workerId,
      created: Date.now(),
      taskCount: 0,
      estimatedMemoryMB: 0,
      lastActivityMs: Date.now(),
      backend,
      state: 'healthy'
    });
    
    console.log(`[WorkerHealth] Started tracking ${backend} worker ${workerId}`);
  }

  /**
   * Record that a task has started on a worker
   */
  recordTaskStart(workerId: string, estimatedMemoryMB: number): void {
    const health = this.healthMap.get(workerId);
    if (!health) {
      console.warn(`[WorkerHealth] Attempted to record task on unknown worker ${workerId}`);
      return;
    }

    health.taskCount++;
    health.estimatedMemoryMB += estimatedMemoryMB;
    health.lastActivityMs = Date.now();
    health.state = this.calculateHealthState(health);

    console.log(`[WorkerHealth] Worker ${workerId} task ${health.taskCount}, est. memory: ${health.estimatedMemoryMB}MB, state: ${health.state}`);
  }

  /**
   * Record that a task has completed on a worker
   */
  recordTaskComplete(workerId: string): void {
    const health = this.healthMap.get(workerId);
    if (!health) return;

    health.lastActivityMs = Date.now();
    // Note: We don't reduce estimated memory since WASM memory doesn't shrink
  }

  /**
   * Determine if a worker should be recycled based on its health metrics
   */
  shouldRecycleWorker(workerId: string): boolean {
    const health = this.healthMap.get(workerId);
    if (!health) return false;

    const age = Date.now() - health.created;
    const threshold = this.limits.recycleWarningThreshold;

    const conditions = {
      age: age > this.limits.maxLifetimeMs * threshold,
      tasks: health.taskCount > this.limits.maxTasksPerWorker * threshold,
      memory: health.estimatedMemoryMB > this.limits.maxMemoryMB * threshold,
      state: health.state === 'critical'
    };

    const shouldRecycle = conditions.age || conditions.tasks || conditions.memory || conditions.state;

    if (shouldRecycle) {
      console.log(`[WorkerHealth] Worker ${workerId} should be recycled:`, conditions);
    }

    return shouldRecycle;
  }

  /**
   * Check if a worker is currently being recycled
   */
  isRecycling(workerId: string): boolean {
    const health = this.healthMap.get(workerId);
    return health?.state === 'recycling' ?? false;
  }

  /**
   * Mark a worker as being recycled
   */
  markRecycling(workerId: string): void {
    const health = this.healthMap.get(workerId);
    if (health) {
      health.state = 'recycling';
      console.log(`[WorkerHealth] Marked worker ${workerId} as recycling`);
    }
  }

  /**
   * Stop tracking a worker (when it's terminated)
   */
  untrackWorker(workerId: string): void {
    const health = this.healthMap.get(workerId);
    if (health) {
      const lifetime = Date.now() - health.created;
      console.log(`[WorkerHealth] Stopped tracking worker ${workerId} after ${lifetime}ms, ${health.taskCount} tasks`);
      this.healthMap.delete(workerId);
    }
  }

  /**
   * Get current health status of a worker
   */
  getWorkerHealth(workerId: string): WorkerHealth | undefined {
    return this.healthMap.get(workerId);
  }

  /**
   * Get health status of all tracked workers
   */
  getAllWorkerHealth(): WorkerHealth[] {
    return Array.from(this.healthMap.values());
  }

  /**
   * Get current limits configuration
   */
  getLimits(): WorkerLimits {
    return { ...this.limits };
  }

  /**
   * Get environment information
   */
  getEnvironment(): EnvironmentInfo {
    return { ...this.environment };
  }

  /**
   * Calculate the health state based on current metrics
   */
  private calculateHealthState(health: WorkerHealth): WorkerHealth['state'] {
    if (health.state === 'recycling') return 'recycling';

    const ageRatio = (Date.now() - health.created) / this.limits.maxLifetimeMs;
    const taskRatio = health.taskCount / this.limits.maxTasksPerWorker;
    const memoryRatio = health.estimatedMemoryMB / this.limits.maxMemoryMB;

    const maxRatio = Math.max(ageRatio, taskRatio, memoryRatio);

    if (maxRatio > 0.9) return 'critical';
    if (maxRatio > 0.7) return 'warning';
    return 'healthy';
  }

  /**
   * Get a summary of overall worker pool health
   */
  getHealthSummary(): {
    totalWorkers: number;
    healthyWorkers: number;
    warningWorkers: number;
    criticalWorkers: number;
    recyclingWorkers: number;
    averageTasksPerWorker: number;
    averageMemoryPerWorker: number;
  } {
    const workers = this.getAllWorkerHealth();
    const totalTasks = workers.reduce((sum, w) => sum + w.taskCount, 0);
    const totalMemory = workers.reduce((sum, w) => sum + w.estimatedMemoryMB, 0);

    const summary = {
      totalWorkers: workers.length,
      healthyWorkers: workers.filter(w => w.state === 'healthy').length,
      warningWorkers: workers.filter(w => w.state === 'warning').length,
      criticalWorkers: workers.filter(w => w.state === 'critical').length,
      recyclingWorkers: workers.filter(w => w.state === 'recycling').length,
      averageTasksPerWorker: workers.length > 0 ? totalTasks / workers.length : 0,
      averageMemoryPerWorker: workers.length > 0 ? totalMemory / workers.length : 0
    };

    return summary;
  }
}