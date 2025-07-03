/**
 * High-Resolution Performance Data Collector for Snarky vs Sparky
 * 
 * This module provides infrastructure for collecting detailed performance metrics
 * with microsecond precision, memory profiling, and event tracing capabilities.
 */

import { performance, PerformanceObserver } from 'perf_hooks';
import { cpuUsage, memoryUsage } from 'process';
import { EventEmitter } from 'events';
import * as os from 'os';

export interface PerformanceMetric {
  operation: string;
  backend: 'snarky' | 'sparky';
  timestamp: number;
  duration: number; // microseconds
  memory: {
    heapUsed: number;
    heapTotal: number;
    external: number;
    arrayBuffers: number;
    rss: number;
  };
  cpu: {
    user: number;
    system: number;
  };
  metadata: {
    iteration: number;
    warmup: boolean;
    version: string;
    commit: string;
    environment: EnvironmentInfo;
  };
  subOperations?: SubOperation[];
  errors?: Error[];
}

export interface SubOperation {
  name: string;
  startTime: number;
  duration: number;
  memory: number;
}

export interface EnvironmentInfo {
  platform: string;
  arch: string;
  nodeVersion: string;
  cpuModel: string;
  cpuCores: number;
  totalMemory: number;
  freeMemory: number;
}

export class PerformanceCollector extends EventEmitter {
  private metrics: PerformanceMetric[] = [];
  private currentOperation: string | null = null;
  private operationStartTime: number = 0;
  private operationStartMemory: any = null;
  private operationStartCpu: any = null;
  private subOperations: SubOperation[] = [];
  private observer: PerformanceObserver | null = null;
  
  constructor(private options: {
    flushInterval?: number;
    maxMetricsInMemory?: number;
    enableDetailedProfiling?: boolean;
    enableGCTracking?: boolean;
  } = {}) {
    super();
    this.setupPerformanceObserver();
    this.setupGCTracking();
  }

  /**
   * Start measuring a new operation
   */
  startOperation(operation: string, backend: 'snarky' | 'sparky', metadata: any = {}) {
    if (this.currentOperation) {
      throw new Error(`Operation ${this.currentOperation} already in progress`);
    }

    this.currentOperation = operation;
    this.operationStartTime = performance.now();
    this.operationStartMemory = memoryUsage();
    this.operationStartCpu = cpuUsage();
    this.subOperations = [];

    // Mark performance entry
    performance.mark(`${operation}-start`);

    this.emit('operation:start', { operation, backend, timestamp: Date.now() });
  }

  /**
   * Mark a sub-operation within the current operation
   */
  markSubOperation(name: string) {
    if (!this.currentOperation) {
      throw new Error('No operation in progress');
    }

    const mark = `${this.currentOperation}-${name}`;
    performance.mark(mark);

    return {
      end: () => {
        const endMark = `${mark}-end`;
        performance.mark(endMark);
        performance.measure(name, mark, endMark);
        
        const measure = performance.getEntriesByName(name)[0];
        if (measure) {
          this.subOperations.push({
            name,
            startTime: measure.startTime,
            duration: measure.duration * 1000, // Convert to microseconds
            memory: memoryUsage().heapUsed
          });
        }
      }
    };
  }

  /**
   * End the current operation and record metrics
   */
  endOperation(backend: 'snarky' | 'sparky', metadata: any = {}) {
    if (!this.currentOperation) {
      throw new Error('No operation in progress');
    }

    const endTime = performance.now();
    const endMemory = memoryUsage();
    const endCpu = cpuUsage(this.operationStartCpu);

    performance.mark(`${this.currentOperation}-end`);
    performance.measure(
      this.currentOperation,
      `${this.currentOperation}-start`,
      `${this.currentOperation}-end`
    );

    const metric: PerformanceMetric = {
      operation: this.currentOperation,
      backend,
      timestamp: Date.now(),
      duration: (endTime - this.operationStartTime) * 1000, // Convert to microseconds
      memory: {
        heapUsed: endMemory.heapUsed - this.operationStartMemory.heapUsed,
        heapTotal: endMemory.heapTotal,
        external: endMemory.external,
        arrayBuffers: endMemory.arrayBuffers,
        rss: endMemory.rss
      },
      cpu: {
        user: endCpu.user,
        system: endCpu.system
      },
      metadata: {
        ...metadata,
        environment: this.getEnvironmentInfo()
      },
      subOperations: [...this.subOperations]
    };

    this.metrics.push(metric);
    this.emit('operation:end', metric);

    // Reset state
    this.currentOperation = null;
    this.subOperations = [];

    // Check if we need to flush
    if (this.metrics.length >= (this.options.maxMetricsInMemory || 1000)) {
      this.flush();
    }

    return metric;
  }

