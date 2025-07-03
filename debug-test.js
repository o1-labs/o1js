import { Field, Provable, switchBackend } from './dist/node/index.js';

async function debugOptimizations() {
  console.log('\n=== Debugging Optimization Differences ===\n');

  // Test 1: Simple Equality Chain
  console.log('Test 1: Equality Chain (should use union-find optimization)');
  await switchBackend('snarky');
  const snarkyEqChain = await Provable.constraintSystem(() => {
    const x = Provable.witness(Field, () => Field(5));
    const y = Provable.witness(Field, () => Field(5));
    x.assertEquals(y);
  });
  console.log(`Snarky constraints: ${snarkyEqChain.gates.length}`);

  await switchBackend('sparky');
  const sparkyEqChain = await Provable.constraintSystem(() => {
    const x = Provable.witness(Field, () => Field(5));
    const y = Provable.witness(Field, () => Field(5));
    x.assertEquals(y);
  });
  console.log(`Sparky constraints: ${sparkyEqChain.gates.length}`);
  console.log(`Match: ${snarkyEqChain.gates.length === sparkyEqChain.gates.length}`);
  console.log(`Difference: ${sparkyEqChain.gates.length - snarkyEqChain.gates.length}\n`);

  // Test 2: Constraint Batching - Two multiplications
  console.log('Test 2: Constraint Batching (two multiplications should batch)');
  await switchBackend('snarky');
  const snarkyBatch = await Provable.constraintSystem(() => {
    const a = Provable.witness(Field, () => Field(2));
    const b = Provable.witness(Field, () => Field(3));
    const c = Provable.witness(Field, () => Field(6));
    
    // First multiplication
    a.mul(b).assertEquals(c);
    
    // Second multiplication (should batch with first)
    const d = Provable.witness(Field, () => Field(4));
    const e = Provable.witness(Field, () => Field(8));
    a.mul(d).assertEquals(e);
  });
  console.log(`Snarky constraints: ${snarkyBatch.gates.length}`);

  await switchBackend('sparky');
  const sparkyBatch = await Provable.constraintSystem(() => {
    const a = Provable.witness(Field, () => Field(2));
    const b = Provable.witness(Field, () => Field(3));
    const c = Provable.witness(Field, () => Field(6));
    
    // First multiplication
    a.mul(b).assertEquals(c);
    
    // Second multiplication (should batch with first)
    const d = Provable.witness(Field, () => Field(4));
    const e = Provable.witness(Field, () => Field(8));
    a.mul(d).assertEquals(e);
  });
  console.log(`Sparky constraints: ${sparkyBatch.gates.length}`);
  console.log(`Match: ${snarkyBatch.gates.length === sparkyBatch.gates.length}`);
  console.log(`Difference: ${sparkyBatch.gates.length - snarkyBatch.gates.length}\n`);

  // Test 3: Very simple constraint count
  console.log('Test 3: Single multiplication constraint');
  await switchBackend('snarky');
  const snarkySimple = await Provable.constraintSystem(() => {
    const a = Provable.witness(Field, () => Field(2));
    const b = Provable.witness(Field, () => Field(3));
    const c = a.mul(b);
    c.assertEquals(Field(6));
  });
  console.log(`Snarky constraints: ${snarkySimple.gates.length}`);

  await switchBackend('sparky');
  const sparkySimple = await Provable.constraintSystem(() => {
    const a = Provable.witness(Field, () => Field(2));
    const b = Provable.witness(Field, () => Field(3));
    const c = a.mul(b);
    c.assertEquals(Field(6));
  });
  console.log(`Sparky constraints: ${sparkySimple.gates.length}`);
  console.log(`Match: ${snarkySimple.gates.length === sparkySimple.gates.length}`);
  console.log(`Difference: ${sparkySimple.gates.length - snarkySimple.gates.length}\n`);

  console.log('=== Summary ===');
  console.log('If any tests show "Match: false", those optimizations are not working correctly in Sparky.');
}

// Run the debug tests
debugOptimizations().catch(console.error);