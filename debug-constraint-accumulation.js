/**
 * Debug script to test constraint accumulation
 */

import { switchBackend, getCurrentBackend, Field } from './dist/node/index.js';

async function debugConstraintAccumulation() {
  console.log('🔍 DEBUGGING: Constraint accumulation in Sparky backend');
  
  try {
    // Switch to Sparky backend
    await switchBackend('sparky');
    console.log(`✅ Switched to backend: ${getCurrentBackend()}`);
    
    // Get access to Sparky instance
    const sparkyInstance = globalThis.__sparkyInstance;
    if (!sparkyInstance) {
      throw new Error('Sparky instance not found on global as __sparkyInstance');
    }
    
    console.log('\n🧪 Test 1: Check initial constraint count');
    const constraintSystem1 = sparkyInstance.constraintSystem;
    const json1 = constraintSystem1.toJson();
    console.log('Initial constraints JSON:', JSON.stringify(json1, null, 2));
    
    console.log('\n🧪 Test 2: Test WITH PROPERLY CONSTRAINED WITNESSES');
    const { Provable } = await import('./dist/node/index.js');
    
    // Create witness variables
    const a = Provable.witness(Field, () => Field(5));
    const b = Provable.witness(Field, () => Field(10));
    
    console.log('\n🧪 Test 3: CONSTRAIN the witnesses (this should generate constraints!)');
    // Force constraint generation by asserting witness values
    a.assertEquals(Field(5));  // This should create a constraint!
    b.assertEquals(Field(10)); // This should create a constraint!
    
    const json2 = constraintSystem1.toJson();
    console.log('After constraining witnesses JSON:', JSON.stringify(json2, null, 2));
    
    console.log('\n🧪 Test 4: Addition with constrained witnesses');
    const c = a.add(b);
    console.log('Addition result:', c.toString());
    
    const json3 = constraintSystem1.toJson();
    console.log('After addition JSON:', JSON.stringify(json3, null, 2));
    
    console.log('\n🧪 Test 5: Assert the addition result');
    c.assertEquals(Field(15)); // This should definitely create a constraint!
    
    const json4 = constraintSystem1.toJson();
    console.log('After final assertion JSON:', JSON.stringify(json4, null, 2));
    
    console.log('\n🧪 Test 8: CONSTANT arithmetic (should be optimized away)');
    const const1 = Field(100);
    const const2 = Field(200);
    const const3 = const1.add(const2);
    console.log('Constant addition result:', const3.toString());
    
    console.log('\n🧪 Test 9: Check that constants don\'t add constraints');
    const json5 = constraintSystem1.toJson();
    console.log('After constant ops JSON:', JSON.stringify(json5, null, 2));
    
  } catch (error) {
    console.error('❌ Debug failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

debugConstraintAccumulation();