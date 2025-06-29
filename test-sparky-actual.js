/**
 * Test Sparky backend with actual o1js operations
 */

import { 
  initializeBindings, 
  switchBackend, 
  getCurrentBackend,
  Snarky 
} from './dist/node/bindings.js';
import { Field } from './dist/node/lib/provable/field.js';
import { Bool } from './dist/node/lib/provable/bool.js';
import { Provable } from './dist/node/lib/provable/provable.js';
import { UInt64 } from './dist/node/lib/provable/int.js';

async function testSparkyBackend() {
  console.log('=== Sparky Backend Functional Test ===\n');
  
  // Set environment variable to use Sparky
  process.env.O1JS_BACKEND = 'sparky';
  
  // Initialize with Sparky
  await initializeBindings('sparky');
  console.log(`Current backend: ${getCurrentBackend()}`);
  console.log('');
  
  // Test 1: Basic Field operations
  console.log('1. Testing Field operations:');
  try {
    const a = new Field(10);
    const b = new Field(20);
    const c = a.add(b);
    console.log(`   ✓ Field addition: ${a.toBigInt()} + ${b.toBigInt()} = ${c.toBigInt()}`);
    
    const d = a.mul(b);
    console.log(`   ✓ Field multiplication: ${a.toBigInt()} * ${b.toBigInt()} = ${d.toBigInt()}`);
    
    const e = b.sub(a);
    console.log(`   ✓ Field subtraction: ${b.toBigInt()} - ${a.toBigInt()} = ${e.toBigInt()}`);
    
    const f = new Field(100);
    const g = f.div(a);
    console.log(`   ✓ Field division: ${f.toBigInt()} / ${a.toBigInt()} = ${g.toBigInt()}`);
  } catch (error) {
    console.error(`   ✗ Field operations failed: ${error.message}`);
    console.error(error.stack);
  }
  
  // Test 2: Field constraints
  console.log('\n2. Testing Field constraints:');
  try {
    const x = new Field(42);
    const y = new Field(42);
    x.assertEquals(y);
    console.log('   ✓ Field.assertEquals works');
    
    const z = new Field(0);
    z.assertNotEquals(x);
    console.log('   ✓ Field.assertNotEquals works');
  } catch (error) {
    console.error(`   ✗ Field constraints failed: ${error.message}`);
  }
  
  // Test 3: Bool operations
  console.log('\n3. Testing Bool operations:');
  try {
    const t = new Bool(true);
    const f = new Bool(false);
    
    const and = t.and(f);
    console.log(`   ✓ Bool AND: true && false = ${and.toBoolean()}`);
    
    const or = t.or(f);
    console.log(`   ✓ Bool OR: true || false = ${or.toBoolean()}`);
    
    const not = t.not();
    console.log(`   ✓ Bool NOT: !true = ${not.toBoolean()}`);
  } catch (error) {
    console.error(`   ✗ Bool operations failed: ${error.message}`);
  }
  
  // Test 4: Provable.witness
  console.log('\n4. Testing Provable.witness:');
  try {
    const witnessed = Provable.witness(Field, () => new Field(123));
    console.log(`   ✓ Witnessed Field value: ${witnessed.toBigInt()}`);
  } catch (error) {
    console.error(`   ✗ Provable.witness failed: ${error.message}`);
  }
  
  // Test 5: UInt64 operations
  console.log('\n5. Testing UInt64 operations:');
  try {
    const u1 = UInt64.from(100);
    const u2 = UInt64.from(200);
    const u3 = u1.add(u2);
    console.log(`   ✓ UInt64 addition: ${u1.toBigInt()} + ${u2.toBigInt()} = ${u3.toBigInt()}`);
  } catch (error) {
    console.error(`   ✗ UInt64 operations failed: ${error.message}`);
  }
  
  // Test 6: Prover context
  console.log('\n6. Testing prover context:');
  try {
    let proverValue = null;
    Snarky.run.asProver(() => {
      proverValue = 'executed in prover';
    });
    console.log(`   ✓ asProver executed: ${proverValue}`);
    
    const isProver = Snarky.run.inProver();
    console.log(`   ✓ inProver check: ${isProver}`);
  } catch (error) {
    console.error(`   ✗ Prover context failed: ${error.message}`);
  }
  
  // Test 7: Low-level Snarky API
  console.log('\n7. Testing low-level Snarky API:');
  try {
    // Test field creation
    const fieldVar = Snarky.field.fromNumber(42);
    console.log(`   ✓ Snarky.field.fromNumber works`);
    
    // Test field read
    try {
      console.log(`   - fieldVar value:`, fieldVar);
      console.log(`   - Checking if we're in prover mode:`, Snarky.run.inProver());
      
      // Try reading in prover mode
      Snarky.run.asProver(() => {
        const value = Snarky.field.readVar(fieldVar);
        console.log(`   ✓ Snarky.field.readVar works: ${value}`);
      });
    } catch (e) {
      console.log(`   ✗ Snarky.field.readVar failed: ${e.message}`);
      console.error(e.stack);
    }
    
    // Test field assertion
    const fieldVar2 = Snarky.field.fromNumber(42);
    Snarky.field.assertEqual(fieldVar, fieldVar2);
    console.log(`   ✓ Snarky.field.assertEqual works`);
  } catch (error) {
    console.error(`   ✗ Low-level API failed: ${error.message}`);
  }
  
  // Test 8: Compare with Snarky backend
  console.log('\n8. Comparing with Snarky backend:');
  
  // Get Sparky results
  const sparkyField = new Field(123);
  const sparkyDouble = sparkyField.add(sparkyField);
  console.log(`   Sparky: ${sparkyField.toBigInt()} * 2 = ${sparkyDouble.toBigInt()}`);
  
  // Switch to Snarky
  await switchBackend('snarky');
  console.log(`   Switched to: ${getCurrentBackend()}`);
  
  const snarkyField = new Field(123);
  const snarkyDouble = snarkyField.add(snarkyField);
  console.log(`   Snarky: ${snarkyField.toBigInt()} * 2 = ${snarkyDouble.toBigInt()}`);
  
  if (sparkyDouble.toBigInt() === snarkyDouble.toBigInt()) {
    console.log('   ✓ Results match between backends');
  } else {
    console.log('   ✗ Results differ between backends!');
  }
}

// Run the test
testSparkyBackend().catch(console.error);