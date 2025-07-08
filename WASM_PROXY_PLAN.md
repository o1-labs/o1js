# WASM Proxy Pattern for Memory Management
Created: 2025-01-08 02:11:00 UTC
Last Modified: 2025-01-08 02:11:00 UTC

## Core Concept

Replace the singleton `wasm` with a proxy that manages two WASM instances:
- **Active**: Currently serving requests
- **Standby**: Being prepared as replacement

When memory approaches critical, prepare standby instance in background, then atomically swap.

## Architecture

```
┌─────────────────────────────────────────┐
│            WASM Proxy                   │
│  ┌─────────────┐  ┌─────────────┐      │
│  │   Active    │  │   Standby   │      │
│  │   WASM      │  │    WASM     │      │
│  │  Instance   │  │  Instance   │      │
│  └─────────────┘  └─────────────┘      │
│                                         │
│  - Forwards calls to active             │
│  - Tracks compilation state             │
│  - Monitors memory usage                │
│  - Prepares standby when needed         │
│  - Atomically swaps instances           │
└─────────────────────────────────────────┘
```

## Detailed Design

### 1. WASM Proxy Class

```typescript
class WasmProxy {
  private active: WasmInstance;
  private standby: WasmInstance | null = null;
  private compilationLog: CompilationLog;
  private isPreparingStandby = false;
  private swapInProgress = false;
  
  constructor() {
    this.active = await this.createFreshInstance();
    this.compilationLog = new CompilationLog();
  }
  
  // Proxy all WASM calls to active instance
  caml_pasta_fp_plonk_prover_create(...args) {
    return this.active.caml_pasta_fp_plonk_prover_create(...args);
  }
  // ... proxy all other methods
  
  async prepareStandby() {
    if (this.isPreparingStandby) return;
    this.isPreparingStandby = true;
    
    // Create fresh instance
    this.standby = await this.createFreshInstance();
    
    // Replay all compilations
    await this.compilationLog.replay(this.standby);
    
    this.isPreparingStandby = false;
  }
  
  async swapInstances() {
    this.swapInProgress = true;
    
    // Atomic swap
    const old = this.active;
    this.active = this.standby!;
    this.standby = null;
    
    // Clean up old instance
    await this.cleanup(old);
    
    this.swapInProgress = false;
  }
}
```

### 2. Compilation State Tracking

```typescript
interface CompilationEntry {
  type: 'srs' | 'circuit' | 'other';
  method: string;
  args: any[];
  result?: any;
  timestamp: number;
}

class CompilationLog {
  private entries: CompilationEntry[] = [];
  
  record(entry: CompilationEntry) {
    this.entries.push(entry);
  }
  
  async replay(wasmInstance: WasmInstance) {
    console.log(`Replaying ${this.entries.length} compilation steps...`);
    
    for (const entry of this.entries) {
      switch (entry.type) {
        case 'srs':
          await this.replaySRS(wasmInstance, entry);
          break;
        case 'circuit':
          await this.replayCircuit(wasmInstance, entry);
          break;
        // ... other types
      }
    }
  }
  
  private async replaySRS(instance: WasmInstance, entry: CompilationEntry) {
    // Special handling for SRS - can be cached/shared
    if (entry.method === 'caml_fp_srs_create_parallel') {
      const [size] = entry.args;
      instance[entry.method](size);
    }
  }
  
  private async replayCircuit(instance: WasmInstance, entry: CompilationEntry) {
    // Circuits need full recompilation
    // This is expensive but necessary
  }
}
```

### 3. Integration Points

```typescript
// node-backend.js
export { wasmProxy as wasm, withThreadPool };

const wasmProxy = new WasmProxy();

// Intercept key compilation methods
const originalMethods = {
  initThreadPool: wasmProxy.initThreadPool.bind(wasmProxy),
  compile: wasmProxy.compile.bind(wasmProxy),
  // ...
};

// Enhanced methods that track state
wasmProxy.initThreadPool = async function(...args) {
  this.compilationLog.record({
    type: 'other',
    method: 'initThreadPool',
    args,
    timestamp: Date.now()
  });
  return originalMethods.initThreadPool(...args);
};
```

### 4. Memory Monitoring & Triggering

```typescript
class WasmProxy {
  private async monitorMemory() {
    setInterval(async () => {
      const memoryMB = this.active.get_memory_usage_mb();
      const threshold = this.active.get_critical_memory_threshold_mb();
      
      if (memoryMB > threshold * 0.7 && !this.standby && !this.isPreparingStandby) {
        console.log('[WasmProxy] Memory at 70%, preparing standby instance...');
        this.prepareStandby(); // Don't await - run in background
      }
      
      if (memoryMB > threshold * 0.9 && this.standby && !this.swapInProgress) {
        console.log('[WasmProxy] Memory critical, swapping instances...');
        await this.swapInstances();
      }
    }, 5000);
  }
}
```

### 5. Handling In-Flight Operations

```typescript
class WasmProxy {
  private activeOperations = new Set<string>();
  
  // Wrap all operations
  async proveOperation(method: string, ...args: any[]) {
    const opId = crypto.randomUUID();
    this.activeOperations.add(opId);
    
    try {
      // Pin the instance for this operation
      const instance = this.active;
      return await instance[method](...args);
    } finally {
      this.activeOperations.delete(opId);
    }
  }
  
  async swapInstances() {
    // Wait for operations to complete
    while (this.activeOperations.size > 0) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Now safe to swap
    // ...
  }
}
```

