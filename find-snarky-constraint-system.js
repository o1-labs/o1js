#!/usr/bin/env node

/**
 * FIND SNARKY CONSTRAINT SYSTEM OBJECT
 * 
 * The toJson method exists, we just need to find the right constraint system object to pass to it.
 */

import { switchBackend, Field, ZkProgram } from './dist/node/index.js';

function createTestProgram() {
  return ZkProgram({
    name: 'FindSnarkyCS',
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

async function findSnarkyConstraintSystem() {
  console.log(`🔍 FINDING SNARKY CONSTRAINT SYSTEM OBJECT`);
  console.log(`═══════════════════════════════════════════════════════════════`);
  
  try {
    await switchBackend('snarky');
    console.log(`✅ Switched to snarky backend`);
    
    const program = createTestProgram();
    
    // Before compilation, see what's available
    console.log(`📊 Before compilation - checking global state...`);
    const snarky = globalThis.__snarky.Snarky;
    
    console.log(`🔍 Snarky object keys:`, Object.keys(snarky));
    
    // Check if there are any properties that look like constraint systems
    for (const key of Object.keys(snarky)) {
      const value = snarky[key];
      if (value && typeof value === 'object') {
        const subKeys = Object.keys(value);
        if (subKeys.includes('rows') || subKeys.includes('digest') || subKeys.includes('gates')) {
          console.log(`🎯 Found potential constraint system object: ${key}`);
          console.log(`   Keys: [${subKeys.join(', ')}]`);
          
          // Try to call toJson on it
          try {
            const toJsonResult = snarky.constraintSystem.toJson(value);
            console.log(`📄 SUCCESS! toJson(${key}) result:`);
            console.log(toJsonResult);
            return toJsonResult;
          } catch (e) {
            console.log(`   ❌ toJson(${key}) failed: ${e.message}`);
          }
        }
      }
    }
    
    // Compile the program
    console.log(`\n📋 Compiling program...`);
    const result = await program.compile();
    console.log(`✅ Compilation completed`);
    
    // Check compilation result
    console.log(`📊 Compilation result keys:`, Object.keys(result));
    
    // Look for any object that might be a constraint system
    for (const key of Object.keys(result)) {
      const value = result[key];
      if (value && typeof value === 'object') {
        console.log(`🔍 Checking result.${key}:`, typeof value, Object.keys(value));
        
        // Try to use it as constraint system
        try {
          const toJsonResult = snarky.constraintSystem.toJson(value);
          console.log(`📄 SUCCESS! toJson(result.${key}) result:`);
          console.log(toJsonResult);
          return toJsonResult;
        } catch (e) {
          console.log(`   ❌ toJson(result.${key}) failed: ${e.message}`);
        }
      }
    }
    
    // Try a different approach - maybe we need to run the method first
    console.log(`\n🧪 Trying to run the zkProgram method...`);
    
    try {
      const publicInput = Field(2);
      const privateInput = Field(3);
      
      // This might create the constraint system
      console.log(`🔧 Running program.compute()...`);
      const proof = await program.compute(publicInput, privateInput);
      console.log(`✅ Proof generation succeeded`);
      
      // Now check if anything changed
      console.log(`🔍 Checking for new constraint system objects after proof generation...`);
      
      // Check the proof object itself
      if (proof && typeof proof === 'object') {
        console.log(`📊 Proof object keys:`, Object.keys(proof));
        
        for (const key of Object.keys(proof)) {
          const value = proof[key];
          if (value && typeof value === 'object') {
            try {
              const toJsonResult = snarky.constraintSystem.toJson(value);
              console.log(`📄 SUCCESS! toJson(proof.${key}) result:`);
              console.log(toJsonResult);
              return toJsonResult;
            } catch (e) {
              // Silent fail for most objects
            }
          }
        }
      }
      
    } catch (e) {
      console.log(`❌ Proof generation failed: ${e.message}`);
      // This is expected for Sparky but might work for Snarky
    }
    
    // Try accessing through global state after operations
    console.log(`\n🔍 Checking global state after operations...`);
    
    // Check if there are any new objects in the global scope
    const allGlobals = Object.keys(globalThis);
    const newGlobals = allGlobals.filter(key => 
      key.includes('constraint') || 
      key.includes('system') ||
      key.includes('cs') ||
      key.includes('CS')
    );
    
    if (newGlobals.length > 0) {
      console.log(`📊 Found potential constraint system globals: [${newGlobals.join(', ')}]`);
      
      for (const globalName of newGlobals) {
        try {
          const globalObj = globalThis[globalName];
          const toJsonResult = snarky.constraintSystem.toJson(globalObj);
          console.log(`📄 SUCCESS! toJson(globalThis.${globalName}) result:`);
          console.log(toJsonResult);
          return toJsonResult;
        } catch (e) {
          console.log(`   ❌ toJson(globalThis.${globalName}) failed: ${e.message}`);
        }
      }
    }
    
    // Last resort - try to create a minimal constraint system manually
    console.log(`\n🧪 Trying to create constraints manually and find the system...`);
    
    const x = Field(2);
    const y = Field(3);
    const z = x.mul(y);
    
    console.log(`📊 Created manual constraints: ${x} * ${y} = ${z}`);
    
    // Check if this created any constraint system objects we can access
    // Look through all possible places again
    const searchTargets = [
      { name: 'result', obj: result },
      { name: 'snarky', obj: snarky },
      { name: 'globalThis.__snarky', obj: globalThis.__snarky }
    ];
    
    for (const target of searchTargets) {
      if (target.obj && typeof target.obj === 'object') {
        for (const key of Object.keys(target.obj)) {
          const value = target.obj[key];
          if (value && typeof value === 'object') {
            try {
              const toJsonResult = snarky.constraintSystem.toJson(value);
              console.log(`📄 SUCCESS! toJson(${target.name}.${key}) result:`);
              console.log(toJsonResult);
              return toJsonResult;
            } catch (e) {
              // Silent fail
            }
          }
        }
      }
    }
    
    console.log(`❌ Could not find a valid constraint system object for Snarky`);
    return null;
    
  } catch (error) {
    console.error(`❌ Failed to find Snarky constraint system: ${error.message}`);
    return null;
  }
}

async function main() {
  console.log(`🎯 SNARKY CONSTRAINT SYSTEM FINDER`);
  console.log(`═══════════════════════════════════════════════════════════════`);
  
  try {
    const snarkyJSON = await findSnarkyConstraintSystem();
    
    if (snarkyJSON) {
      console.log(`\n✅ FOUND SNARKY CONSTRAINT SYSTEM JSON!`);
      console.log(`📄 Final Result:`);
      console.log(snarkyJSON);
      
      // Save to file
      const fs = await import('fs');
      fs.writeFileSync('snarky-found.json', snarkyJSON);
      console.log(`💾 Saved to snarky-found.json`);
    } else {
      console.log(`\n❌ Could not extract Snarky constraint system JSON`);
    }
    
    console.log(`\n🎯 SEARCH COMPLETE`);
    console.log(`═══════════════════════════════════════════════════════════════`);
    
  } catch (error) {
    console.error(`❌ Search failed: ${error}`);
  }
}

main().catch(console.error);