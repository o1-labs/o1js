#!/usr/bin/env node

/**
 * DIRECT CONSTRAINT SYSTEM ACCESS
 * 
 * Attempts to access the constraint system object directly
 * and examine its structure to understand the JSON format.
 */

import { switchBackend, Field, ZkProgram } from './dist/node/index.js';

// Create a simple test program
function createTestProgram() {
  return ZkProgram({
    name: 'ConstraintAccess',
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

// Function to deeply examine an object's structure
function examineObject(obj, name, depth = 0, maxDepth = 3) {
  if (depth > maxDepth) return;
  
  const indent = '  '.repeat(depth);
  console.log(`${indent}🔍 ${name} (${typeof obj}):`);
  
  if (obj === null || obj === undefined) {
    console.log(`${indent}  ${obj}`);
    return;
  }
  
  if (typeof obj === 'object') {
    const keys = Object.keys(obj);
    console.log(`${indent}  Keys: [${keys.join(', ')}]`);
    
    // Look for interesting properties
    const interestingKeys = keys.filter(key => 
      key.toLowerCase().includes('json') ||
      key.toLowerCase().includes('system') ||
      key.toLowerCase().includes('constraint') ||
      key.toLowerCase().includes('gate') ||
      key === 'toJson' ||
      key === 'rows' ||
      key === 'digest'
    );
    
    if (interestingKeys.length > 0) {
      console.log(`${indent}  🎯 Interesting keys: [${interestingKeys.join(', ')}]`);
      
      for (const key of interestingKeys) {
        try {
          const value = obj[key];
          if (typeof value === 'function') {
            console.log(`${indent}    ${key}(): function`);
            
            // Try to call functions that look safe
            if (key === 'toJson' || key === 'rows' || key === 'digest') {
              try {
                console.log(`${indent}    Calling ${key}()...`);
                const result = value.call(obj);
                console.log(`${indent}    ${key}() result:`, result);
                
                // If it's toJson, this might be our JSON!
                if (key === 'toJson' && typeof result === 'string') {
                  console.log(`${indent}    📊 FOUND JSON FROM ${key}():`);
                  console.log(`${indent}    ${result}`);
                }
              } catch (e) {
                console.log(`${indent}    ❌ Failed to call ${key}(): ${e.message}`);
              }
            }
          } else if (depth < maxDepth) {
            examineObject(value, `${name}.${key}`, depth + 1, maxDepth);
          }
        } catch (e) {
          console.log(`${indent}    ❌ Error accessing ${key}: ${e.message}`);
        }
      }
    }
  } else if (typeof obj === 'function') {
    console.log(`${indent}  Function: ${obj.name || 'anonymous'}`);
  } else {
    console.log(`${indent}  Value: ${obj}`);
  }
}

// Function to examine constraint system in detail
async function examineConstraintSystem(backend) {
  console.log(`\n🔍 EXAMINING ${backend.toUpperCase()} CONSTRAINT SYSTEM`);
  console.log(`═══════════════════════════════════════════════════════════════`);
  
  try {
    await switchBackend(backend);
    console.log(`✅ Switched to ${backend} backend`);
    
    const program = createTestProgram();
    const result = await program.compile();
    console.log(`✅ Compilation completed`);
    
    // Examine the compilation result structure
    console.log(`\n📊 Compilation Result Structure:`);
    examineObject(result, 'compilationResult', 0, 2);
    
    // Look specifically at analyzeMethods if it exists
    if (result.analyzeMethods) {
      console.log(`\n📊 analyzeMethods Structure:`);
      examineObject(result.analyzeMethods, 'analyzeMethods', 0, 3);
      
      if (result.analyzeMethods.compute) {
        console.log(`\n📊 analyzeMethods.compute Structure:`);
        examineObject(result.analyzeMethods.compute, 'compute', 0, 3);
      }
    }
    
    // Look at verification key structure
    if (result.verificationKey) {
      console.log(`\n📊 Verification Key Structure:`);
      console.log(`   Hash: ${result.verificationKey.hash}`);
      console.log(`   Data Length: ${result.verificationKey.data?.length}`);
      
      if (result.verificationKey.data && result.verificationKey.data.length < 1000) {
        console.log(`   Data: ${result.verificationKey.data}`);
      } else if (result.verificationKey.data) {
        console.log(`   Data Preview: ${result.verificationKey.data.substring(0, 100)}...`);
      }
    }
    
    return result;
    
  } catch (error) {
    console.error(`❌ Failed to examine ${backend}:`, error.message);
    return null;
  }
}

// Function to look for global constraint system objects
function examineGlobalConstraintObjects() {
  console.log(`\n🌐 EXAMINING GLOBAL CONSTRAINT SYSTEM OBJECTS`);
  console.log(`═══════════════════════════════════════════════════════════════`);
  
  // Look for sparky-related globals
  if (typeof globalThis.sparkyConstraintBridge !== 'undefined') {
    console.log(`📊 Found sparkyConstraintBridge:`);
    examineObject(globalThis.sparkyConstraintBridge, 'sparkyConstraintBridge', 0, 2);
  } else {
    console.log(`❌ sparkyConstraintBridge not found`);
  }
  
  // Look for other globals
  const potentialGlobals = ['snarky', 'sparky_wasm', 'Circuit', 'Pickles'];
  for (const globalName of potentialGlobals) {
    if (typeof globalThis[globalName] !== 'undefined') {
      console.log(`📊 Found global.${globalName}:`);
      examineObject(globalThis[globalName], globalName, 0, 1);
    }
  }
}

// Function to try proof generation to trigger constraint system export
async function attemptProofGeneration(backend) {
  console.log(`\n🧪 ATTEMPTING PROOF GENERATION FOR ${backend.toUpperCase()}`);
  console.log(`═══════════════════════════════════════════════════════════════`);
  
  try {
    await switchBackend(backend);
    const program = createTestProgram();
    await program.compile();
    
    console.log(`🧪 Attempting to generate proof (this will likely fail but may show constraint system)...`);
    
    // Try to generate a proof with simple inputs
    const publicInput = Field(2);
    const privateInput = Field(3);
    
    const proof = await program.compute(publicInput, privateInput);
    console.log(`✅ Proof generation succeeded unexpectedly!`);
    console.log(`📊 Proof:`, proof);
    
  } catch (error) {
    console.log(`❌ Proof generation failed (expected): ${error.message}`);
    // This is expected - we're looking for constraint system data in the process
  }
}

// Main function
async function main() {
  console.log(`🔍 DIRECT CONSTRAINT SYSTEM ACCESS`);
  console.log(`═══════════════════════════════════════════════════════════════`);
  
  try {
    // Examine global objects first
    examineGlobalConstraintObjects();
    
    // Examine constraint systems for both backends
    const snarkyResult = await examineConstraintSystem('snarky');
    const sparkyResult = await examineConstraintSystem('sparky');
    
    // Try proof generation to see if it reveals more
    await attemptProofGeneration('snarky');
    await attemptProofGeneration('sparky');
    
    console.log(`\n🎯 CONSTRAINT SYSTEM EXAMINATION COMPLETE`);
    console.log(`═══════════════════════════════════════════════════════════════`);
    console.log(`Check the detailed examination above for constraint system access methods.`);
    
  } catch (error) {
    console.error(`❌ Examination failed:`, error);
  }
}

// Run the analysis
main().catch(console.error);