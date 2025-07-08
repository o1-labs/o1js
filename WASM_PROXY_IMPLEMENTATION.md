# WASM Proxy Implementation Guide
Created: 2025-01-08 02:43:00 UTC
Last Modified: 2025-01-08 02:43:00 UTC

## Overview

This guide provides step-by-step instructions to implement a WASM proxy that prevents memory exhaustion by swapping between two WASM instances.

## Prerequisites

1. Understanding of o1js architecture (JS → OCaml → WASM → Rayon)
2. Node.js Worker Threads knowledge
3. TypeScript/JavaScript Proxy API
4. ~2 days for initial implementation, 1 week for production hardening

## File Structure

```
src/
├── bindings/
│   ├── js/
│   │   ├── node/
│   │   │   ├── node-backend.js          # MODIFY: Replace wasm singleton
│   │   │   └── wasm-proxy.js            # CREATE: Main proxy implementation
│   │   └── web/
│   │       ├── web-backend.js           # MODIFY: Similar changes for web
│   │       └── wasm-proxy-web.js        # CREATE: Web version
│   └── compiled/
│       └── _node_bindings/
│           └── plonk_wasm.cjs            # Reference for types
└── lib/
    └── proof-system/
        ├── wasm-compilation-log.ts       # CREATE: Track compilations
        ├── wasm-instance-manager.ts      # CREATE: Manage instances
        └── wasm-proxy.test.ts            # CREATE: Tests

```

## Phase 1: Basic Proxy Infrastructure

### Step 1.1: Define Types and Interfaces

**Create: `src/bindings/js/wasm-types.d.ts`**

```typescript
// Type definitions for WASM module
export interface WasmModule {
  // Memory management
  default: (module?: WebAssembly.Module, memory?: WebAssembly.Memory) => Promise<void>;
  memory: () => WebAssembly.Memory;
  
  // Memory reporting (from our additions)
  get_memory_usage_mb?: () => number;
  get_critical_memory_threshold_mb?: () => number;
  
  // Thread pool
  initThreadPool: (numWorkers: number, source: string) => Promise<void>;
  exitThreadPool: () => Promise<void>;
  
  // SRS functions
  caml_fp_srs_create_parallel: (size: number) => WasmFpSrs;
  caml_fq_srs_create_parallel: (size: number) => WasmFqSrs;
  caml_fp_srs_get: (srs: WasmFpSrs) => unknown;
  caml_fq_srs_get: (srs: WasmFqSrs) => unknown;
  caml_fp_srs_set: (value: unknown) => WasmFpSrs;
  caml_fq_srs_set: (value: unknown) => WasmFqSrs;
  
  // Proof system
  caml_pasta_fp_plonk_prover_create: (...args: any[]) => any;
  caml_pasta_fq_plonk_prover_create: (...args: any[]) => any;
  
  // Add ALL other WASM exports here...
  // This is critical - miss one and proxy breaks
  [key: string]: any; // Fallback for dynamic access
}

export interface WasmProxyConfig {
  memoryWarningThreshold: number;  // Default: 0.7 (70%)
  memoryCriticalThreshold: number; // Default: 0.9 (90%)
  checkIntervalMs: number;         // Default: 5000
  maxPrepareTimeMs: number;        // Default: 60000
  enableLogging: boolean;          // Default: true
}
```

### Step 1.2: Create the Proxy Base

**Create: `src/bindings/js/node/wasm-proxy.js`**

