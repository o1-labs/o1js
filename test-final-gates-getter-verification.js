// Final verification test for gates getter fix
// Tests that both direct access and toJson return identical Snarky-compatible format

import { switchBackend } from './dist/node/index.js';

async function testFinalVerification() {
    console.log('🎯 Final Gates Getter Fix Verification');
    
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

        console.log('🔧 Creating constraint system with gates...');
        
        // Reset and enter constraint mode
        Snarky.run.reset();
        const mode = Snarky.run.enterConstraintSystem();
        
        let sparkyCS;
        try {
            // Create multiplication constraint (generates gates)
            const x = Snarky.field.exists(null);
            const y = Snarky.field.constant({ type: 'constant', value: '3' });
            const product = Snarky.field.mul(x, y);
            
            console.log('✅ Constraint created successfully');
            
            // Get constraint system
            sparkyCS = Snarky.run.getConstraintSystem();
            console.log('📊 Constraint system retrieved');
            
        } finally {
            mode.exit();
        }

        // Verify gates property exists after our fix
        console.log('\n🔍 Testing gates property existence...');
        console.log('Has gates property:', 'gates' in sparkyCS);
        
        if (!('gates' in sparkyCS)) {
            console.log('❌ Gates property not found - fix may not be applied');
            return;
        }

        // Test both access paths
        console.log('\n🛤️ Testing both access paths...');
        
        // Path 1: Direct access (uses our getter)
        const directGates = sparkyCS.gates;
        console.log('Direct gates count:', directGates?.length || 0);
        
        // Path 2: toJson access
        const toJsonResult = Snarky.constraintSystem.toJson(sparkyCS);
        const toJsonGates = toJsonResult.gates;
        console.log('toJson gates count:', toJsonGates?.length || 0);
        
        if (directGates.length > 0 && toJsonGates.length > 0) {
            console.log('\n🔍 Comparing gate formats...');
            
            const directGate = directGates[0];
            const toJsonGate = toJsonGates[0];
            
            console.log('Direct gate format:', JSON.stringify(directGate, null, 2));
            console.log('toJson gate format:', JSON.stringify(toJsonGate, null, 2));
            
            // Compare formats
            const directStr = JSON.stringify(directGate);
            const toJsonStr = JSON.stringify(toJsonGate);
            
            if (directStr === toJsonStr) {
                console.log('\n✅ SUCCESS: Dual path gates getter fix is working!');
                console.log('✅ Both access paths return identical Snarky-compatible format');
                
                // Verify Snarky compatibility
                if (directGate.typ === 'Generic' && Array.isArray(directGate.wires) && 
                    directGate.wires.length > 0 && typeof directGate.wires[0] === 'object' &&
                    'row' in directGate.wires[0] && 'col' in directGate.wires[0]) {
                    console.log('✅ Format is confirmed Snarky-compatible');
                    console.log('✅ Gates getter dual path fix is COMPLETE and VERIFIED');
                } else {
                    console.log('⚠️ Format may not be fully Snarky-compatible');
                }
            } else {
                console.log('❌ MISMATCH: Different formats detected');
                console.log('This indicates the fix needs refinement');
            }
        } else {
            console.log('⚠️ No gates generated for comparison');
        }

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error('Stack:', error.stack);
    }
}

// Run the final verification
testFinalVerification().catch(console.error);