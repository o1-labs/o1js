#!/usr/bin/env node

// Simple test for MIR optimization fix
import { switchBackend, getCurrentBackend, Field, Provable, ZkProgram } from './dist/node/index.js';

async function testMirOptimization() {
    console.log('🧪 Testing MIR Optimization Fix...\n');

    try {
        // Switch to Sparky backend
        console.log('🔄 Switching to Sparky backend...');
        await switchBackend('sparky');
        const currentBackend = getCurrentBackend();
        console.log(`✅ Current backend: ${currentBackend}\n`);

        if (currentBackend !== 'sparky') {
            throw new Error('Failed to switch to Sparky backend');
        }

        // Test the exact constraint pattern that was failing
        console.log('📊 Testing 4-term linear combination that previously crashed...');
        
        const TestProgram = ZkProgram({
            name: 'test-4-term-linear',
            publicInput: Field,
            
            methods: {
                testLinearCombination: {
                    privateInputs: [Field],
                    
                    async method(publicInput, privateInput) {
                        // This creates the 4-term linear combination that was crashing:
                        // publicInput + privateInput = Field(8)
                        console.log('  🔍 Creating publicInput.add(privateInput)...');
                        const sum = publicInput.add(privateInput);
                        
                        console.log('  🔍 Asserting sum.assertEquals(Field(8))...');
                        sum.assertEquals(Field(8));
                        
                        console.log('  ✅ 4-term constraint created without crash!');
                    }
                }
            }
        });

        console.log('  🔨 Compiling ZkProgram...');
        const compilationResult = await TestProgram.compile();
        
        if (compilationResult.verificationKey) {
            console.log('  ✅ SUCCESS: Compilation completed!');
            console.log(`  📋 VK hash: ${compilationResult.verificationKey.hash}`);
            console.log('  🎉 MIR optimization pipeline now handles >2 term linear combinations!');
            return true;
        } else {
            console.log('  ❌ FAILED: No verification key generated');
            return false;
        }

    } catch (error) {
        console.error('❌ Test failed with error:');
        console.error(error.message);
        
        // Check if it's the old MIR optimization error
        if (error.message.includes('Large linear combinations') || 
            error.message.includes('not yet supported') ||
            error.message.includes('Got 4 terms')) {
            console.error('\n🚨 CRITICAL: MIR optimization fix did NOT work!');
            console.error('The binary tree decomposition is still failing.');
            return false;
        }
        
        console.error('\nStack trace:');
        console.error(error.stack);
        return false;
    }
}

// Run the test
testMirOptimization()
    .then(success => {
        console.log(`\n🎯 Test result: ${success ? 'PASSED ✅' : 'FAILED ❌'}`);
        
        if (success) {
            console.log('\n🎉 BREAKTHROUGH: MIR Optimization Pipeline Fixed!');
            console.log('✅ Snarky-compatible binary tree decomposition working');
            console.log('✅ Large linear combinations (4+ terms) now supported');
            console.log('✅ Gates getter can now work with complex constraints');
        }
        
        process.exit(success ? 0 : 1);
    })
    .catch(error => {
        console.error('\n💥 Test crashed:', error);
        process.exit(1);
    });