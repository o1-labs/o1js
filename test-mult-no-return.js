#!/usr/bin/env node

/**
 * Multiplication test without return value
 */

import { Field, Provable, ZkProgram } from './dist/node/index.js';
import { switchBackend, getCurrentBackend } from './dist/node/index.js';

// Program that does multiplication but doesn't return
const MultNoReturnProgram = ZkProgram({
    name: 'mult-no-return',
    methods: {
        multNoReturn: {
            privateInputs: [Field, Field, Field],
            async method(a, b, expected) {
                // Compute a * b
                const result = a.mul(b);
                // Assert it equals expected
                result.assertEquals(expected);
            }
        }
    }
});

// Program that uses assertMul directly
const MultDirectProgram = ZkProgram({
    name: 'mult-direct',
    methods: {
        multDirect: {
            privateInputs: [Field, Field, Field],
            async method(a, b, c) {
                // Import Snarky bindings to use assertMul directly
                const { Snarky } = await import('./dist/node/bindings.js');
                Snarky.field.assertMul(a.value, b.value, c.value);
            }
        }
    }
});

async function testMultiplicationVariants() {
    console.log('🔬 Testing Multiplication Constraint Variants');
    console.log('='.repeat(60));
    
    // Test multiplication with no return
    console.log('\n📊 Test 1: Multiplication with no return (a.mul(b).assertEquals(c))');
    
    await switchBackend('snarky');
    const snarkyVk1 = await MultNoReturnProgram.compile();
    console.log('Snarky VK:', snarkyVk1.verificationKey.data.slice(0, 64));
    
    await switchBackend('sparky');
    const sparkyVk1 = await MultNoReturnProgram.compile();
    console.log('Sparky VK:', sparkyVk1.verificationKey.data.slice(0, 64));
    console.log('Match:', snarkyVk1.verificationKey.data === sparkyVk1.verificationKey.data ? '✅' : '❌');
    
    // Test direct assertMul
    console.log('\n📊 Test 2: Direct assertMul (Provable.assertMul(a, b, c))');
    
    await switchBackend('snarky');
    const snarkyVk2 = await MultDirectProgram.compile();
    console.log('Snarky VK:', snarkyVk2.verificationKey.data.slice(0, 64));
    
    await switchBackend('sparky');
    const sparkyVk2 = await MultDirectProgram.compile();
    console.log('Sparky VK:', sparkyVk2.verificationKey.data.slice(0, 64));
    console.log('Match:', snarkyVk2.verificationKey.data === sparkyVk2.verificationKey.data ? '✅' : '❌');
    
    // Compare the two approaches
    console.log('\n🔍 Comparison between approaches:');
    console.log('NoReturn Snarky == Direct Snarky:', snarkyVk1.verificationKey.data === snarkyVk2.verificationKey.data ? '✅' : '❌');
    console.log('NoReturn Sparky == Direct Sparky:', sparkyVk1.verificationKey.data === sparkyVk2.verificationKey.data ? '✅' : '❌');
}

// Run the test
testMultiplicationVariants().then(() => {
    console.log('\n✅ Multiplication variants test completed');
}).catch(error => {
    console.error('💥 Test failed:', error);
    process.exit(1);
});