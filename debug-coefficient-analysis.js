/**
 * COEFFICIENT ANALYSIS DEBUG TOOL
 * 
 * Focuses on analyzing the coefficient encoding differences between
 * Snarky and Sparky that are causing permutation construction failures.
 */

import { Field, ZkProgram, Provable, switchBackend, getCurrentBackend } from './dist/node/index.js';

async function analyzeCoefficients() {
  console.log('🔍 COEFFICIENT ENCODING ANALYSIS');
  console.log('='.repeat(60));

  const MultiplyProgram = ZkProgram({
    name: 'MultiplyProgram',
    publicInput: Field,
    publicOutput: Field,
    methods: {
      multiply: {
        privateInputs: [Field],
        async method(publicInput, privateInput) {
          const result = publicInput.mul(privateInput);
          return { publicOutput: result };
        },
      },
    },
  });

  try {
    console.log('\n🔵 SNARKY COEFFICIENT ANALYSIS:');
    await switchBackend('snarky');
    await MultiplyProgram.compile();
    
    // Try to generate proof and see what constraint system we get
    try {
      const snarkyProof = await MultiplyProgram.multiply(Field(3), Field(4));
      console.log('✅ Snarky proof generation: SUCCESS');
      
      // Extract Snarky constraints if possible through some API
      console.log('🔍 Trying to extract Snarky constraint system...');
      
      // Check for constraint system access
      if (globalThis.__snarky?.Snarky?.constraintSystem) {
        const snarkyCS = globalThis.__snarky.Snarky.constraintSystem;
        console.log(`📋 Snarky CS methods available: ${Object.keys(snarkyCS)}`);
        
        // Try to get constraint data
        if (snarkyCS.rows && snarkyCS.toJson) {
          try {
            const rows = snarkyCS.rows();
            console.log(`📊 Snarky constraint rows: ${rows}`);
            
            // Try various ways to get JSON
            console.log('🔍 Attempting Snarky constraint JSON extraction...');
            // This might fail but let's see what error we get
          } catch (e) {
            console.log(`❌ Snarky constraint extraction failed: ${e.message}`);
          }
        }
      }
      
    } catch (error) {
      console.log(`❌ Snarky proof generation failed: ${error.message}`);
    }

    console.log('\n🟠 SPARKY COEFFICIENT ANALYSIS:');
    await switchBackend('sparky');
    await MultiplyProgram.compile();
    
    // Extract Sparky constraint system
    const sparkySystem = globalThis.sparkyConstraintBridge.getFullConstraintSystem();
    
    console.log(`📊 Sparky constraint system summary:`);
    console.log(`   Gates: ${sparkySystem.gates?.length || 0}`);
    console.log(`   Public input size: ${sparkySystem.publicInputSize || 0}`);
    console.log(`   Constraint count: ${sparkySystem.constraintCount || 0}`);
    
    if (sparkySystem.gates?.length > 0) {
      const gate = sparkySystem.gates[0];
      
      console.log('\n🔍 DETAILED GATE ANALYSIS:');
      console.log(`Gate type: ${gate.typ}`);
      console.log(`Wire count: ${gate.wires?.length || 0}`);
      console.log(`Coefficient count: ${gate.coeffs?.length || 0}`);
      
      console.log('\n📋 WIRE DETAILS:');
      gate.wires.forEach((wire, idx) => {
        console.log(`  Wire ${idx}: row=${wire.row}, col=${wire.col}`);
      });
      
      console.log('\n📋 COEFFICIENT DETAILS:');
      gate.coeffs.forEach((coeff, idx) => {
        if (coeff !== "0000000000000000000000000000000000000000000000000000000000000000") {
          console.log(`  Coeff ${idx}: ${coeff} (non-zero)`);
        } else {
          console.log(`  Coeff ${idx}: (zero)`);
        }
      });
      
      // Analyze coefficient pattern
      const nonZeroCoeffs = gate.coeffs.filter(c => c !== "0000000000000000000000000000000000000000000000000000000000000000");
      console.log(`\n📊 Non-zero coefficients: ${nonZeroCoeffs.length}/${gate.coeffs.length}`);
      
      if (nonZeroCoeffs.length > 0) {
        console.log('🔍 Non-zero coefficient values:');
        nonZeroCoeffs.forEach((coeff, idx) => {
          console.log(`  ${idx + 1}: ${coeff}`);
        });
      }
      
      // Compare with expected multiplication constraint pattern
      console.log('\n🎯 EXPECTED MULTIPLICATION CONSTRAINT PATTERN:');
      console.log('   For a * b = c constraint:');
      console.log('   - Should have non-zero coeffs for multiplication terms');
      console.log('   - Wire assignments should reflect variable relationships');
      console.log('   - Coefficient encoding should match Kimchi expectations');
      
      // Try proof generation to trigger the error
      console.log('\n🧪 TESTING PROOF GENERATION:');
      try {
        const sparkyProof = await MultiplyProgram.multiply(Field(3), Field(4));
        console.log('✅ Sparky proof generation: SUCCESS - ISSUE RESOLVED!');
      } catch (error) {
        console.log(`❌ Sparky proof generation failed: ${error.message}`);
        
        if (error.message.includes('permutation was not constructed correctly')) {
          console.log('\n🎯 ANALYSIS: Permutation construction error persists');
          console.log('💡 LIKELY CAUSES:');
          console.log('   1. Coefficient encoding format incompatible with Kimchi');
          console.log('   2. Wire row/col assignments don\'t match expected pattern');
          console.log('   3. Missing constraint system metadata');
          console.log('   4. Gate type interpretation differences');
          
          // Deep dive into coefficient format
          console.log('\n🔬 COEFFICIENT FORMAT ANALYSIS:');
          const firstNonZero = nonZeroCoeffs[0];
          if (firstNonZero) {
            console.log(`First non-zero coefficient: ${firstNonZero}`);
            console.log(`Length: ${firstNonZero.length} characters`);
            console.log(`Expected: 64 characters for 256-bit field element`);
            
            // Try to interpret as field element
            if (firstNonZero.length === 64) {
              console.log('✅ Coefficient length correct for field element');
              
              // Check if it's little-endian encoded
              const firstBytes = firstNonZero.slice(0, 8);
              const lastBytes = firstNonZero.slice(-8);
              console.log(`First 4 bytes: ${firstBytes}`);
              console.log(`Last 4 bytes: ${lastBytes}`);
              
              // Look for field element -1 (should be p-1 in Pallas field)
              if (firstNonZero === "0100000000000000000000000000000000000000000000000000000000000000") {
                console.log('🎯 Found coefficient "1" (little-endian)');
              }
            }
          }
        }
      }
    }

  } catch (error) {
    console.error(`❌ Analysis failed: ${error.message}`);
    console.error(error.stack);
  }
}

// Run the analysis
analyzeCoefficients().catch(console.error);