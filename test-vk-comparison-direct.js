#!/usr/bin/env node

/**
 * Direct VK comparison without debug noise
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

async function compareVKs() {
    // Compile with both backends
    await switchBackend('snarky');
    const snarkyResult = await MultiplicationProgram.compile();
    
    await switchBackend('sparky');
    const sparkyResult = await MultiplicationProgram.compile();
    
    const snarkyVK = snarkyResult.verificationKey.data;
    const sparkyVK = sparkyResult.verificationKey.data;
    
    console.log('VK Comparison:');
    console.log('='.repeat(60));
    console.log('Snarky VK length:', snarkyVK.length);
    console.log('Sparky VK length:', sparkyVK.length);
    console.log('VKs match:', snarkyVK === sparkyVK);
    
    if (snarkyVK !== sparkyVK) {
        // Find first difference
        let firstDiff = -1;
        for (let i = 0; i < Math.min(snarkyVK.length, sparkyVK.length); i++) {
            if (snarkyVK[i] !== sparkyVK[i]) {
                firstDiff = i;
                break;
            }
        }
        
        if (firstDiff >= 0) {
            console.log(`\nFirst difference at position ${firstDiff}:`);
            console.log('Snarky:', snarkyVK.slice(Math.max(0, firstDiff - 20), firstDiff + 40));
            console.log('Sparky:', sparkyVK.slice(Math.max(0, firstDiff - 20), firstDiff + 40));
            
            // Show more context
            console.log('\nVK prefix (first 200 chars):');
            console.log('Snarky:', snarkyVK.slice(0, 200));
            console.log('Sparky:', sparkyVK.slice(0, 200));
            
            console.log('\nAround position 601:');
            console.log('Snarky:', snarkyVK.slice(590, 620));
            console.log('Sparky:', sparkyVK.slice(590, 620));
        }
    }
}

// Suppress debug logs
console.debug = () => {};

compareVKs().catch(console.error);