/**
 * Demo of Sparky integration with o1js
 * 
 * This example shows how to use the Rust-based Sparky implementation
 * alongside the existing OCaml-based backend.
 */

import { initSparky, createField, poseidonHash, runAsProver } from '../bindings/sparky/index.js';

async function main() {
  console.log('Initializing Sparky WASM module...');
  await initSparky();
  console.log('✓ Sparky initialized');
  
  // Create field elements
  console.log('\nCreating field elements...');
  const a = await createField(100);
  const b = await createField(200);
  console.log('✓ Created field elements');
  
  // Compute Poseidon hash
  console.log('\nComputing Poseidon hash...');
  const hash = await poseidonHash(a, b);
  console.log('✓ Hash computed');
  
  // Run computation in prover mode
  console.log('\nRunning computation in prover mode...');
  const result = await runAsProver(() => {
    console.log('Inside prover computation');
    return 42;
  });
  console.log(`✓ Prover computation result: ${result}`);
  
  console.log('\nSparky demo complete!');
}

// Run the demo
main().catch((error) => {
  console.error('Error in Sparky demo:', error);
  process.exit(1);
});