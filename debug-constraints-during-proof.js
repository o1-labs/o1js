/**
 * CONSTRAINT EXTRACTION DURING PROOF GENERATION
 * 
 * Extracts constraints during actual ZkProgram method execution to compare
 * the real constraint systems that are causing permutation failures.
 */

import { Field, ZkProgram, Provable, switchBackend, getCurrentBackend } from './dist/node/index.js';

async function extractConstraintsDuringProof() {
  console.log('🔍 CONSTRAINT EXTRACTION DURING PROOF GENERATION');
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
          console.log('🔧 Inside ZkProgram method - about to perform addition');
          const result = publicInput.add(privateInput);
          console.log('🔧 Addition completed, returning result');
          return { publicOutput: result };
        },
      },
    },
  });

  try {
    console.log('\n📋 Testing constraint extraction during proof generation');
    
    // FIRST: Test direct constraint extraction using Provable.constraintSystem
    console.log('\n🧪 DIRECT CONSTRAINT SYSTEM ANALYSIS:');
    
    console.log('\n🔵 Snarky backend - Direct constraint analysis:');
    await switchBackend('snarky');
    
    const snarkyConstraints = await Provable.constraintSystem(() => {
      console.log('🔧 Inside Snarky constraint analysis');
      const a = Field(1);
      const b = Field(2); 
      const c = a.add(b);
      console.log('🔧 Snarky constraint generation completed');
      return c;
    });
    
    console.log(`📊 Snarky constraints: ${snarkyConstraints.gates?.length || 0} gates`);
    console.log(`📊 Snarky public input size: ${snarkyConstraints.publicInputSize || 0}`);
    console.log(`📊 Snarky constraint JSON length: ${JSON.stringify(snarkyConstraints).length} chars`);
    
    if (snarkyConstraints.gates?.length > 0) {
      console.log('🎉 Snarky generated constraints successfully!');
      const firstGate = snarkyConstraints.gates[0];
      console.log(`🔍 First gate type: ${firstGate.typ}`);
      console.log(`🔍 First gate wires: ${JSON.stringify(firstGate.wires)}`);
      console.log(`🔍 First gate coeffs: ${JSON.stringify(firstGate.coeffs)}`);
    }
    
    console.log('\n🟠 Sparky backend - Direct constraint analysis:');
    await switchBackend('sparky');
    
    const sparkyConstraints = await Provable.constraintSystem(() => {
      console.log('🔧 Inside Sparky constraint analysis');
      const a = Field(1);
      const b = Field(2);
      const c = a.add(b);
      console.log('🔧 Sparky constraint generation completed');
      return c;
    });
    
    console.log(`📊 Sparky constraints: ${sparkyConstraints.gates?.length || 0} gates`);
    console.log(`📊 Sparky public input size: ${sparkyConstraints.publicInputSize || 0}`);
    console.log(`📊 Sparky constraint JSON length: ${JSON.stringify(sparkyConstraints).length} chars`);
    
    if (sparkyConstraints.gates?.length > 0) {
      console.log('🎉 Sparky generated constraints successfully!');
      const firstGate = sparkyConstraints.gates[0];
      console.log(`🔍 First gate type: ${firstGate.typ}`);
      console.log(`🔍 First gate wires: ${JSON.stringify(firstGate.wires)}`);
      console.log(`🔍 First gate coeffs: ${JSON.stringify(firstGate.coeffs)}`);
      
      // CRITICAL: Compare constraint systems directly
      console.log('\n🔍 DIRECT CONSTRAINT COMPARISON:');
      if (snarkyConstraints.gates?.length > 0 && sparkyConstraints.gates?.length > 0) {
        const snarkyFirst = snarkyConstraints.gates[0];
        const sparkyFirst = sparkyConstraints.gates[0];
        
        console.log(`🔍 Gate types: Snarky='${snarkyFirst.typ}' vs Sparky='${sparkyFirst.typ}'`);
        console.log(`🔍 Wire counts: Snarky=${snarkyFirst.wires?.length} vs Sparky=${sparkyFirst.wires?.length}`);
        console.log(`🔍 Coeff counts: Snarky=${snarkyFirst.coeffs?.length} vs Sparky=${sparkyFirst.coeffs?.length}`);
        
        // Compare JSON representations
        const snarkyJson = JSON.stringify(snarkyConstraints, null, 2);
        const sparkyJson = JSON.stringify(sparkyConstraints, null, 2);
        
        if (snarkyJson === sparkyJson) {
          console.log('✅ CONSTRAINT SYSTEMS ARE IDENTICAL!');
        } else {
          console.log('❌ CONSTRAINT SYSTEMS DIFFER!');
          console.log(`📊 Snarky JSON length: ${snarkyJson.length}`);
          console.log(`📊 Sparky JSON length: ${sparkyJson.length}`);
          
          // Find first difference
          for (let i = 0; i < Math.min(snarkyJson.length, sparkyJson.length); i++) {
            if (snarkyJson[i] !== sparkyJson[i]) {
              console.log(`🔍 First difference at index ${i}: '${snarkyJson[i]}' vs '${sparkyJson[i]}'`);
              console.log(`🔍 Context: "${snarkyJson.slice(Math.max(0, i-20), i+20)}"`);
              break;
            }
          }
        }
      }
    } else {
      console.log('❌ Sparky failed to generate constraints directly');
    }
    
    // Test with Snarky backend
    console.log('\n🔵 SNARKY BACKEND - PROOF GENERATION CONSTRAINTS:');
    await switchBackend('snarky');
    console.log(`Current backend: ${getCurrentBackend()}`);
    
    // Compile first
    console.log('Compiling ZkProgram with Snarky...');
    const snarkyCompileStart = Date.now();
    await MinimalProgram.compile();
    const snarkyCompileTime = Date.now() - snarkyCompileStart;
    console.log(`✅ Snarky compilation: ${snarkyCompileTime}ms`);
    
    // Generate proof and capture constraints
    console.log('Generating proof with Snarky and capturing constraints...');
    const snarkyProofStart = Date.now();
    
    try {
      const snarkyProof = await MinimalProgram.add(Field(1), Field(2));
      const snarkyProofTime = Date.now() - snarkyProofStart;
      console.log(`✅ Snarky proof generation: ${snarkyProofTime}ms - SUCCESS`);
      
      // Try to extract Snarky constraints after successful proof
      console.log('🔍 Extracting Snarky constraints after proof generation...');
      
      // Check if there's a way to access the constraint system from the proof
      if (snarkyProof && typeof snarkyProof === 'object') {
        console.log(`📋 Snarky proof object keys: ${Object.keys(snarkyProof)}`);
      }
      
      // Try to access constraint system through global
      if (globalThis.__snarky?.Snarky?.constraintSystem) {
        console.log('🔍 Found Snarky constraint system object in global');
        const snarkyCS = globalThis.__snarky.Snarky.constraintSystem;
        console.log(`📋 Snarky CS methods: ${Object.keys(snarkyCS)}`);
        
        // Try different methods to get constraints
        if (snarkyCS.gates) {
          try {
            const gates = snarkyCS.gates();
            console.log(`📊 Snarky gates count: ${gates ? gates.length : 'undefined'}`);
          } catch (e) {
            console.log(`❌ Snarky gates() failed: ${e.message}`);
          }
        }
        
        if (snarkyCS.toJson) {
          try {
            // Try calling toJson with different parameters
            console.log('🔍 Trying Snarky toJson() with different parameters...');
            
            // Try with no parameters
            try {
              const json1 = snarkyCS.toJson();
              console.log(`📋 Snarky toJson() no params: ${typeof json1}, length: ${JSON.stringify(json1).length}`);
            } catch (e) {
              console.log(`❌ Snarky toJson() no params failed: ${e.message}`);
            }
            
            // Try with the constraint system itself
            try {
              const json2 = snarkyCS.toJson(snarkyCS);
              console.log(`📋 Snarky toJson(snarkyCS): ${typeof json2}, length: ${JSON.stringify(json2).length}`);
            } catch (e) {
              console.log(`❌ Snarky toJson(snarkyCS) failed: ${e.message}`);
            }
            
          } catch (e) {
            console.log(`❌ Snarky toJson failed: ${e.message}`);
          }
        }
      }
      
    } catch (error) {
      console.log(`❌ Snarky proof generation failed: ${error.message}`);
    }

    // Test with Sparky backend
    console.log('\n🟠 SPARKY BACKEND - PROOF GENERATION CONSTRAINTS:');
    await switchBackend('sparky');
    console.log(`Current backend: ${getCurrentBackend()}`);
    
    // Compile first
    console.log('Compiling ZkProgram with Sparky...');
    const sparkyCompileStart = Date.now();
    await MinimalProgram.compile();
    const sparkyCompileTime = Date.now() - sparkyCompileStart;
    console.log(`✅ Sparky compilation: ${sparkyCompileTime}ms`);
    
    // Generate proof and capture constraints
    console.log('Generating proof with Sparky and capturing constraints...');
    const sparkyProofStart = Date.now();
    
    try {
      const sparkyProof = await MinimalProgram.add(Field(1), Field(2));
      const sparkyProofTime = Date.now() - sparkyProofStart;
      console.log(`✅ Sparky proof generation: ${sparkyProofTime}ms - SUCCESS`);
      
      // Extract Sparky constraints after successful proof
      console.log('🔍 Extracting Sparky constraints after proof generation...');
      
      if (globalThis.sparkyConstraintBridge?.getFullConstraintSystem) {
        const sparkySystem = globalThis.sparkyConstraintBridge.getFullConstraintSystem();
        console.log(`📊 Sparky gates count: ${sparkySystem.gates?.length || 0}`);
        console.log(`📊 Sparky public input size: ${sparkySystem.public_input_size || 0}`);
        
        if (sparkySystem.gates?.length > 0) {
          console.log('🔍 Sparky constraint system has gates!');
          const firstGate = sparkySystem.gates[0];
          console.log(`🔍 First gate type: ${firstGate.typ}`);
          console.log(`🔍 First gate wires: ${JSON.stringify(firstGate.wires)}`);
          console.log(`🔍 First gate coeffs: ${JSON.stringify(firstGate.coeffs)}`);
        } else {
          console.log('❌ Sparky constraint system still empty after proof generation');
        }
      }
      
    } catch (error) {
      console.log(`❌ Sparky proof generation failed: ${error.message}`);
      console.log('🎯 This is the expected permutation error we need to fix');
      
      // Even though proof failed, try to extract what constraints we have
      console.log('🔍 Extracting Sparky constraints after proof failure...');
      
      if (globalThis.sparkyConstraintBridge?.getFullConstraintSystem) {
        const sparkySystem = globalThis.sparkyConstraintBridge.getFullConstraintSystem();
        console.log(`📊 Sparky gates count (after failure): ${sparkySystem.gates?.length || 0}`);
        console.log(`📊 Sparky public input size (after failure): ${sparkySystem.public_input_size || 0}`);
        
        if (sparkySystem.gates?.length > 0) {
          console.log('🔍 Sparky has constraints even after failure!');
          console.log(`📋 Full Sparky constraint JSON: ${JSON.stringify(sparkySystem, null, 2)}`);
        } else {
          console.log('❌ Sparky still has no constraints - constraint accumulation problem confirmed');
        }
      }
    }

    // Try to use Provable.runAndCheck to see if we can capture constraints that way
    console.log('\n🧪 TESTING PROVABLE.RUNANDCHECK CONSTRAINT CAPTURE:');
    
    console.log('\n🔵 Snarky Provable.runAndCheck:');
    await switchBackend('snarky');
    
    try {
      let snarkyRunCheckResult;
      Provable.runAndCheck(() => {
        console.log('🔧 Inside Snarky runAndCheck');
        const a = Field(1);
        const b = Field(2);
        const c = a.add(b);
        console.log('🔧 Snarky addition completed');
        snarkyRunCheckResult = c;
      });
      console.log(`✅ Snarky runAndCheck successful: ${snarkyRunCheckResult}`);
      
      // Try to access constraints after runAndCheck
      if (globalThis.__snarky?.Snarky?.constraintSystem) {
        const snarkyCS = globalThis.__snarky.Snarky.constraintSystem;
        if (snarkyCS.gates) {
          try {
            const gates = snarkyCS.gates();
            console.log(`📊 Snarky gates after runAndCheck: ${gates ? gates.length : 'undefined'}`);
          } catch (e) {
            console.log(`❌ Snarky gates() after runAndCheck failed: ${e.message}`);
          }
        }
      }
      
    } catch (error) {
      console.log(`❌ Snarky runAndCheck failed: ${error.message}`);
    }
    
    console.log('\n🟠 Sparky Provable.runAndCheck:');
    await switchBackend('sparky');
    
    try {
      let sparkyRunCheckResult;
      Provable.runAndCheck(() => {
        console.log('🔧 Inside Sparky runAndCheck');
        const a = Field(1);
        const b = Field(2);
        const c = a.add(b);
        console.log('🔧 Sparky addition completed');
        sparkyRunCheckResult = c;
      });
      console.log(`✅ Sparky runAndCheck successful: ${sparkyRunCheckResult}`);
      
      // Try to access constraints after runAndCheck
      if (globalThis.sparkyConstraintBridge?.getFullConstraintSystem) {
        const sparkySystem = globalThis.sparkyConstraintBridge.getFullConstraintSystem();
        console.log(`📊 Sparky gates after runAndCheck: ${sparkySystem.gates?.length || 0}`);
        
        if (sparkySystem.gates?.length > 0) {
          console.log('🎉 SUCCESS: Sparky runAndCheck generated constraints!');
          console.log(`📋 Sparky runAndCheck constraint JSON: ${JSON.stringify(sparkySystem, null, 2)}`);
        }
      }
      
    } catch (error) {
      console.log(`❌ Sparky runAndCheck failed: ${error.message}`);
    }

  } catch (error) {
    console.error(`❌ Analysis failed: ${error.message}`);
    console.error(error.stack);
  }
}

// Run the analysis
extractConstraintsDuringProof().catch(console.error);