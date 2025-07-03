#!/usr/bin/env node

/**
 * Simple test to check if multiplication VK parity is fixed
 */

import { Field, Provable, ZkProgram } from './dist/node/index.js';
import { switchBackend, getCurrentBackend } from './dist/node/index.js';

// Simple multiplication program
const MultiplicationProgram = ZkProgram({
    name: 'multiplication',
    publicInput: Field,
    methods: {
        multiply: {
            privateInputs: [Field, Field],
            async method(expected, a, b) {
                const result = a.mul(b);
                result.assertEquals(expected);
            }
        }
    }
});

async function testMultiplicationVK() {
    console.log('🔬 Testing Multiplication VK Parity');
    console.log('='.repeat(60));
    
    // Compile with Snarky
    console.log('\n📊 Compiling with Snarky...');
    await switchBackend('snarky');
    const snarkyVk = await MultiplicationProgram.compile();
    
    // Compile with Sparky
    console.log('\n🚀 Compiling with Sparky...');
    await switchBackend('sparky');
    const sparkyVk = await MultiplicationProgram.compile();
    
    // Compare VKs
    console.log('\n🔍 VK Comparison:');
    const snarkyVkData = snarkyVk.verificationKey.data;
    const sparkyVkData = sparkyVk.verificationKey.data;
    
    console.log('Snarky VK length:', snarkyVkData.length);
    console.log('Sparky VK length:', sparkyVkData.length);
    console.log('Snarky VK (first 128 chars):', snarkyVkData.slice(0, 128));
    console.log('Sparky VK (first 128 chars):', sparkyVkData.slice(0, 128));
    
    const match = snarkyVkData === sparkyVkData;
    console.log(`\nVK Match: ${match ? '✅ YES!' : '❌ NO'}`);
    
    if (match) {
        console.log('\n🎉 MULTIPLICATION VK PARITY ACHIEVED!');
    } else {
        // Find first difference
        for (let i = 0; i < Math.min(snarkyVkData.length, sparkyVkData.length); i++) {
            if (snarkyVkData[i] !== sparkyVkData[i]) {
                console.log(`\nFirst difference at position ${i}:`);
                console.log(`Snarky: ${snarkyVkData.slice(i, i + 20)}`);
                console.log(`Sparky: ${sparkyVkData.slice(i, i + 20)}`);
                break;
            }
        }
    }
}

testMultiplicationVK().catch(console.error);