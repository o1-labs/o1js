#!/usr/bin/env node

/**
 * Debug script to trace ML Array issues
 * Created: January 5, 2025 14:30 UTC
 */

import { Field, switchBackend } from './dist/node/index.js';

async function debugMLArray() {
  console.log('\n=== ML ARRAY DEBUG ===\n');
  
  // Switch to Sparky backend
  await switchBackend('sparky');
  console.log('✅ Switched to Sparky backend');
  
  // Hook into the constant function to see what's being passed
  const sparkyInstance = globalThis.__sparkyInstance;
  if (sparkyInstance?.field?.constant) {
    const originalConstant = sparkyInstance.field.constant;
    
    sparkyInstance.field.constant = function(value) {
      console.log('\n📞 WASM constant() called:');
      console.log('   value:', JSON.stringify(value));
      console.log('   value type:', typeof value);
      console.log('   value is array:', Array.isArray(value));
      
      if (Array.isArray(value)) {
        console.log('   value length:', value.length);
        console.log('   value[0]:', value[0]);
        console.log('   value[1]:', value[1]);
        console.log('   value[2]:', value[2]);
        console.log('   value[3]:', value[3]);
      }
      
      // Check if it's an ML Array pattern
      if (Array.isArray(value) && value.length === 4 && value[0] === 0) {
        console.log('\n🚨 DETECTED ML ARRAY PATTERN!');
        console.log('   This looks like an OCaml ML Array: [tag, ...elements]');
        console.log('   Tag:', value[0]);
        console.log('   Elements:', value.slice(1));
        
        // Try to extract the actual field constant
        // ML Arrays from OCaml often have format: [0, elem1, elem2, elem3]
        // For a Field constant, we might expect: [0, [0, "value"]]
        // But we're getting 4 elements instead
        
        // Let's see if element 1 is the FieldConst
        if (Array.isArray(value[1]) && value[1][0] === 0) {
          console.log('\n🔍 Found potential FieldConst at value[1]:', value[1]);
          console.log('   Attempting to use value[1] as the constant...');
          
          try {
            return originalConstant.call(this, value[1][1]);
          } catch (error) {
            console.error('   ❌ Failed with value[1]:', error.message);
          }
        }
      }
      
      try {
        return originalConstant.call(this, value);
      } catch (error) {
        console.error('   ❌ Error:', error.message);
        throw error;
      }
    };
  }
  
  // Create a Field to trigger the issue
  console.log('\n🧪 Creating Field(42) to trigger compilation...\n');
  
  try {
    const f = Field(42);
    console.log('Field created:', f);
    console.log('Field value:', f.value);
    
    // Try to trigger compilation context
    const { Provable } = await import('./dist/node/index.js');
    
    await Provable.runAndCheck(() => {
      const x = Provable.witness(Field, () => Field(10));
      x.assertEquals(Field(10));
    });
    
    console.log('\n✅ Test completed without error');
  } catch (error) {
    console.error('\n❌ Error:', error.message);
  }
}

debugMLArray().catch(console.error);