```javascript
import { EventEmitter } from 'events';

export class WasmProxy extends EventEmitter {
  constructor(initialModule, config = {}) {
    super();
    
    this.config = {
      memoryWarningThreshold: 0.7,
      memoryCriticalThreshold: 0.9,
      checkIntervalMs: 5000,
      maxPrepareTimeMs: 60000,
      enableLogging: true,
      ...config
    };
    
    this.active = initialModule;
    this.standby = null;
    this.isPreparingStandby = false;
    this.swapInProgress = false;
    this.compilationLog = [];
    this.operationCounter = 0;
    this.activeOperations = new Set();
    
    // Create Proxy to intercept all property access
    return new Proxy(this, {
      get(target, prop, receiver) {
        // Handle our own methods
        if (prop in target && typeof target[prop] !== 'undefined') {
          const value = target[prop];
          return typeof value === 'function' ? value.bind(target) : value;
        }
        
        // Proxy to active WASM instance
        const activeValue = target.active[prop];
        
        // If it's a function, wrap it
        if (typeof activeValue === 'function') {
          return target.createProxiedFunction(prop, activeValue);
        }
        
        return activeValue;
      },
      
      set(target, prop, value) {
        // Forward sets to active instance
        target.active[prop] = value;
        return true;
      }
    });
  }
  
  createProxiedFunction(methodName, originalMethod) {
    const self = this;
    
    return function proxiedMethod(...args) {
      // Track active operations
      const opId = `${methodName}-${++self.operationCounter}`;
      self.activeOperations.add(opId);
      
      try {
        // Log compilation methods
        if (self.isCompilationMethod(methodName)) {
          self.logCompilation(methodName, args);
        }
        
        // Execute on active instance
        const result = originalMethod.apply(self.active, args);
        
        // Handle async results
        if (result && typeof result.then === 'function') {
          return result.finally(() => {
            self.activeOperations.delete(opId);
          });
        }
        
        self.activeOperations.delete(opId);
        return result;
        
      } catch (error) {
        self.activeOperations.delete(opId);
        throw error;
      }
    };
  }
  
  isCompilationMethod(methodName) {
    // These methods create state that must be replayed
    const compilationMethods = [
      'initThreadPool',
      'caml_fp_srs_create_parallel',
      'caml_fq_srs_create_parallel',
      'caml_pasta_fp_plonk_prover_create',
      'caml_pasta_fq_plonk_prover_create',
      'caml_fp_srs_set',
      'caml_fq_srs_set',
      'caml_fp_srs_set_lagrange_basis',
      'caml_fq_srs_set_lagrange_basis',
      // Add more as discovered
    ];
    
    return compilationMethods.includes(methodName);
  }
  
  logCompilation(methodName, args) {
    this.compilationLog.push({
      methodName,
      args: this.serializeArgs(args),
      timestamp: Date.now(),
      memoryBefore: this.getMemoryUsage()
    });
    
    if (this.config.enableLogging) {
      console.log(`[WasmProxy] Logged compilation: ${methodName}`);
    }
  }
  
  serializeArgs(args) {
    // Handle special cases where args contain non-serializable data
    return args.map(arg => {
      if (arg === null || arg === undefined) return arg;
      if (typeof arg === 'function') return '[Function]';
      if (typeof arg === 'object' && arg.constructor && arg.constructor.name.startsWith('Wasm')) {
        // WASM objects - store type for replay
        return { _wasmType: arg.constructor.name, _wasmId: arg._id || 'unknown' };
      }
      // TODO: Handle SharedArrayBuffer, other special types
      return arg;
    });
  }
  
  getMemoryUsage() {
    if (typeof this.active.get_memory_usage_mb === 'function') {
      return this.active.get_memory_usage_mb();
    }
    // Fallback: estimate from memory size
    const memory = this.active.memory();
    return (memory.buffer.byteLength / (1024 * 1024));
  }
}
```

### Step 1.3: Memory Monitoring

**Add to `wasm-proxy.js`:**

