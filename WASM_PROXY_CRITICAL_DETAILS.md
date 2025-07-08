# WASM Proxy - Critical Implementation Details
Created: 2025-01-08 03:00:00 UTC
Last Modified: 2025-01-08 03:00:00 UTC

## Critical Discoveries from Investigation

### 1. All WASM Methods Must Be Proxied

The WASM module exports ~200+ methods. Missing even one breaks the proxy.

**Solution**: Use TypeScript to enumerate all methods:

```typescript
// scripts/extract-wasm-methods.ts
import wasm from '../src/bindings/compiled/_node_bindings/plonk_wasm.cjs';

const wasmInstance = wasm();
const methods = Object.getOwnPropertyNames(wasmInstance)
  .filter(prop => typeof wasmInstance[prop] === 'function')
  .sort();

console.log(`Found ${methods.length} WASM methods:`);
methods.forEach(m => console.log(`  ${m}`));

// Generate TypeScript interface
const interfaceCode = methods.map(m => 
  `  ${m}: (...args: any[]) => any;`
).join('\n');

console.log('\ninterface WasmModule {');
console.log(interfaceCode);
console.log('}');
```

### 2. SharedArrayBuffer Complications

Workers share the same WASM memory via SharedArrayBuffer. During swap:

```javascript
// PROBLEM: Both instances try to use same SharedArrayBuffer
const memory = new SharedArrayBuffer(size);
instance1.init(memory);  // OK
instance2.init(memory);  // CONFLICT!

// SOLUTION: Allocate new memory for standby
class WasmProxy {
  async prepareStandby() {
    // Standby gets its own memory
    const freshMemory = new WebAssembly.Memory({
      initial: 19,
      maximum: 65536,
      shared: true  // Still shared for workers
    });
    
    this.standby = await createInstance({ memory: freshMemory });
  }
}
```

### 3. Worker Thread Coordination

Workers hold references to the old WASM instance. Must coordinate:

```javascript
// In node-backend.js worker section
if (!isMainThread) {
  // Worker needs to handle instance swap notification
  parentPort.on('message', (msg) => {
    if (msg.type === 'wasm-swap') {
      // Refresh local wasm reference
      const newWasm = require(msg.wasmPath);
      globalThis.wasm = newWasm;
    }
  });
}

// In proxy swap
async swapInstances() {
  // ... swap logic ...
  
  // Notify all workers
  for (const worker of activeWorkers) {
    worker.postMessage({ 
      type: 'wasm-swap',
      wasmPath: this.active._modulePath
    });
  }
}
```

### 4. Compilation State Dependencies

Some compilations depend on previous results:

```javascript
// PROBLEM: Circuit compilation may reference SRS
const srs = wasm.caml_fp_srs_create_parallel(size);
const circuit = wasm.caml_pasta_fp_plonk_prover_create(srs, ...);

// SOLUTION: Track object dependencies
class CompilationLog {
  logEntry(method, args, result) {
    const entry = {
      id: generateId(),
      method,
      args: args.map(arg => this.serializeArg(arg)),
      resultId: result?._proxyId || null,
      dependencies: args
        .filter(arg => arg?._proxyId)
        .map(arg => arg._proxyId)
    };
    
    this.entries.push(entry);
    
    // Tag result for future reference
    if (result && typeof result === 'object') {
      result._proxyId = entry.id;
    }
  }
  
  async replay(newInstance) {
    const objectMap = new Map(); // old ID -> new object
    
    for (const entry of this.entries) {
      // Resolve dependencies
      const args = entry.args.map(arg => {
        if (arg?._proxyId && objectMap.has(arg._proxyId)) {
          return objectMap.get(arg._proxyId);
        }
        return arg;
      });
      
      // Execute
      const result = newInstance[entry.method](...args);
      
      // Map result
      if (entry.resultId) {
        objectMap.set(entry.resultId, result);
      }
    }
  }
}
```

### 5. OCaml Bridge State

The js_of_ocaml runtime maintains state outside WASM:

```javascript
// In web-backend.js
new Function(o1jsWebSrc)(); // Initializes OCaml runtime

// PROBLEM: This creates global state that references old WASM
// SOLUTION: Re-initialize OCaml bridge after swap

async swapInstances() {
  const oldInstance = this.active;
  this.active = this.standby;
  
  // Re-initialize OCaml bridge
  if (typeof window !== 'undefined') {
    // Web environment
    new Function(o1jsWebSrc)();
  }
  
  // Re-establish bindings
  overrideBindings(globalThis.plonk_wasm, this.active);
}
```

### 6. Deterministic Replay

Circuit compilation MUST produce identical results:

```javascript
// Add verification during replay
async replayCircuitCreation(instance, method, args, state) {
  const result = instance[method](...args);
  
  if (this.config.verifyReplay) {
    // Hash the circuit to ensure deterministic compilation
    const hash = await this.hashCircuit(result);
    
    if (state.circuitHashes.has(method)) {
      const expectedHash = state.circuitHashes.get(method);
      if (hash !== expectedHash) {
        throw new Error(`Circuit replay mismatch for ${method}`);
      }
    } else {
      state.circuitHashes.set(method, hash);
    }
  }
  
  return result;
}
```

