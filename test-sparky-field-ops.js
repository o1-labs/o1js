// Test field operations with sparky backend
import { switchBackend, getCurrentBackend, Field } from './dist/node/index.js';

async function testSparkyFieldOperations() {
    console.log('Testing Sparky field operations...');
    
    try {
        // Switch to sparky backend
        console.log('Switching to sparky backend...');
        await switchBackend('sparky');
        console.log('Current backend:', getCurrentBackend());
        
        // Test basic field operations
        console.log('\n--- Testing Field Operations ---');
        
        const a = Field(5);
        const b = Field(7);
        console.log('a =', a.toString());
        console.log('b =', b.toString());
        
        const sum = a.add(b);
        console.log('a + b =', sum.toString());
        
        const product = a.mul(b);
        console.log('a * b =', product.toString());
        
        const difference = b.sub(a);
        console.log('b - a =', difference.toString());
        
        const scaled = a.mul(Field(3));
        console.log('a * 3 =', scaled.toString());
        
        const squared = a.square();
        console.log('a² =', squared.toString());
        
        console.log('\n✅ All field operations completed successfully');
        
        // Switch back to snarky for comparison
        console.log('\n--- Comparing with Snarky ---');
        await switchBackend('snarky');
        console.log('Switched to snarky for comparison');
        
        const a2 = Field(5);
        const b2 = Field(7);
        const sum2 = a2.add(b2);
        const product2 = a2.mul(b2);
        const difference2 = b2.sub(a2);
        const scaled2 = a2.mul(Field(3));
        const squared2 = a2.square();
        
        console.log('Snarky results:');
        console.log('a + b =', sum2.toString());
        console.log('a * b =', product2.toString());
        console.log('b - a =', difference2.toString());
        console.log('a * 3 =', scaled2.toString());
        console.log('a² =', squared2.toString());
        
        // Verify results match
        const resultsMatch = 
            sum.toString() === sum2.toString() &&
            product.toString() === product2.toString() &&
            difference.toString() === difference2.toString() &&
            scaled.toString() === scaled2.toString() &&
            squared.toString() === squared2.toString();
            
        if (resultsMatch) {
            console.log('\n🎉 Perfect parity! All results match between backends');
        } else {
            console.log('\n❌ Results differ between backends');
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error);
        console.error('Stack trace:', error.stack);
    }
}

testSparkyFieldOperations();