```javascript
startMemoryMonitoring() {
  if (this.memoryCheckInterval) return;
  
  this.memoryCheckInterval = setInterval(() => {
    const memoryMB = this.getMemoryUsage();
    const maxMemoryMB = this.getMaxMemory();
    const usage = memoryMB / maxMemoryMB;
    
    this.emit('memory-check', { memoryMB, maxMemoryMB, usage });
    
    // Warning threshold - start preparing standby
    if (usage > this.config.memoryWarningThreshold && 
        !this.standby && 
        !this.isPreparingStandby) {
      console.log(`[WasmProxy] Memory at ${(usage * 100).toFixed(1)}%, preparing standby...`);
      this.prepareStandby().catch(err => {
        console.error('[WasmProxy] Failed to prepare standby:', err);
        this.emit('error', err);
      });
    }
    
    // Critical threshold - swap if standby ready
    if (usage > this.config.memoryCriticalThreshold && 
        this.standby && 
        !this.swapInProgress) {
      console.log(`[WasmProxy] Memory critical at ${(usage * 100).toFixed(1)}%, swapping...`);
      this.swapInstances().catch(err => {
        console.error('[WasmProxy] Failed to swap instances:', err);
        this.emit('error', err);
      });
    }
  }, this.config.checkIntervalMs);
}

stopMemoryMonitoring() {
  if (this.memoryCheckInterval) {
    clearInterval(this.memoryCheckInterval);
    this.memoryCheckInterval = null;
  }
}

getMaxMemory() {
  if (typeof this.active.get_critical_memory_threshold_mb === 'function') {
    return this.active.get_critical_memory_threshold_mb();
  }
  // Defaults based on platform
  return typeof window !== 'undefined' && /iPhone|iPad/.test(navigator.userAgent) 
    ? 1024  // 1GB for iOS
    : 4096; // 4GB for desktop
}
```

## Phase 2: Instance Creation and Management

### Step 2.1: Create Instance Manager

**Create: `src/lib/proof-system/wasm-instance-manager.ts`**

```typescript
import { isMainThread } from 'worker_threads';

export interface WasmInstanceConfig {
  memory?: WebAssembly.Memory;
  module?: WebAssembly.Module;
  workerSource?: string;
}

export class WasmInstanceManager {
  private static instanceCounter = 0;
  
  static async createInstance(config: WasmInstanceConfig = {}): Promise<any> {
    const instanceId = ++this.instanceCounter;
    console.log(`[WasmInstance] Creating instance #${instanceId}`);
    
    if (!isMainThread) {
      throw new Error('Cannot create WASM instance in worker thread');
    }
    
    // Dynamic import to avoid circular dependencies
    const { default: createWasm } = await import('../../bindings/compiled/_node_bindings/plonk_wasm.cjs');
    const wasm = createWasm();
    
    // Allocate fresh memory if not provided
    const memory = config.memory || this.allocateMemory();
    
    // Initialize WASM module
    await wasm.default(config.module, memory);
    
    // Tag instance for tracking
    wasm._instanceId = instanceId;
    wasm._createdAt = Date.now();
    
    return wasm;
  }
  
  private static allocateMemory(): WebAssembly.Memory {
    const isIOS = typeof window !== 'undefined' && /iPhone|iPad/.test(navigator.userAgent);
    
    return new WebAssembly.Memory({
      initial: 19,
      maximum: isIOS ? 16384 : 65536, // 1GB or 4GB
      shared: true
    });
  }
  
  static async destroyInstance(instance: any): Promise<void> {
    if (!instance) return;
    
    console.log(`[WasmInstance] Destroying instance #${instance._instanceId}`);
    
    try {
      // Exit thread pool if initialized
      if (instance._threadPoolInitialized) {
        await instance.exitThreadPool();
      }
      
      // Clear any references
      // Note: Can't actually free WASM memory, but we can help GC
      if (instance.memory && typeof instance.memory === 'function') {
        const mem = instance.memory();
        // Clear our reference, let GC handle the rest
        delete instance.memory;
      }
      
      // Mark as destroyed
      instance._destroyed = true;
      
    } catch (error) {
      console.error('[WasmInstance] Error during cleanup:', error);
    }
  }
}
```

### Step 2.2: Implement Standby Preparation

**Add to `wasm-proxy.js`:**

```javascript
async prepareStandby() {
  if (this.isPreparingStandby || this.standby) {
    return;
  }
  
  this.isPreparingStandby = true;
  const startTime = Date.now();
  
  try {
    this.emit('standby-prepare-start');
    
    // Step 1: Create fresh instance
    const { WasmInstanceManager } = await import('../../lib/proof-system/wasm-instance-manager.js');
    this.standby = await WasmInstanceManager.createInstance();
    
    // Step 2: Replay compilation log
    console.log(`[WasmProxy] Replaying ${this.compilationLog.length} compilation steps...`);
    await this.replayCompilations(this.standby);
    
    const duration = Date.now() - startTime;
    console.log(`[WasmProxy] Standby prepared in ${duration}ms`);
    
    this.emit('standby-prepare-complete', { duration });
    
  } catch (error) {
    console.error('[WasmProxy] Failed to prepare standby:', error);
    
    // Clean up failed standby
    if (this.standby) {
      await WasmInstanceManager.destroyInstance(this.standby);
      this.standby = null;
    }
    
    this.emit('standby-prepare-error', error);
    throw error;
    
  } finally {
    this.isPreparingStandby = false;
  }
}

