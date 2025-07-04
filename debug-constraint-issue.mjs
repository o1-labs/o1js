#!/usr/bin/env node

/**
 * Debug constraint issue - Simplified test to understand why constraint counting returns 0
 */

import { Field, Provable, getCurrentBackend } from './dist/node/index.js';

console.log('🔍 Debugging constraint counting issue...');
console.log(`Current backend: ${getCurrentBackend()}`);

// Test 1: The current performance test approach (should return 0 constraints)
console.log('\n📊 Test 1: Performance test approach (Field operations without constraints)');
try {
  const { rows, gates } = await Provable.constraintSystem(() => {
    let a = Field(1);
    let b = Field(2);
    let result = Field(0);
    
    for (let i = 0; i < 5; i++) {
      const temp1 = a.mul(b.add(Field(i)));
      const temp2 = temp1.add(Field(i * 2));
      const temp3 = temp2.mul(temp2); // Square
      result = result.add(temp3);
      
      // Update variables for next iteration
      a = temp1;
      b = temp2;
    }
    
    return result;
  });
  
  console.log(`✅ Constraints: ${rows}, Gates: ${gates.length}`);
  console.log(`Gate types: ${JSON.stringify(gates.map(g => g.type))}`);
} catch (error) {
  console.log(`❌ Error: ${error.message}`);
}

// Test 2: Using Provable.witness and assertEquals (should generate constraints)
console.log('\n📊 Test 2: Proper constraint generation (witness + assertEquals)');
try {
  const { rows, gates } = await Provable.constraintSystem(() => {
    // Create witness variables (this should generate constraints when used)
    const a = Provable.witness(Field, () => Field(3));
    const b = Provable.witness(Field, () => Field(4));
    
    // Multiply them (this should generate a constraint)
    const product = a.mul(b);
    
    // Assert the result (this should generate a constraint)
    product.assertEquals(Field(12));
    
    return product;
  });
  
  console.log(`✅ Constraints: ${rows}, Gates: ${gates.length}`);
  console.log(`Gate types: ${JSON.stringify(gates.map(g => g.type))}`);
  if (gates.length > 0) {
    console.log(`First gate details:`, gates[0]);
  }
} catch (error) {
  console.log(`❌ Error: ${error.message}`);
}

// Test 3: Just constants (should generate 0 constraints)
console.log('\n📊 Test 3: Constants only (should be 0 constraints)');
try {
  const { rows, gates } = await Provable.constraintSystem(() => {
    const x = Field(5);
    const y = Field(10);
    const z = x.add(y);
    // No witness or constraints - this is just constant folding
    return z;
  });
  
  console.log(`✅ Constraints: ${rows}, Gates: ${gates.length}`);
  console.log(`Gate types: ${JSON.stringify(gates.map(g => g.type))}`);
} catch (error) {
  console.log(`❌ Error: ${error.message}`);
}

console.log('\n📋 Analysis:');
console.log('- Test 1 returns 0 constraints because Field operations on constants are compile-time computed');
console.log('- Test 2 should return >0 constraints because it uses witnesses and assertions');
console.log('- Test 3 returns 0 constraints because it only uses constants');
console.log('\nThe performance test needs to use Provable.witness() to generate actual constraints!');