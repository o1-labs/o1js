/**
 * Comprehensive test for field.readVar functionality
 */

import { 
  switchBackend, 
  getCurrentBackend,
  Snarky 
} from './dist/node/bindings.js';
import { Field } from './dist/node/lib/provable/field.js';
import { Provable } from './dist/node/lib/provable/provable.js';

async function testReadVar() {
  console.log('=== Comprehensive field.readVar Test ===\n');
  
  await switchBackend('sparky');
  console.log(`Testing with ${getCurrentBackend()} backend\n`);
  
  // Test 1: readVar with constants
  console.log('1. Testing readVar with constants:');
  try {
    const constantField = Snarky.field.fromNumber(42);
    console.log('   Created constant field:', constantField);
    
    Snarky.run.asProver(() => {
      const value = Snarky.field.readVar(constantField);
      console.log(`   ✓ Read constant value: ${value}`);
    });
  } catch (e) {
    console.error(`   ✗ Error: ${e.message}`);
  }
  
  // Test 2: readVar with variables
  console.log('\n2. Testing readVar with witness variables:');
  try {
    Snarky.run.asProver(() => {
      // Create a witness variable
      const witnessVar = Provable.witness(Field, () => new Field(123));
      console.log('   Created witness variable');
      
      // Try to read its value
      const value = Snarky.field.readVar(witnessVar.value);
      console.log(`   ✓ Read witness variable value: ${value}`);
    });
  } catch (e) {
    console.error(`   ✗ Error: ${e.message}`);
  }
  
  // Test 3: readVar with compound expressions
  console.log('\n3. Testing readVar with compound expressions:');
  try {
    Snarky.run.asProver(() => {
      const a = new Field(10);
      const b = new Field(20);
      const sum = a.add(b);
      
      console.log('   Created sum: 10 + 20');
      const value = Snarky.field.readVar(sum.value);
      console.log(`   ✓ Read compound expression value: ${value}`);
    });
  } catch (e) {
    console.error(`   ✗ Error: ${e.message}`);
  }
  
  // Test 4: readVar outside prover mode (should fail)
  console.log('\n4. Testing readVar outside prover mode:');
  try {
    const field = Snarky.field.fromNumber(100);
    const value = Snarky.field.readVar(field);
    console.log(`   ✗ Unexpectedly succeeded: ${value}`);
  } catch (e) {
    console.log(`   ✓ Correctly failed: ${e.message}`);
  }
  
  // Test 5: Field.toConstant() which uses readVar
  console.log('\n5. Testing Field.toConstant() (uses readVar internally):');
  try {
    Snarky.run.asProver(() => {
      const field = Provable.witness(Field, () => new Field(999));
      const constant = field.toConstant();
      console.log(`   ✓ Field.toConstant() worked: ${constant.toBigInt()}`);
    });
  } catch (e) {
    console.error(`   ✗ Error: ${e.message}`);
  }
  
  // Test 6: Bool.toBoolean() which uses readVar
  console.log('\n6. Testing Bool.toBoolean() (uses readVar internally):');
  try {
    const { Bool } = await import('./dist/node/lib/provable/bool.js');
    
    Snarky.run.asProver(() => {
      const boolTrue = new Bool(true);
      const boolFalse = new Bool(false);
      
      const trueValue = boolTrue.toBoolean();
      const falseValue = boolFalse.toBoolean();
      
      console.log(`   ✓ Bool.toBoolean() worked: true=${trueValue}, false=${falseValue}`);
    });
  } catch (e) {
    console.error(`   ✗ Error: ${e.message}`);
  }
}

testReadVar().catch(console.error);