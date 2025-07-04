/**
 * Aggressive Memory Management for Sparky Testing
 * 
 * Implements fast-failure memory management with 600MB limits per process.
 * Designed to catch memory issues early and prevent system overwhelm.
 */

export interface MemoryUsage {
  heapUsed: number;
  heapTotal: number;
  external: number;
  rss: number;
  timestamp: number;
}

export interface MemoryThresholds {
  softLimitMB: number;
  hardLimitMB: number;
  checkIntervalMs: number;
}

export class MemoryManager {
  private memoryThresholds: MemoryThresholds;
  private checkInterval: NodeJS.Timeout | null = null;
  private memoryHistory: MemoryUsage[] = [];
  private maxHistorySize = 100;
  private onMemoryExceeded?: (usage: MemoryUsage) => void;

  constructor(
    limitMB: number = 600,
    aggressiveMode: boolean = true,
    onMemoryExceeded?: (usage: MemoryUsage) => void
  ) {
    this.memoryThresholds = {
      softLimitMB: Math.floor(limitMB * 0.8), // 80% of limit for warnings
      hardLimitMB: limitMB,                   // Hard limit for fast failure
      checkIntervalMs: aggressiveMode ? 1000 : 5000 // Check every 1s in aggressive mode
    };
    this.onMemoryExceeded = onMemoryExceeded;
  }

  /**
   * Start aggressive memory monitoring
   */
  startMonitoring(): void {
    if (this.checkInterval) {
      return; // Already monitoring
    }

    console.log(`🧠 Memory monitoring started: ${this.memoryThresholds.hardLimitMB}MB limit`);
    
    this.checkInterval = setInterval(() => {
      this.checkMemoryUsage();
    }, this.memoryThresholds.checkIntervalMs);

    // Also check immediately
    this.checkMemoryUsage();
  }

