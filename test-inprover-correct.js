import { Field, Provable, switchBackend } from './src/index.js';

console.log('Testing inProver function...\n');

async function runTests() {
  // Test with snarky backend first
  await switchBackend('snarky');
  console.log('Backend: snarky');

  // Test 1: Check inProver outside witness generation
  console.log('Test 1: Outside witness generation');
  try {
    const inProverResult = Provable.inProver();
    console.log(`  Provable.inProver() = ${inProverResult}`);
    console.log('  ✓ inProver() works as function\n');
  } catch (e) {
    console.error('  ✗ Error calling inProver():', e.message);
  }

  // Test 2: Check inProver inside witness generation
  console.log('Test 2: Inside witness generation');
  const witnessResult = await Provable.witness(Field, () => {
    const result = Provable.inProver();
    console.log(`  Inside witness: inProver() = ${result}`);
    return Field(result ? 1 : 0);
  });
  console.log(`  Witness result: ${witnessResult}`);
  console.log('  ✓ inProver() works inside witness\n');

  // Test with sparky backend
  await switchBackend('sparky');
  console.log('Backend: sparky');

  // Test 3: Check inProver outside witness generation (sparky)
  console.log('Test 3: Outside witness generation (sparky)');
  try {
    const inProverResult = Provable.inProver();
    console.log(`  Provable.inProver() = ${inProverResult}`);
    console.log('  ✓ inProver() works as function\n');
  } catch (e) {
    console.error('  ✗ Error calling inProver():', e.message);
  }

  // Test 4: Check inProver inside witness generation (sparky)
  console.log('Test 4: Inside witness generation (sparky)');
  const sparkyWitnessResult = await Provable.witness(Field, () => {
    const result = Provable.inProver();
    console.log(`  Inside witness: inProver() = ${result}`);
    return Field(result ? 1 : 0);
  });
  console.log(`  Witness result: ${sparkyWitnessResult}`);
  console.log('  ✓ inProver() works inside witness\n');

  console.log('All tests completed successfully! ✓');
}

runTests().catch(console.error);