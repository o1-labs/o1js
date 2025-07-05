// Force gate generation test for gates getter fix
// Creates constraints that must generate gates without triggering optimization crash

import { switchBackend } from './dist/node/index.js';

async function testGatesGetterForce() {
    console.log('🔍 Testing Gates Getter Fix - Force Gate Generation');
    
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

        console.log('🔧 Creating constraint system with forced gates...');
        
        // Reset and enter constraint mode
        Snarky.run.reset();
        const mode = Snarky.run.enterConstraintSystem();
        
        let sparkyCS;
        try {
            // Force gate generation with multiplication (creates R1CS constraint)
            console.log('📝 Creating multiplication constraint (forces gate generation)...');
            
            // Create two variables and multiply them (should generate a gate)
            const x = Snarky.field.exists(null); // witness variable
            const y = Snarky.field.constant({ type: 'constant', value: '2' }); // constant
            const product = Snarky.field.mul(x, y); // multiplication creates gate
            
            console.log('✅ Multiplication constraint created successfully');
            
            // Get constraint system
            sparkyCS = Snarky.run.getConstraintSystem();
            console.log('📊 Constraint system retrieved');
            
        } finally {
            mode.exit();
        }

        // Check if we have gates now
        console.log('\n🔍 Testing constraint system structure...');
        console.log('Has gates property:', 'gates' in sparkyCS);
        
        // Try toJson first to see what we have
        console.log('\n🛤️ Testing toJson access first...');
        try {
            const toJsonResult = Snarky.constraintSystem.toJson(sparkyCS);
            console.log('✅ toJson call successful');
            console.log('toJson result structure:', Object.keys(toJsonResult));
            console.log('toJson gates count:', toJsonResult.gates?.length || 0);
            
            if (toJsonResult.gates && toJsonResult.gates.length > 0) {
                console.log('✅ Gates found in toJson result!');
                console.log('First gate from toJson:', JSON.stringify(toJsonResult.gates[0], null, 2));
                
                // Now test direct access (this is where our fix should work)
                console.log('\n🛤️ Testing direct gates access...');
                if ('gates' in sparkyCS && sparkyCS.gates && sparkyCS.gates.length > 0) {
                    const directGate = sparkyCS.gates[0];
                    console.log('✅ Direct gates access successful');
                    console.log('First gate from direct access:', JSON.stringify(directGate, null, 2));
                    
                    // Compare formats
                    console.log('\n🔍 Comparing access paths...');
                    const toJsonGateStr = JSON.stringify(toJsonResult.gates[0]);
                    const directGateStr = JSON.stringify(directGate);
                    
                    if (toJsonGateStr === directGateStr) {
                        console.log('✅ SUCCESS: Both paths return identical format!');
                        console.log('✅ Gates getter fix is working correctly!');
                        
                        // Verify Snarky compatibility
                        if (directGate.typ === 'Generic' && Array.isArray(directGate.wires)) {
                            console.log('✅ Format is Snarky-compatible (typ: Generic, wires: array)');
                        }
                    } else {
                        console.log('❌ MISMATCH: Different formats detected');
                        console.log('  toJson format:', toJsonGateStr);
                        console.log('  direct format:', directGateStr);
                    }
                } else {
                    console.log('❌ Direct gates access failed - no gates property or empty');
                    console.log('This suggests the gates getter property is not working');
                }
            } else {
                console.log('⚠️ No gates generated even with multiplication constraint');
                console.log('This suggests Sparky optimized away the constraint');
            }
            
        } catch (toJsonError) {
            console.log('❌ toJson failed:', toJsonError.message);
            if (toJsonError.message.includes('Large linear combinations')) {
                console.log('🚨 Hit optimization pipeline limitation');
            }
        }

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error('Stack:', error.stack);
    }
}

// Run the test
testGatesGetterForce().catch(console.error);