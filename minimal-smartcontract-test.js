/**
 * Minimal SmartContract compilation test
 * Tests the core issue with @method decorator compilation
 */

import { SmartContract, State, state, Field, method, Mina, switchBackend } from './dist/node/index.js';

console.log('🔍 MINIMAL SMARTCONTRACT COMPILATION TEST');

// Test SmartContract compilation on both backends
async function testSmartContractCompilation() {
  console.log('\n=== Testing SmartContract Compilation ===');
  
  // Create a minimal test contract (no decorators - basic compilation test)
  class TestContract extends SmartContract {
    init() {
      super.init();
      // Just basic initialization - no state or methods
    }
  }
  
  // Test on Snarky backend
  console.log('\n--- Testing Snarky Backend ---');
  try {
    await switchBackend('snarky');
    console.log('✓ Switched to Snarky backend');
    
    const Local = await Mina.LocalBlockchain({ proofsEnabled: false });
    Mina.setActiveInstance(Local);
    console.log('✓ LocalBlockchain setup');
    
    const snarkyResult = await TestContract.compile();
    console.log('✅ Snarky compilation SUCCESS');
    console.log('  VK exists:', !!snarkyResult.verificationKey);
    console.log('  VK hash:', snarkyResult.verificationKey?.hash || 'missing');
    console.log('  Provers:', Object.keys(snarkyResult.provers || {}));
    
  } catch (error) {
    console.log('❌ Snarky compilation FAILED:', error.message);
  }
  
  // Test on Sparky backend
  console.log('\n--- Testing Sparky Backend ---');
  try {
    await switchBackend('sparky');
    console.log('✓ Switched to Sparky backend');
    
    const Local = await Mina.LocalBlockchain({ proofsEnabled: false });
    Mina.setActiveInstance(Local);
    console.log('✓ LocalBlockchain setup');
    
    const sparkyResult = await TestContract.compile();
    console.log('✅ Sparky compilation SUCCESS');
    console.log('  VK exists:', !!sparkyResult.verificationKey);
    console.log('  VK hash:', sparkyResult.verificationKey?.hash || 'missing');
    console.log('  Provers:', Object.keys(sparkyResult.provers || {}));
    
  } catch (error) {
    console.log('❌ Sparky compilation FAILED:', error.message);
    console.log('Stack:', error.stack?.split('\n').slice(0, 10).join('\n'));
  }
}

// Run the test
testSmartContractCompilation().catch(console.error);