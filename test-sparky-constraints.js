/**
 * Test Sparky backend constraint generation
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

async function testConstraintGeneration(backend) {
  console.log(`\n=== Testing constraint generation with ${backend} ===`);
  
  await switchBackend(backend);
  console.log(`Current backend: ${getCurrentBackend()}`);
  
  // Test 1: Simple constraint system
  console.log('\n1. Creating simple constraint system:');
  try {
    let cs = Snarky.run.enterConstraintSystem();
    
    // Create some constraints
    const a = new Field(10);
    const b = new Field(20);
    const c = a.add(b);
    c.assertEquals(new Field(30));
    
    const d = a.mul(b);
    d.assertEquals(new Field(200));
    
    // Get constraint system
    const constraintSystem = cs();
    console.log('   ✓ Constraint system created');
    console.log(`   - Type: ${typeof constraintSystem}`);
    console.log(`   - Keys: ${constraintSystem ? Object.keys(constraintSystem).join(', ') : 'null'}`);
    
    if (constraintSystem && constraintSystem.gates) {
      console.log(`   - Number of gates: ${constraintSystem.gates.length}`);
    }
  } catch (error) {
    console.error(`   ✗ Error: ${error.message}`);
  }
  
  // Test 2: Witness generation
  console.log('\n2. Testing witness generation:');
  try {
    let witness = Snarky.run.enterGenerateWitness();
    
    // Create witness values
    const x = Provable.witness(Field, () => new Field(42));
    const y = Provable.witness(Field, () => new Field(58));
    const sum = x.add(y);
    sum.assertEquals(new Field(100));
    
    // Get witness data
    const witnessData = witness();
    console.log('   ✓ Witness generated');
    console.log(`   - Type: ${typeof witnessData}`);
    console.log(`   - Is array: ${Array.isArray(witnessData)}`);
    if (Array.isArray(witnessData)) {
      console.log(`   - Length: ${witnessData.length}`);
    }
  } catch (error) {
    console.error(`   ✗ Error: ${error.message}`);
  }
  
  // Test 3: Gate operations
  console.log('\n3. Testing gate operations:');
  try {
    // Test generic gate
    const g1 = new Field(1);
    const g2 = new Field(2);
    const g3 = new Field(3);
    
    console.log('   - Testing Snarky.gates...');
    if (Snarky.gates && Snarky.gates.generic) {
      console.log('   ✓ Generic gate available');
    } else {
      console.log('   ✗ Generic gate not available');
    }
    
    // Test range check
    if (Snarky.gates && Snarky.gates.rangeCheck0) {
      console.log('   ✓ Range check gate available');
    } else {
      console.log('   ✗ Range check gate not available');
    }
  } catch (error) {
    console.error(`   ✗ Gate error: ${error.message}`);
  }
  
  // Test 4: Constraint system stats
  console.log('\n4. Testing constraint system stats:');
  try {
    // Create a constraint system with known number of constraints
    let cs = Snarky.run.enterConstraintSystem();
    
    // Add exactly 5 multiplication constraints
    for (let i = 0; i < 5; i++) {
      const a = new Field(i + 1);
      const b = new Field(i + 2);
      const c = a.mul(b);
      c.assertEquals(new Field((i + 1) * (i + 2)));
    }
    
    const system = cs();
    
    // Try to get row count
    if (Snarky.constraintSystem && Snarky.constraintSystem.rows) {
      const rows = Snarky.constraintSystem.rows(system);
      console.log(`   ✓ Constraint rows: ${rows}`);
    } else {
      console.log('   ✗ constraintSystem.rows not available');
    }
  } catch (error) {
    console.error(`   ✗ Stats error: ${error.message}`);
  }
}

async function main() {
  console.log('Testing constraint generation with both backends...');
  
  // Test with Sparky
  await testConstraintGeneration('sparky');
  
  // Test with Snarky
  await testConstraintGeneration('snarky');
  
  console.log('\n=== Summary ===');
  console.log('Tests completed. Review the output above to see what works with each backend.');
}

main().catch(console.error);