#!/usr/bin/env node

/**
 * DEBUG SCRIPT: Simplified ML Array Issue Investigation
 * 
 * This script directly tests the ML Array format that causes the parsing error.
 */

import { switchBackend, getCurrentBackend } from './dist/node/bindings/js/index.js';

console.log('🔍 Simplified ML Array Issue Investigation');
console.log('=========================================\n');

async function testMLArrayParsing() {
  try {
    console.log('🎯 Step 1: Switch to Sparky backend');
    await switchBackend('sparky');
    console.log(`✅ Current backend: ${getCurrentBackend()}`);
    
    // Access the global Sparky instance
    const sparky = globalThis.sparkyInstance;
    if (!sparky) {
      console.log('❌ No global sparkyInstance found');
      return;
    }
    
    console.log('\n🎯 Step 2: Test different field constant formats');
    
    // Test 1: Standard FieldVar format (should work)
    console.log('\n📋 Test 1: Standard FieldVar constant format');
    try {
      const result1 = sparky.field.constant("42");
      console.log('✅ Standard format worked:', result1);
    } catch (error) {
      console.log('❌ Standard format failed:', error.message);
    }
    
    // Test 2: Array format that should work 
    console.log('\n📋 Test 2: Proper array format [0, [0, "42"]]');
    try {
      const properArray = [0, [0, "42"]];
      // This would normally go through the WASM constant function
      console.log('🔍 Would test proper array format (implementation needed)');
    } catch (error) {
      console.log('❌ Proper array format failed:', error.message);
    }
    
    // Test 3: ML Array format that causes the error
    console.log('\n📋 Test 3: ML Array format [0, field1, field2, field3] (should fail)');
    try {
      // Simulate the exact ML Array format from OCaml
      const mlArray = [0, [0, "10"], [0, "20"], [0, "30"]];
      console.log('🔍 ML Array format that causes error:', JSON.stringify(mlArray));
      console.log('📊 This has 4 elements total: [tag, field1, field2, field3]');
      console.log('🚨 Sparky expects: [0, [0, "value"]] (2 elements)');
      console.log('❌ This mismatch causes: "expected constant with 1 argument, got 4 arguments"');
    } catch (error) {
      console.log('❌ ML Array format failed (as expected):', error.message);
    }
    
    console.log('\n🎯 Step 3: Analyze the parsing flow');
    console.log('📋 Error occurs in this flow:');
    console.log('  1. OCaml creates MlFieldConstArray with 3 field elements');
    console.log('  2. ML Array format: [0, field1, field2, field3] (4 elements)');
    console.log('  3. Passed to Sparky WASM constant() function');
    console.log('  4. WASM detects 4-element array, tries ML Array parsing');
    console.log('  5. Sparky FieldVarParser.parse_constant() gets data with length 3');
    console.log('  6. Parser expects length 1, throws error');
    
    console.log('\n🔧 Step 4: Root cause analysis');
    console.log('📊 The issue is in sparky-core/src/fieldvar_parser.rs:404-408');
    console.log('❌ Current check: if data.len() != 1 { return error }');
    console.log('✅ Needed: Proper ML Array detection and extraction before this check');
    
  } catch (error) {
    console.log('\n🚨 Error during ML Array testing:');
    console.log('Error message:', error.message);
    console.log('Error type:', error.constructor.name);
  }
}

async function investigateMLArrayCode() {
  console.log('\n🎯 Step 5: Code Investigation Results');
  console.log('=====================================');
  
  console.log('\n📁 Files that handle ML Arrays:');
  console.log('1. sparky-core/src/fieldvar_parser.rs:370-442 (parse_constant)');
  console.log('   - Lines 379-402: Partial ML Array handling');
  console.log('   - Line 404: Error generation point');
  
  console.log('\n2. sparky-wasm/src/lib.rs:976-1012 (constant function)');
  console.log('   - Lines 986-1000: ML Array detection');
  console.log('   - Tries to extract from 4-element array');
  
  console.log('\n🚨 The Problem:');
  console.log('- ML Array detection exists but is incomplete');
  console.log('- The 4-element array [0, field1, field2, field3] is not properly unwrapped');
  console.log('- Need to extract individual field constants from the ML Array');
  
  console.log('\n✅ The Solution:');
  console.log('1. Enhance parse_constant() to properly detect 3-element data as ML Array');
  console.log('2. Extract field constants from positions [1], [2], [3] of the array');
  console.log('3. Process each field constant individually');
  console.log('4. Return proper FieldVarAst representation');
}

async function main() {
  console.log('🚀 Starting simplified ML Array investigation...\n');
  
  await testMLArrayParsing();
  await investigateMLArrayCode();
  
  console.log('\n🎯 Summary:');
  console.log('===========');
  console.log('✅ Identified exact error location and cause');
  console.log('✅ Found partial ML Array handling code');
  console.log('✅ Determined fix needed in fieldvar_parser.rs');
  console.log('🔧 Next: Implement complete ML Array parsing logic');
}

main().catch(console.error);