#!/usr/bin/env node

/**
 * INTERNAL CONSTRAINT SYSTEM JSON EXTRACTOR
 * 
 * Directly accesses internal constraint system generation to extract raw JSON
 * by calling the toJson methods and constraint system APIs directly.
 */

import { switchBackend, Field, ZkProgram, isReady } from './dist/node/index.js';
import fs from 'fs';

// Wait for everything to be ready
await isReady;

// Function to create a simple test that generates constraints
function createSimpleProgram() {
  return ZkProgram({
    name: 'InternalJSON',
    publicInput: Field,
    publicOutput: Field,
    methods: {
      compute: {
        privateInputs: [Field],
        async method(publicInput, privateInput) {
          // Force constraint generation with multiplication
          const result = publicInput.mul(privateInput);
          return { publicOutput: result };
        },
      },
    },
  });
}

// Function to directly extract constraint system JSON from internal APIs
async function extractInternalJSON(backend) {
  console.log(`\n🔍 EXTRACTING INTERNAL JSON FOR ${backend.toUpperCase()}`);
  console.log(`═══════════════════════════════════════════════════════════════`);
  
  try {
    // Switch backend
    await switchBackend(backend);
    console.log(`✅ Switched to ${backend} backend`);
    
    // Create and compile program
    const program = createSimpleProgram();
    console.log(`📋 Starting compilation...`);
    
    // Access global objects to get constraint system
    const globalObj = globalThis;
    console.log(`🔍 Checking for global constraint system objects...`);
    
    // Compile the program
    const compilationResult = await program.compile();
    console.log(`✅ Compilation completed`);
    
    // Try to access constraint system through different paths
    let constraintSystemJSON = null;
    
    // Method 1: Through compilation result
    if (compilationResult.analyzeMethods?.compute) {
      console.log(`📊 Found analyzeMethods.compute`);
      const analyze = compilationResult.analyzeMethods.compute;
      console.log(`   Rows: ${analyze.rows}`);
      console.log(`   Gates: ${analyze.gates?.length || 'unknown'}`);
      
      // Try to call toJson if available
      if (typeof analyze.toJson === 'function') {
        try {
          constraintSystemJSON = analyze.toJson();
          console.log(`✅ Got JSON from analyzeMethods.compute.toJson()`);
        } catch (e) {
          console.log(`❌ Failed to call toJson(): ${e.message}`);
        }
      }
      
      // Try to access gates directly
      if (analyze.gates && analyze.gates.length > 0) {
        console.log(`🔍 Analyzing gates directly:`);
        for (let i = 0; i < Math.min(3, analyze.gates.length); i++) {
          const gate = analyze.gates[i];
          console.log(`   Gate ${i}:`, JSON.stringify(gate, null, 2));
        }
      }
    }
    
    // Method 2: Access global WASM objects
    if (globalObj.sparky_wasm || globalObj.snarky) {
      console.log(`🔍 Found global WASM objects`);
      
      // Try to access constraint system directly from WASM
      try {
        if (backend === 'sparky' && globalObj.sparky_wasm) {
          console.log(`🔧 Accessing Sparky WASM constraint system...`);
          // Access internal Sparky constraint system
        } else if (backend === 'snarky' && globalObj.snarky) {
          console.log(`🔧 Accessing Snarky constraint system...`);
          // Access internal Snarky constraint system
        }
      } catch (e) {
        console.log(`❌ Failed to access WASM constraint system: ${e.message}`);
      }
    }
    
    // Method 3: Try to intercept during proof generation
    console.log(`🧪 Attempting proof generation to trigger constraint system export...`);
    try {
      // Create simple test inputs
      const publicInput = Field(2);
      const privateInput = Field(3);
      
      // This should trigger the constraint system to be serialized
      console.log(`🔧 Generating proof (this may fail but should show constraint system)...`);
      const proof = await program.compute(publicInput, privateInput);
      console.log(`✅ Proof generation succeeded`);
    } catch (e) {
      console.log(`❌ Proof generation failed (expected): ${e.message}`);
      // This is expected - we're looking for the constraint system data in the logs
    }
    
    // Method 4: Check if we can access the constraint system through the module
    try {
      const module = await import('./dist/node/index.js');
      if (module.Circuit || module.Pickles) {
        console.log(`🔍 Found Circuit/Pickles modules`);
        // Try to access constraint system through these
      }
    } catch (e) {
      console.log(`❌ Failed to access modules: ${e.message}`);
    }
    
    return {
      backend,
      constraintSystemJSON,
      compilationResult,
      vkHash: compilationResult.verificationKey?.hash?.toString()
    };
    
  } catch (error) {
    console.error(`❌ Failed to extract internal JSON for ${backend}:`, error.message);
    return null;
  }
}

