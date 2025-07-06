/**
 * Foreign Field Addition LIR Conversion Test
 * 
 * This test demonstrates the conversion of foreign field addition operations
 * from high-level constraints through LIR gates and back to constraint format.
 * 
 * Created: July 6, 2025
 * Last Modified: July 6, 2025
 */

import { lirGateToConstraintType, convertLirConstraintSystem, analyzeLirConstraintSystem } from '../bindings/sparky-adapter/lir-to-constraint.js';
import type { LirConstraint, LirGate, ConstraintType, FieldElement } from '../bindings/sparky-adapter/lir-to-constraint.js';

// Secp256k1 modulus for foreign field operations
const SECP256K1_MODULUS = BigInt('0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEFFFFFC2F');

// Split into 3 88-bit limbs
const SECP256K1_LIMBS: FieldElement[] = [
  { value: SECP256K1_MODULUS & ((1n << 88n) - 1n) },                    // limb0: bits 0-87
  { value: (SECP256K1_MODULUS >> 88n) & ((1n << 88n) - 1n) },          // limb1: bits 88-175
  { value: SECP256K1_MODULUS >> 176n }                                  // limb2: bits 176-255
];

/**
 * Create a foreign field addition LIR constraint
 */
function createForeignFieldAddLir(
  leftVars: number[],
  rightVars: number[],
  resultVars: number[],
  overflowVar: number,
  carryVar: number,
  sign: 1n | -1n,
  row: number
): LirConstraint {
  // Foreign field addition gate
  const gate: LirGate = {
    type: 'ForeignFieldAdd',
    modulus_limbs: SECP256K1_LIMBS,
    limb_count: 3
  };
  
  // Column assignments with auxiliary variables
  const aux = [
    ...leftVars,    // left limbs (3)
    ...rightVars,   // right limbs (3) 
    ...resultVars,  // result limbs (3)
    overflowVar,    // overflow bit
    carryVar        // carry bit
  ];
  
  return {
    gate,
    row,
    column_assignments: {
      left: leftVars[0],   // Use first limb as primary left
      right: rightVars[0], // Use first limb as primary right
      output: resultVars[0], // Use first limb as primary output
      aux
    },
    metadata: { sign }
  };
}

/**
 * Create a generic gate LIR constraint (for comparison)
 */
function createGenericGateLir(
  coeffs: { l: bigint; r: bigint; o: bigint; m: bigint; c: bigint },
  vars: { left: number; right: number; output: number },
  row: number
): LirConstraint {
  const gate: LirGate = {
    type: 'Generic',
    coefficients: {
      l: { value: coeffs.l },
      r: { value: coeffs.r },
      o: { value: coeffs.o },
      m: { value: coeffs.m },
      c: { value: coeffs.c }
    }
  };
  
  return {
    gate,
    row,
    column_assignments: vars
  };
}

/**
 * Test LIR to constraint conversion for various gate types
 */
function testLirConversion() {
  console.log('=== Testing LIR to Constraint Conversion ===\n');
  
  // Example 1: Foreign Field Addition
  console.log('1. Foreign Field Addition:');
  const ffAddLir = createForeignFieldAddLir(
    [10, 11, 12],  // left limbs
    [13, 14, 15],  // right limbs
    [16, 17, 18],  // result limbs
    19,            // overflow
    20,            // carry
    1n,            // sign (addition)
    0              // row
  );
  
  const ffAddConstraint = lirGateToConstraintType(ffAddLir);
  console.log('LIR Gate Type:', ffAddLir.gate.type);
  console.log('Column Assignments:', ffAddLir.column_assignments);
  console.log('Converted:', ffAddConstraint);
  console.log();
  
  // Example 2: R1CS Multiplication
  console.log('2. R1CS Multiplication:');
  const FIELD_ORDER = BigInt('28948022309329048855892746252171976963363056481941560715954676764349967630337');
  const r1csLir = createGenericGateLir(
    { l: 0n, r: 0n, o: FIELD_ORDER - 1n, m: 1n, c: 0n }, // -1 in field
    { left: 1, right: 2, output: 3 },
    1
  );
  
  const r1csConstraint = lirGateToConstraintType(r1csLir);
  console.log('LIR Gate Type:', r1csLir.gate.type);
  console.log('Coefficients: l=0, r=0, o=-1, m=1, c=0');
  console.log('Converted:', r1csConstraint);
  console.log();
  
  // Example 3: Boolean Constraint
  console.log('3. Boolean Constraint:');
  const boolLir = createGenericGateLir(
    { l: 1n, r: 0n, o: 0n, m: FIELD_ORDER - 1n, c: 0n }, // -1 in field
    { left: 4, right: 4, output: 0 },
    2
  );
  
  const boolConstraint = lirGateToConstraintType(boolLir);
  console.log('LIR Gate Type:', boolLir.gate.type);
  console.log('Coefficients: l=1, r=0, o=0, m=-1, c=0');
  console.log('Converted:', boolConstraint);
  console.log();
  
  // Example 4: Linear Addition
  console.log('4. Linear Addition (a + b = c):');
  const addLir = createGenericGateLir(
    { l: 1n, r: 1n, o: FIELD_ORDER - 1n, m: 0n, c: 0n }, // -1 in field
    { left: 5, right: 6, output: 7 },
    3
  );
  
  const addConstraint = lirGateToConstraintType(addLir);
  console.log('LIR Gate Type:', addLir.gate.type);
  console.log('Coefficients: l=1, r=1, o=-1, m=0, c=0');
  console.log('Converted:', addConstraint);
  console.log();
  
  // Example 5: Batch conversion
  console.log('5. Batch Conversion:');
  const lirConstraints: LirConstraint[] = [
    ffAddLir,
    r1csLir,
    boolLir,
    addLir
  ];
  
  const convertedConstraints = convertLirConstraintSystem(lirConstraints);
  console.log(`Converted ${convertedConstraints.length} out of ${lirConstraints.length} constraints`);
  
  // Analyze the constraint system
  const analysis = analyzeLirConstraintSystem(lirConstraints);
  console.log('\nConstraint System Analysis:');
  console.log(`Total constraints: ${analysis.total}`);
  console.log(`Convertible: ${analysis.convertible}`);
  console.log(`Non-convertible: ${analysis.nonConvertible}`);
  console.log('By gate type:', analysis.byGateType);
}

