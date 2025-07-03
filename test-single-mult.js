#!/usr/bin/env node

/**
 * Single multiplication test - minimal program to debug multiplication constraints
 */

import { Field, Provable, ZkProgram } from './dist/node/index.js';
import { switchBackend, getCurrentBackend } from './dist/node/index.js';

// Simple program with just one multiplication
const SingleMultProgram = ZkProgram({
    name: 'single-mult',
    methods: {
        singleMult: {
            privateInputs: [Field, Field],
            async method(a, b) {
                // Just return a * b - single multiplication
                return a.mul(b);
            }
        }
    }
});

async function testSingleMultiplication() {
    console.log('🔬 Testing Single Multiplication Constraint');
    console.log('='.repeat(60));
    
    // Test with Snarky
    console.log('\n📊 Snarky Backend:');
    await switchBackend('snarky');
    const snarkyVk = await SingleMultProgram.compile();
    console.log('Snarky VK (first 128 chars):', snarkyVk.verificationKey.data.slice(0, 128));
    
    // Test with Sparky
    console.log('\n🚀 Sparky Backend:');
    await switchBackend('sparky');
    const sparkyVk = await SingleMultProgram.compile();
    console.log('Sparky VK (first 128 chars):', sparkyVk.verificationKey.data.slice(0, 128));
    
    // Compare
    console.log('\n🔍 Comparison:');
    const match = snarkyVk.verificationKey.data === sparkyVk.verificationKey.data;
    console.log(`VK Match: ${match ? '✅' : '❌'}`);
    
    // Also test actual proof generation
    console.log('\n🧮 Testing proof generation:');
    try {
        const proof = await SingleMultProgram.singleMult(Field(3), Field(4));
        console.log('Proof generated:', proof ? '✅' : '❌');
        console.log('Result should be 12');
    } catch (e) {
        console.log('Proof generation failed:', e.message);
    }
}

// Run the test
testSingleMultiplication().then(() => {
    console.log('\n✅ Single multiplication test completed');
}).catch(error => {
    console.error('💥 Test failed:', error);
    process.exit(1);
});