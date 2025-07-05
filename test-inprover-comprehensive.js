import { Field, Provable, switchBackend } from './dist/node/index.js';

console.log('Comprehensive inProver function test...\n');

async function runTests() {
  // Test both backends
  for (const backend of ['snarky', 'sparky']) {
    await switchBackend(backend);
    console.log(`\n=== Testing ${backend.toUpperCase()} backend ===`);

    // Test 1: Outside any context
    console.log('\nTest 1: Outside any context');
    const outsideResult = Provable.inProver();
    console.log(`  inProver() = ${outsideResult}`);
    console.log(`  ✓ Expected false, got ${outsideResult}`);

    // Test 2: Inside Provable.asProver
    console.log('\nTest 2: Inside Provable.asProver');
    let asProverResult;
    Provable.asProver(() => {
      asProverResult = Provable.inProver();
      console.log(`  Inside asProver: inProver() = ${asProverResult}`);
    });
    console.log(`  ✓ Expected true, got ${asProverResult}`);

    // Test 3: Nested asProver calls
    console.log('\nTest 3: Nested asProver calls');
    Provable.asProver(() => {
      const outer = Provable.inProver();
      console.log(`  Outer asProver: inProver() = ${outer}`);
      
      Provable.asProver(() => {
        const inner = Provable.inProver();
        console.log(`  Inner asProver: inProver() = ${inner}`);
      });
      
      const afterInner = Provable.inProver();
      console.log(`  After inner asProver: inProver() = ${afterInner}`);
    });

    // Test 4: Inside witness generation
    console.log('\nTest 4: Inside witness generation');
    const witnessField = await Provable.witness(Field, () => {
      const inWitness = Provable.inProver();
      console.log(`  Inside witness: inProver() = ${inWitness}`);
      
      // Test asProver inside witness
      let inAsProverInsideWitness;
      Provable.asProver(() => {
        inAsProverInsideWitness = Provable.inProver();
        console.log(`  Inside asProver inside witness: inProver() = ${inAsProverInsideWitness}`);
      });
      
      return Field(42);
    });
    console.log(`  Witness value: ${witnessField}`);

    // Test 5: After all contexts
    console.log('\nTest 5: After all contexts');
    const finalResult = Provable.inProver();
    console.log(`  inProver() = ${finalResult}`);
    console.log(`  ✓ Expected false, got ${finalResult}`);
  }

  console.log('\n✓ All tests completed successfully!');
}

runTests().catch(console.error);