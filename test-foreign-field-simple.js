import { switchBackend, getCurrentBackend } from './dist/node/lib/provable/backend-generic.js';
import { Field, Provable, createForeignField } from './dist/node/index.js';

async function testForeignFieldAdd() {
  console.log('Testing ForeignFieldAdd implementation...\n');

  // Switch to sparky backend
  await switchBackend('sparky');
  console.log('Current backend:', getCurrentBackend());

  // Create a foreign field with a specific modulus (e.g., secp256k1 field)
  const secp256k1Modulus = 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEFFFFFC2Fn;
  const ForeignFieldSecp = createForeignField(secp256k1Modulus);

  console.log('\n🧪 Test 1: Simple addition');
  try {
    await Provable.runAndCheck(() => {
      const a = Provable.witness(ForeignFieldSecp, () => ForeignFieldSecp.from(10n));
      const b = Provable.witness(ForeignFieldSecp, () => ForeignFieldSecp.from(20n));
      const result = a.add(b);
      
      Provable.log('a =', a);
      Provable.log('b =', b);
      Provable.log('a + b =', result);
      console.log('Expected:', 30n);
      
      // Assert the result
      result.assertEquals(ForeignFieldSecp.from(30n));
    });
    console.log('✅ Test 1 passed!\n');
  } catch (error) {
    console.error('❌ Test 1 failed:', error.message || error);
    console.error('Stack trace:', error.stack);
  }

  console.log('Testing complete!');
}

// Run the test
testForeignFieldAdd().catch(console.error);