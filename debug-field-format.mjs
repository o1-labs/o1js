#!/usr/bin/env node

/**
 * Debug script to trace field format issues during Sparky compilation
 * Created: January 5, 2025 14:10 UTC
 */

import { Field, switchBackend, getCurrentBackend } from './dist/node/index.js';

async function debugFieldFormat() {
  console.log('\n=== FIELD FORMAT DEBUG ===\n');
  
  // Switch to Sparky backend
  await switchBackend('sparky');
  console.log('✅ Switched to Sparky backend');
  
  // Hook into field operations
  const originalSnarky = globalThis.__snarky;
  if (originalSnarky?.field) {
    console.log('🔍 Hooking into __snarky.field operations...');
    
    const originalField = originalSnarky.field;
    const wrappedField = {};
    
    // Wrap each field function to trace calls
    for (const [key, value] of Object.entries(originalField)) {
      if (typeof value === 'function') {
        wrappedField[key] = function(...args) {
          console.log(`\n📞 __snarky.field.${key} called`);
          console.log('   Args count:', args.length);
          args.forEach((arg, i) => {
            console.log(`   Arg[${i}]:`, JSON.stringify(arg, null, 2));
            if (Array.isArray(arg)) {
              console.log(`   Arg[${i}] length:`, arg.length);
              console.log(`   Arg[${i}] elements:`, arg.map((el, j) => `[${j}]: ${typeof el} = ${JSON.stringify(el)}`));
            }
          });
          
          try {
            const result = value.apply(this, args);
            console.log(`   ✅ Result:`, JSON.stringify(result, null, 2));
            return result;
          } catch (error) {
            console.error(`   ❌ Error:`, error.message);
            throw error;
          }
        };
      } else {
        wrappedField[key] = value;
      }
    }
    
    originalSnarky.field = wrappedField;
  }
  
  // Create some field constants to see how they're formatted
  console.log('\n🧪 Testing field constant creation...\n');
  
  try {
    // Test 1: Simple constant
    console.log('Test 1: Creating Field(42)');
    const f1 = Field(42);
    console.log('   Result:', f1);
    console.log('   Value property:', f1.value);
    
    // Test 2: Large constant
    console.log('\nTest 2: Creating Field with large value');
    const f2 = Field('12345678901234567890');
    console.log('   Result:', f2);
    console.log('   Value property:', f2.value);
    
    // Test 3: Field operations
    console.log('\nTest 3: Field addition');
    const f3 = f1.add(f2);
    console.log('   Result:', f3);
    console.log('   Value property:', f3.value);
    
    // Test 4: Try to trigger compilation
    console.log('\n🚀 Attempting to trigger constraint generation...\n');
    
    // Import Provable to create constraints
    const { Provable } = await import('./dist/node/index.js');
    
    Provable.runAndCheck(() => {
      const x = Provable.witness(Field, () => Field(10));
      const y = Provable.witness(Field, () => Field(20));
      const z = x.add(y);
      z.assertEquals(Field(30));
    });
    
  } catch (error) {
    console.error('\n❌ Error during testing:', error.message);
    console.error('Stack:', error.stack);
  }
  
  // Restore original
  if (originalSnarky && originalField) {
    originalSnarky.field = originalField;
  }
}

debugFieldFormat().catch(console.error);