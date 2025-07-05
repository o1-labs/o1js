import { switchBackend, getCurrentBackend, Field, Provable } from './dist/node/index.js';

async function main() {
  console.log('Backend Switching Example');
  console.log('========================\n');

  // Check initial backend
  console.log('Initial backend:', getCurrentBackend());

  // Example 1: Basic field operations with Snarky
  console.log('\n1. Testing with Snarky backend:');
  await switchBackend('snarky');
  console.log('Current backend:', getCurrentBackend());
  
  const a = Field(10);
  const b = Field(20);
  const c = a.add(b);
  console.log('10 + 20 =', c.toString());

  // Example 2: Switch to Sparky
  console.log('\n2. Switching to Sparky backend:');
  await switchBackend('sparky');
  console.log('Current backend:', getCurrentBackend());
  
  const x = Field(30);
  const y = Field(40);
  const z = x.mul(y);
  console.log('30 * 40 =', z.toString());

  // Example 3: Provable witness with backend switching
  console.log('\n3. Testing Provable.witness:');
  
  // First with Sparky
  console.log('\nWith Sparky:');
  let result1;
  Provable.runAndCheck(() => {
    const witness = Provable.witness(Field, () => Field(100));
    const doubled = witness.mul(2);
    Provable.asProver(() => {
      result1 = doubled.toString();
    });
  });
  console.log('witness(100) * 2 =', result1);

  // Switch back to Snarky
  console.log('\nSwitching back to Snarky:');
  await switchBackend('snarky');
  console.log('Current backend:', getCurrentBackend());
  
  let result2;
  Provable.runAndCheck(() => {
    const witness = Provable.witness(Field, () => Field(100));
    const doubled = witness.mul(2);
    Provable.asProver(() => {
      result2 = doubled.toString();
    });
  });
  console.log('witness(100) * 2 =', result2);

  // Example 4: Error handling
  console.log('\n4. Error handling:');
  try {
    await switchBackend('invalid-backend');
  } catch (error) {
    console.log('Expected error:', error.message);
  }

  console.log('\nFinal backend:', getCurrentBackend());
}

main().catch(console.error);