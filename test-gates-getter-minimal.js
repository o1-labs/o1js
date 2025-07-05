// Minimal test for gates getter fix - avoids optimization pipeline crashes
// Tests that direct gates access calls toJson() internally

import { switchBackend } from './dist/node/index.js';

async function testGatesGetterMinimal() {
    console.log('🔍 Testing Gates Getter Fix - Minimal Constraint Test');
    
    try {
        // Switch to Sparky backend
        console.log('📡 Switching to Sparky backend...');
        await switchBackend('sparky');
        console.log('✅ Sparky backend loaded successfully');

        // Get Sparky instance directly
        const Snarky = global.__sparkyInstance;
        if (!Snarky) {
            throw new Error('Sparky instance not available');
        }

        console.log('🔧 Creating minimal constraint system...');
        
        // Reset and enter constraint mode
        Snarky.run.reset();
        const mode = Snarky.run.enterConstraintSystem();
        
        let sparkyCS;
        try {
            // Create minimal constraint - just a single equality (2 terms only)
            console.log('📝 Creating single equality constraint...');
            
            // Create two constants and assert they're equal (no additional variables)
            const x = Snarky.field.constant({ type: 'constant', value: '5' });
            const y = Snarky.field.constant({ type: 'constant', value: '5' });
            Snarky.field.assertEqual(x, y);
            
            console.log('✅ Minimal constraint created successfully');
            
            // Get constraint system
            sparkyCS = Snarky.run.getConstraintSystem();
            console.log('📊 Constraint system retrieved');
            
        } finally {
            mode.exit();
        }

        // Test 1: Check if constraint system has gates property
        console.log('\n🔍 Testing constraint system structure...');
        console.log('Has gates property:', 'gates' in sparkyCS);
        
        if (!sparkyCS.gates) {
            console.log('⚠️ No gates property found, trying alternative approach...');
            
            // Try to get gates through toJson first
            console.log('🛤️ Testing toJson access...');
            try {
                const toJsonResult = Snarky.constraintSystem.toJson(sparkyCS);
                console.log('toJson result structure:', Object.keys(toJsonResult));
                console.log('toJson gates count:', toJsonResult.gates?.length || 0);
                
                if (toJsonResult.gates && toJsonResult.gates.length > 0) {
                    console.log('toJson gates[0]:', JSON.stringify(toJsonResult.gates[0], null, 2));
                    console.log('✅ toJson access works - gates have proper Snarky format');
                } else {
                    console.log('⚠️ No gates in toJson result');
                }
                
            } catch (toJsonError) {
                console.log('❌ toJson failed:', toJsonError.message);
            }
            return;
        }

        console.log(`📊 Found ${sparkyCS.gates.length} gates in constraint system`);
        
        if (sparkyCS.gates.length === 0) {
            console.log('⚠️ No gates generated - constraint might be too simple');
            console.log('✅ Gates getter fix cannot be tested without gates, but no crashes occurred');
            return;
        }

        // Test Path 1: Direct access (should call toJson internally due to our fix)
        console.log('\n🛤️ Testing Path 1: Direct gates access');
        try {
            const directAccess = sparkyCS.gates[0];
            console.log('✅ Direct access successful');
            console.log('Direct format:', JSON.stringify(directAccess, null, 2));
            
            // Check if it has Snarky-compatible format
            if (directAccess.typ === 'Generic' && Array.isArray(directAccess.wires)) {
                console.log('✅ Direct access returns Snarky-compatible format');
            } else {
                console.log('❌ Direct access returns non-Snarky format');
            }
            
        } catch (directError) {
            console.log('❌ Direct access failed:', directError.message);
        }

        // Test Path 2: toJson access (standard path)
        console.log('\n🛤️ Testing Path 2: toJson access');
        try {
            const toJsonAccess = Snarky.constraintSystem.toJson(sparkyCS);
            if (toJsonAccess.gates && toJsonAccess.gates.length > 0) {
                const toJsonGate = toJsonAccess.gates[0];
                console.log('✅ toJson access successful');
                console.log('toJson format:', JSON.stringify(toJsonGate, null, 2));
                
                // Compare with direct access
                const directAccess = sparkyCS.gates[0];
                const directStr = JSON.stringify(directAccess);
                const toJsonStr = JSON.stringify(toJsonGate);
                
                if (directStr === toJsonStr) {
                    console.log('✅ SUCCESS: Both paths return identical format');
                    console.log('✅ Gates getter fix is working correctly');
                } else {
                    console.log('❌ MISMATCH: Different formats detected');
                    console.log('  Direct:', directStr);
                    console.log('  toJson:', toJsonStr);
                }
            } else {
                console.log('⚠️ No gates in toJson result');
            }
            
        } catch (toJsonError) {
            console.log('❌ toJson access failed:', toJsonError.message);
            console.log('This indicates optimization pipeline issues');
        }

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error('Stack:', error.stack);
    }
}

// Run the test
testGatesGetterMinimal().catch(console.error);