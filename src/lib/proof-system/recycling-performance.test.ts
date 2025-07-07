/**
 * Performance Validation Tests for Pool Recycling System
 * 
 * Ensures that the health monitoring and recycling system has minimal
 * performance overhead during normal operation.
 */

import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { PoolHealthCoordinator } from './pool-health-coordinator';
import { SimpleWorkerHealthReporter } from './worker-health-reporter';

describe('Pool Recycling Performance', () => {
  let coordinator: PoolHealthCoordinator;

  beforeEach(() => {
    // Clean up global state
    delete (globalThis as any).__o1js_pool_recycling;
    delete (globalThis as any).__o1js_force_pool_shutdown;
    delete (globalThis as any).poolHealthCoordinator;
    
    coordinator = new PoolHealthCoordinator({
      criticalMemoryMB: 5000, // High threshold to avoid recycling during perf tests
      maxPoolAgeMs: 300000,   // 5 minutes
      gracefulShutdownTimeoutMs: 1000
    });
  });

  afterEach(async () => {
    if (coordinator) {
      await coordinator.waitForRecyclingToComplete();
    }
    
    delete (globalThis as any).__o1js_pool_recycling;
    delete (globalThis as any).__o1js_force_pool_shutdown;
    delete (globalThis as any).poolHealthCoordinator;
  });

  test('should have minimal overhead for health report processing', () => {
    const iterations = 10000;
    const reports = Array.from({ length: iterations }, (_, i) => ({
      workerId: `worker-${i % 4}`, // 4 workers
      memoryUsageMB: 100 + (i % 500), // Vary memory 100-600MB
      isMemoryCritical: false,
      timestamp: Date.now()
    }));

    // Baseline - simple object processing
    const baselineStart = performance.now();
    for (let i = 0; i < iterations; i++) {
      const report = reports[i];
      // Simulate minimal processing
      const processed = {
        ...report,
        processed: true
      };
    }
    const baselineEnd = performance.now();
    const baselineTime = baselineEnd - baselineStart;

    // Test with coordinator processing
    const coordinatorStart = performance.now();
    for (let i = 0; i < iterations; i++) {
      coordinator.receiveHealthReport(reports[i]);
    }
    const coordinatorEnd = performance.now();
    const coordinatorTime = coordinatorEnd - coordinatorStart;

    const overhead = ((coordinatorTime - baselineTime) / baselineTime) * 100;
    
    console.log(`Baseline: ${baselineTime.toFixed(2)}ms`);
    console.log(`Coordinator: ${coordinatorTime.toFixed(2)}ms`);
    console.log(`Overhead: ${overhead.toFixed(2)}%`);

    // Should have less than 50% overhead for health report processing
    expect(overhead).toBeLessThan(50);
  });

  test('should efficiently handle concurrent health reports', async () => {
    const workersCount = 8;
    const reportsPerWorker = 1000;
    
    const startTime = performance.now();
    
    // Simulate concurrent health reports from multiple workers
    const promises = Array.from({ length: workersCount }, async (_, workerIndex) => {
      for (let i = 0; i < reportsPerWorker; i++) {
        coordinator.receiveHealthReport({
          workerId: `worker-${workerIndex}`,
          memoryUsageMB: 200 + (i % 300),
          isMemoryCritical: false,
          timestamp: Date.now()
        });
        
        // Small delay to simulate real reporting interval
        if (i % 100 === 0) {
          await new Promise(resolve => setTimeout(resolve, 1));
        }
      }
    });
    
    await Promise.all(promises);
    
    const endTime = performance.now();
    const totalTime = endTime - startTime;
    const totalReports = workersCount * reportsPerWorker;
    const reportsPerSecond = (totalReports / totalTime) * 1000;
    
    console.log(`Processed ${totalReports} reports in ${totalTime.toFixed(2)}ms`);
    console.log(`Rate: ${reportsPerSecond.toFixed(0)} reports/second`);
    
    // Should process at least 10,000 reports per second
    expect(reportsPerSecond).toBeGreaterThan(10000);
  });

  test('should have minimal memory footprint for health data', () => {
    const workersCount = 16;
    const reportsPerWorker = 100;
    
    // Measure memory before
    if (typeof process !== 'undefined' && process.memoryUsage) {
      const memBefore = process.memoryUsage();
      
      // Send lots of health reports
      for (let worker = 0; worker < workersCount; worker++) {
        for (let report = 0; report < reportsPerWorker; report++) {
          coordinator.receiveHealthReport({
            workerId: `worker-${worker}`,
            memoryUsageMB: 200 + report,
            isMemoryCritical: false,
            timestamp: Date.now() + report
          });
        }
      }
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
      
      const memAfter = process.memoryUsage();
      const heapIncrease = memAfter.heapUsed - memBefore.heapUsed;
      const heapIncreaseMB = heapIncrease / (1024 * 1024);
      
      console.log(`Heap increase: ${heapIncreaseMB.toFixed(2)}MB for ${workersCount * reportsPerWorker} reports`);
      
      // Should use less than 10MB for tracking this amount of data
      expect(heapIncreaseMB).toBeLessThan(10);
    }
  });

  test('should quickly detect critical conditions', () => {
    const iterations = 1000;
    
    const startTime = performance.now();
    
    for (let i = 0; i < iterations; i++) {
      coordinator.receiveHealthReport({
        workerId: `worker-${i % 4}`,
        memoryUsageMB: i < iterations - 1 ? 100 : 6000, // Last one is critical
        isMemoryCritical: i >= iterations - 1,
        timestamp: Date.now()
      });
    }
    
    const endTime = performance.now();
    const detectionTime = endTime - startTime;
    
    console.log(`Critical condition detected in ${detectionTime.toFixed(2)}ms over ${iterations} reports`);
    
    // Should detect critical condition quickly (under 50ms for this test)
    expect(detectionTime).toBeLessThan(50);
    expect(coordinator.isPoolRecycling()).toBe(true);
  });
});