async replayCompilations(targetInstance) {
  const replayState = {
    srsCache: new Map(),
    circuitCache: new Map(),
    errors: []
  };
  
  for (const entry of this.compilationLog) {
    try {
      await this.replayEntry(targetInstance, entry, replayState);
    } catch (error) {
      console.error(`[WasmProxy] Failed to replay ${entry.methodName}:`, error);
      replayState.errors.push({ entry, error });
      
      // Decide whether to continue or abort
      if (this.shouldAbortReplay(entry, error)) {
        throw new Error(`Critical replay failure: ${error.message}`);
      }
    }
  }
  
  if (replayState.errors.length > 0) {
    console.warn(`[WasmProxy] Replay completed with ${replayState.errors.length} errors`);
  }
}

async replayEntry(targetInstance, entry, state) {
  const { methodName, args } = entry;
  
  // Special handling for different method types
  switch (methodName) {
    case 'initThreadPool':
      // Thread pool needs special handling
      await this.replayThreadPoolInit(targetInstance, args);
      break;
      
    case 'caml_fp_srs_create_parallel':
    case 'caml_fq_srs_create_parallel':
      // SRS can potentially be shared
      await this.replaySRSCreation(targetInstance, methodName, args, state);
      break;
      
    case 'caml_pasta_fp_plonk_prover_create':
    case 'caml_pasta_fq_plonk_prover_create':
      // Circuits must be replayed exactly
      await this.replayCircuitCreation(targetInstance, methodName, args, state);
      break;
      
    default:
      // Generic replay
      const deserializedArgs = this.deserializeArgs(args, targetInstance);
      targetInstance[methodName](...deserializedArgs);
  }
}
```

## Phase 3: State Replay Handlers

### Step 3.1: Thread Pool Replay

```javascript
async replayThreadPoolInit(targetInstance, originalArgs) {
  // Thread pool initialization is special - needs worker creation
  const [numWorkers, workerSource] = originalArgs;
  
  // Mark that we're initializing thread pool
  targetInstance._threadPoolInitialized = true;
  
  // Initialize with same parameters
  await targetInstance.initThreadPool(numWorkers, workerSource);
  
  console.log(`[WasmProxy] Replayed thread pool with ${numWorkers} workers`);
}
```

### Step 3.2: SRS Replay with Optimization

```javascript
async replaySRSCreation(targetInstance, methodName, args, state) {
  const [size] = args;
  const cacheKey = `${methodName}-${size}`;
  
  // Check if we can reuse SRS from active instance
  if (this.config.shareSRS && state.srsCache.has(cacheKey)) {
    console.log(`[WasmProxy] Reusing cached SRS for size ${size}`);
    const cachedSRS = state.srsCache.get(cacheKey);
    // TODO: Implement SRS deserialization into target
    return cachedSRS;
  }
  
  // Create fresh SRS
  console.log(`[WasmProxy] Recreating SRS for size ${size}...`);
  const startTime = Date.now();
  
  const srs = targetInstance[methodName](size);
  
  const duration = Date.now() - startTime;
  console.log(`[WasmProxy] SRS created in ${duration}ms`);
  
  // Cache for potential reuse
  state.srsCache.set(cacheKey, srs);
  
  return srs;
}
```

### Step 3.3: Circuit Compilation Replay

```javascript
async replayCircuitCreation(targetInstance, methodName, args, state) {
  // Circuits are complex - need careful replay
  console.log(`[WasmProxy] Replaying circuit compilation: ${methodName}`);
  
  // Deserialize arguments (some may reference other WASM objects)
  const deserializedArgs = this.deserializeArgs(args, targetInstance);
  
  // Execute compilation
  const result = targetInstance[methodName](...deserializedArgs);
  
  // Store mapping for future references
  if (result && typeof result === 'object') {
    // TODO: Track circuit ID mapping between instances
  }
  
  return result;
}

