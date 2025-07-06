#!/usr/bin/env node

/**
 * GET CONSTRAINT SYSTEM DIRECTLY
 * 
 * Calls the constraint system getter methods directly to access the JSON.
 */

import { switchBackend, Field, ZkProgram } from './dist/node/index.js';
import fs from 'fs';

// Create test program
function createTestProgram() {
  return ZkProgram({
    name: 'GetConstraintSystem',
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

// Function to get constraint system data
async function getConstraintSystemData(backend) {
  console.log(`\n🔍 GETTING CONSTRAINT SYSTEM FOR ${backend.toUpperCase()}`);
  console.log(`═══════════════════════════════════════════════════════════════`);
  
  try {
    await switchBackend(backend);
    console.log(`✅ Switched to ${backend} backend`);
    
    const program = createTestProgram();
    await program.compile();
    console.log(`✅ Compilation completed`);
    
    let constraintSystemData = null;
    
    if (backend === 'sparky') {
      // Try to get constraint system from sparkyConstraintBridge
      if (typeof globalThis.sparkyConstraintBridge !== 'undefined') {
        console.log(`🔍 Found sparkyConstraintBridge, trying getFullConstraintSystem()...`);
        
        try {
          const fullSystem = globalThis.sparkyConstraintBridge.getFullConstraintSystem();
          console.log(`📊 getFullConstraintSystem() result:`, fullSystem);
          
          if (fullSystem && typeof fullSystem.toJson === 'function') {
            console.log(`🎯 Found toJson method on constraint system, calling it...`);
            const jsonResult = fullSystem.toJson();
            console.log(`📄 SPARKY CONSTRAINT SYSTEM JSON:`);
            console.log(`═══════════════════════════════════════════════════════════════`);
            console.log(jsonResult);
            console.log(`═══════════════════════════════════════════════════════════════`);
            
            constraintSystemData = {
              backend: 'sparky',
              raw: jsonResult,
              source: 'getFullConstraintSystem().toJson()'
            };
          } else if (fullSystem) {
            console.log(`📊 Examining full constraint system structure...`);
            console.log(`   Type: ${typeof fullSystem}`);
            console.log(`   Keys: [${Object.keys(fullSystem).join(', ')}]`);
            
            // Try calling other methods
            if (typeof fullSystem.rows === 'function') {
              console.log(`   rows(): ${fullSystem.rows()}`);
            }
            if (typeof fullSystem.digest === 'function') {
              console.log(`   digest(): ${fullSystem.digest()}`);
            }
          }
        } catch (e) {
          console.error(`❌ Failed to get full constraint system: ${e.message}`);
        }
        
        // Also try getAccumulatedConstraints
        try {
          console.log(`🔍 Trying getAccumulatedConstraints()...`);
          const accumulated = globalThis.sparkyConstraintBridge.getAccumulatedConstraints();
          console.log(`📊 getAccumulatedConstraints() result:`, accumulated);
        } catch (e) {
          console.error(`❌ Failed to get accumulated constraints: ${e.message}`);
        }
      }
    } else if (backend === 'snarky') {
      // Try to access Snarky constraint system
      console.log(`🔍 Looking for Snarky constraint system access...`);
      
      // Check if there's a global Snarky object
      if (typeof globalThis.Snarky !== 'undefined') {
        console.log(`📊 Found global Snarky object`);
        
        if (typeof globalThis.Snarky.getConstraintSystem === 'function') {
          try {
            const snarkySystem = globalThis.Snarky.getConstraintSystem();
            console.log(`📊 Snarky constraint system:`, snarkySystem);
            
            if (snarkySystem && snarkySystem.gates) {
              console.log(`📄 SNARKY CONSTRAINT SYSTEM JSON:`);
              console.log(`═══════════════════════════════════════════════════════════════`);
              console.log(JSON.stringify(snarkySystem, null, 2));
              console.log(`═══════════════════════════════════════════════════════════════`);
              
              constraintSystemData = {
                backend: 'snarky',
                raw: JSON.stringify(snarkySystem),
                source: 'Snarky.getConstraintSystem()'
              };
            }
          } catch (e) {
            console.error(`❌ Failed to get Snarky constraint system: ${e.message}`);
          }
        }
      }
      
      // Try other possible Snarky access methods
      const possibleMethods = [
        'getConstraintSystem',
        'constraintSystem', 
        'gates',
        'compile'
      ];
      
      for (const method of possibleMethods) {
        if (typeof globalThis[method] === 'function') {
          try {
            console.log(`🔍 Trying global ${method}()...`);
            const result = globalThis[method]();
            console.log(`📊 ${method}() result:`, result);
          } catch (e) {
            console.error(`❌ Failed to call ${method}(): ${e.message}`);
          }
        }
      }
    }
    
    return constraintSystemData;
    
  } catch (error) {
    console.error(`❌ Failed to get constraint system for ${backend}: ${error.message}`);
    return null;
  }
}

// Function to try manual constraint generation
async function manualConstraintGeneration(backend) {
  console.log(`\n🧪 MANUAL CONSTRAINT GENERATION FOR ${backend.toUpperCase()}`);
  console.log(`═══════════════════════════════════════════════════════════════`);
  
  try {
    await switchBackend(backend);
    
    if (backend === 'sparky' && globalThis.sparkyConstraintBridge) {
      console.log(`🔧 Manually creating constraints with Sparky...`);
      
      // Start constraint accumulation
      globalThis.sparkyConstraintBridge.startConstraintAccumulation();
      
      // Create some simple field operations that should generate constraints
      const x = Field(2);
      const y = Field(3);
      const result = x.mul(y); // This should generate a constraint
      
      console.log(`📊 Generated constraint for: ${x} * ${y} = ${result}`);
      
      // Get the accumulated constraints
      const accumulated = globalThis.sparkyConstraintBridge.getAccumulatedConstraints();
      console.log(`📊 Accumulated constraints:`, accumulated);
      
      // Get the full constraint system
      const fullSystem = globalThis.sparkyConstraintBridge.getFullConstraintSystem();
      console.log(`📊 Full constraint system:`, fullSystem);
      
      if (fullSystem && typeof fullSystem.toJson === 'function') {
        const jsonResult = fullSystem.toJson();
        console.log(`📄 MANUAL SPARKY CONSTRAINT SYSTEM JSON:`);
        console.log(`═══════════════════════════════════════════════════════════════`);
        console.log(jsonResult);
        console.log(`═══════════════════════════════════════════════════════════════`);
        
        return jsonResult;
      }
    }
    
  } catch (error) {
    console.error(`❌ Manual constraint generation failed: ${error.message}`);
  }
  
  return null;
}

// Main function
async function main() {
  console.log(`🎯 DIRECT CONSTRAINT SYSTEM ACCESS`);
  console.log(`═══════════════════════════════════════════════════════════════`);
  
  try {
    // Try to get constraint systems from both backends
    const snarkyData = await getConstraintSystemData('snarky');
    const sparkyData = await getConstraintSystemData('sparky');
    
    // Try manual constraint generation
    const manualSparkyJSON = await manualConstraintGeneration('sparky');
    
    // Save any captured JSON to files
    if (snarkyData) {
      fs.writeFileSync('snarky-direct.json', snarkyData.raw);
      console.log(`💾 Snarky constraint system saved to snarky-direct.json`);
    }
    
    if (sparkyData) {
      fs.writeFileSync('sparky-direct.json', sparkyData.raw);
      console.log(`💾 Sparky constraint system saved to sparky-direct.json`);
    }
    
    if (manualSparkyJSON) {
      fs.writeFileSync('sparky-manual.json', manualSparkyJSON);
      console.log(`💾 Manual Sparky JSON saved to sparky-manual.json`);
    }
    
    // Compare if we have both
    if (snarkyData && sparkyData) {
      console.log(`\n🔬 COMPARISON`);
      console.log(`═══════════════════════════════════════════════════════════════`);
      console.log(`Snarky JSON length: ${snarkyData.raw.length}`);
      console.log(`Sparky JSON length: ${sparkyData.raw.length}`);
      console.log(`Sources: ${snarkyData.source} vs ${sparkyData.source}`);
    }
    
    console.log(`\n🎯 CONSTRAINT SYSTEM ACCESS COMPLETE`);
    
  } catch (error) {
    console.error(`❌ Failed to access constraint systems: ${error}`);
  }
}

// Run the analysis
main().catch(console.error);