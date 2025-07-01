// Quick test to check Sparky coefficient fix
import { switchBackend } from './dist/node/index.js';

async function quickTest() {
    console.log('=== QUICK COEFFICIENT TEST ===');
    
    await switchBackend('sparky');
    console.log('✓ Switched to Sparky backend');
    
    try {
        // Create a simple constraint system with a basic operation
        const { Field, Provable } = await import('./dist/node/index.js');
        
        console.log('Testing simple constraint generation...');
        
        // This will internally create constraints and we can examine them
        const { constraintSystem } = await Provable.constraintSystem(() => {
            const x = Provable.witness(Field, () => Field(1));
            const y = Provable.witness(Field, () => Field(1)); 
            x.assertEquals(y); // This should create an equality constraint
        });
        
        console.log('Constraint system generated:');
        console.log('- Rows:', constraintSystem.rows);
        console.log('- Digest:', constraintSystem.digest);
        
        // Get the JSON representation to check coefficients
        const json = constraintSystem.toJson();
        console.log('- Gates count:', json.gates?.length || 0);
        
        if (json.gates && json.gates.length > 0) {
            const firstGate = json.gates[0];
            console.log('\nFirst gate coefficients:', firstGate.coeffs);
            
            // Check coefficient format
            const coeffs = firstGate.coeffs;
            const isDecimal = coeffs.every(c => typeof c === 'string' && /^\d+$/.test(c));
            
            console.log(isDecimal ? '✅ Coefficients are decimal strings!' : '❌ Coefficients are not decimal');
            
            // Show sample coefficients
            console.log('Sample coefficient values:');
            coeffs.slice(0, 5).forEach((coeff, i) => {
                console.log(`  [${i}]: ${coeff}`);
            });
        }
        
    } catch (error) {
        console.error('Error:', error.message);
        console.error('Stack trace:', error.stack);
    }
}

quickTest().catch(console.error);