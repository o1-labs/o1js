#!/usr/bin/env node

/**
 * DEBUG: Field multiplication routing issue
 */

import { Field, Provable, switchBackend } from './dist/node/index.js';
import { Snarky } from './dist/node/bindings.js';

// Track what gets called
let fieldMulCalls = 0;
let assertMulCalls = 0;

async function testFieldMulRouting() {
  console.log('🔬 FIELD MULTIPLICATION ROUTING DEBUG');
  console.log('=====================================');
  
  await switchBackend('sparky');
  console.log('✓ Switched to Sparky backend');
  
  // Patch to track calls
  const originalFieldMul = Snarky.field.mul;
  const originalAssertMul = Snarky.field.assertMul;
  
  Snarky.field.mul = function(...args) {
    fieldMulCalls++;
    console.log(`🔍 [TRACE] Snarky.field.mul called (#${fieldMulCalls})`);
    console.log('🔍 [TRACE] Arguments:', args.map(a => Array.isArray(a) ? `[${a[0]}, ${a[1]}]` : a));
    const result = originalFieldMul.apply(this, args);
    console.log('🔍 [TRACE] Result:', result);
    return result;
  };
  
  Snarky.field.assertMul = function(...args) {
    assertMulCalls++;
    console.log(`🔍 [TRACE] Snarky.field.assertMul called (#${assertMulCalls})`);
    console.log('🔍 [TRACE] Arguments:', args.map(a => Array.isArray(a) ? `[${a[0]}, ${a[1]}]` : a));
    return originalAssertMul.apply(this, args);
  };
  
  console.log('\n📊 TEST: Field multiplication flow');
  console.log('----------------------------------');
  
  try {
    await Provable.runAndCheck(() => {
      console.log('\n🔍 Creating witnesses...');
      const a = Provable.witness(Field, () => Field.from(3));
      const b = Provable.witness(Field, () => Field.from(4));
      
      console.log('\n🔍 Calling a.mul(b)...');
      console.log('🔍 a.value:', a.value);
      console.log('🔍 b.value:', b.value);
      
      // This should trigger field.ts mul() which calls existsOne + assertMul
      const c = a.mul(b);
      
      console.log('🔍 c.value:', c.value);
      console.log('🔍 c type:', c.constructor.name);
      
      console.log('\n🔍 Calling c.assertEquals(12)...');
      c.assertEquals(Field.from(12));
    });
    
    console.log('✅ Test passed');
  } catch (error) {
    console.log('❌ Test failed:', error.message || error);
  }
  
  console.log('\n📊 CALL SUMMARY:');
  console.log(`- Snarky.field.mul calls: ${fieldMulCalls}`);
  console.log(`- Snarky.field.assertMul calls: ${assertMulCalls}`);
  
  // Also check if Field.mul is using the right backend
  console.log('\n🔍 Checking Field class methods...');
  console.log('- typeof Field.prototype.mul:', typeof Field.prototype.mul);
  console.log('- Field.prototype.mul.toString().slice(0, 100):', Field.prototype.mul.toString().slice(0, 100));
}

testFieldMulRouting().catch(console.error);