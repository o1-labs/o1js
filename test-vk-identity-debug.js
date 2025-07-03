/**
 * Debug test to check if VKs are identical across backend switches
 * and verify if globalThis.__snarky routing is working correctly
 */

import { Field, ZkProgram, verify } from './dist/node/index.js';
import { switchBackend, getCurrentBackend } from './dist/node/index.js';

async function testVkIdentity() {
  console.log('🔍 Testing VK identity across backend switches...\n');

  // Simple test program for consistent VK generation
  const TestProgram = ZkProgram({
    name: 'TestProgram',
    publicInput: Field,
    methods: {
      simpleAdd: {
        privateInputs: [Field],
        async method(publicInput, privateInput) {
          publicInput.assertEquals(privateInput.add(Field(1)));
        },
      },
    },
  });

  console.log('📋 Test setup: Simple addition constraint');
  console.log('    publicInput = privateInput + 1\n');

  // Test with Snarky backend
  console.log('1️⃣ Testing with Snarky backend...');
  await switchBackend('snarky');
  console.log(`   Current backend: ${getCurrentBackend()}`);
  console.log(`   globalThis.__snarky exists: ${!!globalThis.__snarky}`);
  console.log(`   globalThis.__snarky.Snarky exists: ${!!globalThis.__snarky?.Snarky}`);
  
  const { verificationKey: vkSnarky } = await TestProgram.compile();
  console.log(`   VK generated (length): ${JSON.stringify(vkSnarky).length} chars`);
  console.log(`   VK hash: ${JSON.stringify(vkSnarky).substring(0, 100)}...\n`);

  // Test with Sparky backend
  console.log('2️⃣ Testing with Sparky backend...');
  await switchBackend('sparky');
  console.log(`   Current backend: ${getCurrentBackend()}`);
  console.log(`   globalThis.__snarky exists: ${!!globalThis.__snarky}`);
  console.log(`   globalThis.__snarky.Snarky exists: ${!!globalThis.__snarky?.Snarky}`);
  
  const { verificationKey: vkSparky } = await TestProgram.compile();
  console.log(`   VK generated (length): ${JSON.stringify(vkSparky).length} chars`);
  console.log(`   VK hash: ${JSON.stringify(vkSparky).substring(0, 100)}...\n`);

  // Switch back to Snarky for comparison
  console.log('3️⃣ Switching back to Snarky...');
  await switchBackend('snarky');
  console.log(`   Current backend: ${getCurrentBackend()}`);
  console.log(`   globalThis.__snarky exists: ${!!globalThis.__snarky}`);
  console.log(`   globalThis.__snarky.Snarky exists: ${!!globalThis.__snarky?.Snarky}`);
  
  const { verificationKey: vkSnarky2 } = await TestProgram.compile();
  console.log(`   VK generated (length): ${JSON.stringify(vkSnarky2).length} chars`);
  console.log(`   VK hash: ${JSON.stringify(vkSnarky2).substring(0, 100)}...\n`);

  // Compare VKs
  console.log('🔄 Comparison Results:');
  const snarkyVkStr = JSON.stringify(vkSnarky);
  const sparkyVkStr = JSON.stringify(vkSparky);
  const snarkyVkStr2 = JSON.stringify(vkSnarky2);

  console.log(`   Snarky VK 1 == Snarky VK 2: ${snarkyVkStr === snarkyVkStr2 ? '✅ SAME' : '❌ DIFFERENT'}`);
  console.log(`   Snarky VK == Sparky VK: ${snarkyVkStr === sparkyVkStr ? '✅ SAME' : '❌ DIFFERENT'}`);
  
  if (snarkyVkStr === sparkyVkStr) {
    console.log('   ⚠️  ALL VKs ARE IDENTICAL - this suggests routing issue!');
  } else {
    console.log('   ✅ VKs are different between backends - routing working');
  }

  // Additional debugging: Check backend object types
  console.log('\n🔍 Backend object inspection:');
  if (globalThis.__snarky?.Snarky) {
    const snarkyObj = globalThis.__snarky.Snarky;
    console.log(`   Backend object type: ${typeof snarkyObj}`);
    console.log(`   Has field method: ${typeof snarkyObj.field === 'function'}`);
    console.log(`   Has constraintSystem: ${typeof snarkyObj.constraintSystem === 'object'}`);
    console.log(`   Has constraintCount: ${typeof snarkyObj.constraintCount === 'function'}`);
    
    // Try to detect if this is actually the OCaml or Sparky implementation
    const objStr = snarkyObj.toString();
    if (objStr.includes('sparky') || objStr.includes('wasm')) {
      console.log('   🟢 Detected: Sparky/WASM backend');
    } else if (objStr.includes('ocaml') || objStr.includes('native')) {
      console.log('   🔵 Detected: OCaml backend');
    } else {
      console.log('   🟡 Backend type unclear from inspection');
    }
  }
}

// Run the test
testVkIdentity().catch(console.error);