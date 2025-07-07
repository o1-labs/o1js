/**
 * Simple Worker Health Reporter
 * 
 * Runs inside each worker to monitor health and report to main thread.
 * Reports memory usage every 5 seconds to prevent WASM panic situations.
 */

export interface WorkerHealthReport {
  workerId: string;
  memoryUsageMB: number;
  isMemoryCritical: boolean;
  timestamp: number;
}

/**
 * Simple health reporter that runs in each worker
 */
export class SimpleWorkerHealthReporter {
  private workerId: string;
  private reportInterval: number = 5000; // 5 seconds
  private isRunning = false;
  private intervalId: ReturnType<typeof setTimeout> | null = null;

  constructor(workerId: string) {
    this.workerId = workerId;
  }

  /**
   * Start health monitoring and reporting
   */
  start(): void {
    if (this.isRunning) return;
    
    this.isRunning = true;
    this.scheduleHealthCheck();
    
    console.log(`[WorkerHealth] Started monitoring worker ${this.workerId}`);
  }

  /**
   * Stop health monitoring
   */
  stop(): void {
    this.isRunning = false;
    if (this.intervalId) {
      clearTimeout(this.intervalId);
      this.intervalId = null;
    }
    console.log(`[WorkerHealth] Stopped monitoring worker ${this.workerId}`);
  }

  /**
   * Schedule the next health check
   */
  private scheduleHealthCheck(): void {
    if (!this.isRunning) return;

    this.intervalId = setTimeout(async () => {
      try {
        await this.sendHealthReport();
      } catch (error) {
        console.error(`[WorkerHealth] Error in health check for ${this.workerId}:`, error);
      }

      // Schedule next check
      this.scheduleHealthCheck();
    }, this.reportInterval);
  }

  /**
   * Send health report to main thread
   */
  private async sendHealthReport(): Promise<void> {
    try {
      let memoryUsageMB = 0;
      let isMemoryCritical = false;

      try {
        // Access WASM memory functions through global object
        // Note: This might fail if WASM isn't initialized yet
        const wasm = (globalThis as any).plonk_wasm;
        
        if (wasm && wasm.get_memory_usage_mb && wasm.is_memory_approaching_critical) {
          memoryUsageMB = wasm.get_memory_usage_mb();
          isMemoryCritical = wasm.is_memory_approaching_critical();
        }
      } catch (wasmError) {
        // WASM not available or not initialized - fall back to basic memory check
        if (typeof process !== 'undefined' && process.memoryUsage) {
          // Node.js environment
          const usage = process.memoryUsage();
          memoryUsageMB = Math.floor(usage.heapUsed / (1024 * 1024));
          isMemoryCritical = memoryUsageMB > 1000; // Basic threshold
        } else if (typeof performance !== 'undefined' && (performance as any).memory) {
          // Browser environment with memory API
          const usage = (performance as any).memory;
          memoryUsageMB = Math.floor(usage.usedJSHeapSize / (1024 * 1024));
          isMemoryCritical = memoryUsageMB > 1000; // Basic threshold
        }
      }

      const report: WorkerHealthReport = {
        workerId: this.workerId,
        memoryUsageMB,
        isMemoryCritical,
        timestamp: Date.now()
      };

      // Send to main thread
      this.sendToMainThread(report);

      // Log critical conditions
      if (isMemoryCritical) {
        console.warn(`[WorkerHealth] CRITICAL: Worker ${this.workerId} memory usage: ${memoryUsageMB}MB`);
      }

    } catch (error) {
      console.error(`[WorkerHealth] Failed to send health report:`, error);
    }
  }

  /**
   * Send message to main thread (handles both Web Worker and Node.js worker thread)
   */
  private sendToMainThread(report: WorkerHealthReport): void {
    const message = {
      type: 'health_report',
      report
    };

    try {
      if (typeof self !== 'undefined' && self.postMessage) {
        // We're in a Web Worker
        self.postMessage(message);
      } else if (typeof process !== 'undefined' && process.send) {
        // We're in a Node.js worker thread  
        process.send(message);
      } else if (typeof postMessage !== 'undefined') {
        // Fallback to global postMessage
        postMessage(message);
      } else {
        console.warn(`[WorkerHealth] No communication channel available for worker ${this.workerId}`);
      }
    } catch (error) {
      console.error(`[WorkerHealth] Error sending message to main thread:`, error);
    }
  }

  /**
   * Set custom report interval
   */
  setReportInterval(intervalMs: number): void {
    this.reportInterval = intervalMs;
    console.log(`[WorkerHealth] Report interval set to ${intervalMs}ms for worker ${this.workerId}`);
  }

  /**
   * Get current configuration
   */
  getConfig() {
    return {
      workerId: this.workerId,
      reportInterval: this.reportInterval,
      isRunning: this.isRunning
    };
  }

  /**
   * Force send a health report immediately (for testing)
   */
  async sendImmediateReport(): Promise<void> {
    await this.sendHealthReport();
  }
}

/**
 * Initialize worker health reporting for this worker
 * Call this function in worker initialization code
 */
export function initWorkerHealthReporting(workerId: string): SimpleWorkerHealthReporter {
  const reporter = new SimpleWorkerHealthReporter(workerId);
  
  // Auto-start unless in a test environment
  if (typeof process === 'undefined' || process.env.NODE_ENV !== 'test') {
    reporter.start();
  }
  
  return reporter;
}

/**
 * Global health reporter instance (for convenience)
 */
let globalHealthReporter: SimpleWorkerHealthReporter | null = null;

/**
 * Get or create the global health reporter
 */
export function getGlobalHealthReporter(workerId?: string): SimpleWorkerHealthReporter | null {
  if (!globalHealthReporter && workerId) {
    globalHealthReporter = initWorkerHealthReporting(workerId);
  }
  return globalHealthReporter;
}