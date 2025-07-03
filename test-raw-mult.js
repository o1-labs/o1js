#!/usr/bin/env node

/**
 * Raw multiplication test - test at the lowest level
 */

import { Field, Provable } from './dist/node/index.js';
import { switchBackend } from './dist/node/index.js';
import { Snarky } from './dist/node/bindings.js';

async function testRawMultiplication() {
    console.log('🔬 Testing Raw Multiplication at Low Level');
    console.log('='.repeat(60));
    
    // Test Snarky raw multiplication
    console.log('\n📊 Snarky Backend:');
    await switchBackend('snarky');
    
    Provable.runAndCheck(() => {
        console.log('Creating witness variables...');
        const a = Provable.witness(Field, () => Field(3));
        const b = Provable.witness(Field, () => Field(4));
        const c = Provable.witness(Field, () => Field(12));
        
        console.log('Calling assertMul directly...');
        // Call assertMul directly: assert that a * b = c
        Snarky.field.assertMul(a.value, b.value, c.value);
        console.log('assertMul completed');
    });
    
    // Test Sparky raw multiplication
    console.log('\n🚀 Sparky Backend:');
    await switchBackend('sparky');
    
    Provable.runAndCheck(() => {
        console.log('Creating witness variables...');
        const a = Provable.witness(Field, () => Field(3));
        const b = Provable.witness(Field, () => Field(4));
        const c = Provable.witness(Field, () => Field(12));
        
        console.log('Calling assertMul directly...');
        // Call assertMul directly: assert that a * b = c
        Snarky.field.assertMul(a.value, b.value, c.value);
        console.log('assertMul completed');
    });
    
    console.log('\n📝 Comparison:');
    console.log('Snarky should generate 1 R1CS constraint: a * b = c');
    console.log('Sparky should also generate 1 R1CS constraint: a * b = c');
}

// Run the test
testRawMultiplication().then(() => {
    console.log('\n✅ Raw multiplication test completed');
}).catch(error => {
    console.error('💥 Test failed:', error);
    console.error(error.stack);
    process.exit(1);
});