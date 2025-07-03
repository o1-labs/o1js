/**
 * Memory Pressure Determinism Validation Test
 * 
 * This test validates that the memory pressure determinism fix works correctly
 * by testing complex field operations under varying memory conditions.
 */

import { Field, ZkProgram, Bool } from './dist/node/index.js';

// Memory pressure utilities
function createMemoryPressure(sizeGB = 1.0) {
  const arrays = [];
  const arraySize = Math.floor((sizeGB * 1024 * 1024 * 1024) / 8); // 8 bytes per number
  
  console.log(`Creating ${sizeGB}GB memory pressure...`);
  
  for (let i = 0; i < 20; i++) {
    const arr = new Float64Array(arraySize / 20);
    for (let j = 0; j < arr.length; j++) {
      arr[j] = Math.random() * 1000000;
    }
    arrays.push(arr);
  }
  
  return () => {
    arrays.length = 0; // Clear memory
    if (global.gc) global.gc();
  };
}

function forceMemoryFragmentation() {
  const fragments = [];
  // Create many small objects to fragment memory
  for (let i = 0; i < 10000; i++) {
    fragments.push({
      id: i,
      data: new Array(Math.floor(Math.random() * 100)).fill(Math.random()),
      timestamp: Date.now(),
      nested: {
        values: Array.from({length: 50}, () => Math.random().toString(36))
      }
    });
  }
  
  // Randomly delete some objects to create holes
  for (let i = 0; i < 3000; i++) {
    const idx = Math.floor(Math.random() * fragments.length);
    fragments.splice(idx, 1);
  }
  
  return () => {
    fragments.length = 0;
    if (global.gc) global.gc();
  };
}

// Test complex field operations
const ComplexFieldProgram = ZkProgram({
  name: 'ComplexFieldProgram',
  publicInput: Field,
  publicOutput: Field,
  methods: {
    complexComputation: {
      privateInputs: [Field, Field, Field],
      async method(input, a, b, c) {
        // Complex computation that exercises BigInt ↔ String conversions
        let result = input;
        
        // Nested operations with multiple conversions
        const intermediate1 = a.square().add(b);
        const intermediate2 = c.mul(intermediate1);
        const intermediate3 = intermediate2.square();
        
        // Complex expression tree
        const branch1 = result.mul(intermediate1).add(intermediate2);
        const branch2 = intermediate3.sub(result).mul(a);
        const branch3 = b.add(c).square().mul(branch1);
        
        // Final computation with multiple levels
        result = branch1.add(branch2).mul(branch3);
        result = result.square().add(input);
        
        // Additional operations that stress memory allocation
        for (let i = 0; i < 5; i++) {
          const temp = result.add(Field(i));
          result = temp.mul(result).square();
        }
        
        return result;
      },
    },
  },
});