// Function to parse debug output for constraint system data
function parseDebugOutput() {
  console.log(`\n🔍 PARSING DEBUG OUTPUT FOR CONSTRAINT SYSTEM DATA`);
  console.log(`═══════════════════════════════════════════════════════════════`);
  
  // Create a simple logger that captures constraint system information
  const originalLog = console.log;
  let capturedConstraintData = {};
  
  console.log = (...args) => {
    const message = args.join(' ');
    
    // Look for constraint system data patterns
    if (message.includes('OCaml CONSTRAINT BRIDGE:')) {
      const match = message.match(/gates=(\d+), publicInputSize=(\d+), constraints=(\d+)/);
      if (match) {
        capturedConstraintData.gates = parseInt(match[1]);
        capturedConstraintData.publicInputSize = parseInt(match[2]);
        capturedConstraintData.constraints = parseInt(match[3]);
        originalLog(`📊 Captured constraint data: ${JSON.stringify(capturedConstraintData)}`);
      }
    }
    
    // Look for JSON-like structures in the output
    if (message.includes('{') && message.includes('}')) {
      try {
        // Try to extract JSON from the message
        const jsonMatch = message.match(/(\{.*\})/);
        if (jsonMatch) {
          const possibleJSON = jsonMatch[1];
          try {
            const parsed = JSON.parse(possibleJSON);
            if (parsed.gates || parsed.coeffs || parsed.wires) {
              originalLog(`📊 Found JSON-like structure: ${possibleJSON}`);
            }
          } catch (e) {
            // Not valid JSON, ignore
          }
        }
      } catch (e) {
        // Ignore parsing errors
      }
    }
    
    // Call original console.log
    originalLog.apply(console, args);
  };
  
  return capturedConstraintData;
}

// Function to create a minimal constraint and examine its structure
async function examineConstraintStructure(backend) {
  console.log(`\n🔬 EXAMINING CONSTRAINT STRUCTURE FOR ${backend.toUpperCase()}`);
  console.log(`═══════════════════════════════════════════════════════════════`);
  
  await switchBackend(backend);
  
  // Create the simplest possible constraint
  const x = Field(2);
  const y = Field(3);
  
  console.log(`🧮 Creating simple constraint: x * y`);
  
  // Force constraint generation
  const result = x.mul(y);
  console.log(`✅ Constraint created, result: ${result}`);
  
  // The constraint should now be in the system
  console.log(`🔍 Constraint should be captured in debug output above`);
}

// Main function
async function main() {
  console.log(`🔍 INTERNAL CONSTRAINT SYSTEM JSON EXTRACTOR`);
  console.log(`═══════════════════════════════════════════════════════════════`);
  
  // Setup debug output parsing
  const capturedData = parseDebugOutput();
  
  try {
    // Extract from both backends
    console.log(`\n📋 EXTRACTING FROM BOTH BACKENDS`);
    
    const snarkyData = await extractInternalJSON('snarky');
    const sparkyData = await extractInternalJSON('sparky');
    
    // Also examine constraint structures directly
    await examineConstraintStructure('snarky');
    await examineConstraintStructure('sparky');
    
    console.log(`\n🎯 EXTRACTION COMPLETE`);
    console.log(`═══════════════════════════════════════════════════════════════`);
    console.log(`Captured constraint data:`, capturedData);
    
    if (snarkyData?.constraintSystemJSON || sparkyData?.constraintSystemJSON) {
      console.log(`✅ Successfully extracted JSON constraint system data`);
      
      if (snarkyData?.constraintSystemJSON) {
        fs.writeFileSync('snarky-internal.json', JSON.stringify(snarkyData.constraintSystemJSON, null, 2));
        console.log(`💾 Snarky JSON saved to snarky-internal.json`);
      }
      
      if (sparkyData?.constraintSystemJSON) {
        fs.writeFileSync('sparky-internal.json', JSON.stringify(sparkyData.constraintSystemJSON, null, 2));
        console.log(`💾 Sparky JSON saved to sparky-internal.json`);
      }
    } else {
      console.log(`❌ No JSON constraint system data extracted`);
      console.log(`💡 The constraint system data may be generated at a lower level`);
      console.log(`💡 Check the debug output above for constraint system information`);
    }
    
  } catch (error) {
    console.error(`❌ Extraction failed:`, error);
  }
}

// Run the analysis
main().catch(console.error);