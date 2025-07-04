/**
 * Simple multiplication constraint debugging
 */

import { Field, Provable, switchBackend, getCurrentBackend } from './dist/node/index.js';

async function testMultiplicationConstraints() {
  console.log('Testing multiplication constraint patterns...\n');

  // Test 1: Simple multiplication with assertEquals
  const testMultiplication = () => {
    const x = Provable.witness(Field, () => Field(3));
    const y = Provable.witness(Field, () => Field(4));
    const z = x.mul(y);
    z.assertEquals(Field(12));
  };

  // Test 2: Direct assertMul usage (if available)
  const testDirectAssertMul = () => {
    const x = Provable.witness(Field, () => Field(3));
    const y = Provable.witness(Field, () => Field(4));
    const z = Provable.witness(Field, () => Field(12));
    // This should directly call assertMul under the hood
    Provable.asProver(() => {
      // In prover context, check if x * y = z is satisfied
      console.log(`Witness values: x=${x.toBigInt()}, y=${y.toBigInt()}, z=${z.toBigInt()}`);
    });
    // The actual constraint: x * y = z
    // We can't directly call assertMul from here, but x.mul(y).assertEquals(z) should do it
    x.mul(y).assertEquals(z);
  };

  // Test both backends
  for (const backend of ['snarky', 'sparky']) {
    console.log(`\n=== Testing with ${backend.toUpperCase()} backend ===`);
    
    try {
      await switchBackend(backend);
      console.log(`✓ Switched to ${backend} backend`);
      
      // Test 1: x.mul(y).assertEquals(z)
      console.log('\n1. Testing x.mul(y).assertEquals(z):');
      const cs1 = await Provable.constraintSystem(testMultiplication);
      console.log(`   Constraints: ${cs1.gates.length}`);
      console.log(`   Gate types: ${cs1.gates.map(g => g.type).join(', ')}`);
      
      if (cs1.gates.length > 0) {
        console.log('   First gate details:', JSON.stringify(cs1.gates[0], null, 2));
      }
      
      // Test 2: Direct multiplication constraint
      console.log('\n2. Testing direct multiplication constraint:');
      const cs2 = await Provable.constraintSystem(testDirectAssertMul);
      console.log(`   Constraints: ${cs2.gates.length}`);
      console.log(`   Gate types: ${cs2.gates.map(g => g.type).join(', ')}`);
      
      // Compare constraint counts
      if (cs1.gates.length === 1) {
        console.log('   ✅ Single constraint generated as expected');
      } else {
        console.log(`   ❌ Expected 1 constraint, got ${cs1.gates.length}`);
      }
      
    } catch (error) {
      console.error(`   ❌ Error with ${backend} backend:`, error.message);
    }
  }

  // Additional analysis: Check if there's a difference in constraint structure
  console.log('\n=== Constraint Structure Comparison ===');
  
  try {
    await switchBackend('snarky');
    const snarkyCS = await Provable.constraintSystem(testMultiplication);
    
    await switchBackend('sparky');
    const sparkyCS = await Provable.constraintSystem(testMultiplication);
    
    console.log('\nSnarky constraint details:');
    snarkyCS.gates.forEach((gate, i) => {
      console.log(`  Gate ${i}: ${gate.type}`);
      console.log(`    ${JSON.stringify(gate, null, 4)}`);
    });
    
    console.log('\nSparky constraint details:');
    sparkyCS.gates.forEach((gate, i) => {
      console.log(`  Gate ${i}: ${gate.type}`);
      console.log(`    ${JSON.stringify(gate, null, 4)}`);
    });
    
    const match = snarkyCS.gates.length === sparkyCS.gates.length;
    console.log(`\nConstraint count match: ${match ? '✅' : '❌'}`);
    console.log(`Snarky: ${snarkyCS.gates.length}, Sparky: ${sparkyCS.gates.length}`);
    
  } catch (error) {
    console.error('Error in comparison:', error.message);
  }
}

// Test the specific concern about mul+assertEquals optimization
async function testOptimizationConcern() {
  console.log('\n=== Testing Optimization Concern ===');
  console.log('User reported: "assertMul/mul->assertEqual should optimize to one constraint"');
  console.log('Let\'s test if a.mul(b).assertEquals(c) generates 1 or 2 constraints');

  const circuit = () => {
    const a = Provable.witness(Field, () => Field(2));
    const b = Provable.witness(Field, () => Field(3));
    const c = Provable.witness(Field, () => Field(6));
    
    // This is the pattern in question: should this be 1 constraint?
    a.mul(b).assertEquals(c);
  };

  for (const backend of ['snarky', 'sparky']) {
    console.log(`\n--- ${backend.toUpperCase()} ---`);
    try {
      await switchBackend(backend);
      const cs = await Provable.constraintSystem(circuit);
      
      console.log(`Constraint count: ${cs.gates.length}`);
      
      if (cs.gates.length === 1) {
        console.log('✅ Optimized to single constraint (expected)');
      } else if (cs.gates.length === 2) {
        console.log('❌ Generated 2 constraints (may indicate missing optimization)');
        console.log('Gates:', cs.gates.map(g => g.type));
      } else {
        console.log(`? Unexpected constraint count: ${cs.gates.length}`);
        console.log('Gates:', cs.gates.map(g => g.type));
      }
      
    } catch (error) {
      console.error(`Error with ${backend}:`, error.message);
    }
  }
}

// Run the tests
(async () => {
  try {
    await testMultiplicationConstraints();
    await testOptimizationConcern();
    console.log('\n✅ Analysis complete');
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
})();