  /**
   * Stop memory monitoring
   */
  stopMonitoring(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
      console.log('🧠 Memory monitoring stopped');
    }
  }

  /**
   * Check current memory usage and enforce limits
   */
  checkMemoryUsage(): MemoryUsage {
    const usage = this.getCurrentMemoryUsage();
    this.recordMemoryUsage(usage);

    const heapUsedMB = usage.heapUsed / 1024 / 1024;
    const rssMB = usage.rss / 1024 / 1024;

    // Use the higher of heap used or RSS for limits
    const currentUsageMB = Math.max(heapUsedMB, rssMB);

    // Hard limit - immediate failure
    if (currentUsageMB > this.memoryThresholds.hardLimitMB) {
      const error = new Error(
        `MEMORY LIMIT EXCEEDED: ${currentUsageMB.toFixed(1)}MB > ${this.memoryThresholds.hardLimitMB}MB\n` +
        `Heap Used: ${heapUsedMB.toFixed(1)}MB\n` +
        `RSS: ${rssMB.toFixed(1)}MB\n` +
        `This indicates a large circuit or memory leak. Consider:\n` +
        `1. Splitting the test into smaller parts\n` +
        `2. Increasing memory limit: SPARKY_TEST_MEMORY_LIMIT_MB=${this.memoryThresholds.hardLimitMB + 200}\n` +
        `3. Using less aggressive monitoring: SPARKY_TEST_AGGRESSIVE_MEMORY=false`
      );

      if (this.onMemoryExceeded) {
        this.onMemoryExceeded(usage);
      }

      throw error;
    }

    // Soft limit - warning
    if (currentUsageMB > this.memoryThresholds.softLimitMB) {
      console.warn(
        `⚠️  Memory warning: ${currentUsageMB.toFixed(1)}MB / ${this.memoryThresholds.hardLimitMB}MB ` +
        `(${((currentUsageMB / this.memoryThresholds.hardLimitMB) * 100).toFixed(1)}%)`
      );
    }

    return usage;
  }

  /**
   * Get current memory usage
   */
  private getCurrentMemoryUsage(): MemoryUsage {
    const memUsage = process.memoryUsage();
    return {
      heapUsed: memUsage.heapUsed,
      heapTotal: memUsage.heapTotal,
      external: memUsage.external,
      rss: memUsage.rss,
      timestamp: Date.now()
    };
  }

  /**
   * Record memory usage in history
   */
  private recordMemoryUsage(usage: MemoryUsage): void {
    this.memoryHistory.push(usage);
    
    // Keep history bounded
    if (this.memoryHistory.length > this.maxHistorySize) {
      this.memoryHistory.shift();
    }
  }

  /**
   * Get memory usage statistics
   */
  getMemoryStats(): {
    current: MemoryUsage;
    peak: MemoryUsage;
    average: MemoryUsage;
    trend: 'increasing' | 'decreasing' | 'stable';
  } {
    if (this.memoryHistory.length === 0) {
      const current = this.getCurrentMemoryUsage();
      return {
        current,
        peak: current,
        average: current,
        trend: 'stable'
      };
    }

    const current = this.memoryHistory[this.memoryHistory.length - 1];
    
    // Find peak usage
    const peak = this.memoryHistory.reduce((max, usage) => 
      usage.heapUsed > max.heapUsed ? usage : max
    );

    // Calculate average
    const totalHeap = this.memoryHistory.reduce((sum, usage) => sum + usage.heapUsed, 0);
    const totalRss = this.memoryHistory.reduce((sum, usage) => sum + usage.rss, 0);
    const average: MemoryUsage = {
      heapUsed: totalHeap / this.memoryHistory.length,
      heapTotal: 0,
      external: 0,
      rss: totalRss / this.memoryHistory.length,
      timestamp: current.timestamp
    };

    // Determine trend (last 10 samples)
    let trend: 'increasing' | 'decreasing' | 'stable' = 'stable';
    if (this.memoryHistory.length >= 10) {
      const recent = this.memoryHistory.slice(-10);
      const firstHalf = recent.slice(0, 5);
      const secondHalf = recent.slice(5);
      
      const firstAvg = firstHalf.reduce((sum, u) => sum + u.heapUsed, 0) / firstHalf.length;
      const secondAvg = secondHalf.reduce((sum, u) => sum + u.heapUsed, 0) / secondHalf.length;
      
      const changePercent = ((secondAvg - firstAvg) / firstAvg) * 100;
      
      if (changePercent > 10) {
        trend = 'increasing';
      } else if (changePercent < -10) {
        trend = 'decreasing';
      }
    }

    return { current, peak, average, trend };
  }

  /**
   * Force garbage collection if available (for testing)
   */
  forceGarbageCollection(): void {
    if (global.gc) {
      console.log('🗑️  Forcing garbage collection');
      global.gc();
    } else {
      console.warn('⚠️  Garbage collection not available (run with --expose-gc for testing)');
    }
  }

  /**
   * Get memory usage report
   */
  getMemoryReport(): string {
    const stats = this.getMemoryStats();
    const currentMB = stats.current.heapUsed / 1024 / 1024;
    const peakMB = stats.peak.heapUsed / 1024 / 1024;
    const averageMB = stats.average.heapUsed / 1024 / 1024;
    const limitMB = this.memoryThresholds.hardLimitMB;
    
    return [
      '🧠 MEMORY USAGE REPORT',
      '━━━━━━━━━━━━━━━━━━━━━━━━',
      `Current: ${currentMB.toFixed(1)}MB / ${limitMB}MB (${((currentMB / limitMB) * 100).toFixed(1)}%)`,
      `Peak: ${peakMB.toFixed(1)}MB`,
      `Average: ${averageMB.toFixed(1)}MB`,
      `Trend: ${stats.trend}`,
      `Samples: ${this.memoryHistory.length}`
    ].join('\n');
  }

  /**
   * Create a memory manager with CI-optimized settings
   */
  static createCIOptimized(): MemoryManager {
    return new MemoryManager(500, true); // 500MB limit, aggressive monitoring
  }

  /**
   * Create a memory manager with development-optimized settings
   */
  static createDevOptimized(): MemoryManager {
    return new MemoryManager(600, true); // 600MB limit, aggressive monitoring
  }

  /**
   * Create a memory manager with conservative settings
   */
  static createConservative(): MemoryManager {
    return new MemoryManager(1000, false); // 1GB limit, less aggressive monitoring
  }
}