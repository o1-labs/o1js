/**
 * Detailed test to see what constraints are generated for Bool operations
 */

import { Provable } from '../lib/provable/provable.js';
import { Bool } from '../lib/provable/bool.js';
import { Field } from '../lib/provable/field.js';
import { getCurrentBackend, switchBackend } from '../bindings.js';

async function testBoolConstraintDetails() {
  console.log('🔍 Detailed Bool constraint analysis...\n');
  
  // Only test Sparky to focus on the issue
  await switchBackend('sparky');
  console.log('Using Sparky backend\n');
  
  // Test 1: Create a Field witness to compare
  console.log('📊 Test 1: Field witness (baseline)');
  const fieldWitness = await Provable.constraintSystem(() => {
    const a = Provable.witness(Field, () => new Field(123));
    return a;
  });
  console.log(`   Field witness constraints: ${fieldWitness.gates.length}`);
  console.log(`   Gates:`, JSON.stringify(fieldWitness.gates, null, 2));
  
  // Test 2: Create a Bool witness
  console.log('\n📊 Test 2: Bool witness');
  const boolWitness = await Provable.constraintSystem(() => {
    const a = Provable.witness(Bool, () => new Bool(true));
    return a;
  });
  console.log(`   Bool witness constraints: ${boolWitness.gates.length}`);
  console.log(`   Gates:`, JSON.stringify(boolWitness.gates, null, 2));
  
  // Test 3: Create two Field witnesses
  console.log('\n📊 Test 3: Two Field witnesses');
  const twoFields = await Provable.constraintSystem(() => {
    const a = Provable.witness(Field, () => new Field(123));
    const b = Provable.witness(Field, () => new Field(456));
    return [a, b];
  });
  console.log(`   Two Field witnesses constraints: ${twoFields.gates.length}`);
  
  // Test 4: Create two Bool witnesses
  console.log('\n📊 Test 4: Two Bool witnesses');
  const twoBools = await Provable.constraintSystem(() => {
    const a = Provable.witness(Bool, () => new Bool(true));
    const b = Provable.witness(Bool, () => new Bool(false));
    return [a, b];
  });
  console.log(`   Two Bool witnesses constraints: ${twoBools.gates.length}`);
  console.log(`   Gates:`, JSON.stringify(twoBools.gates, null, 2));
  
  // Test 5: Check if Bool.check is being called multiple times
  console.log('\n📊 Test 5: Manual Bool check');
  const manualCheck = await Provable.constraintSystem(() => {
    const a = Provable.witness(Field, () => new Field(1));
    a.assertBool(); // Manually assert boolean constraint
    return a;
  });
  console.log(`   Manual assertBool constraints: ${manualCheck.gates.length}`);
  console.log(`   Gates:`, JSON.stringify(manualCheck.gates, null, 2));
  
  // Test 6: Multiple manual checks
  console.log('\n📊 Test 6: Two manual Bool checks');
  const twoManualChecks = await Provable.constraintSystem(() => {
    const a = Provable.witness(Field, () => new Field(1));
    const b = Provable.witness(Field, () => new Field(0));
    a.assertBool();
    b.assertBool();
    return [a, b];
  });
  console.log(`   Two manual assertBool constraints: ${twoManualChecks.gates.length}`);
}

testBoolConstraintDetails().catch(console.error);