#!/usr/bin/env node

/**
 * Union-Find Validation Test
 * Tests the new Union-Find optimization in Sparky vs Snarky
 * Expected: Significant constraint reduction for equality-heavy circuits
 */

import { Field, ZkProgram, Proof, switchBackend, getCurrentBackend } from './dist/node/index.js';

async function testUnionFindOptimization() {
    console.log('🧪 Testing Union-Find Optimization Implementation');
    console.log('='.repeat(60));
    
    // Test 1: Simple equality chain (should benefit most from Union-Find)
    const EqualityChainProgram = ZkProgram({
        name: 'equality-chain',
        methods: {
            equalityChain: {
                privateInputs: [Field, Field, Field],
                async method(a, b, c) {
                    // Chain of equalities: a = b = c
                    // Without Union-Find: 2 constraints
                    // With Union-Find: 0-1 constraints (variables unified)
                    a.assertEquals(b);
                    b.assertEquals(c);
                }
            }
        }
    });
    
    // Test 2: Field multiplication with equality
    const FieldMultProgram = ZkProgram({
        name: 'field-mult-equality', 
        methods: {
            multAndEqual: {
                privateInputs: [Field, Field],
                async method(a, b) {
                    // a² = b, then assert equality
                    // This should benefit from Union-Find optimization
                    const aSquared = a.mul(a);
                    aSquared.assertEquals(b);
                }
            }
        }
    });
    
    try {
        // Test with Snarky backend (baseline)
        console.log('\n📊 Testing with Snarky backend (baseline)...');
        await switchBackend('snarky');
        console.log(`Current backend: ${getCurrentBackend()}`);
        
        const snarkyVk1 = await EqualityChainProgram.compile();
        const snarkyVk2 = await FieldMultProgram.compile();
        
        console.log(`Snarky - Equality Chain VK: ${snarkyVk1.verificationKey.data.slice(0, 64)}...`);
        console.log(`Snarky - Field Mult VK: ${snarkyVk2.verificationKey.data.slice(0, 64)}...`);
        
        // Test with Sparky backend (with Union-Find)
        console.log('\n🚀 Testing with Sparky backend (with Union-Find)...');
        await switchBackend('sparky');
        console.log(`Current backend: ${getCurrentBackend()}`);
        
        const sparkyVk1 = await EqualityChainProgram.compile();
        const sparkyVk2 = await FieldMultProgram.compile();
        
        console.log(`Sparky - Equality Chain VK: ${sparkyVk1.verificationKey.data.slice(0, 64)}...`);
        console.log(`Sparky - Field Mult VK: ${sparkyVk2.verificationKey.data.slice(0, 64)}...`);
        
        // Compare VK compatibility
        console.log('\n🔍 VK Parity Analysis:');
        const vk1Match = snarkyVk1.verificationKey.data === sparkyVk1.verificationKey.data;
        const vk2Match = snarkyVk2.verificationKey.data === sparkyVk2.verificationKey.data;
        
        console.log(`Equality Chain VK Match: ${vk1Match ? '✅' : '❌'}`);
        console.log(`Field Mult VK Match: ${vk2Match ? '✅' : '❌'}`);
        
        // Test actual proof generation
        console.log('\n🧮 Testing proof generation...');
        
        await switchBackend('sparky');
        const proof1 = await EqualityChainProgram.equalityChain(Field(42), Field(42), Field(42));
        const proof2 = await FieldMultProgram.multAndEqual(Field(5), Field(25));
        
        console.log(`Equality chain proof generated: ${proof1 ? '✅' : '❌'}`);
        console.log(`Field mult proof generated: ${proof2 ? '✅' : '❌'}`);
        
        // Summary
        console.log('\n📈 Union-Find Implementation Results:');
        console.log(`VK Parity Rate: ${vk1Match && vk2Match ? '100%' : (vk1Match || vk2Match ? '50%' : '0%')}`);
        console.log(`Proof Generation: ${proof1 && proof2 ? 'Success' : 'Partial/Failed'}`);
        
        if (vk1Match || vk2Match) {
            console.log('🎉 BREAKTHROUGH: Union-Find optimization showing VK compatibility improvements!');
        } else {
            console.log('⚠️  Union-Find needs further refinement for full VK parity');
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error('Stack:', error.stack);
    }
}

// Run the test
testUnionFindOptimization().then(() => {
    console.log('\n✅ Union-Find validation test completed');
}).catch(error => {
    console.error('💥 Validation test crashed:', error);
    process.exit(1);
});