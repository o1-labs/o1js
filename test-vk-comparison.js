#!/usr/bin/env node

/**
 * Compare VKs in detail
 */

import { Field, Provable, ZkProgram } from './dist/node/index.js';
import { switchBackend } from './dist/node/index.js';

const TestProgram = ZkProgram({
    name: 'test-mult',
    methods: {
        test: {
            privateInputs: [Field, Field, Field],
            async method(a, b, expected) {
                const result = a.mul(b);
                result.assertEquals(expected);
            }
        }
    }
});

async function compareVKs() {
    console.log('🔬 Detailed VK Comparison');
    console.log('='.repeat(60));
    
    await switchBackend('snarky');
    const snarkyResult = await TestProgram.compile();
    const snarkyVK = snarkyResult.verificationKey.data;
    
    await switchBackend('sparky');
    const sparkyResult = await TestProgram.compile();
    const sparkyVK = sparkyResult.verificationKey.data;
    
    console.log('\nSnarky VK length:', snarkyVK.length);
    console.log('Sparky VK length:', sparkyVK.length);
    console.log('Lengths match:', snarkyVK.length === sparkyVK.length ? '✅' : '❌');
    
    if (snarkyVK === sparkyVK) {
        console.log('\n✅ VKs are IDENTICAL!');
    } else {
        console.log('\n❌ VKs differ');
        
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
            console.log('Context:', snarkyVK.slice(Math.max(0, firstDiff - 20), firstDiff + 20));
            console.log('Snarky char:', snarkyVK[firstDiff]);
            console.log('Sparky char:', sparkyVK[firstDiff]);
        }
        
        // Show first and last parts
        console.log('\nFirst 100 chars:');
        console.log('Snarky:', snarkyVK.slice(0, 100));
        console.log('Sparky:', sparkyVK.slice(0, 100));
        
        console.log('\nLast 100 chars:');
        console.log('Snarky:', snarkyVK.slice(-100));
        console.log('Sparky:', sparkyVK.slice(-100));
    }
}

compareVKs().then(() => {
    console.log('\n✅ Comparison complete');
}).catch(error => {
    console.error('💥 Error:', error);
    process.exit(1);
});