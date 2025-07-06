/**
 * Simple VK Parity Test
 * 
 * This test directly compares verification keys between Snarky and Sparky backends
 * to check for parity. This is a critical test for zkSNARK compatibility.
 */

import { Field, ZkProgram } from './dist/node/index.js';

// Simple test circuit for VK comparison
const SimpleCircuit = ZkProgram({
  name: 'SimpleCircuit',
  publicInput: Field,
  
  methods: {
    simpleCheck: {
      privateInputs: [Field],
      
      async method(publicInput, privateInput) {
        // Simple constraint: publicInput = privateInput * 2
        const computed = privateInput.mul(2);
        computed.assertEquals(publicInput);
        return computed;
      }
    }
  }
});

async function testVKParity() {
  console.log('=== VK Parity Test: Snarky vs Sparky ===\n');
  
  let snarkyResults = {};
  let sparkyResults = {};
  
  try {
    // Test 1: ZkProgram VK comparison
    console.log('1. Testing ZkProgram VK parity...');
    
    console.log('   Compiling ZkProgram with default backend (Snarky)...');
    const snarkyProgramResult = await SimpleCircuit.compile();
    snarkyResults.program = {
      verificationKey: snarkyProgramResult.verificationKey,
      hash: snarkyProgramResult.verificationKey?.hash || 'no-hash'
    };
    console.log('   Snarky ZkProgram VK hash:', snarkyResults.program.hash);
    
    // Try to switch to Sparky backend if available
    console.log('\n2. Attempting to switch to Sparky backend...');
    
    // Check if switchBackend exists in the module
    const o1js = await import('./dist/node/index.js');
    if (typeof o1js.switchBackend === 'function') {
      console.log('   switchBackend function found, switching to Sparky...');
      await o1js.switchBackend('sparky');
      console.log('   Backend switched to Sparky');
      
      // Recompile with Sparky
      console.log('   Compiling ZkProgram with Sparky backend...');
      const sparkyProgramResult = await SimpleCircuit.compile();
      sparkyResults.program = {
        verificationKey: sparkyProgramResult.verificationKey,
        hash: sparkyProgramResult.verificationKey?.hash || 'no-hash'
      };
      console.log('   Sparky ZkProgram VK hash:', sparkyResults.program.hash);
      
      // Switch back to Snarky
      await o1js.switchBackend('snarky');
      
    } else {
      console.log('   switchBackend function not available, backend switching not supported');
      sparkyResults.program = { hash: 'backend-switch-unavailable' };
    }
    
    // Analysis
    console.log('\n=== VK PARITY ANALYSIS ===');
    
    console.log('\n📊 ZkProgram VK Comparison:');
    console.log(`   Snarky Hash:  ${snarkyResults.program.hash}`);
    console.log(`   Sparky Hash:  ${sparkyResults.program.hash}`);
    
    if (snarkyResults.program.hash === sparkyResults.program.hash) {
      console.log('   ✅ ZkProgram VKs MATCH! Perfect parity achieved!');
    } else {
      console.log('   ❌ ZkProgram VKs DO NOT MATCH - Backend parity issue detected');
    }
    
    // Summary
    console.log('\n🎯 SUMMARY:');
    const programParity = snarkyResults.program.hash === sparkyResults.program.hash;
    
    if (programParity) {
      console.log('   ✅ ALL VK PARITY TESTS PASSED');
    } else {
      console.log('   ❌ VK PARITY ISSUES DETECTED');
      console.log(`   - ZkProgram Parity: ${programParity ? 'PASS' : 'FAIL'}`);
    }
    
  } catch (error) {
    console.error('\n❌ VK Parity Test Failed:', error);
    console.error('Error Details:', error.message);
    console.error('Stack Trace:', error.stack);
  }
}

// Run the test
testVKParity().then(() => {
  console.log('\n🏁 VK Parity Test Complete');
}).catch((error) => {
  console.error('\n💥 VK Parity Test Crashed:', error);
});