#!/usr/bin/env node
import { Field, Provable, switchBackend } from './dist/node/index.js';

console.log('Testing reduce_lincom_exact with complex linear combinations\n');

async function testComplexLincom() {
  console.log('=== Testing with Sparky backend ===');
  await switchBackend('sparky');
  
  console.log('\nTest case that creates internal variables:');
  
  try {
    const result = await Provable.constraintSystem(() => {
      const a = Provable.witness(Field, () => Field(2));
      const b = Provable.witness(Field, () => Field(3));
      const c = Provable.witness(Field, () => Field(5));
      
      // Create a complex linear combination: a + b + c
      const sum = a.add(b).add(c);
      
      // This will call reduce_lincom_exact on a complex Cvar structure:
      // Add(Add(Var(a), Var(b)), Var(c))
      // which should create internal variables
      sum.assertEquals(Field(10));
    });
    
    console.log('\nGenerated constraints:');
    console.log(`Total gates: ${result.gates.length}`);
    result.gates.forEach((gate, i) => {
      console.log(`Gate ${i}: ${gate.type}`);
      if (gate.coeffs) {
        console.log(`  Coefficients: ${gate.coeffs.slice(0, 5).join(', ')}`);
      }
      if (gate.wires) {
        console.log(`  Wires: ${gate.wires.map(w => `(${w.row},${w.col})`).join(', ')}`);
      }
    });
    
  } catch (e) {
    console.error('Error:', e.message);
  }
  
  console.log('\n\nAnother test - multiplication chain:');
  
  try {
    const result = await Provable.constraintSystem(() => {
      const x = Provable.witness(Field, () => Field(2));
      
      // Create chain: x * 3 * 4
      const y = x.mul(3);
      const z = y.mul(4);
      
      // When we assertEquals on z, it has the structure:
      // Scale(4, Var(intermediate_from_y))
      // This should trigger reduce_lincom_exact to handle the scaling
      z.assertEquals(Field(24));
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
  
  // Test with Snarky for comparison
  console.log('\n\n=== Testing with Snarky backend (for comparison) ===');
  await switchBackend('snarky');
  
  try {
    const result = await Provable.constraintSystem(() => {
      const a = Provable.witness(Field, () => Field(2));
      const b = Provable.witness(Field, () => Field(3));
      const c = Provable.witness(Field, () => Field(5));
      const sum = a.add(b).add(c);
      sum.assertEquals(Field(10));
    });
    
    console.log('\nGenerated constraints (complex sum):');
    console.log(`Total gates: ${result.gates.length}`);
    result.gates.forEach((gate, i) => {
      console.log(`Gate ${i}: ${gate.type}`);
    });
    
  } catch (e) {
    console.error('Error:', e.message);
  }
}

// Run the test
testComplexLincom().catch(console.error);