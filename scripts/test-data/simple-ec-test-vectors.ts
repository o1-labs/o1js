/**
 * Simple test vector generation that avoids problematic imports
 * Focus on creating reference test vectors using basic field operations
 */

import { initializeBindings, Snarky } from './src/bindings.js';
import { Field } from './src/lib/provable/field.js';
import { writeFileSync } from 'fs';

// Test vectors will be stored here
const testVectors = {
  fieldOperations: [],
  ecBasicOperations: [],
  scalarMultiplication: [],
  endomorphismTests: []
};

/**
 * Generate basic field operation test vectors
 */
async function generateFieldVectors() {
  console.log('🔢 Generating field operation test vectors...');
  
  const testCases = [
    { a: 1n, b: 2n },
    { a: 3n, b: 4n },
    { a: 255n, b: 256n },
    { a: 65535n, b: 65536n },
  ];
  
  for (const { a, b } of testCases) {
    const fieldA = new Field(a);
    const fieldB = new Field(b);
    
    // Basic field operations
    const sum = fieldA.add(fieldB);
    const diff = fieldA.sub(fieldB);
    const product = fieldA.mul(fieldB);
    const square = fieldA.square();
    
    testVectors.fieldOperations.push({
      inputs: { a: a.toString(), b: b.toString() },
      operations: {
        add: sum.toString(),
        sub: diff.toString(),  
        mul: product.toString(),
        square_a: square.toString()
      }
    });
    
    console.log(`✅ Field vector generated for ${a}, ${b}`);
  }
}

/**
 * Generate scalar multiplication test vectors using constraints
 */
async function generateScalarMultVectors() {
  console.log('📐 Generating scalar multiplication test vectors...');
  
  // Use constraint system to generate reference values
  try {
    const constraintSystemHandle = Snarky.run.enterConstraintSystem();
    
    // Test scalar values and their binary representations
    const testScalars = [1n, 2n, 3n, 15n, 16n, 255n, 256n];
    
    for (const scalar of testScalars) {
      const scalarBits = scalar.toString(2).padStart(8, '0').split('').map(b => parseInt(b));
      
      // Create field constants for bits
      const bitFields = scalarBits.map(bit => {
        const field = Snarky.field.constant(bit);
        return { bit, fieldValue: field };
      });
      
      testVectors.scalarMultiplication.push({
        scalar: scalar.toString(),
        binaryRepresentation: scalarBits,
        bitCount: scalarBits.length,
        fieldConstants: bitFields.map(bf => bf.fieldValue)
      });
      
      console.log(`✅ Scalar mult vector for ${scalar}: ${scalarBits.join('')}`);
    }
    
    const constraintSystem = constraintSystemHandle();
    console.log(`Constraint system created with ${constraintSystem.gates?.length || 0} gates`);
    
  } catch (error) {
    console.log('⚠️ Constraint system error:', error.message);
  }
}

/**
 * Generate endomorphism test vectors
 */
async function generateEndomorphismVectors() {
  console.log('🔀 Generating endomorphism test vectors...');
  
  // Pallas curve parameters
  const pallasP = BigInt('0x40000000000000000000000000000000224698fc094cf91b992d30ed00000001');
  const pallasLambda = BigInt('0x2D33357CB532458ED3552A23A8554E5005270D29D19FC7D27B7FD22F0201B547');
  
  // Verify lambda is cube root of unity
  const lambdaSquared = (pallasLambda * pallasLambda) % pallasP;
  const lambdaCubed = (lambdaSquared * pallasLambda) % pallasP;
  const isValidLambda = lambdaCubed === 1n;
  
  console.log(`Lambda verification: ${isValidLambda ? '✅' : '❌'}`);
  console.log(`  λ = ${pallasLambda.toString(16)}`);
  console.log(`  λ² = ${lambdaSquared.toString(16)}`);
  console.log(`  λ³ = ${lambdaCubed} (should be 1)`);
  
  // Test curve equation y² = x³ + 5
  const testPoints = [
    { x: 1n, expectedY2: 6n },    // 1³ + 5 = 6
    { x: 2n, expectedY2: 13n },   // 2³ + 5 = 13  
    { x: 3n, expectedY2: 32n },   // 3³ + 5 = 32
  ];
  
  for (const { x, expectedY2 } of testPoints) {
    const actualY2 = (x * x * x + 5n) % pallasP;
    const isCorrect = actualY2 === expectedY2;
    
    // Check if this x gives a valid y (y² is a quadratic residue)
    const hasValidY = isQuadraticResidue(actualY2, pallasP);
    
    testVectors.endomorphismTests.push({
      curveEquation: 'y² = x³ + 5',
      x: x.toString(),
      expectedY2: expectedY2.toString(),
      actualY2: actualY2.toString(),
      isValidPoint: hasValidY,
      lambda: pallasLambda.toString(),
      endomorphismX: ((pallasLambda * x) % pallasP).toString()
    });
    
    console.log(`✅ Curve point test for x=${x}: y²=${actualY2} ${isCorrect ? '✅' : '❌'} valid=${hasValidY}`);
  }
}

/**
 * Simple quadratic residue test (not cryptographically secure)
 */
function isQuadraticResidue(n: bigint, p: bigint): boolean {
  // Legendre symbol: n^((p-1)/2) mod p
  // Returns 1 if n is a quadratic residue, -1 if not, 0 if n ≡ 0
  if (n === 0n) return true;
  const exponent = (p - 1n) / 2n;
  const result = modPow(n, exponent, p);
  return result === 1n;
}

/**
 * Modular exponentiation
 */
function modPow(base: bigint, exp: bigint, mod: bigint): bigint {
  let result = 1n;
  base = base % mod;
  while (exp > 0n) {
    if (exp % 2n === 1n) {
      result = (result * base) % mod;
    }
    exp = exp / 2n;
    base = (base * base) % mod;
  }
  return result;
}

/**
 * Main function to generate all test vectors
 */
async function generateAllTestVectors() {
  console.log('🧪 Generating EC test vectors (simplified approach)...');
  console.log('=================================================');
  
  try {
    await initializeBindings(); // Use Snarky backend for reference
    console.log('✅ Snarky bindings initialized');
    
    await generateFieldVectors();
    await generateScalarMultVectors();
    await generateEndomorphismVectors();
    
    // Save test vectors to file
    const outputPath = './simple-ec-test-vectors.json';
    writeFileSync(outputPath, JSON.stringify(testVectors, null, 2));
    
    console.log('\\n📊 Test Vector Generation Summary:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Field operations: ${testVectors.fieldOperations.length}`);
    console.log(`Scalar multiplication: ${testVectors.scalarMultiplication.length}`);
    console.log(`Endomorphism tests: ${testVectors.endomorphismTests.length}`);
    console.log(`Output file: ${outputPath}`);
    
    console.log('\\n🎯 Key Findings:');
    console.log('1. These vectors represent the expected behavior using Snarky');
    console.log('2. Sparky implementations should match these values exactly');
    console.log('3. Any deviations indicate bugs in the Sparky adapter');
    
  } catch (error) {
    console.error('❌ Test vector generation failed:', error.message);
    console.error(error.stack);
  }
}

// Run the test vector generation
generateAllTestVectors();