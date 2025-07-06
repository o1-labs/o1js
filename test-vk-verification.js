/**
 * Test to verify VK hash comparison accuracy
 */

import { Field, ZkProgram, Provable, Bool, switchBackend, getCurrentBackend } from './dist/node/index.js';

// Conditional Program (claimed to have matching VKs)
const ConditionalProgram = ZkProgram({
  name: 'ConditionalProgram',
  publicInput: Field,
  publicOutput: Field,
  methods: {
    compute: {
      privateInputs: [Bool, Field, Field],
      async method(publicInput, condition, ifTrue, ifFalse) {
        const selected = Provable.if(condition, ifTrue, ifFalse);
        const result = publicInput.add(selected);
        return { publicOutput: result };
      },
    },
  },
});

async function testVKComparison() {
  console.log('🔍 Testing VK hash comparison accuracy...\n');
  
  // Test with Snarky
  console.log('📊 Testing with Snarky backend...');
  await switchBackend('snarky');
  
  const snarkyResult = await ConditionalProgram.compile();
  const snarkyHash = snarkyResult.verificationKey.hash;
  console.log('Snarky VK hash (full):', snarkyHash);
  console.log('Snarky VK hash (type):', typeof snarkyHash);
  if (typeof snarkyHash === 'string') {
    console.log('Snarky VK hash (preview):', snarkyHash.substring(0, 8) + '...');
  } else {
    console.log('Snarky VK hash (JSON):', JSON.stringify(snarkyHash));
  }
  
  // Test with Sparky
  console.log('\n📊 Testing with Sparky backend...');
  await switchBackend('sparky');
  
  const sparkyResult = await ConditionalProgram.compile();
  const sparkyHash = sparkyResult.verificationKey.hash;
  console.log('Sparky VK hash (full):', sparkyHash);
  console.log('Sparky VK hash (type):', typeof sparkyHash);
  if (typeof sparkyHash === 'string') {
    console.log('Sparky VK hash (preview):', sparkyHash.substring(0, 8) + '...');
  } else {
    console.log('Sparky VK hash (JSON):', JSON.stringify(sparkyHash));
  }
  
  // Compare
  console.log('\n🔍 Comparison:');
  console.log('Hash equality (===):', snarkyHash === sparkyHash);
  console.log('Hash equality (JSON):', JSON.stringify(snarkyHash) === JSON.stringify(sparkyHash));
  
  if (typeof snarkyHash === 'string' && typeof sparkyHash === 'string') {
    console.log('String comparison:', snarkyHash === sparkyHash);
    console.log('First 20 chars match:', snarkyHash.substring(0, 20) === sparkyHash.substring(0, 20));
  }
}

testVKComparison().catch(console.error);