import { Field, ZkProgram, verify, initializeBindings } from 'o1js';
// @ts-ignore - Direct import of internal module  
import wasmModule from './dist/node/bindings/compiled/_node_bindings/plonk_wasm.cjs';
const wasm = wasmModule;

// We need to initialize bindings first to get access to the wasm module
await initializeBindings();

// Debug: Check what's available
console.log('wasm available:', wasm !== undefined);
if (wasm) {
  console.log('wasm.get_memory_byte_length available:', typeof wasm.get_memory_byte_length);
  // Try to call it once to see if it works
  try {
    const initialBytes = wasm.get_memory_byte_length();
    console.log('Initial WASM memory size:', initialBytes, 'bytes (', Math.round(initialBytes / 1024 / 1024), 'MB)');
  } catch (e) {
    console.error('Error calling get_memory_byte_length:', e);
  }
}

/**
 * Simple zkProgram for memory leak testing
 * Creates a non-trivial but simple circuit that adds two field elements
 */
const SimpleAddProgram = ZkProgram({
  name: 'memory-leak-test',
  publicInput: Field,
  publicOutput: Field,
  methods: {
    add: {
      privateInputs: [Field],
      async method(publicInput: Field, privateInput: Field) {
        // Simple but non-empty constraint generation
        const sum = publicInput.add(privateInput);
        sum.assertGreaterThan(Field(0)); // Add a constraint
        return {
          publicOutput: sum,
        };
      },
    },
  },
});

/**
 * Get current WASM linear memory size in MB
 * Uses the get_memory_byte_length() function exported by the WASM module
 */
function getWasmMemoryMB(): number {
  try {
    const bytes = wasm.get_memory_byte_length();
    return Math.round(bytes / 1024 / 1024 * 100) / 100;
  } catch (e) {
    console.error('Failed to get WASM memory size:', e);
    return 0;
  }
}

/**
 * Force garbage collection if available (requires --expose-gc flag)
 */
function forceGC(): void {
  if (typeof global !== 'undefined' && typeof (global as any).gc === 'function') {
    (global as any).gc();
    console.log('  [GC] Garbage collection triggered');
  } else {
    console.log('  [GC] Garbage collection not available (run with --expose-gc)');
  }
}

/**
 * Main benchmark function
 * Proves the circuit 10 times and tracks memory growth
 */
async function runMemoryBenchmark() {
  console.log('=== o1js WASM Memory Leak Benchmark ===\n');
  console.log('Compiling zkProgram...');
  
  const startCompileMemory = getWasmMemoryMB();
  console.log(`WASM memory before compile: ${startCompileMemory} MB`);
  
  // Compile the zkProgram
  console.time('Compilation time');
  const { verificationKey } = await SimpleAddProgram.compile();
  console.timeEnd('Compilation time');
  
  const afterCompileMemory = getWasmMemoryMB();
  console.log(`WASM memory after compile: ${afterCompileMemory} MB`);
  console.log(`Compile memory delta: ${(afterCompileMemory - startCompileMemory).toFixed(2)} MB\n`);
  
  console.log('Starting proof generation loop (10 iterations)...\n');
  
  const memoryReadings: number[] = [];
  const proofTimes: number[] = [];
  
  // Initial memory reading
  memoryReadings.push(getWasmMemoryMB());
  
  for (let i = 0; i < 10; i++) {
    console.log(`--- Iteration ${i + 1}/10 ---`);
    
    // Generate different inputs for each iteration to avoid any caching
    const publicInput = Field(i + 1);
    const privateInput = Field(i + 100);
    
    // Time the proof generation
    const startTime = Date.now();
    console.log(`  Proving: publicInput=${i + 1}, privateInput=${i + 100}`);
    
    const proof = await SimpleAddProgram.add(publicInput, privateInput);

    const proofTime = Date.now() - startTime;
    proofTimes.push(proofTime);
    console.log(`  Proof generated in ${proofTime}ms`);
    
    // Verify the proof to ensure it's valid
    const isValid = await verify(proof.proof, verificationKey);
    console.log(`  Proof valid: ${isValid}`);
    
    // Force garbage collection
    forceGC();
    
    // Wait a bit for any async cleanup
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Measure memory after this iteration
    const currentMemory = getWasmMemoryMB();
    memoryReadings.push(currentMemory);
    
    const memoryDelta = currentMemory - memoryReadings[i];
    console.log(`  WASM memory after iteration: ${currentMemory} MB (Δ: ${memoryDelta > 0 ? '+' : ''}${memoryDelta.toFixed(2)} MB)`);
    console.log('');
  }
  
  // Analysis
  console.log('=== Analysis ===\n');
  
  console.log('Memory growth per iteration:');
  for (let i = 1; i < memoryReadings.length; i++) {
    const delta = memoryReadings[i] - memoryReadings[i - 1];
    console.log(`  Iteration ${i}: ${delta > 0 ? '+' : ''}${delta.toFixed(2)} MB`);
  }
  
  const totalMemoryGrowth = memoryReadings[memoryReadings.length - 1] - memoryReadings[0];
  const averageGrowthPerProof = totalMemoryGrowth / 10;
  
  console.log('\n=== Summary ===');
  console.log(`Initial WASM memory: ${memoryReadings[0].toFixed(2)} MB`);
  console.log(`Final WASM memory: ${memoryReadings[memoryReadings.length - 1].toFixed(2)} MB`);
  console.log(`Total WASM memory growth: ${totalMemoryGrowth.toFixed(2)} MB`);
  console.log(`Average WASM memory leak per proof: ${averageGrowthPerProof.toFixed(2)} MB`);
  console.log(`WASM memory increase factor: ${(memoryReadings[memoryReadings.length - 1] / memoryReadings[0]).toFixed(2)}x`);
  
  const avgProofTime = proofTimes.reduce((a, b) => a + b, 0) / proofTimes.length;
  console.log(`\nAverage proof generation time: ${avgProofTime.toFixed(0)}ms`);
  
  // Check if there's a clear memory leak pattern
  if (averageGrowthPerProof > 1) {
    console.log('\n⚠️  WASM MEMORY LEAK DETECTED: Significant linear memory growth observed');
    console.log(`   At this rate, WASM memory would exhaust after ~${Math.floor(4000 / averageGrowthPerProof)} proofs`);
  } else {
    console.log('\n✅ WASM memory usage appears stable');
  }
}

// Run the benchmark
runMemoryBenchmark()
  .then(() => {
    console.log('\n=== Benchmark Complete ===');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error during benchmark:', error);
    process.exit(1);
  });