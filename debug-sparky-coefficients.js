// Debug script to understand how Sparky encodes coefficients vs Snarky
import { switchBackend, getCurrentBackend } from './dist/node/index.js';

async function testCoefficientEncoding() {
    console.log('=== TESTING COEFFICIENT ENCODING ===');
    
    // Test with Snarky first
    console.log('\n--- SNARKY BACKEND ---');
    await switchBackend('snarky');
    console.log('Backend:', getCurrentBackend());
    
    // Create a simple constraint system to see coefficient format
    const { Circuit } = await import('./dist/node/index.js');
    
    const simpleConstraints = new Circuit([], async () => {
        const { Field } = await import('./dist/node/index.js');
        
        const x = Circuit.witness(Field, () => Field(1));
        const y = Circuit.witness(Field, () => Field(1));
        
        // Simple constraint: x * x = y  
        x.square().assertEquals(y);
    });
    
    console.log('Compiling with Snarky...');
    const snarkyResult = await simpleConstraints.compile();
    const snarkyCs = snarkyResult.constraintSystem;
    
    console.log('Snarky constraint system rows:', snarkyCs.rows);
    console.log('Snarky constraint system digest:', snarkyCs.digest);
    
    const snarkyJson = snarkyCs.toJson();
    if (snarkyJson.gates && snarkyJson.gates.length > 0) {
        console.log('Snarky gates[0]:', JSON.stringify(snarkyJson.gates[0], null, 2));
    }
    
    // Now test with Sparky
    console.log('\n--- SPARKY BACKEND ---');
    await switchBackend('sparky');
    console.log('Backend:', getCurrentBackend());
    
    console.log('Compiling with Sparky...');
    const sparkyResult = await simpleConstraints.compile();
    const sparkyCs = sparkyResult.constraintSystem;
    
    console.log('Sparky constraint system rows:', sparkyCs.rows);
    console.log('Sparky constraint system digest:', sparkyCs.digest);
    
    const sparkyJson = sparkyCs.toJson();
    if (sparkyJson.gates && sparkyJson.gates.length > 0) {
        console.log('Sparky gates[0]:', JSON.stringify(sparkyJson.gates[0], null, 2));
    }
}

testCoefficientEncoding().catch(console.error);