/**
 * Test to trace each step of Bool constraint generation
 */

import { Provable } from '../lib/provable/provable.js';
import { Bool } from '../lib/provable/bool.js';
import { Field } from '../lib/provable/field.js';
import { switchBackend } from '../bindings.js';

async function traceBoolConstraints() {
  console.log('🔍 Tracing Bool constraint generation step by step...\n');
  
  await switchBackend('sparky');
  
  // Test a very simple case - just creating a Field and asserting it's boolean
  console.log('📊 Step-by-step test:');
  console.log('1. Create Field witness');
  console.log('2. Call assertBool on it');
  console.log('3. Check constraints after each step\n');
  
  // Step 1: Just create a Field witness
  const step1 = await Provable.constraintSystem(() => {
    const a = Provable.witness(Field, () => new Field(1));
    return a;
  });
  console.log(`After Field witness: ${step1.gates.length} constraints`);
  
  // Step 2: Create Field witness and assert boolean
  const step2 = await Provable.constraintSystem(() => {
    const a = Provable.witness(Field, () => new Field(1));
    a.assertBool();
    return a;
  });
  console.log(`After Field witness + assertBool: ${step2.gates.length} constraints`);
  console.log(`   Therefore assertBool added: ${step2.gates.length - step1.gates.length} constraints`);
  
  // Step 3: Create Bool witness (which internally calls assertBool)
  const step3 = await Provable.constraintSystem(() => {
    const a = Provable.witness(Bool, () => new Bool(true));
    return a;
  });
  console.log(`\nBool witness: ${step3.gates.length} constraints`);
  
  // Step 4: Create multiple Field witnesses to see if there's cross-contamination
  console.log('\n📊 Testing cross-contamination:');
  
  const oneField = await Provable.constraintSystem(() => {
    const a = Provable.witness(Field, () => new Field(123));
    return a;
  });
  console.log(`One Field witness: ${oneField.gates.length} constraints`);
  
  const twoFields = await Provable.constraintSystem(() => {
    const a = Provable.witness(Field, () => new Field(123));
    const b = Provable.witness(Field, () => new Field(456));
    return [a, b];
  });
  console.log(`Two Field witnesses: ${twoFields.gates.length} constraints`);
  console.log(`   Extra constraints: ${twoFields.gates.length - (2 * oneField.gates.length)}`);
  
  // Step 5: Test accumulation issue
  console.log('\n📊 Testing constraint accumulation:');
  
  for (let i = 1; i <= 5; i++) {
    const result = await Provable.constraintSystem(() => {
      const witnesses = [];
      for (let j = 0; j < i; j++) {
        witnesses.push(Provable.witness(Field, () => new Field(j)));
      }
      return witnesses;
    });
    console.log(`${i} Field witnesses: ${result.gates.length} constraints (expected: 0)`);
  }
  
  console.log('\n📊 Same test with Bool:');
  
  for (let i = 1; i <= 5; i++) {
    const result = await Provable.constraintSystem(() => {
      const witnesses = [];
      for (let j = 0; j < i; j++) {
        witnesses.push(Provable.witness(Bool, () => new Bool(j % 2 === 0)));
      }
      return witnesses;
    });
    console.log(`${i} Bool witnesses: ${result.gates.length} constraints (expected: ${i})`);
  }
}

traceBoolConstraints().catch(console.error);