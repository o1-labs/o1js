#!/usr/bin/env node
/**
 * Simple Compilation Test
 * 
 * Tests a basic SmartContract compilation to isolate the VK generation ML Array issue
 */

console.log('🎯 Simple Compilation Test - Starting...');

async function testSimpleCompilation() {
  console.log('\n🔍 IMPORTING o1js...');
  const o1js = await import('./dist/node/index.js');
  const { switchBackend } = o1js;
  
  console.log('🔍 SWITCHING TO SPARKY BACKEND...');
  try {
    await switchBackend('sparky');
    console.log('✅ Backend switched to sparky successfully');
  } catch (error) {
    console.log('❌ Backend switch failed:', error.message);
    return { success: false, error: error.message };
  }
  
  console.log('\n🔍 IMPORTING COMPILATION TEST...');
  try {
    const compilationImpl = await import('./dist/node/test/sparky/suites/comprehensive/circuit-compilation.impl.js');
    
    console.log('🔍 STARTING BASIC SMARTCONTRACT COMPILATION...');
    console.log('🔍 This should trigger the exact VK generation path that is failing...');
    
    const result = await compilationImpl.basicSmartContractCompilation('sparky');
    
    console.log('\n🔍 COMPILATION RESULT:');
    console.log('Success:', result.success);
    console.log('Backend:', result.backend);
    console.log('Contract:', result.contractName);
    console.log('VK Exists:', result.verificationKeyExists);
    console.log('VK Hash:', result.verificationKeyHash);
    console.log('Methods:', result.methodCount);
    console.log('Time:', result.compilationTime + 'ms');
    
    if (!result.success) {
      console.log('Error:', result.error);
    }
    
    return { success: result.success, error: result.error };
  } catch (error) {
    console.log(`\n❌ COMPILATION TEST FAILED`);
    console.log('❌ Error type:', typeof error);
    console.log('❌ Error constructor:', error?.constructor?.name);
    console.log('❌ Error message:', error.message);
    console.log('❌ Error stack:', error.stack);
    
    return { success: false, error: error.message };
  }
}

async function main() {
  console.log('🎯 Simple Compilation Test - SmartContract Compilation');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  const result = await testSimpleCompilation();
  
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🎯 Simple Compilation Test - Results:');
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