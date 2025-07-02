/**
 * Simple Poseidon test to verify basic functionality
 */

import { Field, Poseidon, initializeBindings, switchBackend } from './dist/node/index.js';

async function main() {
  console.log('🧪 Simple Poseidon Test');
  console.log('========================');
  
  try {
    await initializeBindings();
    console.log('✅ Bindings initialized');
    
    // Test with Snarky backend
    console.log('\n🔵 Testing Snarky backend...');
    await switchBackend('snarky');
    
    try {
      const input1 = Field(100);
      const input2 = Field(0);
      const result1 = Poseidon.hash([input1, input2]);
      console.log(`✅ Snarky result: ${result1.toString()}`);
    } catch (e: any) {
      console.log(`❌ Snarky error: ${e.message}`);
    }
    
    // Test with Sparky backend
    console.log('\n🟠 Testing Sparky backend...');
    await switchBackend('sparky');
    
    try {
      const input1 = Field(100);
      const input2 = Field(0);
      const result2 = Poseidon.hash([input1, input2]);
      console.log(`✅ Sparky result: ${result2.toString()}`);
    } catch (e: any) {
      console.log(`❌ Sparky error: ${e.message}`);
      console.log('Stack:', e.stack);
    }
    
  } catch (error: any) {
    console.error('💥 Test failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

main().catch(console.error);