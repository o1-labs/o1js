/**
 * CONSTRAINT SYSTEM JSON COMPARISON DEBUG TOOL
 * 
 * Extracts actual constraint system JSON from both Snarky and Sparky backends
 * for identical operations to identify exact structural differences causing
 * permutation construction failures.
 */

import { Field, ZkProgram, Provable, switchBackend, getCurrentBackend } from './dist/node/index.js';

async function compareConstraintSystemJsons() {
  console.log('🔍 CONSTRAINT SYSTEM JSON COMPARISON ANALYSIS');
  console.log('='.repeat(60));

  // Define the simplest possible test case
  const MinimalProgram = ZkProgram({
    name: 'MinimalProgram',
    publicInput: Field,
    publicOutput: Field,
    methods: {
      add: {
        privateInputs: [Field],
        async method(publicInput, privateInput) {
          // Single field addition - simplest constraint possible
          const result = publicInput.add(privateInput);
          return { publicOutput: result };
        },
      },
    },
  });

  try {
    console.log('\n📋 Testing identical operation: Field(1).add(Field(2))');
    
    // Test with Snarky backend
    console.log('\n🔵 SNARKY BACKEND ANALYSIS:');
    await switchBackend('snarky');
    
    const snarkyStart = Date.now();
    const snarkyResult = await MinimalProgram.compile();
    const snarkyCompileTime = Date.now() - snarkyStart;
    
    console.log(`✅ Snarky compilation: ${snarkyCompileTime}ms`);
    const snarkyHash = snarkyResult.verificationKey?.hash;
    console.log(`🔑 Snarky VK hash: ${snarkyHash ? (typeof snarkyHash === 'string' ? snarkyHash.slice(0, 20) + '...' : String(snarkyHash).slice(0, 20) + '...') : 'undefined'}`);

    // Extract Snarky constraint system JSON
    let snarkyConstraintJson = null;
    try {
      // Try to access Snarky constraint system JSON
      if (globalThis.__snarky?.Snarky?.constraintSystem?.toJson) {
        // Need to find the constraint system parameter - this might require investigation
        console.log('🔍 Snarky constraint system method found, but need constraint system parameter');
      }
      
      // Alternative: Try to extract from compilation result
      if (snarkyResult.constraintSystem) {
        snarkyConstraintJson = JSON.stringify(snarkyResult.constraintSystem, null, 2);
        console.log(`📊 Snarky constraint JSON length: ${snarkyConstraintJson.length} chars`);
      } else {
        console.log('❌ Snarky constraint system not accessible from compilation result');
      }
    } catch (error) {
      console.log(`❌ Snarky JSON extraction failed: ${error.message}`);
    }

    // Test with Sparky backend  
    console.log('\n🟠 SPARKY BACKEND ANALYSIS:');
    await switchBackend('sparky');
    
    const sparkyStart = Date.now();
    const sparkyResult = await MinimalProgram.compile();
    const sparkyCompileTime = Date.now() - sparkyStart;
    
    console.log(`✅ Sparky compilation: ${sparkyCompileTime}ms (${(snarkyCompileTime/sparkyCompileTime).toFixed(1)}x faster)`);
    const sparkyHash = sparkyResult.verificationKey?.hash;
    console.log(`🔑 Sparky VK hash: ${sparkyHash ? (typeof sparkyHash === 'string' ? sparkyHash.slice(0, 20) + '...' : String(sparkyHash).slice(0, 20) + '...') : 'undefined'}`);

    // Extract Sparky constraint system JSON
    let sparkyConstraintJson = null;
    try {
      // Use the working Sparky JSON extraction method
      if (globalThis.sparkyConstraintBridge?.getFullConstraintSystem) {
        const sparkySystem = globalThis.sparkyConstraintBridge.getFullConstraintSystem();
        sparkyConstraintJson = JSON.stringify(sparkySystem, null, 2);
        console.log(`📊 Sparky constraint JSON length: ${sparkyConstraintJson.length} chars`);
        
        // Analyze Sparky constraint structure
        console.log(`📈 Sparky gates count: ${sparkySystem.gates?.length || 0}`);
        console.log(`📈 Sparky public input size: ${sparkySystem.public_input_size || 0}`);
        
        if (sparkySystem.gates?.length > 0) {
          const firstGate = sparkySystem.gates[0];
          console.log(`🔍 First gate type: ${firstGate.typ}`);
          console.log(`🔍 First gate wires: ${firstGate.wires?.length || 0} wires`);
          console.log(`🔍 First gate coeffs: ${firstGate.coeffs?.length || 0} coefficients`);
          
          // Show wire format
          if (firstGate.wires?.length > 0) {
            console.log(`🔍 Wire format example: ${JSON.stringify(firstGate.wires[0])}`);
          }
          
          // Show coefficient format
          if (firstGate.coeffs?.length > 0) {
            console.log(`🔍 Coefficient format example: ${JSON.stringify(firstGate.coeffs[0])}`);
          }
        }
      } else {
        console.log('❌ Sparky constraint bridge not accessible');
      }
    } catch (error) {
      console.log(`❌ Sparky JSON extraction failed: ${error.message}`);
    }

    // VK Hash Comparison
    console.log('\n🔑 VERIFICATION KEY COMPARISON:');
    // Use the hashes we already extracted and converted to strings
    
    // Convert hashes to comparable strings
    const snarkyHashStr = snarkyHash ? (typeof snarkyHash === 'string' ? snarkyHash : String(snarkyHash)) : null;
    const sparkyHashStr = sparkyHash ? (typeof sparkyHash === 'string' ? sparkyHash : String(sparkyHash)) : null;
    
    if (snarkyHashStr && sparkyHashStr) {
      if (snarkyHashStr === sparkyHashStr) {
        console.log('✅ VK hashes MATCH - constraint systems are equivalent');
      } else {
        console.log('❌ VK hashes DIFFER - constraint systems are incompatible');
        console.log(`   Snarky: ${snarkyHashStr.slice(0, 40)}...`);
        console.log(`   Sparky: ${sparkyHashStr.slice(0, 40)}...`);
        
        // Find first difference
        for (let i = 0; i < Math.min(snarkyHashStr.length, sparkyHashStr.length); i++) {
          if (snarkyHashStr[i] !== sparkyHashStr[i]) {
            console.log(`   First difference at index ${i}: '${snarkyHashStr[i]}' vs '${sparkyHashStr[i]}'`);
            break;
          }
        }
      }
    } else {
      console.log('❌ Cannot compare VK hashes - one or both are missing');
      console.log(`   Snarky hash: ${snarkyHashStr ? 'present' : 'missing'}`);
      console.log(`   Sparky hash: ${sparkyHashStr ? 'present' : 'missing'}`);
    }

    // JSON Structure Comparison (if both available)
    if (snarkyConstraintJson && sparkyConstraintJson) {
      console.log('\n📋 CONSTRAINT SYSTEM JSON COMPARISON:');
      
      // Parse both JSONs for detailed comparison
      const snarkyData = JSON.parse(snarkyConstraintJson);
      const sparkyData = JSON.parse(sparkyConstraintJson);
      
      console.log(`📊 Snarky gates: ${snarkyData.gates?.length || 0}`);
      console.log(`📊 Sparky gates: ${sparkyData.gates?.length || 0}`);
      
      console.log(`📊 Snarky public_input_size: ${snarkyData.public_input_size || 0}`);
      console.log(`📊 Sparky public_input_size: ${sparkyData.public_input_size || 0}`);
      
      // Compare first gate structure if available
      if (snarkyData.gates?.length > 0 && sparkyData.gates?.length > 0) {
        const snarkyGate = snarkyData.gates[0];
        const sparkyGate = sparkyData.gates[0];
        
        console.log('\n🔍 FIRST GATE COMPARISON:');
        console.log(`   Gate type: Snarky='${snarkyGate.typ}' vs Sparky='${sparkyGate.typ}'`);
        console.log(`   Wire count: Snarky=${snarkyGate.wires?.length} vs Sparky=${sparkyGate.wires?.length}`);
        console.log(`   Coeff count: Snarky=${snarkyGate.coeffs?.length} vs Sparky=${sparkyGate.coeffs?.length}`);
        
        // Compare wire formats
        if (snarkyGate.wires?.length > 0 && sparkyGate.wires?.length > 0) {
          console.log(`   Wire[0]: Snarky=${JSON.stringify(snarkyGate.wires[0])} vs Sparky=${JSON.stringify(sparkyGate.wires[0])}`);
        }
        
        // Compare coefficient formats
        if (snarkyGate.coeffs?.length > 0 && sparkyGate.coeffs?.length > 0) {
          console.log(`   Coeff[0]: Snarky=${JSON.stringify(snarkyGate.coeffs[0])} vs Sparky=${JSON.stringify(sparkyGate.coeffs[0])}`);
        }
      }
    } else {
      console.log('\n❌ Cannot compare constraint JSONs - one or both unavailable');
      if (!snarkyConstraintJson) console.log('   Missing: Snarky constraint JSON');
      if (!sparkyConstraintJson) console.log('   Missing: Sparky constraint JSON');
    }

    // Test proof generation to trigger permutation error
    console.log('\n🧪 PROOF GENERATION TEST:');
    
    try {
      console.log('🔵 Testing Snarky proof generation...');
      await switchBackend('snarky');
      await MinimalProgram.compile(); // Re-compile for Snarky
      
      const snarkyProofStart = Date.now();
      const snarkyProof = await MinimalProgram.add(Field(1), Field(2));
      const snarkyProofTime = Date.now() - snarkyProofStart;
      console.log(`✅ Snarky proof generation: ${snarkyProofTime}ms - SUCCESS`);
      
    } catch (error) {
      console.log(`❌ Snarky proof generation failed: ${error.message}`);
    }
    
    try {
      console.log('🟠 Testing Sparky proof generation...');
      await switchBackend('sparky');
      await MinimalProgram.compile(); // Re-compile for Sparky
      
      const sparkyProofStart = Date.now();
      const sparkyProof = await MinimalProgram.add(Field(1), Field(2));
      const sparkyProofTime = Date.now() - sparkyProofStart;
      console.log(`✅ Sparky proof generation: ${sparkyProofTime}ms - SUCCESS`);
      
    } catch (error) {
      console.log(`❌ Sparky proof generation failed: ${error.message}`);
      console.log('🎯 EXPECTED: "the permutation was not constructed correctly: final value"');
    }

  } catch (error) {
    console.error(`❌ Analysis failed: ${error.message}`);
    console.error(error.stack);
  }
}

// Run the analysis
compareConstraintSystemJsons().catch(console.error);