  /**
   * Record an error during operation
   */
  recordError(error: Error) {
    if (this.currentOperation) {
      this.emit('operation:error', { 
        operation: this.currentOperation, 
        error: error.message,
        stack: error.stack 
      });
    }
  }

  /**
   * Get collected metrics
   */
  getMetrics(): PerformanceMetric[] {
    return [...this.metrics];
  }

  /**
   * Flush metrics to storage and clear memory
   */
  flush() {
    const metricsToFlush = [...this.metrics];
    this.metrics = [];
    this.emit('metrics:flush', metricsToFlush);
    return metricsToFlush;
  }

  /**
   * Get real-time statistics
   */
  getRealtimeStats() {
    const stats = {
      totalOperations: this.metrics.length,
      averageDuration: 0,
      averageMemory: 0,
      operationBreakdown: new Map<string, { count: number; totalDuration: number }>(),
      backendComparison: {
        snarky: { count: 0, totalDuration: 0, avgDuration: 0 },
        sparky: { count: 0, totalDuration: 0, avgDuration: 0 }
      }
    };

    let totalDuration = 0;
    let totalMemory = 0;

    for (const metric of this.metrics) {
      totalDuration += metric.duration;
      totalMemory += metric.memory.heapUsed;

      // Operation breakdown
      const opStats = stats.operationBreakdown.get(metric.operation) || { count: 0, totalDuration: 0 };
      opStats.count++;
      opStats.totalDuration += metric.duration;
      stats.operationBreakdown.set(metric.operation, opStats);

      // Backend comparison
      const backendStats = stats.backendComparison[metric.backend];
      backendStats.count++;
      backendStats.totalDuration += metric.duration;
    }

    if (this.metrics.length > 0) {
      stats.averageDuration = totalDuration / this.metrics.length;
      stats.averageMemory = totalMemory / this.metrics.length;
      
      if (stats.backendComparison.snarky.count > 0) {
        stats.backendComparison.snarky.avgDuration = 
          stats.backendComparison.snarky.totalDuration / stats.backendComparison.snarky.count;
      }
      
      if (stats.backendComparison.sparky.count > 0) {
        stats.backendComparison.sparky.avgDuration = 
          stats.backendComparison.sparky.totalDuration / stats.backendComparison.sparky.count;
      }
    }

    return stats;
  }

  /**
   * Setup performance observer for detailed profiling
   */
  private setupPerformanceObserver() {
    if (!this.options.enableDetailedProfiling) return;

    this.observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        this.emit('performance:entry', {
          name: entry.name,
          type: entry.entryType,
          duration: entry.duration,
          startTime: entry.startTime
        });
      }
    });

    this.observer.observe({ entryTypes: ['measure', 'mark', 'function'] });
  }

  /**
   * Setup GC tracking
   */
  private setupGCTracking() {
    if (!this.options.enableGCTracking) return;

    const obs = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === 'gc') {
          this.emit('gc:event', {
            kind: (entry as any).kind,
            duration: entry.duration,
            timestamp: entry.startTime
          });
        }
      }
    });

    try {
      obs.observe({ entryTypes: ['gc'] });
    } catch (e) {
      // GC tracking might not be available
      console.warn('GC tracking not available');
    }
  }

  /**
   * Get environment information
   */
  private getEnvironmentInfo(): EnvironmentInfo {
    const cpus = os.cpus();
    return {
      platform: os.platform(),
      arch: os.arch(),
      nodeVersion: process.version,
      cpuModel: cpus[0]?.model || 'unknown',
      cpuCores: cpus.length,
      totalMemory: os.totalmem(),
      freeMemory: os.freemem()
    };
  }

  /**
   * Cleanup resources
   */
  destroy() {
    if (this.observer) {
      this.observer.disconnect();
    }
    this.removeAllListeners();
  }
}

/**
 * Create a performance collector with sensible defaults
 */
export function createPerformanceCollector(options?: any) {
  return new PerformanceCollector({
    flushInterval: 5000,
    maxMetricsInMemory: 1000,
    enableDetailedProfiling: true,
    enableGCTracking: true,
    ...options
  });
}