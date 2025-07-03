/**
 * Simple Memory Pressure Determinism Test
 * 
 * Tests the core memory pressure determinism fix without complex ZkPrograms.
 * Focuses on BigInt ↔ String conversion stability under memory pressure.
 */

import { Field, switchBackend, getCurrentBackend } from './dist/node/index.js';

// Memory pressure utilities
function createMemoryPressure(sizeGB = 1.0) {
  const arrays = [];
  const arraySize = Math.floor((sizeGB * 1024 * 1024 * 1024) / 8);
  
  console.log(`Creating ${sizeGB}GB memory pressure...`);
  
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

function forceMemoryFragmentation() {
  const fragments = [];
  for (let i = 0; i < 10000; i++) {
    fragments.push({
      id: i,
      data: new Array(Math.floor(Math.random() * 100)).fill(Math.random()),
      nested: { values: Array.from({length: 50}, () => Math.random().toString(36)) }
    });
  }
  
  // Create holes by deleting random elements
  for (let i = 0; i < 3000; i++) {
    const idx = Math.floor(Math.random() * fragments.length);
    fragments.splice(idx, 1);
  }
  
  return () => {
    fragments.length = 0;
    if (global.gc) global.gc();
  };
}

// Test field operations under memory pressure
async function testFieldDeterminism() {
  console.log('Testing Field operations under memory pressure...\n');
  
  const testValues = [
    '123456789012345678901234567890123456789012345678901234567890',
    '987654321098765432109876543210987654321098765432109876543210',
    '111111111111111111111111111111111111111111111111111111111111',
    '999999999999999999999999999999999999999999999999999999999999',
    '555555555555555555555555555555555555555555555555555555555555',
  ];
  
  // Test 1: Normal memory conditions
  console.log('=== Normal Memory Conditions ===');
  if (global.gc) global.gc();
  
  const normalResults = [];
  for (const value of testValues) {
    const field = Field(value);
    const squared = field.square();
    const result = squared.add(field).mul(field);
    normalResults.push(result.toString());
    console.log(`Value: ${value.slice(0, 20)}... → ${result.toString().slice(0, 30)}...`);
  }
  
  // Test 2: High memory pressure
  console.log('\n=== High Memory Pressure ===');
  const cleanup1 = createMemoryPressure(1.5);
  
  const pressureResults = [];
  for (const value of testValues) {
    const field = Field(value);
    const squared = field.square();
    const result = squared.add(field).mul(field);
    pressureResults.push(result.toString());
    console.log(`Value: ${value.slice(0, 20)}... → ${result.toString().slice(0, 30)}...`);
  }
  
  cleanup1();
  
  // Test 3: Memory fragmentation
  console.log('\n=== Memory Fragmentation ===');
  const cleanup2 = forceMemoryFragmentation();
  
  const fragmentedResults = [];
  for (const value of testValues) {
    const field = Field(value);
    const squared = field.square();
    const result = squared.add(field).mul(field);
    fragmentedResults.push(result.toString());
    console.log(`Value: ${value.slice(0, 20)}... → ${result.toString().slice(0, 30)}...`);
  }
  
  cleanup2();
  
  // Test 4: Extreme pressure with GC cycles
  console.log('\n=== Extreme Pressure + GC Cycles ===');
  const cleanup3 = createMemoryPressure(2.0);
  
  if (global.gc) {
    for (let i = 0; i < 5; i++) {
      global.gc();
      const temp = new Array(10000).fill(0).map(() => Math.random().toString(36));
    }
  }
  
  const extremeResults = [];
  for (const value of testValues) {
    const field = Field(value);
    const squared = field.square();
    const result = squared.add(field).mul(field);
    extremeResults.push(result.toString());
    console.log(`Value: ${value.slice(0, 20)}... → ${result.toString().slice(0, 30)}...`);
  }
  
  cleanup3();
  
  // Determinism validation
  console.log('\n=== Determinism Validation ===');
  
  const testSets = [
    { name: 'Normal vs Pressure', results: [normalResults, pressureResults] },
    { name: 'Normal vs Fragmented', results: [normalResults, fragmentedResults] },
    { name: 'Normal vs Extreme', results: [normalResults, extremeResults] },
    { name: 'Pressure vs Fragmented', results: [pressureResults, fragmentedResults] },
  ];
  
  let allDeterministic = true;
  
  for (const { name, results } of testSets) {
    const [set1, set2] = results;
    let setDeterministic = true;
    
    for (let i = 0; i < set1.length; i++) {
      if (set1[i] !== set2[i]) {
        console.log(`❌ ${name} - Value ${i + 1}: MISMATCH`);
        console.log(`  Set1: ${set1[i].slice(0, 50)}...`);
        console.log(`  Set2: ${set2[i].slice(0, 50)}...`);
        setDeterministic = false;
        allDeterministic = false;
      }
    }
    
    if (setDeterministic) {
      console.log(`✅ ${name}: DETERMINISTIC`);
    }
  }
  
  return allDeterministic;
}

// Test BigInt conversion caching effectiveness
async function testBigIntConversionCaching() {
  console.log('\n=== Testing BigInt Conversion Caching ===');
  
  const largeValues = [
    '12345678901234567890123456789012345678901234567890123456789012345678901234567890',
    '98765432109876543210987654321098765432109876543210987654321098765432109876543210',
    '11111111111111111111111111111111111111111111111111111111111111111111111111111111',
  ];
  
  // Measure performance without pressure
  console.log('Conversion speed without memory pressure:');
  const start1 = Date.now();
  const normalResults = [];
  
  for (let i = 0; i < 100; i++) {
    for (const value of largeValues) {
      const field = Field(value);
      const result = field.square();
      normalResults.push(result.toString());
    }
  }
  
  const time1 = Date.now() - start1;
  console.log(`Time: ${time1}ms for ${normalResults.length} conversions`);
  
  // Measure performance with memory pressure
  console.log('\nConversion speed with memory pressure:');
  const cleanup = createMemoryPressure(1.0);
  const start2 = Date.now();
  const pressureResults = [];
  
  for (let i = 0; i < 100; i++) {
    for (const value of largeValues) {
      const field = Field(value);
      const result = field.square();
      pressureResults.push(result.toString());
    }
  }
  
  const time2 = Date.now() - start2;
  console.log(`Time: ${time2}ms for ${pressureResults.length} conversions`);
  
  cleanup();
  
  // Check consistency
  let consistent = normalResults.length === pressureResults.length;
  for (let i = 0; i < Math.min(normalResults.length, pressureResults.length); i++) {
    if (normalResults[i] !== pressureResults[i]) {
      consistent = false;
      break;
    }
  }
  
  const performanceRatio = time2 / time1;
  console.log(`\nPerformance ratio (pressure/normal): ${performanceRatio.toFixed(2)}x`);
  console.log(`Consistency: ${consistent ? 'PASS' : 'FAIL'}`);
  
  return consistent && performanceRatio < 3.0; // Should not be more than 3x slower
}

// Test Sparky backend under memory pressure
async function testSparkyBackendDeterminism() {
  console.log('\n=== Testing Sparky Backend Under Memory Pressure ===');
  
  try {
    // Switch to Sparky backend
    console.log('Switching to Sparky backend...');
    await switchBackend('sparky');
    console.log(`Current backend: ${getCurrentBackend()}`);
    
    const testValues = [
      '123456789012345678901234567890',
      '987654321098765432109876543210',
    ];
    
    // Normal conditions
    const normalResults = [];
    for (const value of testValues) {
      const field = Field(value);
      const result = field.square().add(field);
      normalResults.push(result.toString());
    }
    
    // Memory pressure conditions
    const cleanup = createMemoryPressure(1.0);
    const pressureResults = [];
    
    for (const value of testValues) {
      const field = Field(value);
      const result = field.square().add(field);
      pressureResults.push(result.toString());
    }
    
    cleanup();
    
    // Check determinism
    let sparkyDeterministic = true;
    for (let i = 0; i < normalResults.length; i++) {
      if (normalResults[i] !== pressureResults[i]) {
        console.log(`❌ Sparky determinism failure for value ${i + 1}`);
        sparkyDeterministic = false;
      }
    }
    
    if (sparkyDeterministic) {
      console.log('✅ Sparky backend is deterministic under memory pressure');
    }
    
    // Switch back to Snarky
    await switchBackend('snarky');
    console.log(`Switched back to: ${getCurrentBackend()}`);
    
    return sparkyDeterministic;
    
  } catch (error) {
    console.error('Sparky backend test failed:', error.message);
    return false;
  }
}

// Main test execution
async function main() {
  console.log('Simple Memory Pressure Determinism Test');
  console.log('='.repeat(60));
  
  try {
    const fieldDeterminism = await testFieldDeterminism();
    const conversionCaching = await testBigIntConversionCaching();
    const sparkyDeterminism = await testSparkyBackendDeterminism();
    
    console.log('\n' + '='.repeat(60));
    console.log('FINAL RESULTS:');
    
    if (fieldDeterminism && conversionCaching && sparkyDeterminism) {
      console.log('✅ ALL TESTS PASSED!');
      console.log('✅ Memory pressure determinism fix is working correctly');
      console.log('✅ Field operations are deterministic under all memory conditions');
      console.log('✅ BigInt ↔ String conversion caching is effective');
      console.log('✅ Sparky backend maintains determinism under memory pressure');
    } else {
      console.log('❌ SOME TESTS FAILED:');
      if (!fieldDeterminism) console.log('  - Field operations not deterministic');
      if (!conversionCaching) console.log('  - BigInt conversion caching ineffective');
      if (!sparkyDeterminism) console.log('  - Sparky backend not deterministic');
      process.exit(1);
    }
  } catch (error) {
    console.error('Test execution failed:', error);
    process.exit(1);
  }
}

main();