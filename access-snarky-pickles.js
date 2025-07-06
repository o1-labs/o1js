#!/usr/bin/env node

/**
 * ACCESS SNARKY PICKLES CONSTRAINT SYSTEM
 * 
 * Explores the Snarky/Pickles modules to find constraint system access.
 */

import { switchBackend, Field, ZkProgram } from './dist/node/index.js';

function createTestProgram() {
  return ZkProgram({
    name: 'PicklesAccess',
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

function deepExplore(obj, name, path = [], maxDepth = 3) {
  if (path.length > maxDepth) return;
  
  const currentPath = path.length > 0 ? `${path.join('.')}.${name}` : name;
  console.log(`${'  '.repeat(path.length)}📊 ${currentPath} (${typeof obj}):`);
  
  if (obj === null || obj === undefined) {
    return;
  }
  
  if (typeof obj === 'object' && obj !== globalThis) {
    const keys = Object.keys(obj);
    
    // Look for constraint/gate/json related keys
    const interestingKeys = keys.filter(key => {
      const lowerKey = key.toLowerCase();
      return lowerKey.includes('constraint') ||
             lowerKey.includes('gate') ||
             lowerKey.includes('json') ||
             lowerKey.includes('system') ||
             lowerKey.includes('compile') ||
             lowerKey === 'toJson' ||
             lowerKey === 'gates' ||
             lowerKey === 'rows';
    });
    
    if (interestingKeys.length > 0) {
      console.log(`${'  '.repeat(path.length)}  🎯 Interesting keys: [${interestingKeys.join(', ')}]`);
      
      for (const key of interestingKeys) {
        try {
          const value = obj[key];
          console.log(`${'  '.repeat(path.length)}    ${key}: ${typeof value}`);
          
          if (typeof value === 'function' && path.length < 2) {
            try {
              console.log(`${'  '.repeat(path.length)}      Trying to call ${key}()...`);
              const result = value.call(obj);
              console.log(`${'  '.repeat(path.length)}      Result:`, result);
              
              // If it looks like JSON, show it
              if (typeof result === 'string' && (result.includes('{') || result.includes('['))) {
                console.log(`${'  '.repeat(path.length)}      📄 POTENTIAL JSON:`);
                console.log(`${'  '.repeat(path.length)}      ${result}`);
              }
            } catch (e) {
              console.log(`${'  '.repeat(path.length)}      ❌ Error calling ${key}(): ${e.message}`);
            }
          } else if (typeof value === 'object' && path.length < maxDepth) {
            deepExplore(value, key, [...path, name], maxDepth);
          }
        } catch (e) {
          console.log(`${'  '.repeat(path.length)}    ❌ Error accessing ${key}: ${e.message}`);
        }
      }
    }
    
    // Also explore some common method names even if they don't match our keywords
    const commonMethods = keys.filter(key => 
      typeof obj[key] === 'function' && 
      ['analyze', 'summary', 'print', 'get', 'export', 'extract'].some(prefix => 
        key.toLowerCase().startsWith(prefix)
      )
    );
    
    if (commonMethods.length > 0 && path.length < 2) {
      console.log(`${'  '.repeat(path.length)}  🔍 Common methods: [${commonMethods.join(', ')}]`);
      
      for (const method of commonMethods) {
        try {
          console.log(`${'  '.repeat(path.length)}    Trying ${method}()...`);
          const result = obj[method].call(obj);
          console.log(`${'  '.repeat(path.length)}    ${method}() result:`, result);
        } catch (e) {
          console.log(`${'  '.repeat(path.length)}    ❌ ${method}() failed: ${e.message}`);
        }
      }
    }
  }
}

async function exploreSnarkyPickles() {
  console.log(`🔍 EXPLORING SNARKY/PICKLES MODULES`);
  console.log(`═══════════════════════════════════════════════════════════════`);
  
  try {
    await switchBackend('snarky');
    console.log(`✅ Switched to snarky backend`);
    
    const program = createTestProgram();
    const result = await program.compile();
    console.log(`✅ Compilation completed`);
    
    // Explore __snarky module
    if (globalThis.__snarky) {
      console.log(`\n📊 Exploring __snarky module:`);
      deepExplore(globalThis.__snarky, '__snarky');
    }
    
    // Look specifically at analyzeMethods if it exists in the result
    if (result.analyzeMethods) {
      console.log(`\n📊 Exploring analyzeMethods:`);
      deepExplore(result.analyzeMethods, 'analyzeMethods');
    }
    
    return result;
    
  } catch (error) {
    console.error(`❌ Failed to explore Snarky/Pickles: ${error.message}`);
    return null;
  }
}

async function tryDirectConstraintAccess() {
  console.log(`\n🧪 TRYING DIRECT CONSTRAINT ACCESS`);
  console.log(`═══════════════════════════════════════════════════════════════`);
  
  try {
    await switchBackend('snarky');
    
    // Try to create constraints manually and see if we can access them
    console.log(`🔧 Creating manual constraints...`);
    
    const x = Field(2);
    const y = Field(3);
    const result = x.mul(y);
    
    console.log(`📊 Created constraint: ${x} * ${y} = ${result}`);
    
    // Now check if anything in the global objects changed
    console.log(`🔍 Checking for constraint system changes...`);
    
    // Check if __snarky has any state that changed
    if (globalThis.__snarky?.Snarky) {
      const snarky = globalThis.__snarky.Snarky;
      console.log(`📊 Snarky object keys:`, Object.keys(snarky));
      
      // Look for any constraint-related state
      const snarkyProps = Object.keys(snarky).filter(key => {
        const lowerKey = key.toLowerCase();
        return lowerKey.includes('constraint') ||
               lowerKey.includes('gate') ||
               lowerKey.includes('state') ||
               lowerKey.includes('system');
      });
      
      if (snarkyProps.length > 0) {
        console.log(`🎯 Found Snarky constraint properties: [${snarkyProps.join(', ')}]`);
        
        for (const prop of snarkyProps) {
          try {
            const value = snarky[prop];
            console.log(`   ${prop}:`, value);
            
            if (value && typeof value === 'object' && typeof value.toJson === 'function') {
              console.log(`     📄 Calling ${prop}.toJson():`);
              const json = value.toJson();
              console.log(`     ${json}`);
            }
          } catch (e) {
            console.log(`   ❌ Error accessing ${prop}: ${e.message}`);
          }
        }
      }
    }
    
    // Check Pickles
    if (globalThis.__snarky?.Pickles) {
      const pickles = globalThis.__snarky.Pickles;
      console.log(`📊 Pickles object keys:`, Object.keys(pickles));
      
      const picklesProps = Object.keys(pickles).filter(key => {
        const lowerKey = key.toLowerCase();
        return lowerKey.includes('constraint') ||
               lowerKey.includes('gate') ||
               lowerKey.includes('compile') ||
               lowerKey.includes('system');
      });
      
      if (picklesProps.length > 0) {
        console.log(`🎯 Found Pickles constraint properties: [${picklesProps.join(', ')}]`);
        
        for (const prop of picklesProps) {
          try {
            const value = pickles[prop];
            console.log(`   ${prop}:`, typeof value);
            
            if (typeof value === 'function') {
              console.log(`     Trying to call ${prop}()...`);
              const result = value();
              console.log(`     Result:`, result);
            }
          } catch (e) {
            console.log(`   ❌ Error with ${prop}: ${e.message}`);
          }
        }
      }
    }
    
  } catch (error) {
    console.error(`❌ Direct constraint access failed: ${error.message}`);
  }
}

async function main() {
  console.log(`🎯 SNARKY PICKLES CONSTRAINT SYSTEM ACCESS`);
  console.log(`═══════════════════════════════════════════════════════════════`);
  
  try {
    await exploreSnarkyPickles();
    await tryDirectConstraintAccess();
    
    console.log(`\n🎯 EXPLORATION COMPLETE`);
    console.log(`═══════════════════════════════════════════════════════════════`);
    
  } catch (error) {
    console.error(`❌ Exploration failed: ${error}`);
  }
}

main().catch(console.error);