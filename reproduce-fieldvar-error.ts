/**
 * Reproduce the exact FieldVar format error from the test suite
 */

import { SmartContract, State, state, Field, method, Mina, switchBackend, getCurrentBackend } from './dist/node/index.js';

// Add BigInt serialization
(BigInt.prototype as any).toJSON = function() { return this.toString(); };

async function reproduceError() {
  console.log('🔍 Reproducing FieldVar Format Error');
  console.log('====================================\n');
  
  // Switch to Sparky backend
  await switchBackend('sparky');
  console.log('✅ Using Sparky backend:', getCurrentBackend());
  
  // Set up minimal local blockchain
  try {
    const Local = await Mina.LocalBlockchain({ proofsEnabled: false });
    Mina.setActiveInstance(Local);
    console.log('✅ LocalBlockchain initialized\n');
  } catch (error) {
    console.error('Failed to set up LocalBlockchain:', error);
    return;
  }
  
  // Define the exact same contract from the test
  class TestContract extends SmartContract {
    @state(Field) value = State();
    
    init() {
      super.init();
      this.value.set(Field(0));
    }
    
    @method async increment() {
      const current = this.value.getAndRequireEquals();
      const newValue = (current as any).add(Field(1));
      this.value.set(newValue);
    }
  }
  
  console.log('🔧 Starting compilation...\n');
  
  try {
    console.log(`🔍 COMPILATION DEBUG [sparky]: Starting TestContract.compile()`);
    const compilationResult = await TestContract.compile();
    console.log(`🔍 COMPILATION DEBUG [sparky]: Compilation succeeded`);
    console.log('Result:', compilationResult);
  } catch (error: any) {
    console.log(`🔍 COMPILATION DEBUG [sparky]: Raw error object:`, error);
    console.log(`🔍 COMPILATION DEBUG [sparky]: Error type:`, typeof error);
    console.log(`🔍 COMPILATION DEBUG [sparky]: Error constructor:`, error?.constructor?.name);
    
    if (error instanceof Error) {
      console.log(`🔍 COMPILATION DEBUG [sparky]: Error message: ${error.message}`);
      console.log(`🔍 COMPILATION DEBUG [sparky]: Error stack:`, error.stack);
    } else {
      console.log(`🔍 COMPILATION DEBUG [sparky]: Non-Error thrown: ${String(error)}`);
    }
    
    // Check if this is the FieldVar format error
    const errorStr = String(error);
    if (errorStr.includes('FieldVar format') || errorStr.includes('4 arguments')) {
      console.log('\n🎯 FOUND THE FIELDVAR FORMAT ERROR!');
      console.log('This is the exact error from the test suite.');
    }
  }
}

reproduceError().catch(console.error);