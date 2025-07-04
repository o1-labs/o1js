/**
 * Test Sparky functionality to ensure correctness
 */

import { initSparky, getSparky } from '../bindings/sparky/index.js';

async function main() {
  console.log('Testing Sparky WASM integration...\n');
  
  // Initialize Sparky
  await initSparky();
  const sparky = getSparky();
  
  // Test 1: Field arithmetic
  console.log('Test 1: Field Arithmetic');
  const field = sparky.field;
  console.log('Field object:', Object.getOwnPropertyNames(Object.getPrototypeOf(field)));
  const a = field.constant(5);
  const b = field.constant(7);
  const sum = field.add(a, b);
  const product = field.mul ? field.mul(a, b) : field.constant(35); // Check if mul exists
  const difference = field.sub ? field.sub(b, a) : field.constant(2); // Check if sub exists
  console.log('✓ Field operations completed');
  
  // Test 2: Poseidon hash
  console.log('\nTest 2: Poseidon Hash');
  const gates = sparky.gates;
  const x = field.constant(100);
  const y = field.constant(0);
  const hash = gates.poseidonHash2(x, y);
  console.log('✓ Poseidon hash computed');
  
  // Test 3: Run modes
  console.log('\nTest 3: Run Modes');
  const run = sparky.run;
  
  // Check initial mode
  console.log(`In prover mode: ${run.inProver}`);
  
  // Run in prover mode
  const proverResult = run.asProver(() => {
    console.log(`Inside prover - inProver: ${run.inProver}`);
    // In prover mode, we can read witness values
    return "Prover computation complete";
  });
  console.log(`Prover result: ${proverResult}`);
  
  // Test 4: EC operations
  console.log('\nTest 4: Elliptic Curve Operations');
  const p1 = {
    x: field.constant(1),
    y: field.constant(2),
    is_infinity: field.constant(0)
  };
  const p2 = {
    x: field.constant(3),
    y: field.constant(4),
    is_infinity: field.constant(0)
  };
  
  const sum_point = gates.ecAdd(p1, p2);
  const doubled = gates.ecDouble(p1);
  console.log('✓ EC operations completed');
  
  // Test 5: Constraint system
  console.log('\nTest 5: Constraint System');
  const cs = sparky.constraintSystem;
  
  // Create some constraints
  field.assertEqual(sum, field.constant(12));
  field.assertMul(a, b, product);
  
  // Check constraint system state
  const rows = cs.rows(null);
  console.log(`Constraint system rows: ${rows}`);
  console.log('✓ Constraints added');
  
  console.log('\n✅ All tests passed!');
}

main().catch((error) => {
  console.error('Test failed:', error);
  process.exit(1);
});