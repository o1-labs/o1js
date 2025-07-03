import { Field, Provable, switchBackend, Bool } from './dist/node/index.js';

async function countConstraints(circuit) {
  const cs = await Provable.constraintSystem(circuit);
  return cs.gates.length;
}

async function testOperation(name, circuitFn) {
  console.log(`\n🧪 Testing: ${name}`);
  
  // Test with Snarky
  await switchBackend('snarky');
  const snarkyCount = await countConstraints(circuitFn);
  
  // Test with Sparky
  await switchBackend('sparky');
  const sparkyCount = await countConstraints(circuitFn);
  
  const match = snarkyCount === sparkyCount;
  const diff = sparkyCount - snarkyCount;
  
  console.log(`  Snarky: ${snarkyCount}, Sparky: ${sparkyCount}, Diff: ${diff >= 0 ? '+' : ''}${diff}, Match: ${match ? '✅' : '❌'}`);
  
  return { name, snarkyCount, sparkyCount, match, diff };
}

async function runComprehensiveTests() {
  console.log('🚀 Running comprehensive Sparky vs Snarky comparison...\n');
  
  const results = [];
  
  // Test 1: Simple assertion
  results.push(await testOperation('Simple assertion', () => {
    const x = Provable.witness(Field, () => Field(5));
    x.assertEquals(Field(5));
  }));
  
  // Test 2: Field addition
  results.push(await testOperation('Field addition', () => {
    const x = Provable.witness(Field, () => Field(3));
    const y = Provable.witness(Field, () => Field(4));
    const z = x.add(y);
    z.assertEquals(Field(7));
  }));
  
  // Test 3: Field multiplication
  results.push(await testOperation('Field multiplication', () => {
    const x = Provable.witness(Field, () => Field(3));
    const y = Provable.witness(Field, () => Field(4));
    const z = x.mul(y);
    z.assertEquals(Field(12));
  }));
  
  // Test 4: Boolean assertion
  results.push(await testOperation('Boolean assertion', () => {
    const x = Provable.witness(Field, () => Field(1));
    x.assertBool();
  }));
  
  // Test 5: Chained additions
  results.push(await testOperation('Chained additions', () => {
    const x = Provable.witness(Field, () => Field(1));
    const y = Provable.witness(Field, () => Field(2));
    const z = Provable.witness(Field, () => Field(3));
    const result = x.add(y).add(z);
    result.assertEquals(Field(6));
  }));

  // Test 6: Mixed operations
  results.push(await testOperation('Mixed operations', () => {
    const x = Provable.witness(Field, () => Field(2));
    const y = Provable.witness(Field, () => Field(3));
    const result = x.mul(y).add(Field(1)); // 2*3 + 1 = 7
    result.assertEquals(Field(7));
  }));
  
  console.log('\n📊 Summary:');
  console.log('━'.repeat(80));
  
  let totalMatches = 0;
  let totalTests = results.length;
  let totalSnarkyConstraints = 0;
  let totalSparkyConstraints = 0;
  
  results.forEach(result => {
    const status = result.match ? '✅' : '❌';
    const diffStr = result.diff >= 0 ? `+${result.diff}` : `${result.diff}`;
    console.log(`${status} ${result.name.padEnd(20)} | Snarky: ${result.snarkyCount.toString().padStart(2)} | Sparky: ${result.sparkyCount.toString().padStart(2)} | Diff: ${diffStr.padStart(3)}`);
    
    if (result.match) totalMatches++;
    totalSnarkyConstraints += result.snarkyCount;
    totalSparkyConstraints += result.sparkyCount;
  });
  
  console.log('━'.repeat(80));
  console.log(`📈 Overall Results:`);
  console.log(`   Tests Passing: ${totalMatches}/${totalTests} (${(totalMatches/totalTests*100).toFixed(1)}%)`);
  console.log(`   Total Constraints: Snarky ${totalSnarkyConstraints}, Sparky ${totalSparkyConstraints}`);
  console.log(`   Efficiency: Sparky uses ${((totalSparkyConstraints/totalSnarkyConstraints)*100).toFixed(1)}% of Snarky constraints`);
  
  if (totalMatches === totalTests) {
    console.log('🎉 Perfect compatibility achieved!');
  } else {
    console.log('⚠️  Some constraint count mismatches detected');
    console.log('   This indicates potential VK incompatibility issues');
  }
}

runComprehensiveTests().catch(console.error);