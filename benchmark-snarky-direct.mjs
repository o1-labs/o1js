#!/usr/bin/env node
/**
 * Direct benchmark of Snarky Poseidon using Node.js bindings
 * This bypasses the TypeScript build system
 */

import { createRequire } from 'module';
import { performance } from 'perf_hooks';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Helper functions
async function measureTime(fn) {
  const start = performance.now();
  const result = await fn();
  const end = performance.now();
  return [result, end - start];
}

function formatNumber(n) {
  return n.toLocaleString('en-US', { maximumFractionDigits: 3 });
}

async function main() {
  console.log('Snarky Poseidon Direct Benchmark');
  console.log('================================\n');
  
  try {
    // Load the OCaml bindings directly
    console.log('Loading Snarky bindings...');
    const bindingsStart = performance.now();
    
    // Try to load the compiled bindings
    const bindingsPath = join(__dirname, 'src/bindings/compiled/node_bindings/o1js_node.bc.cjs');
    const plonkWasmPath = join(__dirname, 'src/bindings/compiled/node_bindings/plonk_wasm.cjs');
    
    // Load WASM first
    const plonkWasm = await import(plonkWasmPath);
    await plonkWasm.default();
    
    // Load main bindings
    const bindings = require(bindingsPath);
    
    const bindingsEnd = performance.now();
    console.log(`✓ Bindings loaded in ${(bindingsEnd - bindingsStart).toFixed(3)}ms\n`);
    
    // Access Poseidon directly from bindings
    const poseidon = bindings.Poseidon;
    const Field = bindings.Field;
    
    if (!poseidon || !Field) {
      throw new Error('Poseidon or Field not found in bindings');
    }
    
    // Test 1: Basic hash
    console.log('--- Test 1: Basic Hash ---');
    
    // Create field elements
    const field100 = Field.ofString('100');
    const field0 = Field.ofString('0');
    
    // Measure hash time
    const [hash1, time1] = await measureTime(() => 
      poseidon.hash([field100, field0])
    );
    
    console.log(`hash(100, 0) = ${Field.toString(hash1)}`);
    console.log(`Time: ${time1.toFixed(3)}ms`);
    
    // Test 2: Batch performance
    console.log('\n--- Test 2: Batch Performance ---');
    
    const iterations = 1000;
    const fields = Array.from({ length: iterations }, (_, i) => 
      [Field.ofString(i.toString()), Field.ofString((i + 1).toString())]
    );
    
    const [, batchTime] = await measureTime(() => {
      for (const [a, b] of fields) {
        poseidon.hash([a, b]);
      }
    });
    
    console.log(`${iterations} hashes: ${batchTime.toFixed(3)}ms`);
    console.log(`Average: ${(batchTime / iterations).toFixed(3)}ms per hash`);
    
    // Test 3: Different array sizes
    console.log('\n--- Test 3: Array Size Performance ---');
    
    const sizes = [2, 3, 5, 10, 20];
    for (const size of sizes) {
      const inputs = Array.from({ length: size }, (_, i) => 
        Field.ofString((i * 10).toString())
      );
      
      const [, time] = await measureTime(() => poseidon.hash(inputs));
      console.log(`${size} fields: ${time.toFixed(3)}ms`);
    }
    
    // Summary
    console.log('\n--- Summary ---');
    console.log(`Single hash: ${time1.toFixed(3)}ms`);
    console.log(`Average (batch): ${(batchTime / iterations).toFixed(3)}ms per hash`);
    console.log(`Throughput: ~${formatNumber(1000 / (batchTime / iterations))} hashes/second`);
    
  } catch (error) {
    console.error('Failed to run benchmark:', error.message);
    console.error('\nThis script requires compiled bindings. Try:');
    console.error('1. npm run build:bindings');
    console.error('2. npm run build');
  }
}

main().catch(console.error);