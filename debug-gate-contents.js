/**
 * Debug the actual gate contents returned by getConstraintSystem
 * Compare with what WASM debug output shows
 */

import { Field, ZkProgram } from './dist/node/index.js';
import { switchBackend, getCurrentBackend } from './dist/node/index.js';

async function debugGateContents() {
  console.log('🔍 Debugging actual gate contents...\n');

  // Switch to Sparky backend
  await switchBackend('sparky');
  console.log(`Backend: ${getCurrentBackend()}\n`);

  // Simple test that should produce ONE clear constraint
  const SimpleTest = ZkProgram({
    name: 'SimpleTest',
    publicInput: Field,
    methods: {
      test: {
        privateInputs: [Field],
        async method(publicInput, privateInput) {
          publicInput.assertEquals(privateInput.add(Field(1)));
        },
      },
    },
  });

  // Different test that should produce DIFFERENT constraint
  const DifferentTest = ZkProgram({
    name: 'DifferentTest', 
    publicInput: Field,
    methods: {
      test: {
        privateInputs: [Field],
        async method(publicInput, privateInput) {
          publicInput.assertEquals(privateInput.mul(Field(2)));
        },
      },
    },
  });

  const snarky = globalThis.__snarky?.Snarky;

  console.log('🧪 Test 1: Simple addition constraint');
  console.log('Compiling: publicInput.assertEquals(privateInput.add(Field(1)))');
  
  await SimpleTest.compile();
  
  const cs1 = snarky.run.getConstraintSystem();
  console.log('Result 1:');
  console.log('  Gates count:', cs1.gates.length);
  console.log('  Public input size:', cs1.public_input_size);
  
  if (cs1.gates.length > 0) {
    const gate1 = cs1.gates[0];
    console.log('  Gate 1 type:', gate1.typ);
    console.log('  Gate 1 wires count:', gate1.wires.length);
    console.log('  Gate 1 coeffs count:', gate1.coeffs.length);
    console.log('  Gate 1 wires:', gate1.wires);
    console.log('  Gate 1 coeffs preview:', gate1.coeffs.slice(0, 3).map(c => c.substring(0, 16) + '...'));
    console.log('  Full first coeff:', gate1.coeffs[0]);
  }

  console.log('\n🧪 Test 2: Simple multiplication constraint');
  console.log('Compiling: publicInput.assertEquals(privateInput.mul(Field(2)))');
  
  await DifferentTest.compile();
  
  const cs2 = snarky.run.getConstraintSystem();
  console.log('Result 2:');
  console.log('  Gates count:', cs2.gates.length);
  console.log('  Public input size:', cs2.public_input_size);
  
  if (cs2.gates.length > 0) {
    const gate2 = cs2.gates[0];
    console.log('  Gate 2 type:', gate2.typ);
    console.log('  Gate 2 wires count:', gate2.wires.length);
    console.log('  Gate 2 coeffs count:', gate2.coeffs.length);
    console.log('  Gate 2 wires:', gate2.wires);
    console.log('  Gate 2 coeffs preview:', gate2.coeffs.slice(0, 3).map(c => c.substring(0, 16) + '...'));
    console.log('  Full first coeff:', gate2.coeffs[0]);
  }

  console.log('\n🔍 Constraint System Comparison:');
  console.log('Same gates count:', cs1.gates.length === cs2.gates.length);
  
  if (cs1.gates.length > 0 && cs2.gates.length > 0) {
    const gate1 = cs1.gates[0];
    const gate2 = cs2.gates[0];
    
    console.log('Same gate type:', gate1.typ === gate2.typ);
    console.log('Same wires count:', gate1.wires.length === gate2.wires.length);
    console.log('Same coeffs count:', gate1.coeffs.length === gate2.coeffs.length);
    
    // Compare first few coefficients
    const sameFirstCoeff = gate1.coeffs[0] === gate2.coeffs[0];
    console.log('Same first coefficient:', sameFirstCoeff);
    
    if (!sameFirstCoeff) {
      console.log('✅ Different coefficients detected - constraints are actually different!');
      console.log('  Gate 1 first coeff:', gate1.coeffs[0]);
      console.log('  Gate 2 first coeff:', gate2.coeffs[0]);
    } else {
      console.log('❌ Identical coefficients - constraint system collision detected!');
    }
    
    // Compare all coefficients
    const allCoeffsMatch = gate1.coeffs.every((c, i) => c === gate2.coeffs[i]);
    console.log('All coefficients match:', allCoeffsMatch);
    
    if (!allCoeffsMatch) {
      console.log('✅ Constraint systems are actually different at coefficient level');
      // Find first difference
      for (let i = 0; i < Math.min(gate1.coeffs.length, gate2.coeffs.length); i++) {
        if (gate1.coeffs[i] !== gate2.coeffs[i]) {
          console.log(`  First difference at coeff ${i}:`);
          console.log(`    Gate 1: ${gate1.coeffs[i]}`);
          console.log(`    Gate 2: ${gate2.coeffs[i]}`);
          break;
        }
      }
    }
  }

  // Test what WASM debug vs JavaScript see
  console.log('\n🎯 WASM vs JavaScript constraint mismatch analysis:');
  console.log('The WASM debug output shows detailed constraints with many coefficients,');
  console.log('but JavaScript only sees 1 gate. This suggests either:');
  console.log('1. Constraint batching is combining multiple WASM constraints into 1 JS gate');
  console.log('2. Only the final/summary constraint is being returned to JavaScript');
  console.log('3. The WASM->JS serialization is truncating the constraint system');
}

// Run the debug
debugGateContents().catch(console.error);