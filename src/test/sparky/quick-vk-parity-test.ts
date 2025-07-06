/**
 * QUICK VK PARITY TEST
 * 
 * Created: July 6, 2025 18:30 UTC
 * Last Modified: July 6, 2025 18:30 UTC
 * 
 * Purpose: Quick test to validate VK parity on circuits with actual constraints
 */

import { Field, ZkProgram, switchBackend } from '../../index.js';

// Simple circuit with actual constraints
const SimpleArithmeticProgram = ZkProgram({
  name: 'SimpleArithmetic',
  publicInput: Field,
  publicOutput: Field,
  methods: {
    compute: {
      privateInputs: [Field],
      async method(publicInput: Field, privateInput: Field) {
        const result = publicInput.add(privateInput);
        return { publicOutput: result };
      },
    },
  },
});

async function testVKParity() {
  console.log('🔍 Quick VK Parity Test');
  console.log('=' .repeat(50));

  // Test with Snarky
  console.log('\n📊 Testing Snarky backend...');
  await switchBackend('snarky');
  const snarkyResult = await SimpleArithmeticProgram.compile();
  const snarkyVKHash = snarkyResult.verificationKey.hash.toString();
  console.log(`Snarky VK Hash: ${snarkyVKHash}`);

  // Test with Sparky
  console.log('\n📊 Testing Sparky backend...');
  await switchBackend('sparky');
  const sparkyResult = await SimpleArithmeticProgram.compile();
  const sparkyVKHash = sparkyResult.verificationKey.hash.toString();
  console.log(`Sparky VK Hash: ${sparkyVKHash}`);

  // Compare
  const match = snarkyVKHash === sparkyVKHash;
  console.log(`\n🎯 VK Parity Result: ${match ? '✅ MATCH' : '❌ MISMATCH'}`);
  
  if (!match) {
    console.log('VK Hash Difference:');
    console.log(`  Snarky: ${snarkyVKHash}`);
    console.log(`  Sparky: ${sparkyVKHash}`);
  }

  return match;
}

testVKParity().then(match => {
  process.exit(match ? 0 : 1);
}).catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
});