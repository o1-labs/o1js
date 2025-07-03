#!/usr/bin/env node

/**
 * EXACT ENCODING VERIFICATION
 * 
 * This test verifies EXACTLY what o1js sends vs what Sparky receives
 * to determine where the Add expressions are being created.
 */

import { Field, Provable, switchBackend, getCurrentBackend } from './dist/node/index.js';

async function testExactEncoding() {
  console.log('🔍 EXACT ENCODING VERIFICATION');
  console.log('===============================');
  console.log('Testing what o1js sends vs what Sparky receives');
  
  if (getCurrentBackend() !== 'sparky') {
    await switchBackend('sparky');
  }
  
  console.log('\n1. Testing simple witness variable:');
  
  await Provable.runAndCheck(() => {
    console.log('Creating witness x = 5');
    const x = Provable.witness(Field, () => Field(5));
    
    console.log('\n📊 O1JS FIELD REPRESENTATION:');
    console.log('x.value =', x.value);
    console.log('JSON representation:', JSON.stringify(x.value));
    console.log('Type:', typeof x.value);
    console.log('Array?', Array.isArray(x.value));
    if (Array.isArray(x.value)) {
      console.log('Length:', x.value.length);
      console.log('Element 0:', x.value[0], typeof x.value[0]);
      console.log('Element 1:', x.value[1], typeof x.value[1]);
    }
    
    console.log('\n🧪 Testing x.assertEquals(5) to see what gets sent to Sparky:');
    x.assertEquals(Field(5));
  });
  
  console.log('\n2. Testing x.mul(1):');
  
  await Provable.runAndCheck(() => {
    const x = Provable.witness(Field, () => Field(7));
    console.log('\n📊 ORIGINAL VARIABLE:');
    console.log('x.value =', JSON.stringify(x.value));
    
    const result = x.mul(1);
    console.log('\n📊 AFTER x.mul(1):');
    console.log('result.value =', JSON.stringify(result.value));
    console.log('Same as original?', JSON.stringify(result.value) === JSON.stringify(x.value));
    
    console.log('\n🧪 Testing result.assertEquals(7):');
    result.assertEquals(Field(7));
  });
  
  console.log('\n3. Testing x.mul(Field(1)):');
  
  await Provable.runAndCheck(() => {
    const x = Provable.witness(Field, () => Field(9));
    console.log('\n📊 ORIGINAL VARIABLE:');
    console.log('x.value =', JSON.stringify(x.value));
    
    const one = Field(1);
    console.log('\n📊 Field(1):');
    console.log('Field(1).value =', JSON.stringify(one.value));
    console.log('Field(1).isConstant() =', one.isConstant());
    
    const result = x.mul(one);
    console.log('\n📊 AFTER x.mul(Field(1)):');
    console.log('result.value =', JSON.stringify(result.value));
    console.log('Same as original?', JSON.stringify(result.value) === JSON.stringify(x.value));
    
    console.log('\n🧪 Testing result.assertEquals(9):');
    result.assertEquals(Field(9));
  });
  
  console.log('\n4. Testing direct Field(constant):');
  
  await Provable.runAndCheck(() => {
    const constant = Field(42);
    console.log('\n📊 CONSTANT FIELD:');
    console.log('Field(42).value =', JSON.stringify(constant.value));
    console.log('isConstant =', constant.isConstant());
    
    console.log('\n🧪 Testing constant.assertEquals(42):');
    constant.assertEquals(Field(42));
  });
  
  console.log('\n🎯 ANALYSIS:');
  console.log('=============');
  console.log('Compare the o1js Field representations with the Sparky debug output.');
  console.log('If o1js shows [1, n] but Sparky receives [2, [1, n], [0, ...]], then');
  console.log('the bug is in the communication layer or Sparky parsing.');
  console.log('If o1js already shows [2, ...], then the bug is in o1js Field creation.');
}

// Run the verification
testExactEncoding().catch(console.error);