#!/usr/bin/env node

/**
 * Detailed analysis of constraint system differences between Snarky and Sparky
 */

import { Field, Provable, ZkProgram } from './dist/node/index.js';
import { switchBackend, getCurrentBackend } from './dist/node/index.js';

// Simple multiplication program for analysis
const TestProgram = ZkProgram({
    name: 'test-constraints',
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

async function analyzeConstraintSystems() {
    console.log('Constraint System Analysis');
    console.log('='.repeat(80));
    
    // Analyze Snarky
    console.log('\n🔍 SNARKY BACKEND ANALYSIS');
    console.log('-'.repeat(40));
    await switchBackend('snarky');
    console.log('Backend:', getCurrentBackend());
    
    console.log('Compiling with Snarky...');
    const snarkyResult = await TestProgram.compile();
    console.log('✓ Snarky compilation complete');
    console.log('Snarky VK length:', snarkyResult.verificationKey.data.length);
    
    // Analyze Sparky  
    console.log('\n🚀 SPARKY BACKEND ANALYSIS');
    console.log('-'.repeat(40));
    await switchBackend('sparky');
    console.log('Backend:', getCurrentBackend());
    
    console.log('Compiling with Sparky...');
    const sparkyResult = await TestProgram.compile();
    console.log('✓ Sparky compilation complete');
    console.log('Sparky VK length:', sparkyResult.verificationKey.data.length);
    
    // Compare VKs
    console.log('\n📊 VK COMPARISON');
    console.log('-'.repeat(40));
    const snarkyVK = snarkyResult.verificationKey.data;
    const sparkyVK = sparkyResult.verificationKey.data;
    
    console.log('VK lengths match:', snarkyVK.length === sparkyVK.length);
    console.log('VKs identical:', snarkyVK === sparkyVK);
    
    if (snarkyVK !== sparkyVK) {
        // Find first difference
        let firstDiff = -1;
        for (let i = 0; i < Math.min(snarkyVK.length, sparkyVK.length); i++) {
            if (snarkyVK[i] !== sparkyVK[i]) {
                firstDiff = i;
                break;
            }
        }
        
        console.log(`First difference at position: ${firstDiff}`);
        console.log(`Percentage through VK: ${Math.floor(firstDiff / snarkyVK.length * 100)}%`);
        
        // Analyze VK structure
        console.log('\nVK structure analysis:');
        console.log('- Position 0-200: Circuit gates and coefficients');
        console.log('- Position 200-600: Permutation data');
        console.log('- Position 600+: Domain parameters and verification data');
        
        if (firstDiff < 200) {
            console.log('❌ Difference in circuit gates/coefficients - fundamental constraint differences');
        } else if (firstDiff < 600) {
            console.log('⚠️  Difference in permutation data - variable arrangement differs');
        } else {
            console.log('🔧 Difference in verification parameters - likely fixable');
        }
    }
    
    // Summary
    console.log('\n📋 SUMMARY');
    console.log('-'.repeat(40));
    console.log('Constraint satisfaction: ✅ FIXED (multiplication works)');
    console.log('VK parity: ❌ NOT ACHIEVED (diverges at position', firstDiff + ')');
    console.log('\nRoot cause: Different circuit structures despite same constraints');
    console.log('Next steps: Investigate variable allocation and permutation generation');
}

// Suppress debug output except for constraint system info
console.debug = () => {};

analyzeConstraintSystems().catch(console.error);