deserializeArgs(serializedArgs, targetInstance) {
  return serializedArgs.map(arg => {
    if (arg && arg._wasmType) {
      // Handle WASM object references
      // TODO: Implement object lookup/recreation
      console.warn(`[WasmProxy] Cannot deserialize ${arg._wasmType} - using null`);
      return null;
    }
    return arg;
  });
}
```

## Phase 4: Instance Swapping

### Step 4.1: Implement Atomic Swap

```javascript
async swapInstances() {
  if (this.swapInProgress || !this.standby) {
    return;
  }
  
  this.swapInProgress = true;
  const startTime = Date.now();
  
  try {
    this.emit('swap-start');
    
    // Step 1: Wait for active operations
    await this.waitForActiveOperations();
    
    // Step 2: Pause new operations
    this.pauseNewOperations = true;
    
    // Step 3: Atomic swap
    const oldInstance = this.active;
    this.active = this.standby;
    this.standby = null;
    
    // Step 4: Resume operations
    this.pauseNewOperations = false;
    
    // Step 5: Clean up old instance (async, don't wait)
    this.cleanupOldInstance(oldInstance);
    
    const duration = Date.now() - startTime;
    console.log(`[WasmProxy] Instance swap completed in ${duration}ms`);
    
    this.emit('swap-complete', { duration });
    
  } catch (error) {
    console.error('[WasmProxy] Swap failed:', error);
    this.pauseNewOperations = false;
    this.emit('swap-error', error);
    throw error;
    
  } finally {
    this.swapInProgress = false;
  }
}

async waitForActiveOperations(timeoutMs = 5000) {
  const startTime = Date.now();
  
  while (this.activeOperations.size > 0) {
    if (Date.now() - startTime > timeoutMs) {
      throw new Error(`Timeout waiting for ${this.activeOperations.size} operations`);
    }
    
    if (this.config.enableLogging) {
      console.log(`[WasmProxy] Waiting for ${this.activeOperations.size} operations...`);
    }
    
    await new Promise(resolve => setTimeout(resolve, 100));
  }
}

async cleanupOldInstance(instance) {
  try {
    const { WasmInstanceManager } = await import('../../lib/proof-system/wasm-instance-manager.js');
    await WasmInstanceManager.destroyInstance(instance);
    
    // Reset compilation log to only include entries after swap
    this.compilationLog = [];
    
  } catch (error) {
    console.error('[WasmProxy] Error cleaning up old instance:', error);
  }
}
```

## Phase 5: Integration

### Step 5.1: Modify node-backend.js

**File: `src/bindings/js/node/node-backend.js`**

```javascript
import { isMainThread, parentPort, workerData, Worker } from 'worker_threads';
import os from 'os';
import wasm_ from '../../compiled/_node_bindings/plonk_wasm.cjs';
import { WasmProxy } from './wasm-proxy.js';
import { fileURLToPath } from 'url';
import { WithThreadPool, workers } from '../../../lib/proof-system/workers.js';