/**
 * Test specific foreign field patterns
 */
function testForeignFieldPatterns() {
  console.log('\n=== Testing Foreign Field Patterns ===\n');
  
  // Pattern 1: Addition with positive sign
  console.log('Pattern 1: a + b = c (mod p)');
  const addPattern = createForeignFieldAddLir(
    [100, 101, 102],  // a limbs
    [103, 104, 105],  // b limbs
    [106, 107, 108],  // c limbs
    109,              // overflow
    110,              // carry
    1n,               // sign = +1
    10
  );
  
  const addResult = lirGateToConstraintType(addPattern);
  if (addResult && addResult.type === 'ForeignFieldAdd') {
    console.log('✓ Correctly identified as ForeignFieldAdd');
    console.log(`  Left limbs: ${addResult.left}`);
    console.log(`  Right limbs: ${addResult.right}`);
    console.log(`  Result limbs: ${addResult.result}`);
    console.log(`  Sign: ${addResult.sign.value}`);
  }
  
  // Pattern 2: Subtraction with negative sign
  console.log('\nPattern 2: a - b = c (mod p)');
  const subPattern = createForeignFieldAddLir(
    [200, 201, 202],  // a limbs
    [203, 204, 205],  // b limbs
    [206, 207, 208],  // c limbs
    209,              // overflow
    210,              // carry
    -1n,              // sign = -1
    20
  );
  
  const subResult = lirGateToConstraintType(subPattern);
  if (subResult && subResult.type === 'ForeignFieldAdd') {
    console.log('✓ Correctly identified as ForeignFieldAdd with subtraction');
    console.log(`  Sign: ${subResult.sign.value}`);
  }
}

/**
 * Test edge cases and error handling
 */
function testEdgeCases() {
  console.log('\n=== Testing Edge Cases ===\n');
  
  // Edge case 1: Invalid auxiliary column count
  console.log('Edge case 1: Missing auxiliary columns');
  const invalidFFAdd: LirConstraint = {
    gate: { type: 'ForeignFieldAdd', modulus_limbs: SECP256K1_LIMBS, limb_count: 3 },
    row: 0,
    column_assignments: {
      left: 1,
      right: 2,
      output: 3,
      aux: [1, 2, 3] // Too few auxiliary columns
    }
  };
  
  const result1 = lirGateToConstraintType(invalidFFAdd);
  console.log(`Result: ${result1 === null ? '✓ Correctly returned null' : '✗ Unexpected result'}`);
  
  // Edge case 2: Unknown gate type
  console.log('\nEdge case 2: Unknown gate type');
  const unknownGate: LirConstraint = {
    gate: { type: 'UnknownGate' } as any,
    row: 0,
    column_assignments: { left: 1, right: 2, output: 3 }
  };
  
  const result2 = lirGateToConstraintType(unknownGate);
  console.log(`Result: ${result2 === null ? '✓ Correctly returned null' : '✗ Unexpected result'}`);
  
  // Edge case 3: Generic gate with non-standard coefficients
  console.log('\nEdge case 3: Non-standard generic gate');
  const nonStandardLir = createGenericGateLir(
    { l: 2n, r: 3n, o: 4n, m: 5n, c: 6n },
    { left: 1, right: 2, output: 3 },
    0
  );
  
  const result3 = lirGateToConstraintType(nonStandardLir);
  console.log(`Result: ${result3 === null ? '✓ Correctly returned null for non-convertible pattern' : 'Converted to: ' + JSON.stringify(result3)}`);
}

// Run all tests
console.log('Foreign Field Addition LIR Conversion Test\n');
console.log('This test demonstrates the conversion of LIR gates back to constraint format.\n');

testLirConversion();
testForeignFieldPatterns();
testEdgeCases();

console.log('\n=== Test Complete ===');