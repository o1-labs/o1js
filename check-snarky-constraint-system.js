#!/usr/bin/env node

/**
 * CHECK SNARKY CONSTRAINT SYSTEM ACCESS
 * 
 * Focuses specifically on accessing Snarky's constraint system.
 */

import { switchBackend, Field, ZkProgram } from './dist/node/index.js';

// Create test program
function createTestProgram() {
  return ZkProgram({
    name: 'CheckSnarky',
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

async function checkSnarkyConstraintSystem() {
  console.log(`🔍 CHECKING SNARKY CONSTRAINT SYSTEM ACCESS`);
  console.log(`═══════════════════════════════════════════════════════════════`);
  
  try {
    await switchBackend('snarky');
    console.log(`✅ Switched to snarky backend`);
    
    const program = createTestProgram();
    const result = await program.compile();
    console.log(`✅ Compilation completed`);
    
    // Check what's in the result
    console.log(`\n📊 Compilation result keys:`, Object.keys(result));
    
    // Look at verificationKey
    if (result.verificationKey) {
      console.log(`\n🔑 Verification Key:`);
      console.log(`   Hash: ${result.verificationKey.hash}`);
      console.log(`   Data length: ${result.verificationKey.data?.length}`);
      
      // Check if verificationKey has any constraint-related properties
      const vkKeys = Object.keys(result.verificationKey);
      console.log(`   VK Keys: [${vkKeys.join(', ')}]`);
      
      for (const key of vkKeys) {
        if (key.toLowerCase().includes('constraint') || key.toLowerCase().includes('gate')) {
          console.log(`   🎯 Found constraint-related VK property: ${key}`);
          console.log(`      Value:`, result.verificationKey[key]);
        }
      }
    }
    
    // Check if there are any methods we can call
    console.log(`\n🔍 Searching for constraint system access methods...`);
    
    // Check __snarkyTsBindings global
    if (typeof globalThis.__snarkyTsBindings !== 'undefined') {
      console.log(`📊 Found __snarkyTsBindings:`);
      const bindingKeys = Object.keys(globalThis.__snarkyTsBindings);
      console.log(`   Keys: [${bindingKeys.join(', ')}]`);
      
      // Look for constraint-related methods
      const constraintMethods = bindingKeys.filter(key => 
        key.toLowerCase().includes('constraint') ||
        key.toLowerCase().includes('gate') ||
        key.toLowerCase().includes('system')
      );
      
      if (constraintMethods.length > 0) {
        console.log(`   🎯 Constraint-related methods: [${constraintMethods.join(', ')}]`);
        
        for (const method of constraintMethods) {
          try {
            const value = globalThis.__snarkyTsBindings[method];
            console.log(`     ${method}: ${typeof value}`);
            
            if (typeof value === 'function') {
              console.log(`       Trying to call ${method}()...`);
              const callResult = value();
              console.log(`       Result:`, callResult);
            }
          } catch (e) {
            console.log(`       ❌ Error with ${method}: ${e.message}`);
          }
        }
      }
    }
    
    // Check __snarky global
    if (typeof globalThis.__snarky !== 'undefined') {
      console.log(`📊 Found __snarky:`);
      const snarkyKeys = Object.keys(globalThis.__snarky);
      console.log(`   Keys: [${snarkyKeys.join(', ')}]`);
      
      // Look for constraint-related methods
      const constraintMethods = snarkyKeys.filter(key => 
        key.toLowerCase().includes('constraint') ||
        key.toLowerCase().includes('gate') ||
        key.toLowerCase().includes('system') ||
        key.toLowerCase().includes('json')
      );
      
      if (constraintMethods.length > 0) {
        console.log(`   🎯 Constraint-related methods: [${constraintMethods.join(', ')}]`);
        
        for (const method of constraintMethods) {
          try {
            const value = globalThis.__snarky[method];
            console.log(`     ${method}: ${typeof value}`);
            
            if (typeof value === 'function') {
              console.log(`       Trying to call ${method}()...`);
              const callResult = value();
              console.log(`       Result:`, callResult);
            }
          } catch (e) {
            console.log(`       ❌ Error with ${method}: ${e.message}`);
          }
        }
      }
      
      // Also check if __snarky has any objects with toJson methods
      for (const key of snarkyKeys) {
        try {
          const obj = globalThis.__snarky[key];
          if (obj && typeof obj === 'object' && typeof obj.toJson === 'function') {
            console.log(`   🎯 Found object with toJson: ${key}`);
            console.log(`       Calling ${key}.toJson()...`);
            const jsonResult = obj.toJson();
            console.log(`       JSON Result:`, jsonResult);
          }
        } catch (e) {
          console.log(`       ❌ Error accessing ${key}: ${e.message}`);
        }
      }
    }
    
    // Try to access pickles bindings directly
    console.log(`\n🔍 Looking for Pickles constraint system access...`);
    
    // Look for any globals that might contain constraint system info
    const allGlobals = Object.keys(globalThis);
    const potentialGlobals = allGlobals.filter(key => 
      key.toLowerCase().includes('pickles') ||
      key.toLowerCase().includes('circuit') ||
      key.toLowerCase().includes('compile') ||
      (key.includes('constraint') || key.includes('gate'))
    );
    
    console.log(`📊 Found potential constraint-related globals: [${potentialGlobals.join(', ')}]`);
    
    for (const globalName of potentialGlobals) {
      try {
        const globalObj = globalThis[globalName];
        console.log(`   ${globalName}: ${typeof globalObj}`);
        
        if (globalObj && typeof globalObj === 'object') {
          const objKeys = Object.keys(globalObj);
          const constraintKeys = objKeys.filter(key => 
            key.toLowerCase().includes('constraint') ||
            key.toLowerCase().includes('gate') ||
            key.toLowerCase().includes('json') ||
            key.toLowerCase().includes('system')
          );
          
          if (constraintKeys.length > 0) {
            console.log(`     🎯 Constraint-related keys: [${constraintKeys.join(', ')}]`);
            
            for (const key of constraintKeys) {
              try {
                const value = globalObj[key];
                console.log(`       ${key}: ${typeof value}`);
                
                if (typeof value === 'function') {
                  console.log(`         Trying to call ${key}()...`);
                  const result = value();
                  console.log(`         Result:`, result);
                  
                  // If it looks like JSON, show it
                  if (typeof result === 'string' && (result.includes('{') || result.includes('['))) {
                    console.log(`         📄 POTENTIAL JSON FOUND:`);
                    console.log(`         ${result}`);
                  }
                }
              } catch (e) {
                console.log(`         ❌ Error with ${key}: ${e.message}`);
              }
            }
          }
        }
      } catch (e) {
        console.log(`   ❌ Error accessing ${globalName}: ${e.message}`);
      }
    }
    
    return result;
    
  } catch (error) {
    console.error(`❌ Failed to check Snarky constraint system: ${error.message}`);
    return null;
  }
}

// Main function
async function main() {
  console.log(`🎯 SNARKY CONSTRAINT SYSTEM CHECK`);
  console.log(`═══════════════════════════════════════════════════════════════`);
  
  try {
    await checkSnarkyConstraintSystem();
    
    console.log(`\n🎯 SNARKY CHECK COMPLETE`);
    console.log(`═══════════════════════════════════════════════════════════════`);
    
  } catch (error) {
    console.error(`❌ Check failed: ${error}`);
  }
}

// Run the check
main().catch(console.error);