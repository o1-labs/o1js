#!/usr/bin/env node

import { Field, Provable, Poseidon, MerkleTree, Bool, Circuit, ZkProgram, constraintSystem, switchBackend, getCurrentBackend } from './dist/node/index.js';

console.log('=== Testing Backend Switching ===\n');

// Test 1: Check current backend
console.log('1. Current backend:', getCurrentBackend());

// Test 2: Simple field operations with Snarky
console.log('\n2. Testing Snarky backend:');
await switchBackend('snarky');
console.log('   Backend switched to:', getCurrentBackend());

const snarkyCs = await constraintSystem(() => {
  const x = Provable.witness(Field, () => Field(5));
  const y = Provable.witness(Field, () => Field(7));
  const z = x.add(y);
  z.assertEquals(Field(12));
});
console.log('   Snarky constraints:', snarkyCs.rows);

// Test 3: Switch to Sparky and run same operations
console.log('\n3. Testing Sparky backend:');
await switchBackend('sparky');
console.log('   Backend switched to:', getCurrentBackend());

const sparkyCs = await constraintSystem(() => {
  const x = Provable.witness(Field, () => Field(5));
  const y = Provable.witness(Field, () => Field(7));
  const z = x.add(y);
  z.assertEquals(Field(12));
});
console.log('   Sparky constraints:', sparkyCs.rows);

// Test 4: More complex operations
console.log('\n4. Testing complex operations:');

// Snarky
await switchBackend('snarky');
const snarkyComplexCs = await constraintSystem(() => {
  const a = Provable.witness(Field, () => Field(3));
  const b = Provable.witness(Field, () => Field(4));
  const c = Provable.witness(Field, () => Field(5));
  
  const ab = a.mul(b);
  const bc = b.mul(c);
  const result = ab.add(bc);
  
  result.assertEquals(Field(32)); // 3*4 + 4*5 = 12 + 20 = 32
});
console.log('   Snarky complex constraints:', snarkyComplexCs.rows);

// Sparky
await switchBackend('sparky');
const sparkyComplexCs = await constraintSystem(() => {
  const a = Provable.witness(Field, () => Field(3));
  const b = Provable.witness(Field, () => Field(4));
  const c = Provable.witness(Field, () => Field(5));
  
  const ab = a.mul(b);
  const bc = b.mul(c);
  const result = ab.add(bc);
  
  result.assertEquals(Field(32));
});
console.log('   Sparky complex constraints:', sparkyComplexCs.rows);

// Test 5: Poseidon hash
console.log('\n5. Testing Poseidon hash:');

// Snarky
await switchBackend('snarky');
const snarkyPoseidonCs = await constraintSystem(() => {
  const x = Provable.witness(Field, () => Field(123));
  const y = Provable.witness(Field, () => Field(456));
  const hash = Poseidon.hash([x, y]);
  hash.assertEquals(hash); // Just to generate constraints
});
console.log('   Snarky Poseidon constraints:', snarkyPoseidonCs.rows);

// Sparky
await switchBackend('sparky');
const sparkyPoseidonCs = await constraintSystem(() => {
  const x = Provable.witness(Field, () => Field(123));
  const y = Provable.witness(Field, () => Field(456));
  const hash = Poseidon.hash([x, y]);
  hash.assertEquals(hash);
});
console.log('   Sparky Poseidon constraints:', sparkyPoseidonCs.rows);

// Test 6: Boolean operations
console.log('\n6. Testing Boolean operations:');

// Snarky
await switchBackend('snarky');
const snarkyBoolCs = await constraintSystem(() => {
  const a = Provable.witness(Bool, () => Bool(true));
  const b = Provable.witness(Bool, () => Bool(false));
  const c = a.and(b);
  const d = a.or(b);
  const e = a.not();
  
  c.assertEquals(Bool(false));
  d.assertEquals(Bool(true));
  e.assertEquals(Bool(false));
});
console.log('   Snarky Boolean constraints:', snarkyBoolCs.rows);

// Sparky
await switchBackend('sparky');
const sparkyBoolCs = await constraintSystem(() => {
  const a = Provable.witness(Bool, () => Bool(true));
  const b = Provable.witness(Bool, () => Bool(false));
  const c = a.and(b);
  const d = a.or(b);
  const e = a.not();
  
  c.assertEquals(Bool(false));
  d.assertEquals(Bool(true));
  e.assertEquals(Bool(false));
});
console.log('   Sparky Boolean constraints:', sparkyBoolCs.rows);

// Summary
console.log('\n=== Summary ===');
console.log('Backend switching: ✅ Working');
console.log('Field operations: ✅ Working');
console.log('Complex operations: ✅ Working');
console.log('Poseidon hash: ✅ Working');
console.log('Boolean operations: ✅ Working');

console.log('\n=== Constraint Count Comparison ===');
console.log('Simple addition:');
console.log(`  Snarky: ${snarkyCs.rows}, Sparky: ${sparkyCs.rows}`);
console.log('Complex operations:');
console.log(`  Snarky: ${snarkyComplexCs.rows}, Sparky: ${sparkyComplexCs.rows}`);
console.log('Poseidon hash:');
console.log(`  Snarky: ${snarkyPoseidonCs.rows}, Sparky: ${sparkyPoseidonCs.rows}`);
console.log('Boolean operations:');
console.log(`  Snarky: ${snarkyBoolCs.rows}, Sparky: ${sparkyBoolCs.rows}`);

// Switch back to default
await switchBackend('snarky');
console.log('\nSwitched back to default:', getCurrentBackend());