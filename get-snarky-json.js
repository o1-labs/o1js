#!/usr/bin/env node

/**
 * GET SNARKY CONSTRAINT SYSTEM JSON
 * 
 * Uses the discovered constraintSystem.toJson() method to get actual JSON.
 */

import { switchBackend, Field, ZkProgram } from './dist/node/index.js';
import fs from 'fs';

function createTestProgram() {
  return ZkProgram({
    name: 'GetSnarkyJSON',
    publicInput: Field,
    publicOutput: Field,
    methods: {
      compute: {
        privateInputs: [Field],
        async method(publicInput, privateInput) {
          return { publicOutput: publicInput.mul(privateInput) };
        },
      },
    },
  });
}

async function getSnarkyConstraintJSON() {
  console.log(`🔍 GETTING SNARKY CONSTRAINT SYSTEM JSON`);
  console.log(`═══════════════════════════════════════════════════════════════`);
  
  try {
    await switchBackend('snarky');
    console.log(`✅ Switched to snarky backend`);
    
    const program = createTestProgram();
    const result = await program.compile();
    console.log(`✅ Compilation completed`);
    
    // Access the constraint system
    const snarky = globalThis.__snarky.Snarky;
    const constraintSystem = snarky.constraintSystem;
    
    console.log(`📊 Found constraintSystem with methods:`, Object.keys(constraintSystem));
    
    // The toJson function needs a constraint system parameter
    // Let's try to get the constraint system from the compilation result
    if (result.analyzeMethods?.compute) {
      console.log(`🎯 Trying with analyzeMethods.compute as constraint system...`);
      
      const cs = result.analyzeMethods.compute;
      console.log(`📊 CS object keys:`, Object.keys(cs));
      
      try {
        console.log(`🔧 Calling constraintSystem.toJson(cs)...`);
        const jsonResult = constraintSystem.toJson(cs);
        
        console.log(`📄 SNARKY CONSTRAINT SYSTEM JSON:`);
        console.log(`═══════════════════════════════════════════════════════════════`);
        console.log(jsonResult);
        console.log(`═══════════════════════════════════════════════════════════════`);
        
        return {
          backend: 'snarky',
          raw: jsonResult,
          parsed: JSON.parse(jsonResult),
          source: 'constraintSystem.toJson(analyzeMethods.compute)'
        };
        
      } catch (e) {
        console.error(`❌ Failed to call toJson with analyzeMethods.compute: ${e.message}`);
      }
    }
    
    // Try other approaches
    console.log(`🔍 Trying other constraint system access methods...`);
    
    // Try calling rows() and digest() methods
    if (result.analyzeMethods?.compute) {
      const cs = result.analyzeMethods.compute;
      
      try {
        console.log(`🔧 Calling constraintSystem.rows(cs)...`);
        const rows = constraintSystem.rows(cs);
        console.log(`   Rows: ${rows}`);
      } catch (e) {
        console.log(`   ❌ rows() failed: ${e.message}`);
      }
      
      try {
        console.log(`🔧 Calling constraintSystem.digest(cs)...`);
        const digest = constraintSystem.digest(cs);
        console.log(`   Digest: ${digest}`);
      } catch (e) {
        console.log(`   ❌ digest() failed: ${e.message}`);
      }
    }
    
    // Try alternative approaches - maybe we need to create constraints first
    console.log(`🧪 Trying manual constraint creation...`);
    
    // Create some constraints manually
    const x = Field(2);
    const y = Field(3);
    const z = x.mul(y);
    
    console.log(`📊 Created constraints with result: ${z}`);
    
    // Now try again
    if (result.analyzeMethods?.compute) {
      const cs = result.analyzeMethods.compute;
      
      try {
        console.log(`🔧 Calling constraintSystem.toJson(cs) after constraint creation...`);
        const jsonResult = constraintSystem.toJson(cs);
        
        console.log(`📄 SNARKY CONSTRAINT SYSTEM JSON (after constraints):`);
        console.log(`═══════════════════════════════════════════════════════════════`);
        console.log(jsonResult);
        console.log(`═══════════════════════════════════════════════════════════════`);
        
        return {
          backend: 'snarky',
          raw: jsonResult,
          parsed: JSON.parse(jsonResult),
          source: 'constraintSystem.toJson(analyzeMethods.compute) after manual constraints'
        };
        
      } catch (e) {
        console.error(`❌ Failed to call toJson after constraint creation: ${e.message}`);
      }
    }
    
    return null;
    
  } catch (error) {
    console.error(`❌ Failed to get Snarky JSON: ${error.message}`);
    return null;
  }
}