// Create proxy instead of direct wasm reference
const wasm = new WasmProxy(wasm_, {
  memoryWarningThreshold: 0.7,
  memoryCriticalThreshold: 0.9,
  checkIntervalMs: 5000,
  enableLogging: true
});

// Start monitoring if in main thread
if (isMainThread) {
  wasm.startMemoryMonitoring();
  
  // Integrate with pool health coordinator
  wasm.on('swap-complete', () => {
    if (globalThis.poolHealthCoordinator) {
      console.log('[WasmProxy] Triggering thread pool recycle after WASM swap');
      globalThis.poolHealthCoordinator.forceRecycling('wasm_swapped');
    }
  });
}

export { wasm, withThreadPool };

// ... rest of file remains the same
```

### Step 5.2: Handle Edge Cases

**Add to `wasm-proxy.js`:**

```javascript
// Handle operations that try to execute during pause
createProxiedFunction(methodName, originalMethod) {
  const self = this;
  
  return async function proxiedMethod(...args) {
    // Wait if operations are paused
    while (self.pauseNewOperations) {
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    
    // ... rest of implementation
  };
}

// Handle proxy errors gracefully
handleProxyError(error, methodName) {
  console.error(`[WasmProxy] Error in ${methodName}:`, error);
  
  // Check if error is due to memory exhaustion
  if (error.message && error.message.includes('memory')) {
    // Try emergency swap if standby is ready
    if (this.standby && !this.swapInProgress) {
      console.log('[WasmProxy] Emergency swap triggered by error');
      this.swapInstances().catch(e => {
        console.error('[WasmProxy] Emergency swap failed:', e);
      });
    }
  }
  
  throw error;
}
```

## Phase 6: Testing

### Step 6.1: Unit Tests

**Create: `src/lib/proof-system/wasm-proxy.test.ts`**

```typescript
import { describe, test, expect, jest } from '@jest/globals';
import { WasmProxy } from '../../bindings/js/node/wasm-proxy.js';

describe('WASM Proxy', () => {
  let mockWasm;
  let proxy;
  
  beforeEach(() => {
    // Create mock WASM module
    mockWasm = {
      get_memory_usage_mb: jest.fn(() => 500),
      get_critical_memory_threshold_mb: jest.fn(() => 4096),
      initThreadPool: jest.fn(),
      exitThreadPool: jest.fn(),
      caml_fp_srs_create_parallel: jest.fn((size) => ({ size })),
      someMethod: jest.fn((a, b) => a + b)
    };
    
    proxy = new WasmProxy(mockWasm, {
      checkIntervalMs: 100,
      enableLogging: false
    });
  });
  
  test('should proxy method calls to active instance', () => {
    const result = proxy.someMethod(1, 2);
    expect(result).toBe(3);
    expect(mockWasm.someMethod).toHaveBeenCalledWith(1, 2);
  });
  
  test('should track compilation methods', () => {
    proxy.caml_fp_srs_create_parallel(1024);
    
    expect(proxy.compilationLog).toHaveLength(1);
    expect(proxy.compilationLog[0]).toMatchObject({
      methodName: 'caml_fp_srs_create_parallel',
      args: [1024]
    });
  });
  
  test('should prepare standby when memory warning threshold reached', async () => {
    // Mock high memory usage
    mockWasm.get_memory_usage_mb.mockReturnValue(3000);
    
    proxy.startMemoryMonitoring();
    
    // Wait for monitoring to trigger
    await new Promise(resolve => setTimeout(resolve, 200));
    
    expect(proxy.isPreparingStandby).toBe(true);
    
    proxy.stopMemoryMonitoring();
  });
});
```

### Step 6.2: Integration Tests

```typescript
describe('WASM Proxy Integration', () => {
  test('should successfully swap instances', async () => {
    // This test requires real WASM modules
    const wasm1 = await createTestWasmInstance();
    const proxy = new WasmProxy(wasm1);
    
    // Perform some operations
    proxy.initThreadPool(2, 'test-worker.js');
    proxy.caml_fp_srs_create_parallel(1024);
    
    // Manually trigger standby preparation
    await proxy.prepareStandby();
    expect(proxy.standby).toBeDefined();
    
    // Trigger swap
    await proxy.swapInstances();
    
    // Verify active instance changed
    expect(proxy.active).not.toBe(wasm1);
    expect(proxy.standby).toBeNull();
    
    // Verify operations still work
    const srs = proxy.caml_fp_srs_create_parallel(2048);
    expect(srs).toBeDefined();
  });
});
```

## Phase 7: Monitoring and Metrics

### Step 7.1: Add Telemetry

```javascript
class WasmProxy {
  constructor(initialModule, config = {}) {
    // ... existing code ...
    
    this.metrics = {
      swapCount: 0,
      totalSwapDuration: 0,
      failedPrepares: 0,
      operationCounts: new Map(),
      memorySnapshots: []
    };
  }
  
  recordMetric(metric, value) {
    switch (metric) {
      case 'swap':
        this.metrics.swapCount++;
        this.metrics.totalSwapDuration += value;
        break;
      case 'prepare-failed':
        this.metrics.failedPrepares++;
        break;
      case 'memory':
        this.metrics.memorySnapshots.push({
          timestamp: Date.now(),
          value
        });
        // Keep last 100 snapshots
        if (this.metrics.memorySnapshots.length > 100) {
          this.metrics.memorySnapshots.shift();
        }
        break;
    }
  }
  
  getMetrics() {
    return {
      ...this.metrics,
      averageSwapDuration: this.metrics.swapCount > 0 
        ? this.metrics.totalSwapDuration / this.metrics.swapCount 
        : 0,
      currentMemoryMB: this.getMemoryUsage(),
      uptimeMs: Date.now() - this.active._createdAt
    };
  }
}
```

## Phase 8: Production Deployment

### Step 8.1: Feature Flag

```javascript
// Enable proxy with environment variable
const ENABLE_WASM_PROXY = process.env.O1JS_ENABLE_WASM_PROXY === 'true';

const wasm = ENABLE_WASM_PROXY 
  ? new WasmProxy(wasm_, config)
  : wasm_;
```

### Step 8.2: Rollback Plan

1. Set `O1JS_ENABLE_WASM_PROXY=false`
2. Restart application
3. Monitor for memory issues returning

### Step 8.3: Gradual Rollout

1. **Week 1**: Deploy to internal testing (5% of traffic)
2. **Week 2**: Expand to 25% if metrics are good
3. **Week 3**: 50% rollout
4. **Week 4**: Full rollout if stable

## Debugging Guide

### Common Issues

1. **Replay Failures**
   - Check compilation log for non-deterministic operations
   - Verify all WASM methods are proxied
   - Look for missing state dependencies

2. **Memory Not Dropping After Swap**
   - Verify old instance cleanup
   - Check for lingering references
   - Monitor SharedArrayBuffer usage

3. **Performance Degradation**
   - Tune memory thresholds
   - Optimize replay speed
   - Consider SRS caching

### Debug Commands

```javascript
// Get proxy state
console.log(wasm.getDebugInfo());

// Force standby preparation
await wasm.prepareStandby();

// Manual swap
await wasm.swapInstances();

// View metrics
console.log(wasm.getMetrics());
```

## Success Criteria

1. **No memory panics** in production for 30 days
2. **Swap success rate** > 99%
3. **Average swap time** < 60 seconds
4. **No proof failures** during or after swaps
5. **Memory usage** returns to baseline after each swap

## Future Improvements

1. **Parallel Standby Preparation**: Prepare multiple operations in parallel
2. **Predictive Preparation**: Start standby based on memory growth rate
3. **SRS Deduplication**: Share SRS between instances via SharedArrayBuffer
4. **Circuit Caching**: Serialize and restore compiled circuits
5. **Multi-Instance Pool**: Maintain pool of instances, not just 2

This implementation guide provides a complete roadmap for implementing the WASM proxy pattern. The key is careful state tracking and thorough testing before production deployment.