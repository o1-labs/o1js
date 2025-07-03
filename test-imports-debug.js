#!/usr/bin/env node

/**
 * DEBUG: Import and function availability
 */

import { Field, Provable, switchBackend } from './dist/node/index.js';
import { Snarky } from './dist/node/bindings.js';
import { existsOne } from './dist/node/lib/provable/core/exists.js';
import { assertMul } from './dist/node/lib/provable/gadgets/basic.js';

async function testImportsDebug() {
  console.log('🔬 IMPORTS AND FUNCTIONS DEBUG');
  console.log('==============================');
  
  // Test with both backends
  for (const backend of ['snarky', 'sparky']) {
    console.log(`\n\n🔄 TESTING WITH ${backend.toUpperCase()} BACKEND`);
    console.log('=' . repeat(50));
    
    await switchBackend(backend);
    console.log(`✓ Switched to ${backend} backend`);
  
  console.log('\n📊 CHECKING IMPORTS:');
  console.log('- typeof existsOne:', typeof existsOne);
  console.log('- typeof assertMul:', typeof assertMul);
  console.log('- typeof Snarky.run.existsOne:', typeof Snarky.run.existsOne);
  console.log('- typeof Snarky.field.assertMul:', typeof Snarky.field.assertMul);
  
  console.log('\n📊 TESTING existsOne directly:');
  try {
    const witness = existsOne(() => {
      console.log('🔍 Inside existsOne compute function');
      return 42n;
    });
    console.log('✅ existsOne returned:', witness);
    console.log('- witness.value:', witness.value);
  } catch (error) {
    console.log('❌ existsOne failed:', error.message);
  }
  
  console.log('\n📊 TESTING assertMul directly:');
  try {
    await Provable.runAndCheck(() => {
      const a = Provable.witness(Field, () => Field.from(3));
      const b = Provable.witness(Field, () => Field.from(4));
      const c = Provable.witness(Field, () => Field.from(12));
      
      console.log('🔍 Calling assertMul(a, b, c)...');
      assertMul(a, b, c);
      console.log('✅ assertMul completed');
    });
  } catch (error) {
    console.log('❌ assertMul test failed:', error.message);
  }
  
  console.log('\n📊 TESTING Field.mul internals:');
  try {
    await Provable.runAndCheck(() => {
      const a = Provable.witness(Field, () => Field.from(3));
      const b = Provable.witness(Field, () => Field.from(4));
      
      console.log('🔍 Manual multiplication flow:');
      console.log('- a.isConstant():', a.isConstant());
      console.log('- b.isConstant():', b.isConstant());
      
      // Manually do what Field.mul should do
      console.log('🔍 Calling existsOne for result...');
      const z = existsOne(() => {
        const result = 3n * 4n; // Should be Fp.mul
        console.log('🔍 Computed result in existsOne:', result);
        return result;
      });
      console.log('🔍 existsOne returned z:', z);
      console.log('- z.value:', z.value);
      
      console.log('🔍 Calling assertMul(a, b, z)...');
      assertMul(a, b, z);
      console.log('✅ Manual flow completed');
    });
  } catch (error) {
    console.log('❌ Manual flow failed:', error.message);
  }
  } // End of backend loop
}

testImportsDebug().catch(console.error);