async function getSparkyConstraintJSON() {
  console.log(`\n🔍 GETTING SPARKY CONSTRAINT SYSTEM JSON`);
  console.log(`═══════════════════════════════════════════════════════════════`);
  
  try {
    await switchBackend('sparky');
    console.log(`✅ Switched to sparky backend`);
    
    const program = createTestProgram();
    await program.compile();
    console.log(`✅ Compilation completed`);
    
    // Get Sparky constraint system
    const constraintSystem = globalThis.sparkyConstraintBridge.getFullConstraintSystem();
    
    const sparkyJSON = {
      gates: constraintSystem.gates || [],
      public_input_size: constraintSystem.publicInputSize || 0
    };
    
    console.log(`📄 SPARKY CONSTRAINT SYSTEM JSON:`);
    console.log(`═══════════════════════════════════════════════════════════════`);
    console.log(JSON.stringify(sparkyJSON, null, 2));
    console.log(`═══════════════════════════════════════════════════════════════`);
    
    return {
      backend: 'sparky',
      raw: JSON.stringify(sparkyJSON),
      parsed: sparkyJSON,
      source: 'sparkyConstraintBridge.getFullConstraintSystem()'
    };
    
  } catch (error) {
    console.error(`❌ Failed to get Sparky JSON: ${error.message}`);
    return null;
  }
}

function compareConstraintJSON(snarkyData, sparkyData) {
  console.log(`\n🔬 COMPARING CONSTRAINT SYSTEM JSON`);
  console.log(`═══════════════════════════════════════════════════════════════`);
  
  if (!snarkyData || !sparkyData) {
    console.log(`❌ Cannot compare - missing data:`);
    console.log(`   Snarky: ${snarkyData ? 'Present' : 'Missing'}`);
    console.log(`   Sparky: ${sparkyData ? 'Present' : 'Missing'}`);
    return;
  }
  
  // Save to files
  fs.writeFileSync('snarky-final.json', snarkyData.raw);
  fs.writeFileSync('sparky-final.json', sparkyData.raw);
  console.log(`💾 JSON saved to snarky-final.json and sparky-final.json`);
  
  const snarky = snarkyData.parsed;
  const sparky = sparkyData.parsed;
  
  console.log(`📊 Basic Comparison:`);
  console.log(`   Snarky gates: ${snarky.gates?.length || 'N/A'}`);
  console.log(`   Sparky gates: ${sparky.gates?.length || 'N/A'}`);
  console.log(`   Gate count match: ${(snarky.gates?.length === sparky.gates?.length) ? '✅' : '❌'}`);
  
  console.log(`   Snarky public_input_size: ${snarky.public_input_size || 'N/A'}`);
  console.log(`   Sparky public_input_size: ${sparky.public_input_size || 'N/A'}`);
  console.log(`   Public input match: ${(snarky.public_input_size === sparky.public_input_size) ? '✅' : '❌'}`);
  
  // Compare first gate in detail
  if (snarky.gates?.[0] && sparky.gates?.[0]) {
    console.log(`\n🔍 First Gate Comparison:`);
    const sGate = snarky.gates[0];
    const pGate = sparky.gates[0];
    
    console.log(`   Type: Snarky='${sGate.typ}' vs Sparky='${pGate.typ}' ${(sGate.typ === pGate.typ) ? '✅' : '❌'}`);
    
    console.log(`   Wires:`);
    console.log(`     Snarky: ${JSON.stringify(sGate.wires)}`);
    console.log(`     Sparky: ${JSON.stringify(pGate.wires)}`);
    console.log(`     Match: ${(JSON.stringify(sGate.wires) === JSON.stringify(pGate.wires)) ? '✅' : '❌'}`);
    
    console.log(`   Coefficients:`);
    console.log(`     Snarky: ${JSON.stringify(sGate.coeffs)}`);
    console.log(`     Sparky: ${JSON.stringify(pGate.coeffs)}`);
    console.log(`     Match: ${(JSON.stringify(sGate.coeffs) === JSON.stringify(pGate.coeffs)) ? '✅' : '❌'}`);
  }
  
  // Character-by-character comparison
  if (snarkyData.raw !== sparkyData.raw) {
    console.log(`\n📝 String Comparison:`);
    console.log(`   Snarky length: ${snarkyData.raw.length}`);
    console.log(`   Sparky length: ${sparkyData.raw.length}`);
    
    const minLength = Math.min(snarkyData.raw.length, sparkyData.raw.length);
    for (let i = 0; i < minLength; i++) {
      if (snarkyData.raw[i] !== sparkyData.raw[i]) {
        console.log(`   First difference at index ${i}:`);
        console.log(`     Snarky[${i}]: '${snarkyData.raw[i]}'`);
        console.log(`     Sparky[${i}]: '${sparkyData.raw[i]}'`);
        break;
      }
    }
  } else {
    console.log(`   ✅ JSON strings are identical!`);
  }
}

async function main() {
  console.log(`🎯 CONSTRAINT SYSTEM JSON EXTRACTION AND COMPARISON`);
  console.log(`═══════════════════════════════════════════════════════════════`);
  
  try {
    const snarkyData = await getSnarkyConstraintJSON();
    const sparkyData = await getSparkyConstraintJSON();
    
    compareConstraintJSON(snarkyData, sparkyData);
    
    console.log(`\n🎯 EXTRACTION COMPLETE`);
    console.log(`═══════════════════════════════════════════════════════════════`);
    
  } catch (error) {
    console.error(`❌ Extraction failed: ${error}`);
  }
}

main().catch(console.error);