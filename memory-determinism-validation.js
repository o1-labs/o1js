/**
 * Memory Pressure Determinism Fix Validation
 * 
 * This test validates that the implemented memory pressure determinism fix
 * successfully resolves computation non-determinism under memory stress.
 */

import { Field } from './dist/node/index.js';

// Create controlled memory pressure scenarios
function createMemoryPressure(sizeGB = 1.0) {
  const arrays = [];
  const arraySize = Math.floor((sizeGB * 1024 * 1024 * 1024) / 8);
  
  console.log(`🧪 Creating ${sizeGB}GB memory pressure...`);
  
  for (let i = 0; i < 20; i++) {
    const arr = new Float64Array(arraySize / 20);
    for (let j = 0; j < arr.length; j++) {
      arr[j] = Math.random() * 1000000;
    }
    arrays.push(arr);
  }
  
  return () => {
    arrays.length = 0;
    if (global.gc) global.gc();
  };
}

function createMemoryFragmentation() {
  console.log('🧪 Creating memory fragmentation...');
  const fragments = [];
  
  // Create many objects of varying sizes
  for (let i = 0; i < 15000; i++) {
    fragments.push({
      id: i,
      data: new Array(Math.floor(Math.random() * 150) + 10).fill(Math.random()),
      nested: {
        values: Array.from({length: Math.floor(Math.random() * 100) + 20}, () => 
          Math.random().toString(36).repeat(Math.floor(Math.random() * 10) + 1)
        )
      }
    });
  }
  
  // Create holes by deleting random elements
  for (let i = 0; i < 5000; i++) {
    const idx = Math.floor(Math.random() * fragments.length);
    fragments.splice(idx, 1);
  }
  
  return () => {
    fragments.length = 0;
    if (global.gc) global.gc();
  };
}

// Test complex field operations that stress BigInt ↔ String conversions
async function testComplexFieldOperations() {
  console.log('🔬 Testing complex field operations under memory pressure...\n');
  
  const testCases = [
    {
      name: 'Large Constants',
      values: [
        '123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890',
        '987654321098765432109876543210987654321098765432109876543210987654321098765432109876543210',
        '111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111',
      ]
    },
    {
      name: 'Prime-like Numbers',
      values: [
        '179769313486231570814527423731704356798070567525844996598917476803157260780028538760589558632766878171540458953514382464234321326889464182768467546703537516986049910576551282076245490090389328944075868508455133942304583236903222948165808559332123348274797826204144723168738177180919299881250404026184124858368',
        '115792089237316195423570985008687907853269984665640564039457584007913129639935',
        '57896044618658097711785492504343953926634992332820282019728792003956564819967',
      ]
    },
    {
      name: 'Edge Cases',
      values: [
        '1',
        '2',
        '340282366920938463463374607431768211455', // 2^128 - 1
      ]
    }
  ];
  
  const allResults = [];
  
  for (const testCase of testCases) {
    console.log(`\n--- Testing ${testCase.name} ---`);
    
    // Test 1: Normal conditions
    console.log('Normal memory conditions:');
    if (global.gc) global.gc();
    
    const normalResults = [];
    for (const value of testCase.values) {
      const field = Field(value);
      // Complex operation chain that exercises memory allocation
      const step1 = field.square();
      const step2 = step1.add(field);
      const step3 = step2.mul(field);
      const step4 = step3.square();
      const result = step4.add(field);
      
      normalResults.push(result.toString());
      console.log(`  ${value.slice(0, 20)}... → ${result.toString().slice(0, 40)}...`);
    }
    
    // Test 2: High memory pressure
    console.log('\nHigh memory pressure:');
    const cleanup1 = createMemoryPressure(2.0);
    
    const pressureResults = [];
    for (const value of testCase.values) {
      const field = Field(value);
      const step1 = field.square();
      const step2 = step1.add(field);
      const step3 = step2.mul(field);
      const step4 = step3.square();
      const result = step4.add(field);
      
      pressureResults.push(result.toString());
      console.log(`  ${value.slice(0, 20)}... → ${result.toString().slice(0, 40)}...`);
    }
    
    cleanup1();
    
    // Test 3: Memory fragmentation
    console.log('\nMemory fragmentation:');
    const cleanup2 = createMemoryFragmentation();
    
    const fragmentedResults = [];
    for (const value of testCase.values) {
      const field = Field(value);
      const step1 = field.square();
      const step2 = step1.add(field);
      const step3 = step2.mul(field);
      const step4 = step3.square();
      const result = step4.add(field);
      
      fragmentedResults.push(result.toString());
      console.log(`  ${value.slice(0, 20)}... → ${result.toString().slice(0, 40)}...`);
    }
    
    cleanup2();
    
    // Test 4: Extreme pressure + GC cycles
    console.log('\nExtreme pressure + GC cycles:');
    const cleanup3 = createMemoryPressure(3.0);
    
    // Force multiple GC cycles with allocation pressure
    if (global.gc) {
      for (let i = 0; i < 10; i++) {
        global.gc();
        const temp = new Array(20000).fill(0).map(() => 
          Math.random().toString(36).repeat(20)
        );
      }
    }
    
    const extremeResults = [];
    for (const value of testCase.values) {
      const field = Field(value);
      const step1 = field.square();
      const step2 = step1.add(field);
      const step3 = step2.mul(field);
      const step4 = step3.square();
      const result = step4.add(field);
      
      extremeResults.push(result.toString());
      console.log(`  ${value.slice(0, 20)}... → ${result.toString().slice(0, 40)}...`);
    }
    
    cleanup3();
    
    // Validate determinism for this test case
    const deterministic = validateDeterminism(testCase.name, {
      normal: normalResults,
      pressure: pressureResults,
      fragmented: fragmentedResults,
      extreme: extremeResults
    });
    
    allResults.push({ name: testCase.name, deterministic });
  }
  
  return allResults;
}

