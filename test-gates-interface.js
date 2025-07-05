#!/usr/bin/env node

/**
 * Test script to verify that getSparkyInstance().gates is properly exposed
 * This tests the P0 issue: Gates Interface Exposure
 */

async function testGatesInterface() {
    console.log('🔍 Testing Gates Interface Exposure...\n');
    
    try {
        // Import the switchBackend function
        console.log('📦 Loading o1js backend switcher...');
        const { switchBackend } = await import('./dist/node/index.js');
        
        // Switch to Sparky backend (this loads everything properly)
        console.log('🚀 Switching to Sparky backend...');
        await switchBackend('sparky');
        console.log('✅ Sparky backend loaded successfully');
        
        // Get the Sparky instance
        console.log('📋 Getting Sparky instance...');
        const sparkyInstance = global.__sparkyInstance;
        
        if (!sparkyInstance) {
            console.log('❌ CRITICAL: sparkyInstance not found in global.__sparkyInstance');
            return false;
        }
        
        // Test basic instance properties
        console.log('✅ Sparky instance obtained:', typeof sparkyInstance);
        console.log('📊 Instance properties:', Object.keys(sparkyInstance));
        console.log('📊 Instance prototype properties:', Object.getOwnPropertyNames(Object.getPrototypeOf(sparkyInstance)));
        console.log('📊 Instance descriptors:', Object.getOwnPropertyDescriptors(Object.getPrototypeOf(sparkyInstance)));
        
        // Test all getters to isolate the issue
        console.log('\n🎯 Testing all property getters...');
        
        console.log('   - sparkyInstance.poseidon:', typeof sparkyInstance.poseidon);
        console.log('   - sparkyInstance.field:', typeof sparkyInstance.field);
        console.log('   - sparkyInstance.run:', typeof sparkyInstance.run);
        console.log('   - sparkyInstance.constraintSystem:', typeof sparkyInstance.constraintSystem);
        
        try {
            console.log('   - Calling gates getter...');
            const gatesResult = sparkyInstance.gates;
            console.log('   - sparkyInstance.gates:', typeof gatesResult);
            console.log('   - sparkyInstance.gates value:', gatesResult);
            
            if (gatesResult) {
                console.log('   - gates properties:', Object.keys(gatesResult));
                console.log('   - gates prototype:', Object.getOwnPropertyNames(Object.getPrototypeOf(gatesResult)));
            }
        } catch (error) {
            console.log('   - Error calling gates getter:', error.message);
        }
        
        if (sparkyInstance.gates === undefined) {
            console.log('❌ CRITICAL: sparkyInstance.gates is undefined!');
            return false;
        }
        
        // Test gates methods
        console.log('\n🔧 Testing gates methods...');
        console.log('   - gates.rangeCheck0:', typeof sparkyInstance.gates.rangeCheck0);
        
        if (typeof sparkyInstance.gates.rangeCheck0 !== 'function') {
            console.log('❌ CRITICAL: gates.rangeCheck0 is not a function!');
            return false;
        }
        
        // Test other expected gates methods
        console.log('   - gates.xor:', typeof sparkyInstance.gates.xor);
        console.log('   - gates.zero:', typeof sparkyInstance.gates.zero);
        
        console.log('\n✅ SUCCESS: Gates interface is properly exposed!');
        return true;
        
    } catch (error) {
        console.error('❌ ERROR testing gates interface:', error);
        return false;
    }
}

// Run the test
testGatesInterface().then(success => {
    if (success) {
        console.log('\n🎉 Test completed successfully!');
        process.exit(0);
    } else {
        console.log('\n💥 Test failed!');
        process.exit(1);
    }
}).catch(error => {
    console.error('💥 Unexpected error:', error);
    process.exit(1);
});