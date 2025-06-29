/**
 * Generate test vectors for EC operations using the reference Snarky implementation
 * These vectors will be used to verify the correctness of Sparky implementations
 */

import { initializeBindings, Snarky } from './src/bindings.js';
import { Field, Group, Scalar, Provable, ZkProgram } from './src/index.js';
import { writeFileSync } from 'fs';

// Test vectors will be stored here
const testVectors = {
  ecScale: [],
  ecEndoscale: [],
  ecEndoscalar: [],
  basePoints: [],
  scalars: [],
  expectedResults: []
};

/**
 * Generate test vectors for ecScale (variable-base scalar multiplication)
 */
async function generateEcScaleVectors() {
  console.log('📐 Generating ecScale test vectors...');
  
  const TestProgram = ZkProgram({
    name: 'ECScaleTest',
    publicInput: Field,
    
    methods: {
      testScalarMultiplication: {
        privateInputs: [Field, Field, Field],
        async method(publicInput: Field, baseX: Field, baseY: Field, scalar: Field) {
          // Create a point from coordinates
          const basePoint = new Group({ x: baseX, y: baseY });
          
          // Perform scalar multiplication
          const result = basePoint.scale(Scalar.from(scalar));
          
          // Return the result coordinates
          return result.x.add(result.y);
        }
      }
    }
  });
  
  try {
    await TestProgram.compile();
    
    // Test cases with various scalar values
    const testCases = [
      { scalar: 1n, baseX: 1n, baseY: 1n },
      { scalar: 2n, baseX: 1n, baseY: 1n },
      { scalar: 3n, baseX: 2n, baseY: 3n },
      { scalar: 255n, baseX: 5n, baseY: 7n },
      { scalar: 256n, baseX: 1n, baseY: 2n },
      { scalar: 65535n, baseX: 3n, baseY: 4n },
      { scalar: 65536n, baseX: 7n, baseY: 8n },
      { scalar: 2n**32n - 1n, baseX: 9n, baseY: 10n },
    ];
    
    for (const testCase of testCases) {
      try {
        const { scalar, baseX, baseY } = testCase;
        
        // Generate proof to capture constraint system
        const proof = await TestProgram.testScalarMultiplication(
          Field(0),
          Field(baseX),
          Field(baseY), 
          Field(scalar)
        );
        
        // Extract the actual group operations
        const basePoint = new Group({ x: Field(baseX), y: Field(baseY) });
        const scalarField = Scalar.from(scalar);
        const result = basePoint.scale(scalarField);
        
        testVectors.ecScale.push({
          scalar: scalar.toString(),
          basePoint: { x: baseX.toString(), y: baseY.toString() },
          expectedResult: { x: result.x.toString(), y: result.y.toString() },
          scalarBits: scalar.toString(2).padStart(64, '0').split('').map(b => parseInt(b)),
          proofPublicOutput: proof.publicOutput.toString()
        });
        
        console.log(`✅ ecScale vector generated for scalar ${scalar}`);
        
      } catch (error) {
        console.log(`⚠️ Failed to generate vector for scalar ${testCase.scalar}: ${error.message}`);
      }
    }
    
  } catch (error) {
    console.error('❌ ecScale vector generation failed:', error.message);
  }
}

/**
 * Generate test vectors for ecEndoscale (GLV endomorphism)
 */
