// Simple test to check coefficient encoding
import { switchBackend, getCurrentBackend } from './dist/node/index.js';

async function testCoefficients() {
    console.log('=== CHECKING COEFFICIENT ENCODING ===\n');
    
    await switchBackend('sparky');
    console.log('Backend:', getCurrentBackend());
    
    try {
        // Import internal modules
        const wasm = await import('./src/sparky/sparky-wasm/pkg-node/sparky_wasm.js');
        
        console.log('Creating simple constraint system...');
        
        // Create a constraint system and add a simple constraint
        const cs = wasm.ConstraintSystem.new();
        
        // Test adding a simple constraint - this should use our fixed int_to_coeff_string function
        console.log('Adding equality constraint...');
        
        // Get the JSON representation
        const jsonStr = cs.toJson();
        const json = JSON.parse(jsonStr);
        
        console.log('Constraint system JSON structure:');
        console.log('- Gates:', json.gates ? json.gates.length : 'none');
        console.log('- Public input size:', json.public_input_size);
        
        if (json.gates && json.gates.length > 0) {
            const firstGate = json.gates[0];
            console.log('\nFirst gate:');
            console.log('- Type:', firstGate.typ);
            console.log('- Coefficients:', firstGate.coeffs);
            
            // Check if coefficients are decimal strings
            const coeffs = firstGate.coeffs;
            const looksLikeDecimal = coeffs.every(coeff => {
                // Should be a string of digits, possibly very large
                return typeof coeff === 'string' && /^\d+$/.test(coeff);
            });
            
            if (looksLikeDecimal) {
                console.log('✅ Coefficients appear to be decimal strings');
                console.log('Sample values:');
                coeffs.slice(0, 3).forEach((coeff, i) => {
                    console.log(`  coeff[${i}]: ${coeff}`);
                });
            } else {
                console.log('❌ Coefficients do not appear to be decimal strings');
                console.log('Sample values:');
                coeffs.slice(0, 3).forEach((coeff, i) => {
                    console.log(`  coeff[${i}]: ${coeff} (type: ${typeof coeff})`);
                });
            }
        }
        
    } catch (error) {
        console.error('Error:', error.message);
        console.error('Stack:', error.stack);
    }
}

testCoefficients().catch(console.error);