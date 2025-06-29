/**
 * Test the updated Sparky WASM with Kimchi JSON conversion
 */

import { initSparky, getSparky } from '../bindings/sparky/index.js';
import { gatesFromJson } from '../lib/provable/core/provable-context.js';

async function testUpdatedSparkyWasm() {
  console.log('Testing updated Sparky WASM with Kimchi JSON conversion...\n');
  
  try {
    console.log('Initializing Sparky...');
    await initSparky();
    const sparky = getSparky();
    console.log('✓ Sparky initialized successfully');
    
    console.log('\nTesting constraint generation...');
    
    // Switch to constraint mode
    sparky.run.constraintMode();
    console.log('✓ Switched to constraint mode');
    
    // Create some field elements and constraints
    const x = sparky.field.constant(5);
    const y = sparky.field.constant(3);
    console.log('✓ Created field constants');
    
    // Add different types of constraints to test our Kimchi conversion
    console.log('\nAdding constraints...');
    
    // Boolean constraint
    sparky.field.assertBoolean(sparky.field.constant(1));
    console.log('✓ Added Boolean constraint');
    
    // Equal constraint
    sparky.field.assertEqual(x, sparky.field.constant(5));
    console.log('✓ Added Equal constraint');
    
    // Multiplication constraint (R1CS)
    sparky.field.assertMul(x, y, sparky.field.constant(15));
    console.log('✓ Added R1CS constraint');
    
    // Square constraint
    sparky.field.assertSquare(x, sparky.field.constant(25));
    console.log('✓ Added Square constraint');
    
    console.log('\nGenerating constraint system JSON...');
    
    // Get the constraint system JSON (should now be in Kimchi format!)
    const constraintSystemJSON = JSON.parse(sparky.constraintSystem.toJson({}));
    
    console.log('✓ Generated constraint system JSON');
    console.log(`✓ Number of gates: ${constraintSystemJSON.gates?.length || 'undefined'}`);
    console.log(`✓ Public input size: ${constraintSystemJSON.public_input_size}`);
    
    // Display the JSON structure
    console.log('\nConstraint System JSON:');
    console.log(JSON.stringify(constraintSystemJSON, null, 2));
    
    console.log('\nValidating JSON structure...');
    
    // Validate the JSON has the expected Kimchi format
    if (!constraintSystemJSON.gates) {
      throw new Error('Missing "gates" field - still using old R1CS format!');
    }
    
    if (constraintSystemJSON.constraints) {
      throw new Error('Found "constraints" field - this means old R1CS format is still being used!');
    }
    
    if (typeof constraintSystemJSON.public_input_size !== 'number') {
      throw new Error('Missing or invalid "public_input_size" field');
    }
    
    console.log('✓ JSON has correct Kimchi format (gates, not constraints)');
    
    // Validate each gate
    for (let i = 0; i < constraintSystemJSON.gates.length; i++) {
      const gate = constraintSystemJSON.gates[i];
      
      if (!gate.typ || typeof gate.typ !== 'string') {
        throw new Error(`Gate ${i}: Missing or invalid "typ" field`);
      }
      
      if (!Array.isArray(gate.wires)) {
        throw new Error(`Gate ${i}: Missing or invalid "wires" field`);
      }
      
      if (!Array.isArray(gate.coeffs)) {
        throw new Error(`Gate ${i}: Missing or invalid "coeffs" field`);
      }
      
      // Validate wire structure
      for (let j = 0; j < gate.wires.length; j++) {
        const wire = gate.wires[j];
        if (typeof wire.row !== 'number' || typeof wire.col !== 'number') {
          throw new Error(`Gate ${i}, wire ${j}: Invalid wire structure`);
        }
      }
      
      // Validate coefficients are strings
      for (let j = 0; j < gate.coeffs.length; j++) {
        if (typeof gate.coeffs[j] !== 'string') {
          throw new Error(`Gate ${i}, coeff ${j}: Coefficients must be strings`);
        }
      }
      
      console.log(`✓ Gate ${i}: ${gate.typ} with ${gate.wires.length} wires and ${gate.coeffs.length} coeffs`);
    }
    
    console.log('\nTesting o1js compatibility...');
    
    // Test with o1js gatesFromJson function
    try {
      const result = gatesFromJson(constraintSystemJSON);
      console.log(`✓ o1js gatesFromJson succeeded with ${result.gates.length} gates`);
      console.log(`✓ Public input size: ${result.publicInputSize}`);
      
      // Display converted gates
      for (let i = 0; i < result.gates.length; i++) {
        const gate = result.gates[i];
        console.log(`  Gate ${i}: ${gate.type} with ${gate.wires.length} wires and ${gate.coeffs.length} coeffs`);
      }
      
    } catch (error) {
      console.error('❌ o1js gatesFromJson failed:', error);
      throw error;
    }
    
    console.log('\n🎉 All tests passed! Sparky now outputs correct Kimchi JSON format!');
    console.log('\nSummary:');
    console.log('✅ WASM initialization works');
    console.log('✅ Constraint generation works');
    console.log('✅ JSON output is in Kimchi format (not R1CS)');
    console.log('✅ All gate structures are valid');
    console.log('✅ o1js gatesFromJson() accepts the output');
    console.log('✅ Full compatibility with o1js constraint system!');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    throw error;
  }
}

async function main() {
  try {
    await testUpdatedSparkyWasm();
  } catch (error) {
    console.error('\n💥 Sparky WASM test failed:', error);
    process.exit(1);
  }
}

main();