describe('Worker Health Reporter Performance', () => {
  let reporter: SimpleWorkerHealthReporter;

  beforeEach(() => {
    reporter = new SimpleWorkerHealthReporter('test-worker');
  });

  afterEach(() => {
    if (reporter) {
      reporter.stop();
    }
  });

  test('should have minimal startup overhead', () => {
    const iterations = 1000;
    
    const startTime = performance.now();
    
    for (let i = 0; i < iterations; i++) {
      const testReporter = new SimpleWorkerHealthReporter(`test-worker-${i}`);
      testReporter.stop(); // Immediately stop to avoid running
    }
    
    const endTime = performance.now();
    const creationTime = endTime - startTime;
    const timePerCreation = creationTime / iterations;
    
    console.log(`Average reporter creation time: ${timePerCreation.toFixed(3)}ms`);
    
    // Should create reporters quickly (less than 1ms each)
    expect(timePerCreation).toBeLessThan(1);
  });

  test('should handle configuration changes efficiently', () => {
    const iterations = 10000;
    
    const startTime = performance.now();
    
    for (let i = 0; i < iterations; i++) {
      reporter.setReportInterval(1000 + (i % 5000)); // Vary interval
    }
    
    const endTime = performance.now();
    const configTime = endTime - startTime;
    
    console.log(`Configuration changes took ${configTime.toFixed(2)}ms for ${iterations} operations`);
    
    // Should handle config changes quickly
    expect(configTime).toBeLessThan(100);
  });

  test('should efficiently format health reports', async () => {
    const iterations = 1000;
    
    // Mock WASM functions for consistent testing
    const mockWasmModule = {
      get_memory_usage_mb: () => 500,
      is_memory_approaching_critical: () => false
    };
    
    const startTime = performance.now();
    
    for (let i = 0; i < iterations; i++) {
      // Test the health report generation logic
      await reporter.sendImmediateReport();
    }
    
    const endTime = performance.now();
    const reportTime = endTime - startTime;
    const timePerReport = reportTime / iterations;
    
    console.log(`Average report generation time: ${timePerReport.toFixed(3)}ms`);
    
    // Should generate reports quickly (less than 5ms each)
    expect(timePerReport).toBeLessThan(5);
  });
});

describe('Integration Performance', () => {
  test('should maintain low overhead in realistic scenario', async () => {
    const coordinator = new PoolHealthCoordinator({
      criticalMemoryMB: 3000,
      maxPoolAgeMs: 600000
    });
    
    const workers = Array.from({ length: 4 }, (_, i) => 
      new SimpleWorkerHealthReporter(`worker-${i}`)
    );
    
    // Set fast reporting for testing
    workers.forEach(worker => worker.setReportInterval(10)); // 10ms intervals
    
    const startTime = performance.now();
    
    // Start all reporters
    workers.forEach(worker => worker.start());
    
    // Let them run for a short time
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Stop all reporters
    workers.forEach(worker => worker.stop());
    
    const endTime = performance.now();
    const runTime = endTime - startTime;
    
    console.log(`Integration test run time: ${runTime.toFixed(2)}ms`);
    
    // Should complete integration test quickly
    expect(runTime).toBeLessThan(200);
    expect(coordinator.isPoolRecycling()).toBe(false);
    
    await coordinator.waitForRecyclingToComplete();
  });

  test('should handle stress conditions gracefully', async () => {
    const coordinator = new PoolHealthCoordinator({
      criticalMemoryMB: 100, // Very low threshold to trigger recycling
      maxPoolAgeMs: 50,      // Very short age limit
      gracefulShutdownTimeoutMs: 10
    });
    
    const startTime = performance.now();
    
    // Rapidly send reports that will trigger recycling
    for (let i = 0; i < 100; i++) {
      coordinator.receiveHealthReport({
        workerId: `worker-${i % 4}`,
        memoryUsageMB: 150, // Above threshold
        isMemoryCritical: true,
        timestamp: Date.now()
      });
    }
    
    // Wait for recycling to complete
    await coordinator.waitForRecyclingToComplete();
    
    const endTime = performance.now();
    const stressTime = endTime - startTime;
    
    console.log(`Stress test completed in ${stressTime.toFixed(2)}ms`);
    
    // Should handle stress conditions within reasonable time
    expect(stressTime).toBeLessThan(1000);
    expect(coordinator.isPoolRecycling()).toBe(false);
  });
});