async function generateEcEndoscaleVectors() {
  console.log('🔀 Generating ecEndoscale test vectors...');
  
  // For GLV, we need to work with the actual Pallas curve parameters
  // Pallas curve: y² = x³ + 5 over Fp where p = 0x40000000000000000000000000000000224698fc094cf91b992d30ed00000001
  const pallasP = BigInt('0x40000000000000000000000000000000224698fc094cf91b992d30ed00000001');
  
  // GLV lambda for Pallas curve (cube root of unity)
  const pallasLambda = BigInt('0x2D33357CB532458ED3552A23A8554E5005270D29D19FC7D27B7FD22F0201B547');
  
  // Verify lambda is correct: lambda^3 ≡ 1 (mod p)
  const lambdaCubed = (pallasLambda * pallasLambda * pallasLambda) % pallasP;
  const isValidLambda = lambdaCubed === 1n;
  
  console.log(`Lambda verification: ${isValidLambda ? '✅' : '❌'} (λ³ mod p = ${lambdaCubed})`);
  
  const TestProgram = ZkProgram({
    name: 'ECEndoscaleTest',
    publicInput: Field,
    
    methods: {
      testGLVDecomposition: {
        privateInputs: [Field, Field, Field],
        async method(publicInput: Field, baseX: Field, baseY: Field, scalar: Field) {
          // Validate the base point is on the curve: y² = x³ + 5
          const xCubed = baseX.mul(baseX).mul(baseX);
          const yCubed = baseY.mul(baseY);
          const five = Field(5);
          yCubed.assertEquals(xCubed.add(five));
          
          // Apply endomorphism: (x, y) -> (λx, y)
          const lambda = Field(pallasLambda);
          const endoX = lambda.mul(baseX);
          
          // Verify endomorphism point is also on curve
          const endoXCubed = endoX.mul(endoX).mul(endoX);
          const endoYSquared = baseY.mul(baseY);
          endoYSquared.assertEquals(endoXCubed.add(five));
          
          return endoX.add(baseY);
        }
      }
    }
  });
  
  try {
    await TestProgram.compile();
    
    // Test cases with points that should be on the Pallas curve
    const testCases = [
      // Generator point (if we can find it)
      { scalar: 123456789n, baseX: 1n, baseY: 2n },
      { scalar: 987654321n, baseX: 3n, baseY: 4n },
    ];
    
    for (const testCase of testCases) {
      try {
        const { scalar, baseX, baseY } = testCase;
        
        // First, find a valid point on the curve y² = x³ + 5
        let validX = baseX;
        let validY: bigint;
        let foundValidPoint = false;
        
        for (let i = 0; i < 100 && !foundValidPoint; i++) {
          const xCubed = (validX * validX * validX) % pallasP;
          const rhs = (xCubed + 5n) % pallasP;
          
          // Check if rhs is a quadratic residue (has a square root)  
          const sqrtRhs = modularSqrt(rhs, pallasP);
          if (sqrtRhs !== null) {
            validY = sqrtRhs;
            foundValidPoint = true;
          } else {
            validX = validX + 1n;
          }
        }
        
        if (!foundValidPoint) {
          console.log(`⚠️ Could not find valid curve point starting from ${baseX}`);
          continue;
        }
        
        // Generate GLV decomposition
        const { k1, k2 } = computeGLVDecomposition(scalar, pallasLambda, pallasP);
        
        // Verify: k = k1 + k2 * λ
        const reconstructed = (k1 + k2 * pallasLambda) % pallasP;
        const isValidDecomposition = reconstructed === scalar % pallasP;
        
        if (isValidDecomposition) {
          testVectors.ecEndoscale.push({
            scalar: scalar.toString(),
            basePoint: { x: validX.toString(), y: validY.toString() },
            glvDecomposition: { k1: k1.toString(), k2: k2.toString() },
            lambda: pallasLambda.toString(),
            endomorphismPoint: { x: ((pallasLambda * validX) % pallasP).toString(), y: validY.toString() },
            verification: { valid: isValidDecomposition, reconstructed: reconstructed.toString() }
          });
          
          console.log(`✅ ecEndoscale vector generated for scalar ${scalar}`);
        } else {
          console.log(`❌ GLV decomposition failed for scalar ${scalar}`);
        }
        
      } catch (error) {
        console.log(`⚠️ Failed to generate endoscale vector: ${error.message}`);
      }
    }
    
  } catch (error) {
    console.error('❌ ecEndoscale vector generation failed:', error.message);
  }
}

/**
 * Compute modular square root using Tonelli-Shanks algorithm
 */
