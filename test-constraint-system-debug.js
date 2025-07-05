// Debug constraint system object structure
// Understanding what getConstraintSystem() returns

import { switchBackend } from './dist/node/index.js';

async function debugConstraintSystem() {
    console.log('🔍 Debugging Constraint System Object Structure');
    
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

        console.log('🔧 Creating constraint system...');
        
        // Reset and enter constraint mode
        Snarky.run.reset();
        const mode = Snarky.run.enterConstraintSystem();
        
        let sparkyCS;
        try {
            // Create multiplication constraint (generates gates)
            const x = Snarky.field.exists(null);
            const y = Snarky.field.constant({ type: 'constant', value: '2' });
            const product = Snarky.field.mul(x, y);
            
            console.log('✅ Constraints created');
            
            // Get constraint system
            sparkyCS = Snarky.run.getConstraintSystem();
            console.log('📊 Constraint system retrieved');
            
        } finally {
            mode.exit();
        }

        // Debug the constraint system object
        console.log('\n🔍 Constraint System Object Analysis:');
        console.log('Type:', typeof sparkyCS);
        console.log('Constructor:', sparkyCS.constructor?.name);
        console.log('Is object:', typeof sparkyCS === 'object');
        console.log('Is array:', Array.isArray(sparkyCS));
        
        // List all properties and methods
        console.log('\n📋 Object Properties:');
        const props = Object.getOwnPropertyNames(sparkyCS);
        props.forEach(prop => {
            const descriptor = Object.getOwnPropertyDescriptor(sparkyCS, prop);
            console.log(`  ${prop}: ${typeof sparkyCS[prop]} ${descriptor?.get ? '(getter)' : ''}`);
        });
        
        // Check prototype chain
        console.log('\n🔗 Prototype Chain:');
        let current = sparkyCS;
        let level = 0;
        while (current && level < 5) {
            const proto = Object.getPrototypeOf(current);
            if (proto) {
                console.log(`  Level ${level}: ${proto.constructor?.name || 'Anonymous'}`);
                const protoProps = Object.getOwnPropertyNames(proto);
                protoProps.forEach(prop => {
                    if (prop !== 'constructor') {
                        const descriptor = Object.getOwnPropertyDescriptor(proto, prop);
                        console.log(`    ${prop}: ${typeof proto[prop]} ${descriptor?.get ? '(getter)' : ''}`);
                    }
                });
            }
            current = proto;
            level++;
        }
        
        // Try accessing gates property directly
        console.log('\n🛤️ Direct Gates Access Test:');
        try {
            console.log('sparkyCS.gates:', sparkyCS.gates);
            console.log('gates type:', typeof sparkyCS.gates);
        } catch (error) {
            console.log('Direct gates access failed:', error.message);
        }
        
        // Test toJson access
        console.log('\n🛤️ toJson Access Test:');
        try {
            const toJsonResult = Snarky.constraintSystem.toJson(sparkyCS);
            console.log('toJson success:', !!toJsonResult);
            console.log('toJson gates count:', toJsonResult.gates?.length || 0);
        } catch (error) {
            console.log('toJson access failed:', error.message);
        }

        // Test if we can add a gates property
        console.log('\n🔧 Property Addition Test:');
        try {
            // Try to add gates property dynamically
            Object.defineProperty(sparkyCS, 'gates', {
                get: function() {
                    console.log('🎯 Custom gates getter called!');
                    const toJsonResult = Snarky.constraintSystem.toJson(this);
                    return toJsonResult.gates || [];
                },
                enumerable: true,
                configurable: true
            });
            
            console.log('✅ Property added successfully');
            console.log('Testing new gates property:', sparkyCS.gates?.length || 0);
            
        } catch (error) {
            console.log('❌ Could not add gates property:', error.message);
        }

    } catch (error) {
        console.error('❌ Debug failed:', error.message);
        console.error('Stack:', error.stack);
    }
}

// Run the debug
debugConstraintSystem().catch(console.error);