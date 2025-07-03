#!/usr/bin/env node

/**
 * Silent VK comparison - captures VKs without debug output
 */

import { Field, Provable, ZkProgram } from './dist/node/index.js';
import { switchBackend, getCurrentBackend } from './dist/node/index.js';

// Suppress all debug output
const originalDebug = console.debug;
const originalLog = console.log;
const originalInfo = console.info;
console.debug = () => {};
console.log = () => {};
console.info = () => {};

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

async function captureVKs() {
    // Compile with both backends
    await switchBackend('snarky');
    const snarkyResult = await MultiplicationProgram.compile();
    
    await switchBackend('sparky');
    const sparkyResult = await MultiplicationProgram.compile();
    
    // Restore console
    console.debug = originalDebug;
    console.log = originalLog;
    console.info = originalInfo;
    
    const snarkyVK = snarkyResult.verificationKey.data;
    const sparkyVK = sparkyResult.verificationKey.data;
    
    console.log('VK Comparison Results:');
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
            const context = 30;
            console.log('Snarky:', snarkyVK.slice(Math.max(0, firstDiff - context), firstDiff + context));
            console.log('Sparky:', sparkyVK.slice(Math.max(0, firstDiff - context), firstDiff + context));
            
            // Analyze the difference
            console.log('\nAnalysis:');
            console.log('Position', firstDiff, 'is approximately', Math.floor(firstDiff / snarkyVK.length * 100) + '% through the VK');
            
            // Show VK structure around position 601
            if (firstDiff > 590 && firstDiff < 620) {
                console.log('\nDetailed view around position 601:');
                for (let i = 590; i <= 620 && i < Math.min(snarkyVK.length, sparkyVK.length); i++) {
                    const match = snarkyVK[i] === sparkyVK[i] ? '✓' : 'X';
                    console.log(`Position ${i}: ${match} Snarky:'${snarkyVK[i]}' Sparky:'${sparkyVK[i]}'`);
                }
            }
        }
    } else {
        console.log('\n🎉 VKs MATCH! VK parity achieved for multiplication!');
    }
}

captureVKs().catch(console.error);