function modularSqrt(n: bigint, p: bigint): bigint | null {
  // Simple case: if p ≡ 3 (mod 4), then sqrt(n) = n^((p+1)/4)
  if (p % 4n === 3n) {
    const result = modPow(n, (p + 1n) / 4n, p);
    if ((result * result) % p === n % p) {
      return result;
    }
  }
  
  // For general case, would need full Tonelli-Shanks
  // For now, return null for non-trivial cases
  return null;
}

/**
 * Modular exponentiation: base^exp mod mod
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
 * Compute GLV decomposition k = k1 + k2*λ
 * This is a simplified version - real implementation requires lattice reduction
 */
function computeGLVDecomposition(k: bigint, lambda: bigint, p: bigint): { k1: bigint, k2: bigint } {
  // Simplified approach: use extended Euclidean algorithm
  // In practice, would use more sophisticated lattice reduction
  
  // For now, return a trivial decomposition
  return { k1: k % p, k2: 0n };
}

/**
 * Generate test vectors for ecEndoscalar (scalar decomposition validation)
 */
async function generateEcEndoscalarVectors() {
  console.log('🧮 Generating ecEndoscalar test vectors...');
  
  const testCases = [
    { scalar: 1n },
    { scalar: 2n },
    { scalar: 255n },
    { scalar: 256n },
    { scalar: 65535n },
    { scalar: 65536n },
    { scalar: 2n**32n - 1n },
  ];
  
  for (const testCase of testCases) {
    const { scalar } = testCase;
    
    // Convert scalar to binary representation
    const binaryStr = scalar.toString(2);
    const bits = binaryStr.split('').map(b => parseInt(b));
    
    // For GLV, decompose into k1 and k2
    const { k1, k2 } = computeGLVDecomposition(scalar, BigInt('0x2D33357CB532458ED3552A23A8554E5005270D29D19FC7D27B7FD22F0201B547'), BigInt('0x40000000000000000000000000000000224698fc094cf91b992d30ed00000001'));
    
    const k1Bits = k1.toString(2).split('').map(b => parseInt(b));
    const k2Bits = k2.toString(2).split('').map(b => parseInt(b));
    
    testVectors.ecEndoscalar.push({
      scalar: scalar.toString(),
      scalarBits: bits,
      glvDecomposition: {
        k1: k1.toString(),
        k2: k2.toString(),
        k1Bits: k1Bits,
        k2Bits: k2Bits
      }
    });
    
    console.log(`✅ ecEndoscalar vector generated for scalar ${scalar}`);
  }
}

/**
 * Main function to generate all test vectors
 */
async function generateAllTestVectors() {
  console.log('🧪 Generating comprehensive EC test vectors...');
  console.log('=====================================');
  
  try {
    await initializeBindings(); // Use Snarky backend for reference
    console.log('✅ Snarky bindings initialized');
    
    await generateEcScaleVectors();
    await generateEcEndoscaleVectors();
    await generateEcEndoscalarVectors();
    
    // Save test vectors to file
    const outputPath = './ec-test-vectors.json';
    writeFileSync(outputPath, JSON.stringify(testVectors, null, 2));
    
    console.log('\\n📊 Test Vector Generation Summary:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`ecScale vectors: ${testVectors.ecScale.length}`);
    console.log(`ecEndoscale vectors: ${testVectors.ecEndoscale.length}`);
    console.log(`ecEndoscalar vectors: ${testVectors.ecEndoscalar.length}`);
    console.log(`Output file: ${outputPath}`);
    
    console.log('\\n🎯 Next Steps:');
    console.log('1. Use these vectors to test Sparky implementation');
    console.log('2. Compare Sparky output against these reference values');
    console.log('3. Fix any discrepancies in Sparky adapter');
    
  } catch (error) {
    console.error('❌ Test vector generation failed:', error.message);
    console.error(error.stack);
  }
}

// Run the test vector generation
generateAllTestVectors();