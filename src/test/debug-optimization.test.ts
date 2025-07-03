import { Field, Provable, switchBackend } from '../index.js';

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
  console.log(`Match: ${snarkyEqChain.gates.length === sparkyEqChain.gates.length}\n`);

  // Test 2: Constant Folding
  console.log('Test 2: Constant Folding');
  await switchBackend('snarky');
  const snarkyConst = await Provable.constraintSystem(() => {
    const result = Field(10).mul(Field(20)).add(Field(30));
    // Force constraint generation
    const x = Provable.witness(Field, () => Field(230));
    x.assertEquals(result);
  });
  console.log(`Snarky constraints: ${snarkyConst.gates.length}`);

  await switchBackend('sparky');
  const sparkyConst = await Provable.constraintSystem(() => {
    const result = Field(10).mul(Field(20)).add(Field(30));
    // Force constraint generation
    const x = Provable.witness(Field, () => Field(230));
    x.assertEquals(result);
  });
  console.log(`Sparky constraints: ${sparkyConst.gates.length}`);
  console.log(`Match: ${snarkyConst.gates.length === sparkyConst.gates.length}\n`);

  // Test 3: Constraint Batching
  console.log('Test 3: Constraint Batching (multiple multiplications)');
  await switchBackend('snarky');
  const snarkyBatch = await Provable.constraintSystem(() => {
    const a = Provable.witness(Field, () => Field(2));
    const b = Provable.witness(Field, () => Field(3));
    const c = Provable.witness(Field, () => Field(6));
    const d = Provable.witness(Field, () => Field(4));
    const e = Provable.witness(Field, () => Field(12));
    
    // These should batch
    a.mul(b).assertEquals(c);
    a.mul(d).assertEquals(Field(8));
  });
  console.log(`Snarky constraints: ${snarkyBatch.gates.length}`);

  await switchBackend('sparky');
  const sparkyBatch = await Provable.constraintSystem(() => {
    const a = Provable.witness(Field, () => Field(2));
    const b = Provable.witness(Field, () => Field(3));
    const c = Provable.witness(Field, () => Field(6));
    const d = Provable.witness(Field, () => Field(4));
    const e = Provable.witness(Field, () => Field(12));
    
    // These should batch
    a.mul(b).assertEquals(c);
    a.mul(d).assertEquals(Field(8));
  });
  console.log(`Sparky constraints: ${sparkyBatch.gates.length}`);
  console.log(`Match: ${snarkyBatch.gates.length === sparkyBatch.gates.length}\n`);

  // Test 4: Identity Operations
  console.log('Test 4: Identity Operations (should be simplified)');
  await switchBackend('snarky');
  const snarkyIdentity = await Provable.constraintSystem(() => {
    const x = Provable.witness(Field, () => Field(42));
    const a = x.add(Field(0));     // x + 0 → x
    const b = x.mul(Field(1));     // x * 1 → x
    const c = x.mul(Field(0));     // x * 0 → 0
    const d = x.sub(x);            // x - x → 0
    
    a.assertEquals(x);
    b.assertEquals(x);
    c.assertEquals(Field(0));
    d.assertEquals(Field(0));
  });
  console.log(`Snarky constraints: ${snarkyIdentity.gates.length}`);

  await switchBackend('sparky');
  const sparkyIdentity = await Provable.constraintSystem(() => {
    const x = Provable.witness(Field, () => Field(42));
    const a = x.add(Field(0));     // x + 0 → x
    const b = x.mul(Field(1));     // x * 1 → x
    const c = x.mul(Field(0));     // x * 0 → 0
    const d = x.sub(x);            // x - x → 0
    
    a.assertEquals(x);
    b.assertEquals(x);
    c.assertEquals(Field(0));
    d.assertEquals(Field(0));
  });
  console.log(`Sparky constraints: ${sparkyIdentity.gates.length}`);
  console.log(`Match: ${snarkyIdentity.gates.length === sparkyIdentity.gates.length}\n`);

  // Test 5: As Prover Block
  console.log('Test 5: As Prover Block (should not generate constraints)');
  await switchBackend('snarky');
  const snarkyProver = await Provable.constraintSystem(() => {
    const x = Provable.witness(Field, () => Field(10));
    
    // Outside as_prover
    x.assertEquals(x);
    
    // Inside as_prover - should not generate constraints
    Provable.asProver(() => {
      const y = x.mul(Field(2));
      y.assertEquals(Field(20));
    });
  });
  console.log(`Snarky constraints: ${snarkyProver.gates.length}`);

  await switchBackend('sparky');
  const sparkyProver = await Provable.constraintSystem(() => {
    const x = Provable.witness(Field, () => Field(10));
    
    // Outside as_prover
    x.assertEquals(x);
    
    // Inside as_prover - should not generate constraints
    Provable.asProver(() => {
      const y = x.mul(Field(2));
      y.assertEquals(Field(20));
    });
  });
  console.log(`Sparky constraints: ${sparkyProver.gates.length}`);
  console.log(`Match: ${snarkyProver.gates.length === sparkyProver.gates.length}\n`);

  console.log('=== Summary ===');
  console.log('If any tests show "Match: false", those optimizations are not working correctly in Sparky.');
}

// Run the debug tests
debugOptimizations().catch(console.error);