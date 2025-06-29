/**
 * Test Sparky Kimchi JSON format compatibility with o1js
 */

import { initSparky, getSparky } from '../bindings/sparky/index.js';
import { gatesFromJson } from '../lib/provable/core/provable-context.js';

async function testKimchiJsonFormat() {
  console.log('Testing Sparky Kimchi JSON format compatibility...\n');
  
  // Initialize Sparky
  await initSparky();
  const sparky = getSparky();
  
  // Test 1: Basic constraint system with simple constraints
  console.log('Test 1: Basic Boolean and Equal constraints');
  
  // Switch to constraint mode
  sparky.run.constraintMode();
  
  // Create some simple constraints
  const x = sparky.field.constant(5);
  const y = sparky.field.constant(7);
  
  // Add some constraints
  sparky.field.assertBoolean(x); // Boolean constraint
  sparky.field.assertEqual(x, y); // Equal constraint
  
  // Get the JSON output
  const constraintSystemJSON = JSON.parse(sparky.constraintSystem.toJson({}));
  
  console.log('Sparky constraint system JSON:');
  console.log(JSON.stringify(constraintSystemJSON, null, 2));
  
  // Test 2: Validate the JSON format matches o1js expectations
  console.log('\nTest 2: JSON format validation');
  
  // Check required fields
  if (!constraintSystemJSON.gates) {
    throw new Error('Missing "gates" field in constraint system JSON');
  }
  
  if (typeof constraintSystemJSON.public_input_size !== 'number') {
    throw new Error('Missing or invalid "public_input_size" field');
  }
  
  // Check gate structure
  const gates = constraintSystemJSON.gates;
  if (!Array.isArray(gates)) {
    throw new Error('Gates field must be an array');
  }
  
  console.log(`✓ Found ${gates.length} gates`);
  
  for (let i = 0; i < gates.length; i++) {
    const gate = gates[i];
    
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
  
  // Test 3: Try to use with o1js gatesFromJson function
  console.log('\nTest 3: o1js gatesFromJson compatibility');
  
  try {
    const result = gatesFromJson(constraintSystemJSON);
    console.log(`✓ gatesFromJson succeeded with ${result.gates.length} gates`);
    console.log(`✓ Public input size: ${result.publicInputSize}`);
    
    // Validate the converted gates
    for (let i = 0; i < result.gates.length; i++) {
      const gate = result.gates[i];
      console.log(`  Gate ${i}: ${gate.type} with ${gate.wires.length} wires and ${gate.coeffs.length} coeffs`);
    }
    
  } catch (error) {
    console.error('❌ gatesFromJson failed:', error);
    throw error;
  }
  
  console.log('\n✅ All Kimchi JSON format tests passed!');
}

async function testConstraintTypes() {
  console.log('\nTesting different constraint types...\n');
  
  await initSparky();
  const sparky = getSparky();
  
  // Reset and test different constraint types
  sparky.run.reset();
  sparky.run.constraintMode();
  
  console.log('Testing R1CS constraint (multiplication)...');
  const a = sparky.field.constant(5);
  const b = sparky.field.constant(7);
  const c = sparky.field.constant(35);
  sparky.field.assertMul(a, b, c); // R1CS: a * b = c
  
  console.log('Testing Square constraint...');
  const x = sparky.field.constant(5);
  const x_squared = sparky.field.constant(25);
  sparky.field.assertSquare(x, x_squared); // Square: x^2 = x_squared
  
  const constraintSystemJSON = JSON.parse(sparky.constraintSystem.toJson({}));
  console.log('Multi-constraint system JSON:');
  console.log(JSON.stringify(constraintSystemJSON, null, 2));
  
  // Validate with o1js
  const result = gatesFromJson(constraintSystemJSON);
  console.log(`✓ Multi-constraint system processed: ${result.gates.length} gates`);
  
  console.log('\n✅ All constraint type tests passed!');
}

async function main() {
  try {
    await testKimchiJsonFormat();
    await testConstraintTypes();
    console.log('\n🎉 All Sparky Kimchi integration tests passed!');
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }
}

main();