### 7. Memory Measurement Accuracy

WASM memory reporting may be delayed or cached:

```javascript
getMemoryUsage() {
  // Force memory measurement update
  if (this.active.force_memory_update) {
    this.active.force_memory_update();
  }
  
  const reported = this.active.get_memory_usage_mb?.();
  const actual = this.active.memory().buffer.byteLength / (1024 * 1024);
  
  // Use maximum of reported vs actual
  return Math.max(reported || 0, actual);
}
```

### 8. Graceful Degradation

If standby preparation fails, continue with active:

```javascript
class WasmProxy {
  async prepareStandby() {
    try {
      // ... preparation logic ...
    } catch (error) {
      this.metrics.failedPrepares++;
      
      // Clean up partial standby
      if (this.standby) {
        await this.destroyInstance(this.standby);
        this.standby = null;
      }
      
      // Increase threshold to prevent immediate retry
      this.config.memoryWarningThreshold = Math.min(
        this.config.memoryWarningThreshold + 0.05,
        0.85
      );
      
      console.warn('[WasmProxy] Standby prep failed, continuing with active');
    }
  }
}
```

### 9. Testing Memory Exhaustion

```javascript
// test-utils/memory-leak-simulator.js
export function simulateMemoryLeak(wasm, leakRateMBPerOp = 10) {
  const allocations = [];
  
  // Monkey-patch a method to leak memory
  const original = wasm.caml_pasta_fp_plonk_prover_create;
  wasm.caml_pasta_fp_plonk_prover_create = function(...args) {
    // Allocate memory that won't be freed
    const leak = new ArrayBuffer(leakRateMBPerOp * 1024 * 1024);
    allocations.push(leak);
    
    // Call original
    return original.apply(this, args);
  };
  
  return {
    getLeakedMB: () => allocations.length * leakRateMBPerOp,
    cleanup: () => {
      wasm.caml_pasta_fp_plonk_prover_create = original;
      allocations.length = 0;
    }
  };
}
```

### 10. Production Monitoring

```javascript
// monitoring/wasm-proxy-monitor.js
export class WasmProxyMonitor {
  constructor(proxy) {
    this.proxy = proxy;
    
    // Prometheus metrics
    this.metrics = {
      swapCounter: new promClient.Counter({
        name: 'wasm_proxy_swaps_total',
        help: 'Total number of WASM instance swaps'
      }),
      memoryGauge: new promClient.Gauge({
        name: 'wasm_memory_usage_mb',
        help: 'Current WASM memory usage in MB'
      }),
      swapDuration: new promClient.Histogram({
        name: 'wasm_swap_duration_seconds',
        help: 'Time taken to swap instances'
      })
    };
    
    // Listen to proxy events
    proxy.on('swap-complete', ({ duration }) => {
      this.metrics.swapCounter.inc();
      this.metrics.swapDuration.observe(duration / 1000);
    });
    
    // Regular memory updates
    setInterval(() => {
      this.metrics.memoryGauge.set(proxy.getMemoryUsage());
    }, 10000);
  }
}
```

## Implementation Checklist

- [ ] Extract all WASM method signatures
- [ ] Implement basic proxy with method forwarding  
- [ ] Add compilation logging for key methods
- [ ] Implement memory monitoring
- [ ] Create instance manager for fresh WASM
- [ ] Build compilation replay system
- [ ] Handle object dependencies in replay
- [ ] Implement atomic instance swap
- [ ] Add worker thread coordination
- [ ] Handle OCaml bridge reinitialization
- [ ] Add metrics and monitoring
- [ ] Create memory leak tests
- [ ] Add feature flag for gradual rollout
- [ ] Document rollback procedure
- [ ] Load test with memory pressure
- [ ] Verify deterministic replay
- [ ] Add production monitoring
- [ ] Create runbook for operations

## Risk Matrix

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Replay produces different circuit | Medium | High | Add hash verification |
| Worker coordination fails | Low | High | Implement retry + fallback |
| Memory measurement inaccurate | Medium | Medium | Use conservative thresholds |
| Standby prep too slow | Medium | Low | Start earlier (60% threshold) |
| OCaml bridge corruption | Low | High | Full restart fallback |

## Go/No-Go Criteria

**GO if:**
- Replay produces identical circuits (hash match)
- Swap completes in <60 seconds
- Memory returns to baseline after swap
- No proof failures during swap
- Load test passes (1000 proofs without panic)

**NO-GO if:**
- Circuit replay mismatches
- Swap takes >2 minutes
- Memory doesn't drop after swap
- Proofs fail during/after swap
- Crashes during load test

This should give an engineer everything needed to implement the WASM proxy successfully.