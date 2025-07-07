import { Field, Provable, switchBackend } from './dist/node/index.js';

async function testForceConstraints() {
  console.log('Testing forced constraint generation\n');
  
  // Test both backends
  for (const backend of ['snarky', 'sparky']) {
    console.log(`\n=== Testing ${backend} ===`);
    await switchBackend(backend);
    
    // Test 1: Simple addition should generate constraint
    console.log('\nTest 1: Field addition');
    const result1 = await Provable.constraintSystem(() => {
      const a = Provable.witness(Field, () => Field(5));
      const b = Provable.witness(Field, () => Field(10));
      const c = a.add(b);
      // Force constraint by asserting
      c.assertEquals(Field(15));
    });
    console.log('Constraints:', result1.rows);
    console.log('Digest:', result1.digest);
    
    // Test 2: Just witness creation (no constraints)
    console.log('\nTest 2: Just witness variables');
    const result2 = await Provable.constraintSystem(() => {
      const a = Provable.witness(Field, () => Field(5));
      const b = Provable.witness(Field, () => Field(10));
      // No operations, no constraints
    });
    console.log('Constraints:', result2.rows);
    
    // Test 3: Constants only (no constraints)
    console.log('\nTest 3: Constants only');
    const result3 = await Provable.constraintSystem(() => {
      const a = Field(5);
      const b = Field(10);
      const c = a.add(b);
      // No witness variables, no constraints
    });
    console.log('Constraints:', result3.rows);
    
    // Test 4: Public input simulation
    console.log('\nTest 4: Public input style');
    const result4 = await Provable.constraintSystem(() => {
      // Public input is passed as parameter (already exists)
      const publicInput = Provable.witness(Field, () => Field(42));
      const one = Field(1);
      const result = publicInput.add(one);
      return result;
    });
    console.log('Constraints:', result4.rows);
    
    // Test 5: Force constraint with assertEqual
    console.log('\nTest 5: Explicit assertEqual');
    const result5 = await Provable.constraintSystem(() => {
      const a = Provable.witness(Field, () => Field(5));
      const b = Provable.witness(Field, () => Field(5));
      a.assertEquals(b);
    });
    console.log('Constraints:', result5.rows);
  }
}

testForceConstraints().catch(console.error);