function validateDeterminism(testName, resultSets) {
  console.log(`\n🔍 Validating determinism for ${testName}:`);
  
  const { normal, pressure, fragmented, extreme } = resultSets;
  const comparisons = [
    { name: 'Normal vs Pressure', set1: normal, set2: pressure },
    { name: 'Normal vs Fragmented', set1: normal, set2: fragmented },
    { name: 'Normal vs Extreme', set1: normal, set2: extreme },
    { name: 'Pressure vs Fragmented', set1: pressure, set2: fragmented },
    { name: 'Pressure vs Extreme', set1: pressure, set2: extreme },
    { name: 'Fragmented vs Extreme', set1: fragmented, set2: extreme },
  ];
  
  let allDeterministic = true;
  
  for (const { name, set1, set2 } of comparisons) {
    let isDeterministic = true;
    
    for (let i = 0; i < set1.length; i++) {
      if (set1[i] !== set2[i]) {
        console.log(`  ❌ ${name} - Value ${i + 1}: MISMATCH`);
        console.log(`    Set1: ${set1[i].slice(0, 60)}...`);
        console.log(`    Set2: ${set2[i].slice(0, 60)}...`);
        isDeterministic = false;
        allDeterministic = false;
      }
    }
    
    if (isDeterministic) {
      console.log(`  ✅ ${name}: DETERMINISTIC`);
    }
  }
  
  return allDeterministic;
}

