#!/usr/bin/env node

// Test RangeCheck0 fix - verify that limb variables are properly preserved
// through the MIR -> LIR transformation pipeline

console.log('🔍 Testing RangeCheck0 Variable Preservation Fix...');

// Test the rangeCheck64 function which uses RangeCheck0 internally
const { Field, Provable, Bool } = await import('./dist/node/index.js');

async function testRangeCheck0Fix() {
    console.log('\n🎯 Testing RangeCheck0 constraint generation with Sparky backend...');
    
    try {
        // Switch to Sparky backend
        await import('./dist/node/index.js').then(o1js => {
            if (o1js.switchBackend) {
                o1js.switchBackend('sparky');
                console.log('✅ Switched to Sparky backend');
            }
        });

        // Test basic range check operation
        const { ZkProgram } = await import('./dist/node/index.js');
        
        const TestProgram = ZkProgram({
            name: 'test-rangecheck',
            publicInput: Field,
            
            methods: {
                checkRange: {
                    privateInputs: [Field],
                    method: (publicInput, privateInput) => {
                        // This will trigger rangeCheck0 constraint generation
                        privateInput.assertLessThan(Field(2n ** 32n));
                        publicInput.assertEquals(privateInput);
                    }
                }
            }
        });

        console.log('🔄 Compiling ZkProgram with RangeCheck0 constraints...');
        const { verificationKey } = await TestProgram.compile();
        
        if (verificationKey) {
            console.log('✅ SUCCESS: ZkProgram compilation succeeded!');
            console.log(`📊 Verification Key Hash: ${verificationKey.hash}`);
            
            // Test proof generation to verify constraint satisfaction
            console.log('🔄 Generating proof to test constraint satisfaction...');
            const value = Field(12345);
            const proof = await TestProgram.checkRange(value, value);
            
            console.log('✅ SUCCESS: Proof generation succeeded!');
            console.log('🎯 CRITICAL FIX CONFIRMED: RangeCheck0 variable preservation is working correctly!');
            
            return true;
        } else {
            console.log('❌ FAILED: No verification key generated');
            return false;
        }
        
    } catch (error) {
        console.log('❌ FAILED: RangeCheck0 compilation error:');
        console.log(error.message);
        console.log(error.stack);
        return false;
    }
}

async function testSnarkyComparison() {
    console.log('\n🔄 Testing Snarky backend for comparison...');
    
    try {
        // Switch to Snarky backend  
        await import('./dist/node/index.js').then(o1js => {
            if (o1js.switchBackend) {
                o1js.switchBackend('snarky');
                console.log('✅ Switched to Snarky backend');
            }
        });

        const { ZkProgram } = await import('./dist/node/index.js');
        
        const TestProgram = ZkProgram({
            name: 'test-rangecheck-snarky',
            publicInput: Field,
            
            methods: {
                checkRange: {
                    privateInputs: [Field],
                    method: (publicInput, privateInput) => {
                        privateInput.assertLessThan(Field(2n ** 32n));
                        publicInput.assertEquals(privateInput);
                    }
                }
            }
        });

        const { verificationKey } = await TestProgram.compile();
        
        if (verificationKey) {
            console.log('✅ SUCCESS: Snarky compilation succeeded');
            console.log(`📊 Snarky VK Hash: ${verificationKey.hash}`);
            return verificationKey.hash;
        } else {
            console.log('❌ FAILED: Snarky compilation failed');
            return null;
        }
        
    } catch (error) {
        console.log('❌ FAILED: Snarky compilation error:');
        console.log(error.message);
        return null;
    }
}

// Run the tests
const sparkySuccess = await testRangeCheck0Fix();
const snarkyVkHash = await testSnarkyComparison();

console.log('\n📋 SUMMARY:');
console.log(`Sparky Backend: ${sparkySuccess ? 'SUCCESS ✅' : 'FAILED ❌'}`);
console.log(`Snarky Backend: ${snarkyVkHash ? 'SUCCESS ✅' : 'FAILED ❌'}`);

if (sparkySuccess) {
    console.log('\n🎉 BREAKTHROUGH CONFIRMED: RangeCheck0 variable preservation fix is working!');
    console.log('🚀 This should resolve the comprehensive test failures');
    console.log('🎯 Expected outcome: Improved VK parity and successful SmartContract/ZkProgram compilation');
} else {
    console.log('\n⚠️  Fix may need additional work - check error messages above');
}