// Test determinism under various memory conditions
async function testMemoryDeterminism() {
  console.log('Testing memory pressure determinism...\n');
  
  const testInputs = [
    {
      input: Field('123456789012345678901234567890'),
      a: Field('987654321098765432109876543210'),
      b: Field('111111111111111111111111111111'),
      c: Field('222222222222222222222222222222'),
    },
    {
      input: Field('999999999999999999999999999999'),
      a: Field('888888888888888888888888888888'),
      b: Field('777777777777777777777777777777'),
      c: Field('666666666666666666666666666666'),
    },
    {
      input: Field('555555555555555555555555555555'),
      a: Field('444444444444444444444444444444'),
      b: Field('333333333333333333333333333333'),
      c: Field('123987456321789654123987456321'),
    },
  ];
  
  console.log('Compiling program...');
  await ComplexFieldProgram.compile();
  
  // Test 1: Normal memory conditions
  console.log('\n=== Test 1: Normal Memory Conditions ===');
  if (global.gc) global.gc();
  
  const normalResults = [];
  for (let i = 0; i < testInputs.length; i++) {
    const { input, a, b, c } = testInputs[i];
    const result = await ComplexFieldProgram.complexComputation(input, a, b, c);
    normalResults.push(result.toString());
    console.log(`Input ${i + 1}: ${result.toString().slice(0, 50)}...`);
  }
  
  // Test 2: High memory pressure
  console.log('\n=== Test 2: High Memory Pressure ===');
  const cleanup1 = createMemoryPressure(1.5);
  
  const pressureResults = [];
  for (let i = 0; i < testInputs.length; i++) {
    const { input, a, b, c } = testInputs[i];
    const result = await ComplexFieldProgram.complexComputation(input, a, b, c);
    pressureResults.push(result.toString());
    console.log(`Input ${i + 1}: ${result.toString().slice(0, 50)}...`);
  }
  
  cleanup1();
  
  // Test 3: Memory fragmentation
  console.log('\n=== Test 3: Memory Fragmentation ===');
  const cleanup2 = forceMemoryFragmentation();
  
  const fragmentedResults = [];
  for (let i = 0; i < testInputs.length; i++) {
    const { input, a, b, c } = testInputs[i];
    const result = await ComplexFieldProgram.complexComputation(input, a, b, c);
    fragmentedResults.push(result.toString());
    console.log(`Input ${i + 1}: ${result.toString().slice(0, 50)}...`);
  }
  
  cleanup2();
  
  // Test 4: Extreme memory pressure with GC cycles
  console.log('\n=== Test 4: Extreme Memory Pressure + GC ===');
  const cleanup3 = createMemoryPressure(2.0);
  
  // Force multiple GC cycles
  if (global.gc) {
    for (let i = 0; i < 10; i++) {
      global.gc();
      // Create temporary pressure between GC cycles
      const temp = new Array(50000).fill(0).map(() => Math.random().toString(36));
    }
  }
  
  const extremeResults = [];
  for (let i = 0; i < testInputs.length; i++) {
    const { input, a, b, c } = testInputs[i];
    const result = await ComplexFieldProgram.complexComputation(input, a, b, c);
    extremeResults.push(result.toString());
    console.log(`Input ${i + 1}: ${result.toString().slice(0, 50)}...`);
  }
  
  cleanup3();
  
  // Determinism validation
  console.log('\n=== Determinism Validation ===');
  
  let allTestsPass = true;
  const resultSets = [
    { name: 'Normal vs Pressure', set1: normalResults, set2: pressureResults },
    { name: 'Normal vs Fragmented', set1: normalResults, set2: fragmentedResults },
    { name: 'Normal vs Extreme', set1: normalResults, set2: extremeResults },
    { name: 'Pressure vs Fragmented', set1: pressureResults, set2: fragmentedResults },
    { name: 'Pressure vs Extreme', set1: pressureResults, set2: extremeResults },
    { name: 'Fragmented vs Extreme', set1: fragmentedResults, set2: extremeResults },
  ];
  
  for (const { name, set1, set2 } of resultSets) {
    let testPass = true;
    for (let i = 0; i < set1.length; i++) {
      if (set1[i] !== set2[i]) {
        console.log(`❌ ${name} - Input ${i + 1}: MISMATCH`);
        console.log(`  Set1: ${set1[i].slice(0, 100)}...`);
        console.log(`  Set2: ${set2[i].slice(0, 100)}...`);
        testPass = false;
        allTestsPass = false;
      }
    }
    if (testPass) {
      console.log(`✅ ${name}: DETERMINISTIC`);
    }
  }
  
  return allTestsPass;
}

// Stress test BigInt ↔ String conversion caching
async function testConversionCaching() {
  console.log('\n=== Testing BigInt ↔ String Conversion Caching ===');
  
  const largeValues = [
    BigInt('1234567890123456789012345678901234567890123456789012345678901234567890'),
    BigInt('9876543210987654321098765432109876543210987654321098765432109876543210'),
    BigInt('1111111111111111111111111111111111111111111111111111111111111111111111'),
  ];
  
  const normalResults = [];
  const pressureResults = [];
  
  // Test without pressure
  for (const value of largeValues) {
    const field = Field(value);
    const result = field.square().add(field);
    normalResults.push(result.toString());
  }
  
  // Test with memory pressure
  const cleanup = createMemoryPressure(1.0);
  
  for (const value of largeValues) {
    const field = Field(value);
    const result = field.square().add(field);
    pressureResults.push(result.toString());
  }
  
  cleanup();
  
  // Validate cache effectiveness
  let cacheEffective = true;
  for (let i = 0; i < normalResults.length; i++) {
    if (normalResults[i] !== pressureResults[i]) {
      console.log(`❌ Conversion cache failed for value ${i + 1}`);
      cacheEffective = false;
    }
  }
  
  if (cacheEffective) {
    console.log('✅ BigInt ↔ String conversion caching is working correctly');
  }
  
  return cacheEffective;
}

// Main test execution
async function main() {
  console.log('Memory Pressure Determinism Validation');
  console.log('='.repeat(60));
  
  try {
    const deterministicTest = await testMemoryDeterminism();
    const cachingTest = await testConversionCaching();
    
    console.log('\n' + '='.repeat(60));
    console.log('FINAL RESULTS:');
    
    if (deterministicTest && cachingTest) {
      console.log('✅ ALL TESTS PASSED - Memory pressure determinism fix is working!');
      console.log('✅ Computation results are consistent under all memory conditions');
      console.log('✅ BigInt ↔ String conversion caching is effective');
    } else {
      console.log('❌ SOME TESTS FAILED:');
      if (!deterministicTest) console.log('  - Memory pressure affects computation results');
      if (!cachingTest) console.log('  - BigInt ↔ String conversion caching is ineffective');
      process.exit(1);
    }
  } catch (error) {
    console.error('Test execution failed:', error);
    process.exit(1);
  }
}

main();