## Implementation Phases

### Phase 1: Create Basic Proxy
1. Create WasmProxy class
2. Proxy all methods to active instance
3. Test that existing code works unchanged

### Phase 2: Add Compilation Tracking
1. Identify all compilation methods
2. Create CompilationLog
3. Record all compilations
4. Test replay functionality

### Phase 3: Implement Instance Swapping
1. Add standby instance creation
2. Implement replay mechanism
3. Add atomic swap logic
4. Test swap under load

### Phase 4: Add Memory Monitoring
1. Integrate memory reporting
2. Add threshold triggers
3. Background standby preparation
4. Automatic swapping

### Phase 5: Production Hardening
1. Handle edge cases
2. Add metrics and logging
3. Performance optimization
4. Extensive testing

## Advantages

1. **No Downtime**: Standby prepared in background
2. **Clean Memory**: Each swap gets fresh memory
3. **Transparent**: No changes to calling code
4. **Predictable**: Can control when swaps happen

## Challenges

1. **Double Memory**: Need 2x memory during preparation
2. **Compilation Time**: Replaying can take 30-60 seconds
3. **State Synchronization**: Must track all mutations
4. **Complexity**: More moving parts

## Alternative Approaches

### A. Worker Pool Rotation
- Have N workers, each with own WASM
- Rotate through them
- Simpler but uses N× memory

### B. Fork-on-Proof
- Fork process for each proof
- Child does proof, returns result, exits
- Clean but high overhead

### C. Compilation Cache Sharing
- Serialize compiled circuits to SharedArrayBuffer
- Share between instances
- Complex but faster swaps

## Key Optimization: SRS Sharing

Since SRS is read-only after creation, we can share it between instances:

```typescript
class WasmProxy {
  private srsCache = new Map<string, SharedArrayBuffer>();
  
  async createSRS(instance: WasmInstance, size: number) {
    const key = `srs-${size}`;
    
    // Check if we already have this SRS
    let srsBuffer = this.srsCache.get(key);
    
    if (!srsBuffer) {
      // Create in active instance
      const srs = instance.caml_fp_srs_create_parallel(size);
      // Serialize to SharedArrayBuffer
      srsBuffer = this.serializeSRS(srs);
      this.srsCache.set(key, srsBuffer);
    }
    
    // Deserialize into target instance
    return this.deserializeSRS(instance, srsBuffer);
  }
}
```

This optimization:
- Reduces memory usage during standby preparation
- Speeds up standby preparation (no SRS regeneration)
- SRS is often the largest memory consumer (100MB+)

## Memory Usage Analysis

Current: 
- Single instance: ~500MB baseline + leaks

With Proxy:
- During normal operation: ~500MB (1 instance)
- During preparation: ~1000MB (2 instances)
- After swap: ~500MB (back to 1 instance)

## Success Criteria

1. No WASM memory panics
2. Transparent to existing code
3. Swap time < 60 seconds
4. Memory usage returns to baseline after swap
5. No proof failures during swap

## Implementation Strategy

### Step 1: Create Proxy Infrastructure

```typescript
// wasm-proxy.ts
import type * as WasmModule from '../compiled/node_bindings/plonk_wasm.cjs';

export class WasmProxy implements WasmModule {
  private active: typeof WasmModule;
  
  constructor(initial: typeof WasmModule) {
    this.active = initial;
    
    // Use Proxy to forward all method calls
    return new Proxy(this, {
      get(target, prop) {
        if (prop in target) {
          return target[prop];
        }
        // Forward to active WASM instance
        const value = target.active[prop];
        if (typeof value === 'function') {
          return value.bind(target.active);
        }
        return value;
      }
    });
  }
}
```

### Step 2: Identify Compilation Methods

```typescript
const COMPILATION_METHODS = [
  'caml_fp_srs_create_parallel',
  'caml_fq_srs_create_parallel',
  'caml_pasta_fp_plonk_prover_create',
  'caml_pasta_fq_plonk_prover_create',
  // ... analyze codebase to find all
];
```

### Step 3: Modify Backend Integration

```typescript
// node-backend.js
import { WasmProxy } from './wasm-proxy.js';

const wasmModule = wasm_;
const wasm = new WasmProxy(wasmModule);

export { wasm, withThreadPool };
```

## Risk Mitigation

1. **Fallback Strategy**: If standby prep fails, continue with active
2. **Gradual Rollout**: Start with opt-in flag
3. **Metrics**: Track swap frequency, duration, success rate
4. **Circuit Fingerprinting**: Ensure replay produces identical circuits

## Next Steps

1. Prototype the basic proxy
2. Test with simple operations
3. Add compilation tracking
4. Implement full swapping
5. Stress test with real workloads

This approach is more complex than thread pool recycling but actually addresses the root problem of WASM memory exhaustion.

## Why This Is The Best Approach

After analyzing alternatives:

1. **Process Isolation**: Too much overhead per proof (~100ms startup)
2. **Worker Pool Rotation**: Uses N× memory constantly
3. **Hot Reload**: Not feasible with current architecture
4. **Proxy Pattern**: Best balance of feasibility and effectiveness

The proxy pattern with SRS sharing gives us:
- Clean memory state periodically
- Minimal disruption to existing code
- Acceptable performance impact
- Actually prevents panics

The complexity is worth it to prevent production outages from memory exhaustion.