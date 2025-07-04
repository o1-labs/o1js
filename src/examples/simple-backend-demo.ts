/**
 * Simple Backend Switching Demo
 * 
 * A simplified demonstration of the backend switching concept
 * that doesn't require full WASM builds to show the architecture.
 */

// Mock backend implementations for demonstration
interface MockBackendField {
  value: bigint;
  add(other: MockBackendField): MockBackendField;
  mul(other: MockBackendField): MockBackendField;
  toString(): string;
}

class MockSnarkyField implements MockBackendField {
  constructor(public value: bigint) {}
  
  add(other: MockBackendField): MockBackendField {
    console.log(`[Snarky] Field addition: ${this.value} + ${other.value}`);
    return new MockSnarkyField(this.value + other.value);
  }
  
  mul(other: MockBackendField): MockBackendField {
    console.log(`[Snarky] Field multiplication: ${this.value} * ${other.value}`);
    return new MockSnarkyField(this.value * other.value);
  }
  
  toString(): string {
    return `SnarkyField(${this.value})`;
  }
}

class MockSparkyField implements MockBackendField {
  constructor(public value: bigint) {}
  
  add(other: MockBackendField): MockBackendField {
    console.log(`[Sparky] Optimized field addition: ${this.value} + ${other.value}`);
    return new MockSparkyField(this.value + other.value);
  }
  
  mul(other: MockBackendField): MockBackendField {
    console.log(`[Sparky] SIMD field multiplication: ${this.value} * ${other.value}`);
    return new MockSparkyField(this.value * other.value);
  }
  
  toString(): string {
    return `SparkyField(${this.value})`;
  }
}

interface MockBackend {
  name: string;
  createField(value: bigint): MockBackendField;
  poseidonHash(a: MockBackendField, b: MockBackendField): MockBackendField;
}

class MockSnarkyBackend implements MockBackend {
  name = 'snarky';
  
  createField(value: bigint): MockBackendField {
    return new MockSnarkyField(value);
  }
  
  poseidonHash(a: MockBackendField, b: MockBackendField): MockBackendField {
    console.log(`[Snarky] Poseidon hash computation`);
    // Mock hash: simple combination for demo
    const hashValue = (a.value * 7n + b.value * 13n) % 2n**251n;
    return new MockSnarkyField(hashValue);
  }
}

class MockSparkyBackend implements MockBackend {
  name = 'sparky';
  
  createField(value: bigint): MockBackendField {
    return new MockSparkyField(value);
  }
  
  poseidonHash(a: MockBackendField, b: MockBackendField): MockBackendField {
    console.log(`[Sparky] Optimized Poseidon hash with WASM acceleration`);
    // Mock hash: same computation but "optimized"
    const hashValue = (a.value * 7n + b.value * 13n) % 2n**251n;
    return new MockSparkyField(hashValue);
  }
}

class MockBackendRegistry {
  private backends = new Map<string, MockBackend>();
  private currentBackend: MockBackend | null = null;
  
  register(name: string, backend: MockBackend): void {
    this.backends.set(name, backend);
    if (!this.currentBackend) {
      this.currentBackend = backend;
    }
  }
  
  switch(name: string): void {
    const backend = this.backends.get(name);
    if (backend) {
      console.log(`\n🔄 Switching from ${this.currentBackend?.name || 'none'} to ${name} backend`);
      this.currentBackend = backend;
    } else {
      throw new Error(`Backend '${name}' not found`);
    }
  }
  
  getCurrentBackend(): MockBackend {
    if (!this.currentBackend) {
      throw new Error('No backend selected');
    }
    return this.currentBackend;
  }
  
  getAvailableBackends(): string[] {
    return Array.from(this.backends.keys());
  }
}

// Demo functions
function performFieldOperations(backend: MockBackend): void {
  console.log(`\n📊 Performing field operations with ${backend.name} backend:`);
  
  const a = backend.createField(100n);
  const b = backend.createField(200n);
  
  console.log(`Created fields: a=${a.toString()}, b=${b.toString()}`);
  
  const sum = a.add(b);
  console.log(`Sum: ${sum.toString()}`);
  
  const product = a.mul(b);
  console.log(`Product: ${product.toString()}`);
  
  const hash = backend.poseidonHash(a, b);
  console.log(`Poseidon hash: ${hash.toString()}`);
}

