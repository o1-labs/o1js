/**
 * Test to verify if Sparky produces unique VKs for different circuits
 * This tests the hypothesis that Sparky generates the same VK regardless of circuit
 */

import { Field, ZkProgram } from './dist/node/index.js';
import { switchBackend, getCurrentBackend } from './dist/node/index.js';

async function testSparkyVKUniqueness() {
  console.log('🔍 Testing if Sparky produces unique VKs for different circuits...\n');

  // Switch to Sparky backend
  await switchBackend('sparky');
  console.log(`Backend: ${getCurrentBackend()}\n`);

  // Define completely different circuits
  const SimpleAddition = ZkProgram({
    name: 'SimpleAddition',
    publicInput: Field,
    methods: {
      add: {
        privateInputs: [Field],
        async method(publicInput, privateInput) {
          publicInput.assertEquals(privateInput.add(Field(1)));
        },
      },
    },
  });

  const SimpleMultiplication = ZkProgram({
    name: 'SimpleMultiplication', 
    publicInput: Field,
    methods: {
      multiply: {
        privateInputs: [Field],
        async method(publicInput, privateInput) {
          publicInput.assertEquals(privateInput.mul(Field(2)));
        },
      },
    },
  });

  const ComplexCircuit = ZkProgram({
    name: 'ComplexCircuit',
    publicInput: Field,
    methods: {
      complex: {
        privateInputs: [Field, Field],
        async method(publicInput, a, b) {
          const sum = a.add(b);
          const product = a.mul(b);
          const combined = sum.add(product);
          publicInput.assertEquals(combined);
        },
      },
    },
  });

  const VerySimple = ZkProgram({
    name: 'VerySimple',
    publicInput: Field,
    methods: {
      justAssert: {
        privateInputs: [],
        async method(publicInput) {
          publicInput.assertEquals(Field(42));
        },
      },
    },
  });

  console.log('🧪 Compiling different circuits with Sparky...\n');

  // Compile all circuits and collect VKs
  const circuits = [
    { name: 'SimpleAddition', program: SimpleAddition },
    { name: 'SimpleMultiplication', program: SimpleMultiplication },
    { name: 'ComplexCircuit', program: ComplexCircuit },
    { name: 'VerySimple', program: VerySimple },
  ];

  const results = [];

  for (const circuit of circuits) {
    console.log(`Compiling ${circuit.name}...`);
    const start = Date.now();
    const { verificationKey } = await circuit.program.compile();
    const duration = Date.now() - start;
    
    const vkString = JSON.stringify(verificationKey);
    const vkHash = vkString.substring(0, 100);
    
    results.push({
      name: circuit.name,
      vkString,
      vkHash,
      vkLength: vkString.length,
      duration
    });
    
    console.log(`  ✓ VK generated (${vkString.length} chars, ${duration}ms)`);
    console.log(`  Hash: ${vkHash}...\n`);
  }

  // Analyze uniqueness
  console.log('🔍 Uniqueness Analysis:\n');
  
  const uniqueVKs = new Set(results.map(r => r.vkString));
  const uniqueHashes = new Set(results.map(r => r.vkHash));
  
  console.log(`Total circuits: ${results.length}`);
  console.log(`Unique VKs: ${uniqueVKs.size}`);
  console.log(`Unique VK hashes: ${uniqueHashes.size}\n`);

  if (uniqueVKs.size === 1) {
    console.log('❌ CRITICAL ISSUE: All circuits produce IDENTICAL VKs!');
    console.log('   This confirms Sparky is not generating circuit-specific constraints.\n');
  } else if (uniqueVKs.size < results.length) {
    console.log(`⚠️  PARTIAL ISSUE: Some circuits produce identical VKs (${uniqueVKs.size}/${results.length} unique)`);
  } else {
    console.log('✅ All circuits produce unique VKs');
  }

  // Detailed comparison
  console.log('📋 Detailed VK Comparison:');
  for (let i = 0; i < results.length; i++) {
    for (let j = i + 1; j < results.length; j++) {
      const r1 = results[i];
      const r2 = results[j];
      const isIdentical = r1.vkString === r2.vkString;
      const status = isIdentical ? '❌ IDENTICAL' : '✅ DIFFERENT';
      console.log(`  ${r1.name} vs ${r2.name}: ${status}`);
    }
  }

  // Check constraint generation debugging
  console.log('\n🔧 Debugging Information:');
  console.log('  Check the Sparky debug output above for constraint generation patterns');
  console.log('  Look for repeated constraint patterns that might indicate generic generation');
  
  return results;
}

// Run the test
testSparkyVKUniqueness().catch(console.error);