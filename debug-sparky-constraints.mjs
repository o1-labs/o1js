#\!/usr/bin/env node

/**
 * Debug Sparky constraint issue - Test both backends
 */

import { Field, Provable, switchBackend, getCurrentBackend } from './dist/node/index.js';

async function testConstraints(backend) {
  console.log(`\n🔍 Testing ${backend.toUpperCase()} backend`);
  await switchBackend(backend);
  console.log(`Current backend: ${getCurrentBackend()}`);

  // Test with proper witness and assertions (should generate constraints)
  console.log('\n📊 Test: Proper constraint generation (witness + assertEquals)');
  try {
    const { rows, gates } = await Provable.constraintSystem(() => {
      // Create witness variables (this should generate constraints when used)
      const a = Provable.witness(Field, () => Field(3));
      const b = Provable.witness(Field, () => Field(4));
      
      // Multiply them (this should generate a constraint)
      const product = a.mul(b);
      
      // Assert the result (this should generate a constraint)
      product.assertEquals(Field(12));
      
      return product;
    });
    
    console.log(`✅ Constraints: ${rows}, Gates: ${gates.length}`);
    console.log(`Gate types: ${JSON.stringify(gates.map(g => g.type))}`);
    if (gates.length > 0) {
      console.log(`First gate details:`, gates[0]);
    }
    
    return { rows, gates: gates.length };
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
    return { rows: -1, gates: -1 };
  }
}

async function main() {
  console.log('🔥 CONSTRAINT DEBUGGING: Testing both backends\n');
  
  // Test both backends
  const snarkyResult = await testConstraints('snarky');
  const sparkyResult = await testConstraints('sparky');
  
  console.log('\n📋 COMPARISON RESULTS:');
  console.log(`Snarky: ${snarkyResult.rows} constraints, ${snarkyResult.gates} gates`);
  console.log(`Sparky: ${sparkyResult.rows} constraints, ${sparkyResult.gates} gates`);
  
  if (snarkyResult.rows === sparkyResult.rows && snarkyResult.gates === sparkyResult.gates) {
    console.log('✅ MATCH: Both backends generate the same number of constraints');
  } else {
    console.log('❌ MISMATCH: Different constraint counts between backends');
  }
  
  console.log('\n🎯 CONCLUSION:');
  if (snarkyResult.rows > 0 && sparkyResult.rows > 0) {
    console.log('✅ Both backends can generate constraints when using witness + assertions');
    console.log('❌ The performance test issue: using constant operations instead of witness operations');
    console.log('🔧 SOLUTION: Update performance test to use Provable.witness() for meaningful constraint comparison');
  } else {
    console.log('❌ Problem with constraint generation mechanism itself');
  }
}

main().catch(console.error);
EOF < /dev/null