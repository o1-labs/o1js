// Test sparky WASM module directly
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const sparkyWasm = require('./src/bindings/compiled/sparky_node/sparky_wasm.cjs');

async function testDirectWasm() {
    console.log('Testing Sparky WASM module directly...');
    
    try {
        // Initialize Sparky
        const snarky = sparkyWasm.initSparky();
        console.log('✅ Sparky initialized');
        
        // Get the run module
        const runModule = snarky.run;
        console.log('✅ Run module obtained');
        
        // Check available methods
        console.log('Available methods on run module:');
        console.log('- enterConstraintSystem:', typeof runModule.enterConstraintSystem);
        console.log('- enterGenerateWitness:', typeof runModule.enterGenerateWitness);
        console.log('- reset:', typeof runModule.reset);
        console.log('- inProver:', typeof runModule.inProver);
        console.log('- constraintMode:', typeof runModule.constraintMode);
        console.log('- getConstraintSystem:', typeof runModule.getConstraintSystem);
        console.log('- enterAsProver:', typeof runModule.enterAsProver);
        console.log('- existsOne:', typeof runModule.existsOne);
        
        // Test enterAsProver if available
        if (typeof runModule.enterAsProver === 'function') {
            console.log('\n✅ enterAsProver method found!');
            console.log('Testing enterAsProver...');
            
            const handle = runModule.enterAsProver(1);
            console.log('✅ enterAsProver returned:', typeof handle);
            
            if (handle && typeof handle.exit === 'function') {
                handle.exit();
                console.log('✅ Handle exit called successfully');
            }
        } else {
            console.log('\n❌ enterAsProver method NOT found');
        }
        
        // Test existsOne if available
        if (typeof runModule.existsOne === 'function') {
            console.log('\n✅ existsOne method found!');
        } else {
            console.log('\n❌ existsOne method NOT found');
        }
        
        console.log('\n✅ Direct WASM test completed');
        
    } catch (error) {
        console.error('❌ Direct WASM test failed:', error);
        console.error('Stack trace:', error.stack);
    }
}

testDirectWasm();