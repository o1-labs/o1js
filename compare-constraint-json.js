#!/usr/bin/env node

/**
 * COMPARE CONSTRAINT SYSTEM JSON
 * 
 * Gets the actual constraint system JSON from both backends and compares them.
 */

import { switchBackend, Field, ZkProgram } from './dist/node/index.js';
import fs from 'fs';

// Create test program
function createTestProgram() {
  return ZkProgram({
    name: 'CompareJSON',
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

// Function to get constraint system JSON from compilation result
async function getConstraintSystemJSON(backend) {
  console.log(`\n🔍 GETTING CONSTRAINT SYSTEM JSON FOR ${backend.toUpperCase()}`);
  console.log(`═══════════════════════════════════════════════════════════════`);
  
  try {
    await switchBackend(backend);
    console.log(`✅ Switched to ${backend} backend`);
    
    const program = createTestProgram();
    const result = await program.compile();
    console.log(`✅ Compilation completed`);
    
    let constraintJSON = null;
    
    if (backend === 'sparky') {
      // Get constraint system from sparkyConstraintBridge
      if (globalThis.sparkyConstraintBridge) {
        const constraintSystem = globalThis.sparkyConstraintBridge.getFullConstraintSystem();
        console.log(`📊 Sparky constraint system structure:`, constraintSystem);
        
        constraintJSON = {
          gates: constraintSystem.gates || [],
          public_input_size: constraintSystem.publicInputSize || 0
        };
        
        console.log(`📄 SPARKY CONSTRAINT SYSTEM JSON:`);
        console.log(`═══════════════════════════════════════════════════════════════`);
        console.log(JSON.stringify(constraintJSON, null, 2));
        console.log(`═══════════════════════════════════════════════════════════════`);
      }
    } else if (backend === 'snarky') {
      // For Snarky, we need to access the constraint system differently
      // Try to access through the compilation result
      if (result.analyzeMethods?.compute) {
        const analyzeResult = result.analyzeMethods.compute;
        console.log(`📊 Snarky analyzeMethods.compute:`, analyzeResult);
        
        // Check if we can access gates through the analyze result
        if (analyzeResult.gates) {
          constraintJSON = {
            gates: analyzeResult.gates,
            public_input_size: analyzeResult.publicInputSize || 0
          };
          
          console.log(`📄 SNARKY CONSTRAINT SYSTEM JSON:`);
          console.log(`═══════════════════════════════════════════════════════════════`);
          console.log(JSON.stringify(constraintJSON, null, 2));
          console.log(`═══════════════════════════════════════════════════════════════`);
        } else {
          console.log(`❌ No gates found in Snarky analyze result`);
          console.log(`   Available keys:`, Object.keys(analyzeResult));
          
          // Try to call summary or print methods if they exist
          if (typeof analyzeResult.summary === 'function') {
            console.log(`🔍 Calling analyzeResult.summary():`);
            try {
              const summary = analyzeResult.summary();
              console.log(summary);
            } catch (e) {
              console.log(`❌ Failed to call summary(): ${e.message}`);
            }
          }
          
          if (typeof analyzeResult.print === 'function') {
            console.log(`🔍 Calling analyzeResult.print():`);
            try {
              const printed = analyzeResult.print();
              console.log(printed);
            } catch (e) {
              console.log(`❌ Failed to call print(): ${e.message}`);
            }
          }
        }
      }
      
      // Also try accessing global Snarky functions
      console.log(`🔍 Looking for global Snarky constraint access...`);
      
      // Check for potential global functions
      const globalFuncs = Object.keys(globalThis).filter(key => 
        key.toLowerCase().includes('constraint') || 
        key.toLowerCase().includes('snarky') ||
        key.toLowerCase().includes('gate')
      );
      
      if (globalFuncs.length > 0) {
        console.log(`📊 Found potential constraint-related globals: [${globalFuncs.join(', ')}]`);
        
        for (const funcName of globalFuncs) {
          try {
            const func = globalThis[funcName];
            if (typeof func === 'function') {
              console.log(`🔍 Trying ${funcName}()...`);
              const result = func();
              console.log(`   Result:`, result);
            }
          } catch (e) {
            console.log(`   ❌ Failed to call ${funcName}(): ${e.message}`);
          }
        }
      }
    }
    
    return {
      backend,
      constraintJSON,
      vkHash: result.verificationKey?.hash?.toString(),
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    console.error(`❌ Failed to get constraint system for ${backend}: ${error.message}`);
    return null;
  }
}

// Function to save and compare JSON
function saveAndCompareJSON(snarkyData, sparkyData) {
  console.log(`\n💾 SAVING AND COMPARING JSON`);
  console.log(`═══════════════════════════════════════════════════════════════`);
  
  // Save JSON files
  if (snarkyData?.constraintJSON) {
    const snarkyJSON = JSON.stringify(snarkyData.constraintJSON, null, 2);
    fs.writeFileSync('snarky-constraints.json', snarkyJSON);
    console.log(`✅ Snarky JSON saved to snarky-constraints.json (${snarkyJSON.length} chars)`);
  }
  
  if (sparkyData?.constraintJSON) {
    const sparkyJSON = JSON.stringify(sparkyData.constraintJSON, null, 2);
    fs.writeFileSync('sparky-constraints.json', sparkyJSON);
    console.log(`✅ Sparky JSON saved to sparky-constraints.json (${sparkyJSON.length} chars)`);
  }
  
  // Compare if we have both
  if (snarkyData?.constraintJSON && sparkyData?.constraintJSON) {
    console.log(`\n🔬 DETAILED COMPARISON`);
    console.log(`═══════════════════════════════════════════════════════════════`);
    
    const snarky = snarkyData.constraintJSON;
    const sparky = sparkyData.constraintJSON;
    
    console.log(`📊 Basic Structure:`);
    console.log(`   Snarky gates: ${snarky.gates?.length || 'N/A'}`);
    console.log(`   Sparky gates: ${sparky.gates?.length || 'N/A'}`);
    console.log(`   Gate count match: ${(snarky.gates?.length === sparky.gates?.length) ? '✅' : '❌'}`);
    
    console.log(`   Snarky public_input_size: ${snarky.public_input_size}`);
    console.log(`   Sparky public_input_size: ${sparky.public_input_size}`);
    console.log(`   Public input match: ${(snarky.public_input_size === sparky.public_input_size) ? '✅' : '❌'}`);
    
    console.log(`\n🔑 VK Hashes:`);
    console.log(`   Snarky VK: ${snarkyData.vkHash}`);
    console.log(`   Sparky VK: ${sparkyData.vkHash}`);
    console.log(`   VK match: ${(snarkyData.vkHash === sparkyData.vkHash) ? '✅' : '❌'}`);
    
    // Compare gates in detail
    if (snarky.gates && sparky.gates) {
      console.log(`\n🔍 Gate-by-Gate Comparison:`);
      const maxGates = Math.max(snarky.gates.length, sparky.gates.length);
      
      for (let i = 0; i < Math.min(3, maxGates); i++) {
        const snarkyGate = snarky.gates[i];
        const sparkyGate = sparky.gates[i];
        
        console.log(`\n   Gate ${i}:`);
        if (snarkyGate && sparkyGate) {
          console.log(`     Type: Snarky='${snarkyGate.typ}' vs Sparky='${sparkyGate.typ}' ${(snarkyGate.typ === sparkyGate.typ) ? '✅' : '❌'}`);
          
          // Compare wires
          console.log(`     Wires:`);
          console.log(`       Snarky: ${JSON.stringify(snarkyGate.wires)}`);
          console.log(`       Sparky: ${JSON.stringify(sparkyGate.wires)}`);
          console.log(`       Match: ${(JSON.stringify(snarkyGate.wires) === JSON.stringify(sparkyGate.wires)) ? '✅' : '❌'}`);
          
          // Compare coefficients
          console.log(`     Coefficients:`);
          console.log(`       Snarky: ${JSON.stringify(snarkyGate.coeffs)}`);
          console.log(`       Sparky: ${JSON.stringify(sparkyGate.coeffs)}`);
          console.log(`       Match: ${(JSON.stringify(snarkyGate.coeffs) === JSON.stringify(sparkyGate.coeffs)) ? '✅' : '❌'}`);
        } else {
          console.log(`     ❌ Gate ${i} missing in ${snarkyGate ? 'Sparky' : 'Snarky'}`);
        }
      }
    }
  } else {
    console.log(`❌ Cannot compare - missing constraint JSON:`);
    console.log(`   Snarky: ${snarkyData?.constraintJSON ? 'Present' : 'Missing'}`);
    console.log(`   Sparky: ${sparkyData?.constraintJSON ? 'Present' : 'Missing'}`);
  }
}

// Main function
async function main() {
  console.log(`🎯 CONSTRAINT SYSTEM JSON COMPARISON`);
  console.log(`═══════════════════════════════════════════════════════════════`);
  
  try {
    // Get constraint system JSON from both backends
    const snarkyData = await getConstraintSystemJSON('snarky');
    const sparkyData = await getConstraintSystemJSON('sparky');
    
    // Save and compare
    saveAndCompareJSON(snarkyData, sparkyData);
    
    console.log(`\n🎯 COMPARISON COMPLETE`);
    console.log(`═══════════════════════════════════════════════════════════════`);
    
  } catch (error) {
    console.error(`❌ Comparison failed: ${error}`);
  }
}

// Run the comparison
main().catch(console.error);