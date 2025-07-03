#!/usr/bin/env node

/**
 * 🔬 SIMPLE DEBUG TEST
 * 
 * Minimal test to see what's going wrong with runAndCheck
 */

import { Field, Provable, switchBackend, getCurrentBackend } from './dist/node/index.js';

async function testSimpleDebug() {
  console.log('🔬 SIMPLE DEBUG TEST');
  console.log('===================');
  
  await switchBackend('sparky');
  console.log('✓ Switched to Sparky backend');
  
  try {
    console.log('\n📊 TEST: Minimal runAndCheck');
    console.log('---------------------------');
    
    const result = await Provable.runAndCheck(() => {
      console.log('Inside runAndCheck callback');
      const a = Field.from(3);
      console.log('Created Field.from(3)');
      return a;
    });
    
    console.log('✅ runAndCheck succeeded');
    console.log('Result:', result);
    
  } catch (error) {
    console.log('❌ runAndCheck failed');
    console.log('Error type:', typeof error);
    console.log('Error message:', error?.message || 'undefined');
    console.log('Error stack:', error?.stack || 'no stack');
    console.log('Full error object:', error);
  }
}

testSimpleDebug().catch(console.error);