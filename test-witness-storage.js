#!/usr/bin/env node

/**
 * Test Witness Storage Debug
 * 
 * This test checks if witness values are being properly stored
 * when variables are created in Sparky.
 */

import { Field, Provable, switchBackend, getCurrentBackend } from './dist/node/index.js';

async function testWitnessStorage() {
  console.log('🔍 WITNESS STORAGE DEBUG');
  console.log('======================');
  
  if (getCurrentBackend() !== 'sparky') {
    await switchBackend('sparky');
  }
  
  console.log('\n1. Testing simple witness creation:');
  
  try {
    await Provable.runAndCheck(() => {
      console.log('Creating witness x = 5');
      const x = Provable.witness(Field, () => Field(5));
      console.log('x created successfully');
      
      console.log('\\n🧪 Testing simple assertion x == 5:');
      x.assertEquals(Field(5));
      console.log('✅ Assertion passed');
    });
  } catch (error) {
    console.log('❌ Error:', error.message);
    console.log('Error type:', error.constructor.name);
    console.log('Full error:', error);
  }
  
  console.log('\\n2. Testing multiplication:');
  
  try {
    await Provable.runAndCheck(() => {
      const x = Provable.witness(Field, () => Field(3));
      const y = Provable.witness(Field, () => Field(4));
      
      console.log('Creating multiplication constraint');
      const result = x.mul(y);
      
      console.log('Testing result == 12');
      result.assertEquals(Field(12));
      console.log('✅ Multiplication passed');
    });
  } catch (error) {
    console.log('❌ Multiplication error:', error.message);
    console.log('Error details:', error);
  }
}

// Run the test
testWitnessStorage().catch(console.error);