#!/usr/bin/env node
/**
 * ML Array Debug Test - Direct Circuit Compilation
 * 
 * This script directly tests circuit compilation to trigger the VK generation
 * path where ML Array parsing is still failing despite the implemented fixes.
 */

console.log('🎯 ML Array Debug Test - Starting...');

async function testBasicFieldOperations() {
  console.log('\n🔍 IMPORTING o1js...');
  const o1js = await import('./dist/node/index.js');
  const { Field, switchBackend } = o1js;
  
  console.log('🔍 SWITCHING TO SPARKY BACKEND...');
  try {
    await switchBackend('sparky');
    console.log('✅ Backend switched to sparky successfully');
  } catch (error) {
    console.log('❌ Backend switch failed:', error.message);
    return { success: false, error: error.message };
  }
  
  console.log('\n🔍 TESTING BASIC FIELD OPERATIONS...');
  console.log('🔍 This should trigger field constant creation through the ML Array parsing logic...');
  
  try {
    // Test basic field constant creation
    console.log('🔍 Creating Field(42)...');
    const field1 = Field(42);
    console.log('✅ Field(42) created successfully');
    
    console.log('🔍 Creating Field(1)...');
    const field2 = Field(1);
    console.log('✅ Field(1) created successfully');
    
    console.log('🔍 Testing field addition...');
    const result = field1.add(field2);
    console.log('✅ Field addition successful, result:', result.toString());
    
    console.log('🔍 Testing field multiplication...');
    const product = field1.mul(field2);
    console.log('✅ Field multiplication successful, result:', product.toString());
    
    return { success: true, error: null };
  } catch (error) {
    console.log(`\n❌ FIELD OPERATIONS FAILED`);
    console.log('❌ Error type:', typeof error);
    console.log('❌ Error constructor:', error?.constructor?.name);
    console.log('❌ Error message:', error.message);
    console.log('❌ Error stack:', error.stack);
    
    return { success: false, error: error.message };
  }
}

async function main() {
  console.log('🎯 ML Array Debug Test - Basic Field Operations');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  const result = await testBasicFieldOperations();
  
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🎯 ML Array Debug Test - Results:');
  console.log('Success:', result.success);
  if (!result.success) {
    console.log('Error:', result.error);
  }
  
  process.exit(result.success ? 0 : 1);
}

main().catch(error => {
  console.error('❌ Unhandled error:', error);
  process.exit(1);
});