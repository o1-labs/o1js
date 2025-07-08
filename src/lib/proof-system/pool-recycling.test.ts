/**
 * Pool Recycling System Tests
 * 
 * Tests the pool-level memory management and recycling system
 * to ensure WASM memory panics are prevented.
 */

import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { PoolHealthCoordinator, WorkerHealthReport } from './pool-health-coordinator';

describe('Pool Recycling System', () => {
  let coordinator: PoolHealthCoordinator;
  let mockExitThreadPool: jest.Mock;
  let mockInitThreadPool: jest.Mock;

  beforeEach(() => {
    // Clean up any global state
    delete (globalThis as any).__o1js_pool_recycling;
    delete (globalThis as any).__o1js_force_pool_shutdown;
    delete (globalThis as any).poolHealthCoordinator;
    
    // Create mock callbacks
    mockExitThreadPool = jest.fn().mockResolvedValue(undefined);
    mockInitThreadPool = jest.fn().mockResolvedValue(undefined);
    
    // Create fresh coordinator for each test
    coordinator = new PoolHealthCoordinator({
      criticalMemoryMB: 1000,
      maxPoolAgeMs: 10000, // 10 seconds for testing
      gracefulShutdownTimeoutMs: 1000, // 1 second for testing
      healthCheckIntervalMs: 100 // Fast checks for testing
    });
    
    // Set the mock callbacks
    coordinator.setRecyclingCallbacks({
      exitThreadPool: mockExitThreadPool,
      initThreadPool: mockInitThreadPool
    });
  });

  afterEach(async () => {
    // Wait for any ongoing recycling to complete
    if (coordinator) {
      await coordinator.waitForRecyclingToComplete();
    }
    
    // Clean up global state
    delete (globalThis as any).__o1js_pool_recycling;
    delete (globalThis as any).__o1js_force_pool_shutdown;
    delete (globalThis as any).poolHealthCoordinator;
  });

  test('should trigger recycling when any worker reports critical memory', async () => {
    // Simulate worker reporting critical memory
    const criticalReport: WorkerHealthReport = {
      workerId: 'worker-1',
      memoryUsageMB: 1200, // Above critical threshold of 1000MB
      isMemoryCritical: true,
      timestamp: Date.now()
    };

    coordinator.receiveHealthReport(criticalReport);

    // Should trigger recycling immediately
    expect(coordinator.isPoolRecycling()).toBe(true);
    
    // Wait for recycling to complete
    await coordinator.waitForRecyclingToComplete();
    expect(coordinator.isPoolRecycling()).toBe(false);
    
    // Verify that the Rayon pool was actually recycled
    expect(mockExitThreadPool).toHaveBeenCalledTimes(1);
    expect(mockInitThreadPool).toHaveBeenCalledTimes(1);
    
    // Verify exit was called before init
    const exitCallOrder = mockExitThreadPool.mock.invocationCallOrder[0];
    const initCallOrder = mockInitThreadPool.mock.invocationCallOrder[0];
    expect(exitCallOrder).toBeLessThan(initCallOrder);
  });

  test('should not trigger recycling for healthy workers', async () => {
    // Simulate healthy worker
    const healthyReport: WorkerHealthReport = {
      workerId: 'worker-1', 
      memoryUsageMB: 500, // Below threshold
      isMemoryCritical: false,
      timestamp: Date.now()
    };

    coordinator.receiveHealthReport(healthyReport);

    expect(coordinator.isPoolRecycling()).toBe(false);
  });

  test('should set global recycling flags during recycling', async () => {
    // Trigger recycling
    coordinator.receiveHealthReport({
      workerId: 'worker-1',
      memoryUsageMB: 1500,
      isMemoryCritical: true,
      timestamp: Date.now()
    });

    // Should set blocking flag immediately
    expect((globalThis as any).__o1js_pool_recycling).toBe(true);

    await coordinator.waitForRecyclingToComplete();

    // Flags should be cleared after recycling
    expect((globalThis as any).__o1js_pool_recycling).toBeUndefined();
    expect((globalThis as any).__o1js_force_pool_shutdown).toBeUndefined();
  });

  test('should trigger recycling based on pool age', async () => {
    // Create coordinator with very short max age
    const shortAgeCoordinator = new PoolHealthCoordinator({
      criticalMemoryMB: 2000,
      maxPoolAgeMs: 100, // 100ms
      gracefulShutdownTimeoutMs: 500
    });

    // Wait for pool to age beyond limit
    await new Promise(resolve => setTimeout(resolve, 150));

    // Send any health report to trigger age check
    shortAgeCoordinator.receiveHealthReport({
      workerId: 'worker-1',
      memoryUsageMB: 100, // Well below memory threshold
      isMemoryCritical: false,
      timestamp: Date.now()
    });

    expect(shortAgeCoordinator.isPoolRecycling()).toBe(true);
    await shortAgeCoordinator.waitForRecyclingToComplete();
  });

  test('should handle multiple workers and find critical one', async () => {
    // Send multiple healthy reports
    coordinator.receiveHealthReport({
      workerId: 'worker-1',
      memoryUsageMB: 300,
      isMemoryCritical: false,
      timestamp: Date.now()
    });

    coordinator.receiveHealthReport({
      workerId: 'worker-2', 
      memoryUsageMB: 400,
      isMemoryCritical: false,
      timestamp: Date.now()
    });

    expect(coordinator.isPoolRecycling()).toBe(false);

    // Now send one critical report
    coordinator.receiveHealthReport({
      workerId: 'worker-3',
      memoryUsageMB: 1100, // Critical
      isMemoryCritical: true,
      timestamp: Date.now()
    });

    expect(coordinator.isPoolRecycling()).toBe(true);
    await coordinator.waitForRecyclingToComplete();
  });

  test('should provide accurate health summary', () => {
    // Test with a new coordinator to avoid interference from other tests
    const summaryCoordinator = new PoolHealthCoordinator({
      criticalMemoryMB: 5000, // High threshold to avoid auto-recycling
      maxPoolAgeMs: 10000,
      gracefulShutdownTimeoutMs: 1000,
      healthCheckIntervalMs: 100
    });
    
    // Set mock callbacks for this coordinator too
    summaryCoordinator.setRecyclingCallbacks({
      exitThreadPool: jest.fn().mockResolvedValue(undefined),
      initThreadPool: jest.fn().mockResolvedValue(undefined)
    });

    // Send multiple reports with realistic values (none trigger recycling)
    summaryCoordinator.receiveHealthReport({
      workerId: 'worker-1',
      memoryUsageMB: 300,
      isMemoryCritical: false,
      timestamp: Date.now()
    });

    summaryCoordinator.receiveHealthReport({
      workerId: 'worker-2',
      memoryUsageMB: 400,
      isMemoryCritical: false, // Don't trigger recycling
      timestamp: Date.now()
    });

    summaryCoordinator.receiveHealthReport({
      workerId: 'worker-3',
      memoryUsageMB: 1500,
      isMemoryCritical: false, // Keep all non-critical
      timestamp: Date.now()
    });

    const summary = summaryCoordinator.getPoolHealthSummary();

    expect(summary.totalWorkers).toBe(3);
    expect(summary.totalMemoryMB).toBe(2200); // 300 + 400 + 1500
    expect(summary.criticalWorkers).toBe(0); // No workers flagged as critical
    expect(summary.isRecycling).toBe(false); // Not recycling
    expect(summary.shouldRecycle).toBe(false); // No recycling needed - all under threshold
    expect(typeof summary.poolAge).toBe('number'); // Age should be a number
  });

  test('should handle manual recycling trigger', async () => {
    expect(coordinator.isPoolRecycling()).toBe(false);

    const recyclingPromise = coordinator.forceRecycling('test');
    
    expect(coordinator.isPoolRecycling()).toBe(true);
    
    await recyclingPromise;
    
    expect(coordinator.isPoolRecycling()).toBe(false);
  });

  test('should update configuration at runtime', () => {
    const originalConfig = coordinator.getConfig();
    expect(originalConfig.criticalMemoryMB).toBe(1000);

    coordinator.updateConfig({
      criticalMemoryMB: 2000,
      maxPoolAgeMs: 20000
    });

    const updatedConfig = coordinator.getConfig();
    expect(updatedConfig.criticalMemoryMB).toBe(2000);
    expect(updatedConfig.maxPoolAgeMs).toBe(20000);
    expect(updatedConfig.gracefulShutdownTimeoutMs).toBe(1000); // Should preserve unchanged values
  });

  test('should handle concurrent recycling requests gracefully', async () => {
    // Trigger multiple recycling requests simultaneously
    const promise1 = coordinator.forceRecycling('test1');
    const promise2 = coordinator.forceRecycling('test2');
    const promise3 = coordinator.forceRecycling('test3');

    // All should resolve to the same recycling operation
    await Promise.all([promise1, promise2, promise3]);

    expect(coordinator.isPoolRecycling()).toBe(false);
  });

  test('should block new tasks during recycling', async () => {
    // Start recycling
    const recyclingPromise = coordinator.forceRecycling('test');
    
    // Check that blocking flag is set
    expect((globalThis as any).__o1js_pool_recycling).toBe(true);
    
    await recyclingPromise;
    
    // Blocking flag should be cleared
    expect((globalThis as any).__o1js_pool_recycling).toBeUndefined();
  });
});

describe('Worker Health Reporting Integration', () => {
  test('should handle invalid health reports gracefully', () => {
    const coordinator = new PoolHealthCoordinator();

    // Test with malformed reports
    expect(() => {
      coordinator.receiveHealthReport({
        workerId: '',
        memoryUsageMB: -1,
        isMemoryCritical: false,
        timestamp: 0
      });
    }).not.toThrow();

    expect(coordinator.isPoolRecycling()).toBe(false);
  });

  test('should handle very old health reports', () => {
    const coordinator = new PoolHealthCoordinator();

    // Send old report
    coordinator.receiveHealthReport({
      workerId: 'worker-1',
      memoryUsageMB: 2000,
      isMemoryCritical: true,
      timestamp: Date.now() - 3600000 // 1 hour ago
    });

    // Should still trigger recycling based on critical memory
    expect(coordinator.isPoolRecycling()).toBe(true);
  });
});