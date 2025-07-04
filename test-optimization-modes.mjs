#!/usr/bin/env node

/**
 * Test script to compare VK parity between optimization modes
 */

import { switchBackend, getCurrentBackend } from './dist/node/index.js';

console.log('🧪 Testing Sparky Optimization Modes for VK Parity');
console.log('===================================================');

// Import the Snarky API through bindings
let snarky;
try {
    const bindings = await import('./dist/node/bindings.js');
    await bindings.initializeBindings();
    
    // Access Snarky through globalThis.__snarky
    if (globalThis.__snarky) {
        snarky = globalThis.__snarky;
        console.log('✅ Snarky API accessed through globalThis.__snarky');
    } else {
        console.log('❌ globalThis.__snarky not available, trying direct import');
        snarky = { 
            setOptimizationMode: () => { throw new Error('Optimization mode API not available'); },
            getOptimizationMode: () => 'unknown'
        };
    }
} catch (error) {
    console.error('❌ Failed to access Snarky API:', error);
    snarky = { 
        setOptimizationMode: () => { throw new Error('Optimization mode API not available'); },
        getOptimizationMode: () => 'unknown'
    };
}

async function testOptimizationMode(mode) {
    console.log(`\n🎯 Testing optimization mode: ${mode}`);
    console.log('----------------------------------------');
    
    // Set optimization mode
    try {
        snarky.setOptimizationMode(mode);
        const currentMode = snarky.getOptimizationMode();
        console.log(`✅ Optimization mode set to: ${currentMode}`);
    } catch (error) {
        console.error(`❌ Failed to set optimization mode: ${error.message}`);
        return;
    }
    
    // Switch to Sparky backend
    await switchBackend('sparky');
    console.log(`📡 Backend: ${getCurrentBackend()}`);
    
    // Test simple field operations
    console.log('\n📊 Testing Field Operations:');
    
    try {
        const { ZkProgram } = await import('./dist/node/index.js');
        
        // Simple multiplication test
        const simpleProgram = ZkProgram({
            name: 'testProgram',
            publicInput: undefined,
            methods: {
                multiply: {
                    privateInputs: [],
                    async method() {
                        const { Field } = await import('./dist/node/index.js');
                        const a = Field(3);
                        const b = Field(4);
                        const result = a.mul(b);
                        result.assertEquals(Field(12));
                    }
                }
            }
        });
        
        // Compile and measure constraints
        console.log('🔨 Compiling program...');
        const startTime = Date.now();
        const { verificationKey } = await simpleProgram.compile();
        const compileTime = Date.now() - startTime;
        
        console.log(`⏱️  Compilation time: ${compileTime}ms`);
        console.log(`🔑 VK hash: ${verificationKey.hash}`);
        
        // Get constraint count from the compiled program
        // This is a simplified way to check - real implementation would need better access
        console.log(`📊 Program compiled successfully with optimization mode: ${mode}`);
        
    } catch (error) {
        console.error(`❌ Program compilation failed: ${error.message}`);
        console.error(error.stack);
    }
}

async function main() {
    try {
        // Test each optimization mode
        await testOptimizationMode('aggressive');
        await testOptimizationMode('snarky_compatible');
        await testOptimizationMode('debug');
        
    } catch (error) {
        console.error('❌ Test failed:', error);
        console.error(error.stack);
    }
    
    console.log('\n🏁 Optimization mode testing complete');
}

main().catch(console.error);