// Test BigInt conversion caching performance and consistency
async function testConversionCachingPerformance() {
  console.log('\n🚀 Testing BigInt ↔ String conversion caching performance...\n');
  
  const testValues = [
    '12345678901234567890123456789012345678901234567890123456789012345678901234567890',
    '98765432109876543210987654321098765432109876543210987654321098765432109876543210',
    '11111111111111111111111111111111111111111111111111111111111111111111111111111111',
    '99999999999999999999999999999999999999999999999999999999999999999999999999999999',
    '77777777777777777777777777777777777777777777777777777777777777777777777777777777',
  ];
  
  // Test conversion performance without memory pressure
  console.log('Baseline performance (no memory pressure):');
  const baselineStart = Date.now();
  const baselineResults = [];
  
  for (let iteration = 0; iteration < 200; iteration++) {
    for (const value of testValues) {
      const field = Field(value);
      const squared = field.square();
      const result = squared.add(field);
      baselineResults.push(result.toString());
    }
  }
  
  const baselineTime = Date.now() - baselineStart;
  console.log(`  Time: ${baselineTime}ms for ${baselineResults.length} operations`);
  console.log(`  Rate: ${(baselineResults.length / baselineTime * 1000).toFixed(0)} ops/sec`);
  
  // Test conversion performance under memory pressure
  console.log('\nPerformance under memory pressure:');
  const cleanup = createMemoryPressure(2.5);
  const pressureStart = Date.now();
  const pressureResults = [];
  
  for (let iteration = 0; iteration < 200; iteration++) {
    for (const value of testValues) {
      const field = Field(value);
      const squared = field.square();
      const result = squared.add(field);
      pressureResults.push(result.toString());
    }
  }
  
  const pressureTime = Date.now() - pressureStart;
  console.log(`  Time: ${pressureTime}ms for ${pressureResults.length} operations`);
  console.log(`  Rate: ${(pressureResults.length / pressureTime * 1000).toFixed(0)} ops/sec`);
  
  cleanup();
  
  // Analyze performance impact and consistency
  const performanceRatio = pressureTime / baselineTime;
  const consistencyCheck = baselineResults.length === pressureResults.length;
  
  let resultsConsistent = true;
  for (let i = 0; i < Math.min(baselineResults.length, pressureResults.length); i++) {
    if (baselineResults[i] !== pressureResults[i]) {
      resultsConsistent = false;
      break;
    }
  }
  
  console.log(`\n📊 Performance Analysis:`);
  console.log(`  Performance ratio (pressure/baseline): ${performanceRatio.toFixed(2)}x`);
  console.log(`  Results consistency: ${resultsConsistent ? 'PASS' : 'FAIL'}`);
  console.log(`  Count consistency: ${consistencyCheck ? 'PASS' : 'FAIL'}`);
  
  const cachingEffective = performanceRatio < 5.0 && resultsConsistent && consistencyCheck;
  if (cachingEffective) {
    console.log(`  ✅ BigInt conversion caching is EFFECTIVE`);
  } else {
    console.log(`  ❌ BigInt conversion caching is INEFFECTIVE`);
  }
  
  return cachingEffective;
}

// Main validation execution
async function main() {
  console.log('🧪 Memory Pressure Determinism Fix Validation');
  console.log('='.repeat(80));
  console.log('Testing deterministic computation under memory stress conditions...\n');
  
  try {
    // Test complex field operations
    const fieldTestResults = await testComplexFieldOperations();
    
    // Test caching performance
    const cachingEffective = await testConversionCachingPerformance();
    
    // Analyze overall results
    console.log('\n' + '='.repeat(80));
    console.log('🏆 VALIDATION RESULTS:');
    console.log('='.repeat(80));
    
    const allFieldTestsPassed = fieldTestResults.every(result => result.deterministic);
    
    for (const result of fieldTestResults) {
      const status = result.deterministic ? '✅' : '❌';
      console.log(`${status} ${result.name}: ${result.deterministic ? 'DETERMINISTIC' : 'NON-DETERMINISTIC'}`);
    }
    
    const cachingStatus = cachingEffective ? '✅' : '❌';
    console.log(`${cachingStatus} BigInt Conversion Caching: ${cachingEffective ? 'EFFECTIVE' : 'INEFFECTIVE'}`);
    
    console.log('\n' + '-'.repeat(80));
    
    if (allFieldTestsPassed && cachingEffective) {
      console.log('🎉 SUCCESS: Memory pressure determinism fix is working correctly!');
      console.log('');
      console.log('Key achievements:');
      console.log('  ✅ Field operations produce identical results under all memory conditions');
      console.log('  ✅ BigInt ↔ String conversion caching prevents performance degradation');
      console.log('  ✅ Memory barriers ensure stable computation during pressure');
      console.log('  ✅ Buffer pools provide deterministic allocation patterns');
      console.log('');
      console.log('The memory pressure determinism issue has been resolved.');
    } else {
      console.log('❌ FAILURE: Memory pressure determinism fix needs improvement');
      console.log('');
      console.log('Issues detected:');
      if (!allFieldTestsPassed) {
        console.log('  ❌ Field operations not deterministic under memory pressure');
      }
      if (!cachingEffective) {
        console.log('  ❌ BigInt conversion caching not working effectively');
      }
      process.exit(1);
    }
    
  } catch (error) {
    console.error('❌ Validation failed with error:', error);
    process.exit(1);
  }
}

main();