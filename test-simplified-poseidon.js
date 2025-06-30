#!/usr/bin/env node

/**
 * Test the simplified Poseidon implementation (no two-layer optimization)
 * This verifies that removing the JavaScript fast path doesn't break functionality
 */

import { Field, Poseidon, initializeBindings, switchBackend, getCurrentBackend } from './dist/node/index.js';

async function testSimplifiedPoseidon() {
    console.log('🧪 Testing Simplified Poseidon Implementation');
    console.log('='.repeat(50));
    
    // Initialize with Snarky first
    await initializeBindings();
    console.log(`Initial backend: ${getCurrentBackend()}`);
    
    // Test with constants
    console.log('\n1. Testing Poseidon with constants:');
    const constant1 = Field(100);
    const constant2 = Field(0);
    
    // Test with Snarky
    const snarkyResult = Poseidon.hash([constant1, constant2]);
    console.log(`Snarky result: ${snarkyResult.toString()}`);
    
    // Switch to Sparky
    await switchBackend('sparky');
    console.log(`\nSwitched to: ${getCurrentBackend()}`);
    
    // Test with Sparky (constants)
    const sparkyConstantResult = Poseidon.hash([constant1, constant2]);
    console.log(`Sparky result (constants): ${sparkyConstantResult.toString()}`);
    
    // Verify they match
    const constantsMatch = snarkyResult.equals(sparkyConstantResult).toBoolean();
    console.log(`Constants match: ${constantsMatch ? '✅' : '❌'}`);
    
    // Test with variables (need to be in a ZkProgram context)
    console.log('\n2. Testing Poseidon with variables in ZkProgram:');
    
    const { ZkProgram } = await import('./dist/node/index.js');
    
    const PoseidonProgram = ZkProgram({
        name: 'poseidon-test',
        publicInput: Field,
        methods: {
            hash: {
                privateInputs: [Field],
                method(publicInput, privateInput) {
                    // This should create variables and test the WASM path
                    const result = Poseidon.hash([publicInput, privateInput]);
                    result.assertEquals(publicInput.add(privateInput));
                }
            }
        }
    });
    
    console.log('Compiling ZkProgram with Sparky...');
    const startTime = Date.now();
    const { verificationKey } = await PoseidonProgram.compile();
    const compileTime = Date.now() - startTime;
    console.log(`Compilation time: ${compileTime}ms`);
    console.log(`VK digest: ${verificationKey.data.slice(0, 10)}...`);
    
    // Switch back to Snarky and compare
    await switchBackend('snarky');
    console.log('\n3. Comparing with Snarky compilation:');
    
    const snarkyStartTime = Date.now();
    const { verificationKey: snarkyVK } = await PoseidonProgram.compile();
    const snarkyCompileTime = Date.now() - snarkyStartTime;
    console.log(`Snarky compilation time: ${snarkyCompileTime}ms`);
    console.log(`Snarky VK digest: ${snarkyVK.data.slice(0, 10)}...`);
    
    // Check if VKs match (they should for identical constraint systems)
    const vkMatch = verificationKey.hash.equals(snarkyVK.hash).toBoolean();
    console.log(`Verification keys match: ${vkMatch ? '✅' : '❌'}`);
    
    console.log('\n📊 Summary:');
    console.log(`- Constant hash consistency: ${constantsMatch ? '✅' : '❌'}`);
    console.log(`- Variable constraint generation: ✅ (compiled successfully)`);
    console.log(`- Backend switching: ✅`);
    console.log(`- VK consistency: ${vkMatch ? '✅' : '❌'}`);
    console.log(`- Sparky speedup: ${(snarkyCompileTime / compileTime).toFixed(1)}x`);
    
    if (constantsMatch && vkMatch) {
        console.log('\n🎉 Simplified implementation working correctly!');
        return true;
    } else {
        console.log('\n❌ Issues detected with simplified implementation');
        return false;
    }
}

// Run the test
testSimplifiedPoseidon()
    .then(success => {
        process.exit(success ? 0 : 1);
    })
    .catch(error => {
        console.error('❌ Test failed with error:', error);
        process.exit(1);
    });