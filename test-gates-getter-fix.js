// Test script to verify gates getter fix works properly
// This tests that both access paths return identical Snarky-compatible format

import { switchBackend, ZkProgram, Field } from './dist/node/index.js';

async function testGatesGetterFix() {
    console.log('🔍 Testing Gates Getter Fix - Dual Path Verification');
    
    try {
        // Switch to Sparky backend
        console.log('📡 Switching to Sparky backend...');
        await switchBackend('sparky');
        console.log('✅ Sparky backend loaded successfully');

        // Create simple ZkProgram to generate constraints
        console.log('🔧 Creating simple ZkProgram...');
        
        const SimpleProgram = ZkProgram({
            name: 'SimpleProgram',
            publicInput: Field,
            methods: {
                simple: {
                    privateInputs: [Field],
                    method(publicInput, privateInput) {
                        const sum = publicInput.add(privateInput);
                        sum.assertEquals(Field(8));
                    }
                }
            }
        });

        console.log('✅ ZkProgram created successfully');

        // Analyze the program to get constraint system
        console.log('🔧 Analyzing program constraints...');
        const { constraintSystem } = await SimpleProgram.analyzeMethods();
        const sparkyCS = constraintSystem.simple;
        
        console.log(`📊 Constraint system has ${sparkyCS.gates?.length || 0} gates`);

        // Test Path 1: Direct access (should call toJson internally)
        console.log('\n🛤️ Testing Path 1: Direct gates access');
        const directAccess = sparkyCS.gates[0];
        console.log('Direct access result:', JSON.stringify(directAccess, null, 2));

        // Test Path 2: toJson access (standard path)
        console.log('\n🛤️ Testing Path 2: toJson access');
        // Get Sparky instance to call toJson
        const Snarky = global.__sparkyInstance;
        const toJsonAccess = Snarky?.constraintSystem?.toJson(sparkyCS) || { gates: [] };
        const toJsonGate = toJsonAccess.gates[0];
        console.log('toJson access result:', JSON.stringify(toJsonGate, null, 2));

        // Compare the results
        console.log('\n🔍 Comparing results...');
        
        // Check if formats are identical
        const directStr = JSON.stringify(directAccess);
        const toJsonStr = JSON.stringify(toJsonGate);
        
        if (directStr === toJsonStr) {
            console.log('✅ SUCCESS: Both paths return identical format');
            console.log('✅ Gates getter fix is working correctly');
        } else {
            console.log('❌ MISMATCH: Different formats detected');
            console.log('Direct format:', directStr);
            console.log('toJson format:', toJsonStr);
        }

        // Verify Snarky compatibility
        console.log('\n🔍 Verifying Snarky compatibility...');
        if (directAccess.typ === 'Generic' && typeof directAccess.wires === 'object') {
            if (Array.isArray(directAccess.wires) && directAccess.wires.length > 0) {
                const firstWire = directAccess.wires[0];
                if (typeof firstWire === 'object' && 'row' in firstWire && 'col' in firstWire) {
                    console.log('✅ Snarky-compatible format confirmed');
                } else {
                    console.log('❌ Wire format not Snarky-compatible');
                }
            }
        } else {
            console.log('❌ Gate format not Snarky-compatible');
        }

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error('Stack:', error.stack);
    }
}

// Run the test
testGatesGetterFix().catch(console.error);