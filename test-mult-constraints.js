#!/usr/bin/env node

/**
 * Focused multiplication constraint test
 * Tests exactly what constraints are generated for a * b = c
 */

import { Field, ZkProgram } from './dist/node/index.js';
import { switchBackend, getCurrentBackend } from './dist/node/index.js';

const MultiplicationProgram = ZkProgram({
    name: 'multiplication-test',
    methods: {
        multiply: {
            privateInputs: [Field, Field],
            async method(a, b) {
                // Simple multiplication: a * b
                const c = a.mul(b);
                return c;
            }
        }
    }
});

async function testMultiplicationConstraints() {
    console.log('🔬 Testing Multiplication Constraints');
    console.log('='.repeat(60));
    
    // Test with Snarky
    console.log('\n📊 Snarky Backend:');
    await switchBackend('snarky');
    console.log(`Current backend: ${getCurrentBackend()}`);
    
    const snarkyResult = await MultiplicationProgram.compile();
    console.log('Snarky VK (first 64 chars):', snarkyResult.verificationKey.data.slice(0, 64));
    console.log('Snarky constraint count:', snarkyResult.verificationKey.data.length);
    
    // Test with Sparky
    console.log('\n🚀 Sparky Backend:');
    await switchBackend('sparky');
    console.log(`Current backend: ${getCurrentBackend()}`);
    
    console.log('Compiling with Sparky...');
    const sparkyResult = await MultiplicationProgram.compile();
    console.log('Sparky VK (first 64 chars):', sparkyResult.verificationKey.data.slice(0, 64));
    console.log('Sparky constraint count:', sparkyResult.verificationKey.data.length);
    
    // Compare
    console.log('\n🔍 Comparison:');
    const vkMatch = snarkyResult.verificationKey.data === sparkyResult.verificationKey.data;
    console.log(`VK Match: ${vkMatch ? '✅' : '❌'}`);
    
    if (!vkMatch) {
        console.log('VK lengths:', {
            snarky: snarkyResult.verificationKey.data.length,
            sparky: sparkyResult.verificationKey.data.length
        });
    }
}

// Run the test
testMultiplicationConstraints().then(() => {
    console.log('\n✅ Multiplication constraint test completed');
}).catch(error => {
    console.error('💥 Test failed:', error);
    console.error(error.stack);
    process.exit(1);
});