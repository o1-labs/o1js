import { Field, Bool, Provable } from './dist/node/index.js';
import { switchBackend } from './dist/node/bindings.js';

console.log('🔬 Testing Bool Witness Constraint Generation\n');

// Test 1: How many constraints does a Bool witness generate?
async function testBoolWitness() {
  for (const backend of ['snarky', 'sparky']) {
    console.log(`\n📊 ${backend} backend:`);
    await switchBackend(backend);
    
    // Test single Bool witness
    console.log('\nTest 1: Single Bool witness');
    const cs1 = await Provable.constraintSystem(() => {
      const b = Provable.witness(Bool, () => Bool.from(true));
    });
    console.log(`Constraints: ${cs1.rows}`);
    
    // Test two Bool witnesses
    console.log('\nTest 2: Two Bool witnesses');
    const cs2 = await Provable.constraintSystem(() => {
      const b1 = Provable.witness(Bool, () => Bool.from(true));
      const b2 = Provable.witness(Bool, () => Bool.from(false));
    });
    console.log(`Constraints: ${cs2.rows}`);
    
    // Test Bool witness + toField
    console.log('\nTest 3: Bool witness converted to Field');
    const cs3 = await Provable.constraintSystem(() => {
      const b = Provable.witness(Bool, () => Bool.from(true));
      const f = b.toField();
    });
    console.log(`Constraints: ${cs3.rows}`);
    
    // Test Bool witness + operation
    console.log('\nTest 4: Bool witness + AND operation');
    const cs4 = await Provable.constraintSystem(() => {
      const b1 = Provable.witness(Bool, () => Bool.from(true));
      const b2 = Provable.witness(Bool, () => Bool.from(false));
      const result = b1.and(b2);
    });
    console.log(`Constraints: ${cs4.rows}`);
    
    // Skip test 5 as it requires constant field
  }
}

// Test 2: Trace where boolean assertions are added
async function traceBooleanAssertions() {
  console.log('\n\n🔍 Tracing Boolean Assertion Generation:');
  
  await switchBackend('sparky');
  
  // Create a custom Bool that logs when assertBoolean is called
  const originalAssertBoolean = Bool.prototype.assertBoolean;
  let assertionCount = 0;
  
  Bool.prototype.assertBoolean = function() {
    assertionCount++;
    console.log(`  📍 assertBoolean() called #${assertionCount} on Bool instance`);
    return originalAssertBoolean.call(this);
  };
  
  console.log('\nRunning Bool witness test with tracing...');
  const cs = await Provable.constraintSystem(() => {
    console.log('  Creating Bool witness...');
    const b = Provable.witness(Bool, () => {
      console.log('    Inside witness computation');
      return Bool.from(true);
    });
    console.log('  Bool witness created');
  });
  
  console.log(`\nTotal assertBoolean calls: ${assertionCount}`);
  console.log(`Total constraints generated: ${cs.rows}`);
  
  // Restore original function
  Bool.prototype.assertBoolean = originalAssertBoolean;
}

// Run tests
async function runTests() {
  try {
    await testBoolWitness();
    await traceBooleanAssertions();
    
    console.log('\n\n📋 ANALYSIS:');
    console.log('The issue is that Bool witnesses generate multiple constraints.');
    console.log('We need to find where these extra assertions are added.');
  } catch (error) {
    console.error('Test failed:', error);
  }
}

runTests();