#!/usr/bin/env node
import { Field, Provable, switchBackend } from './dist/node/index.js';

console.log('Testing internal variable generation in reduce_lincom_exact\n');

async function testInternalVars() {
  console.log('=== Testing with Sparky backend ===');
  await switchBackend('sparky');
  
  console.log('\nSimple test to trace constraint generation:');
  
  try {
    const result = await Provable.constraintSystem(() => {
      const x = Provable.witness(Field, () => Field(2));
      
      // This multiplication will create a constraint through generic_gate_impl
      const y = x.mul(3);
      
      // This assertEquals will call add_optimized_equal_constraint
      // which calls add_constraint(Equal(x, y))
      // which calls reduce_lincom_exact
      y.assertEquals(Field(6));
    });
    
    console.log('\nGenerated constraints:');
    console.log(`Total gates: ${result.gates.length}`);
    result.gates.forEach((gate, i) => {
      console.log(`Gate ${i}: ${gate.type}`);
      if (gate.coeffs) {
        console.log(`  Coefficients: ${gate.coeffs.slice(0, 5).join(', ')}`);
      }
    });
    
  } catch (e) {
    console.error('Error:', e.message);
  }
  
  // Now test with Snarky for comparison
  console.log('\n\n=== Testing with Snarky backend (for comparison) ===');
  await switchBackend('snarky');
  
  try {
    const result = await Provable.constraintSystem(() => {
      const x = Provable.witness(Field, () => Field(2));
      const y = x.mul(3);
      y.assertEquals(Field(6));
    });
    
    console.log('\nGenerated constraints:');
    console.log(`Total gates: ${result.gates.length}`);
    result.gates.forEach((gate, i) => {
      console.log(`Gate ${i}: ${gate.type}`);
      if (gate.coeffs) {
        console.log(`  Coefficients: ${gate.coeffs.slice(0, 5).join(', ')}`);
      }
    });
    
  } catch (e) {
    console.error('Error:', e.message);
  }
}

// Run the test
testInternalVars().catch(console.error);