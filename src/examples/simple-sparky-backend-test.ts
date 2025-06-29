/**
 * Simple Sparky Backend Test
 * Focuses on basic proving without complex worker threads
 */

import { Field, ZkProgram, Poseidon } from 'o1js';
import { switchBackend, getCurrentBackend } from '../bindings.js';

// Very simple program to avoid worker complexity
const SimpleProgram = ZkProgram({
  name: 'simple-sparky-test',
  publicOutput: Field,
  methods: {
    square: {
      privateInputs: [Field],
      async method(x: Field) {
        const result = x.mul(x);
        return { publicOutput: result };
      },
    },
    add: {
      privateInputs: [Field, Field],
      async method(a: Field, b: Field) {
        return { publicOutput: a.add(b) };
      },
    },
  },
});

async function testBackend(backendName: string) {
  console.log(`\n🧪 Testing ${backendName} Backend`);
  console.log('='.repeat(40));
  
  // Switch backend
  if (backendName === 'Sparky') {
    await switchBackend('sparky');
  } else {
    await switchBackend('snarky');
  }
  
  console.log(`✅ Active backend: ${getCurrentBackend()}`);
  
  try {
    console.log('\n📊 Compiling SimpleProgram...');
    console.time(`⏱️  ${backendName} compile`);
    const { verificationKey } = await SimpleProgram.compile();
    console.timeEnd(`⏱️  ${backendName} compile`);
    
    console.log('\n🔢 Testing square: 5^2 = 25');
    console.time(`⏱️  ${backendName} square proof`);
    const squareProof = await SimpleProgram.square(Field(5));
    console.timeEnd(`⏱️  ${backendName} square proof`);
    
    console.log('\n➕ Testing addition: 10 + 15 = 25');
    console.time(`⏱️  ${backendName} add proof`);
    const addProof = await SimpleProgram.add(Field(10), Field(15));
    console.timeEnd(`⏱️  ${backendName} add proof`);
    
    console.log('\n🔍 Verifying proofs...');
    const squareValid = await SimpleProgram.verify(squareProof);
    const addValid = await SimpleProgram.verify(addProof);
    
    console.log(`✅ Square proof valid: ${squareValid}`);
    console.log(`✅ Add proof valid: ${addValid}`);
    console.log(`📊 Square result: ${squareProof.publicOutput.toString()}`);
    console.log(`📊 Add result: ${addProof.publicOutput.toString()}`);
    
    return {
      backend: backendName,
      squareValid,
      addValid,
      squareResult: squareProof.publicOutput.toString(),
      addResult: addProof.publicOutput.toString(),
      success: squareValid && addValid
    };
    
  } catch (error) {
    console.error(`❌ ${backendName} test failed:`, error.message);
    return {
      backend: backendName,
      success: false,
      error: error.message
    };
  }
}

async function main() {
  try {
    console.log('🎯 Simple Sparky Backend Test');
    console.log('=============================');
    
    // Test Snarky first
    const snarkyResult = await testBackend('Snarky');
    
    // Test Sparky
    const sparkyResult = await testBackend('Sparky');
    
    console.log('\n' + '='.repeat(50));
    console.log('📊 BACKEND COMPARISON RESULTS');
    console.log('='.repeat(50));
    
    console.log(`\n🔵 Snarky:`);
    console.log(`   • Success: ${snarkyResult.success}`);
    if (snarkyResult.success) {
      console.log(`   • Square: ${snarkyResult.squareResult} (valid: ${snarkyResult.squareValid})`);
      console.log(`   • Add: ${snarkyResult.addResult} (valid: ${snarkyResult.addValid})`);
    } else {
      console.log(`   • Error: ${snarkyResult.error}`);
    }
    
    console.log(`\n⚡ Sparky:`);
    console.log(`   • Success: ${sparkyResult.success}`);
    if (sparkyResult.success) {
      console.log(`   • Square: ${sparkyResult.squareResult} (valid: ${sparkyResult.squareValid})`);
      console.log(`   • Add: ${sparkyResult.addResult} (valid: ${sparkyResult.addValid})`);
    } else {
      console.log(`   • Error: ${sparkyResult.error}`);
    }
    
    // Compare results
    if (snarkyResult.success && sparkyResult.success) {
      const squareMatch = snarkyResult.squareResult === sparkyResult.squareResult;
      const addMatch = snarkyResult.addResult === sparkyResult.addResult;
      
      console.log(`\n🔍 Result Comparison:`);
      console.log(`   • Square results match: ${squareMatch ? '✅ YES' : '❌ NO'}`);
      console.log(`   • Add results match: ${addMatch ? '✅ YES' : '❌ NO'}`);
      
      if (squareMatch && addMatch) {
        console.log('\n🎉 SUCCESS! Sparky produces identical results to Snarky!');
        console.log('🔥 Sparky backend is working correctly!');
      } else {
        console.log('\n⚠️  Results differ between backends');
      }
    } else {
      console.log('\n❌ One or both backends failed');
    }
    
  } catch (error) {
    console.error('\n❌ Test suite failed:', error);
    process.exit(1);
  }
}

main();