function benchmarkOperation(backend: MockBackend, name: string, operation: () => void): number {
  const iterations = 1000;
  
  console.log(`\n⏱️  Benchmarking ${name} with ${backend.name} backend (${iterations} iterations):`);
  
  const start = performance.now();
  for (let i = 0; i < iterations; i++) {
    operation();
  }
  const end = performance.now();
  
  const timeMs = end - start;
  const opsPerSec = (iterations * 1000) / timeMs;
  
  console.log(`Time: ${timeMs.toFixed(2)}ms`);
  console.log(`Ops/sec: ${opsPerSec.toFixed(0)}`);
  
  return timeMs;
}

async function runDemo(): Promise<void> {
  console.log('🚀 Backend Switching Architecture Demo');
  console.log('=====================================');
  
  // Create registry and register backends
  const registry = new MockBackendRegistry();
  registry.register('snarky', new MockSnarkyBackend());
  registry.register('sparky', new MockSparkyBackend());
  
  console.log(`Available backends: ${registry.getAvailableBackends().join(', ')}`);
  
  // Demonstrate operations with each backend
  for (const backendName of ['snarky', 'sparky']) {
    registry.switch(backendName);
    const backend = registry.getCurrentBackend();
    
    performFieldOperations(backend);
  }
  
  // Benchmark comparison
  console.log('\n🏁 Performance Comparison');
  console.log('=========================');
  
  const results: Record<string, Record<string, number>> = {};
  
  for (const backendName of ['snarky', 'sparky']) {
    registry.switch(backendName);
    const backend = registry.getCurrentBackend();
    
    results[backendName] = {};
    
    // Benchmark field addition
    results[backendName]['addition'] = benchmarkOperation(
      backend,
      'Field Addition',
      () => {
        const a = backend.createField(123n);
        const b = backend.createField(456n);
        a.add(b);
      }
    );
    
    // Benchmark field multiplication  
    results[backendName]['multiplication'] = benchmarkOperation(
      backend,
      'Field Multiplication',
      () => {
        const a = backend.createField(123n);
        const b = backend.createField(456n);
        a.mul(b);
      }
    );
    
    // Benchmark Poseidon hash
    results[backendName]['poseidon'] = benchmarkOperation(
      backend,
      'Poseidon Hash',
      () => {
        const a = backend.createField(123n);
        const b = backend.createField(456n);
        backend.poseidonHash(a, b);
      }
    );
  }
  
  // Display comparison
  console.log('\n📈 Performance Summary:');
  console.log('=======================');
  
  for (const operation of ['addition', 'multiplication', 'poseidon']) {
    console.log(`\n${operation.toUpperCase()}:`);
    
    const snarkyTime = results['snarky'][operation];
    const sparkyTime = results['sparky'][operation];
    
    console.log(`  Snarky: ${snarkyTime.toFixed(2)}ms`);
    console.log(`  Sparky: ${sparkyTime.toFixed(2)}ms`);
    
    if (snarkyTime && sparkyTime) {
      const speedup = snarkyTime / sparkyTime;
      if (speedup > 1) {
        console.log(`  → Sparky is ${speedup.toFixed(2)}x faster`);
      } else {
        console.log(`  → Snarky is ${(1/speedup).toFixed(2)}x faster`);
      }
    }
  }
  
  // Demonstrate environment-based switching
  console.log('\n🌍 Environment-Based Backend Selection');
  console.log('======================================');
  
  // Mock environment variable
  const mockEnv = 'sparky';
  console.log(`O1JS_BACKEND=${mockEnv}`);
  
  if (registry.getAvailableBackends().includes(mockEnv)) {
    registry.switch(mockEnv);
    console.log(`✅ Automatically selected ${mockEnv} backend based on environment`);
  } else {
    console.log(`❌ Requested backend '${mockEnv}' not available, using default`);
  }
  
  // Show final configuration
  const currentBackend = registry.getCurrentBackend();
  console.log(`\n📋 Final Configuration:`);
  console.log(`Active backend: ${currentBackend.name}`);
  console.log(`Available backends: ${registry.getAvailableBackends().join(', ')}`);
  
  console.log('\n✅ Demo completed successfully!');
  console.log('\nThis demonstrates the backend switching architecture:');
  console.log('• Unified interface across different implementations');
  console.log('• Runtime backend switching capability');
  console.log('• Performance comparison and benchmarking');
  console.log('• Environment-based configuration');
  console.log('• Seamless migration path for existing code');
}

// Run the demo
if (typeof window === 'undefined') {
  // Node.js environment
  runDemo().catch(console.error);
} else {
  // Browser environment
  console.log('Backend switching demo ready - call runDemo() to start');
  (global as any).runDemo = runDemo;
}

export { runDemo };