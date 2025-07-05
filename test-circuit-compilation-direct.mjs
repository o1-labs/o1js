/**
 * Direct test of circuit compilation to see the exact error
 */

import { Field, SmartContract, State, state, method, switchBackend } from './dist/node/index.js';

async function testCircuitCompilation() {
  console.log('🔍 Testing circuit compilation directly...');
  
  // Switch to Sparky backend
  await switchBackend('sparky');
  console.log('✅ Switched to Sparky backend');
  
  // Define a simple SmartContract using manual decorator application
  class TestContract extends SmartContract {
    constructor() {
      super();
      this.value = State();
    }
    
    async setValue(newValue) {
      const current = this.value.getAndRequireEquals();
      newValue.assertGreaterThan(current);
      this.value.set(newValue);
    }
  }
  
  // Apply decorators manually
  state(Field)(TestContract.prototype, 'value');
  method(TestContract.prototype, 'setValue');
  
  console.log('📋 SmartContract defined with manual decorators');
  
  try {
    // Try to compile
    console.log('🔧 Starting compilation...');
    const result = await TestContract.compile();
    console.log('✅ Compilation successful!');
    console.log('Verification key exists:', !!result.verificationKey);
    console.log('Method count:', Object.keys(result.provers || {}).length);
  } catch (error) {
    console.log('❌ Compilation failed:', error.message);
    console.log('Error type:', error.constructor.name);
    console.log('Error stack:', error.stack);
  }
}

testCircuitCompilation().catch(console.error);