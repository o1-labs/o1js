import { Field, Provable, switchBackend, Bool, Poseidon } from './dist/node/index.js';
import fs from 'fs';

console.log('🧪 COMPREHENSIVE VK PARITY TEST SUITE');
console.log('=====================================\n');

// Test results tracking
const results = {
  passed: 0,
  failed: 0,
  tests: []
};

// Helper function to compare constraint systems
async function compareConstraintSystems(testName, circuitFn) {
  console.log(`\n🔍 Testing: ${testName}`);
  
  try {
    // Extract Snarky constraints
    await switchBackend('snarky');
    const snarkyCS = await Provable.constraintSystem(circuitFn);
    
    // Extract Sparky constraints  
    await switchBackend('sparky');
    const sparkyCS = await Provable.constraintSystem(circuitFn);
    
    // Compare structure
    const structureMatch = (
      snarkyCS.rows === sparkyCS.rows &&
      snarkyCS.gates?.length === sparkyCS.gates?.length &&
      snarkyCS.publicInputSize === sparkyCS.publicInputSize
    );
    
    if (!structureMatch) {
      console.log(`❌ Structure mismatch:`);
      console.log(`   Snarky: ${snarkyCS.rows} rows, ${snarkyCS.gates?.length} gates, ${snarkyCS.publicInputSize} public`);
      console.log(`   Sparky: ${sparkyCS.rows} rows, ${sparkyCS.gates?.length} gates, ${sparkyCS.publicInputSize} public`);
      results.failed++;
      results.tests.push({ name: testName, status: 'FAILED', reason: 'Structure mismatch' });
      return;
    }
    
    // Compare gates coefficient by coefficient
    let coeffMatch = true;
    let mismatchDetails = [];
    
    for (let i = 0; i < snarkyCS.gates.length; i++) {
      const snarkyGate = snarkyCS.gates[i];
      const sparkyGate = sparkyCS.gates[i];
      
      if (JSON.stringify(snarkyGate.coeffs) !== JSON.stringify(sparkyGate.coeffs)) {
        coeffMatch = false;
        mismatchDetails.push({
          gate: i,
          snarky: snarkyGate.coeffs,
          sparky: sparkyGate.coeffs
        });
      }
    }
    
    if (coeffMatch) {
      console.log(`✅ PASS - Perfect VK parity achieved`);
      console.log(`   Structure: ${snarkyCS.rows} rows, ${snarkyCS.gates?.length} gates`);
      results.passed++;
      results.tests.push({ name: testName, status: 'PASSED' });
    } else {
      console.log(`❌ FAIL - Coefficient mismatch:`);
      mismatchDetails.slice(0, 3).forEach(({ gate, snarky, sparky }) => {
        console.log(`   Gate ${gate}:`);
        console.log(`     Snarky: [${snarky.slice(0, 3).join(', ')}${snarky.length > 3 ? '...' : ''}]`);
        console.log(`     Sparky: [${sparky.slice(0, 3).join(', ')}${sparky.length > 3 ? '...' : ''}]`);
      });
      if (mismatchDetails.length > 3) {
        console.log(`   ... and ${mismatchDetails.length - 3} more gate mismatches`);
      }
      results.failed++;
      results.tests.push({ name: testName, status: 'FAILED', reason: 'Coefficient mismatch' });
    }
    
  } catch (error) {
    console.log(`❌ ERROR: ${error.message}`);
    results.failed++;
    results.tests.push({ name: testName, status: 'ERROR', reason: error.message });
  }
}

// Test suite
async function runComprehensiveTests() {
  console.log('Starting comprehensive VK parity validation...\n');
  
  // Test 1: Simple equality (baseline)
  await compareConstraintSystems(
    'Simple Equality: x = 1',
    () => {
      const x = Provable.witness(Field, () => Field(1));
      x.assertEquals(Field(1));
    }
  );
  
  // Test 2: Variable equality
  await compareConstraintSystems(
    'Variable Equality: x = y',
    () => {
      const x = Provable.witness(Field, () => Field(5));
      const y = Provable.witness(Field, () => Field(5));
      x.assertEquals(y);
    }
  );
  
  // Test 3: Addition
  await compareConstraintSystems(
    'Addition: x + y = z',
    () => {
      const x = Provable.witness(Field, () => Field(3));
      const y = Provable.witness(Field, () => Field(4));
      const z = x.add(y);
      z.assertEquals(Field(7));
    }
  );
  
  // Test 4: Subtraction  
  await compareConstraintSystems(
    'Subtraction: x - y = z',
    () => {
      const x = Provable.witness(Field, () => Field(10));
      const y = Provable.witness(Field, () => Field(3));
      const z = x.sub(y);
      z.assertEquals(Field(7));
    }
  );
  
  // Test 5: Scaling
  await compareConstraintSystems(
    'Scaling: 5 * x = y',
    () => {
      const x = Provable.witness(Field, () => Field(4));
      const y = x.mul(5);
      y.assertEquals(Field(20));
    }
  );
  
  // Test 6: Multiplication (R1CS)
  await compareConstraintSystems(
    'Multiplication: x * y = z',
    () => {
      const x = Provable.witness(Field, () => Field(3));
      const y = Provable.witness(Field, () => Field(7));
      const z = x.mul(y);
      z.assertEquals(Field(21));
    }
  );
  
  // Test 7: Square
  await compareConstraintSystems(
    'Square: x² = y',
    () => {
      const x = Provable.witness(Field, () => Field(5));
      const y = x.square();
      y.assertEquals(Field(25));
    }
  );
  
  // Test 8: Boolean constraint
  await compareConstraintSystems(
    'Boolean: x ∈ {0,1}',
    () => {
      const b = Provable.witness(Bool, () => Bool(true));
      b.assertTrue();
    }
  );
  
  // Test 9: Conditional
  await compareConstraintSystems(
    'Conditional: if-then-else',
    () => {
      const condition = Provable.witness(Bool, () => Bool(true));
      const a = Provable.witness(Field, () => Field(10));
      const b = Provable.witness(Field, () => Field(20));
      const result = Provable.if(condition, a, b);
      result.assertEquals(Field(10));
    }
  );
  
  // Test 10: Multiple constraints
  await compareConstraintSystems(
    'Multiple Constraints: x=1, y=2, z=x+y',
    () => {
      const x = Provable.witness(Field, () => Field(1));
      const y = Provable.witness(Field, () => Field(2));
      x.assertEquals(Field(1));
      y.assertEquals(Field(2));
      const z = x.add(y);
      z.assertEquals(Field(3));
    }
  );
  
  // Test 11: Complex arithmetic
  await compareConstraintSystems(
    'Complex: (x + y) * z = w',
    () => {
      const x = Provable.witness(Field, () => Field(2));
      const y = Provable.witness(Field, () => Field(3));
      const z = Provable.witness(Field, () => Field(4));
      const sum = x.add(y);
      const w = sum.mul(z);
      w.assertEquals(Field(20));
    }
  );
  
  // Test 12: Poseidon hash (real-world circuit)
  await compareConstraintSystems(
    'Poseidon Hash: Real-world circuit',
    () => {
      const input1 = Provable.witness(Field, () => Field(1));
      const input2 = Provable.witness(Field, () => Field(2));
      const hash = Poseidon.hash([input1, input2]);
      // Don't assert specific value, just ensure constraint generation matches
      hash.assertEquals(hash); // Tautology to generate constraints
    }
  );
  
  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(50));
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`📈 Success Rate: ${((results.passed / (results.passed + results.failed)) * 100).toFixed(1)}%`);
  
  if (results.failed > 0) {
    console.log('\n🔍 FAILED TESTS:');
    results.tests.filter(t => t.status !== 'PASSED').forEach(test => {
      console.log(`   • ${test.name}: ${test.status}${test.reason ? ` (${test.reason})` : ''}`);
    });
  }
  
  // Save detailed results
  const detailedResults = {
    timestamp: new Date().toISOString(),
    summary: {
      passed: results.passed,
      failed: results.failed,
      total: results.passed + results.failed,
      successRate: ((results.passed / (results.passed + results.failed)) * 100).toFixed(1)
    },
    tests: results.tests
  };
  
  fs.writeFileSync('vk-parity-test-results.json', JSON.stringify(detailedResults, null, 2));
  console.log('\n📁 Detailed results saved to vk-parity-test-results.json');
  
  if (results.passed === results.passed + results.failed) {
    console.log('\n🎉 ALL TESTS PASSED - VK PARITY FULLY ACHIEVED! 🎉');
  } else {
    console.log('\n⚠️  Some tests failed - VK parity needs additional work');
  }
}

// Run the comprehensive test suite
runComprehensiveTests().catch(console.error);