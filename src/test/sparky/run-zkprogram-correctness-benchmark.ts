/**
 * ZkProgram Mathematical Correctness Benchmark
 * 
 * This benchmark tests the mathematical correctness of zkPrograms between
 * Sparky and Snarky backends, focusing on edge cases and potential inconsistencies.
 * 
 * Tests include:
 * - Known good witness values (should pass)
 * - Known bad witness values (should fail)
 * - Edge cases and boundary conditions
 * - Backend consistency verification
 * - Sparky-specific stress testing
 */

import { Field, ZkProgram, Struct, Provable, Bool, CircuitString, MerkleWitness, Poseidon, switchBackend, getCurrentBackend } from '../../index.js';

// Re-use program definitions from compilation benchmark
class Point extends Struct({
  x: Field,
  y: Field,
}) {}

class MerkleWitness8 extends MerkleWitness(8) {}

// Test case types
interface TestCase {
  name: string;
  inputs: any[];
  expectedToPass: boolean;
  description: string;
}

interface CorrectnessResult {
  name: string;
  backend: string;
  testCase: string;
  passed: boolean;
  error?: string;
  proof?: any;
  publicOutput?: any;
  executionTime: number;
}

// Test Programs (simplified for correctness testing)

const SimpleArithmetic = ZkProgram({
  name: 'SimpleArithmetic',
  publicInput: Field,
  publicOutput: Field,
  methods: {
    compute: {
      privateInputs: [Field, Field],
      async method(publicInput: Field, a: Field, b: Field) {
        const result = a.mul(b).add(publicInput);
        return { publicOutput: result };
      },
    },
  },
});

const BooleanLogic = ZkProgram({
  name: 'BooleanLogic',
  publicInput: Bool,
  publicOutput: Bool,
  methods: {
    compute: {
      privateInputs: [Bool, Bool, Bool, Bool],
      async method(publicInput: Bool, a: Bool, b: Bool, c: Bool, d: Bool) {
        const and1 = a.and(b);
        const or1 = c.or(d);
        const xor1 = and1.not().and(or1).or(and1.and(or1.not()));
        const result = publicInput.and(xor1);
        return { publicOutput: result };
      },
    },
  },
});

const HashProgram = ZkProgram({
  name: 'HashProgram',
  publicInput: Field,
  publicOutput: Field,
  methods: {
    hash: {
      privateInputs: [Field, Field, Field],
      async method(publicInput: Field, a: Field, b: Field, c: Field) {
        const hash1 = Poseidon.hash([publicInput, a]);
        const hash2 = Poseidon.hash([hash1, b]);
        const hash3 = Poseidon.hash([hash2, c]);
        return { publicOutput: hash3 };
      },
    },
  },
});

const ConditionalProgram = ZkProgram({
  name: 'ConditionalProgram',
  publicInput: Field,
  publicOutput: Field,
  methods: {
    compute: {
      privateInputs: [Bool, Field, Field],
      async method(publicInput: Field, condition: Bool, ifTrue: Field, ifFalse: Field) {
        const selected = Provable.if(condition, ifTrue, ifFalse);
        const result = publicInput.add(selected);
        return { publicOutput: result };
      },
    },
  },
});

const StructProgram = ZkProgram({
  name: 'StructProgram',
  publicInput: Point,
  publicOutput: Point,
  methods: {
    transform: {
      privateInputs: [Field, Field],
      async method(point: Point, scalar: Field, offset: Field) {
        const newX = point.x.mul(scalar).add(offset);
        const newY = point.y.mul(scalar).sub(offset);
        return { publicOutput: new Point({ x: newX, y: newY }) };
      },
    },
  },
});

const RangeCheckProgram = ZkProgram({
  name: 'RangeCheckProgram',
  publicInput: Field,
  publicOutput: Bool,
  methods: {
    checkRange: {
      privateInputs: [Field, Field, Field],
      async method(publicInput: Field, value: Field, min: Field, max: Field) {
        // This should fail if value is outside [min, max]
        value.assertGreaterThanOrEqual(min);
        value.assertLessThanOrEqual(max);
        const isInRange = value.greaterThanOrEqual(min).and(value.lessThanOrEqual(max));
        return { publicOutput: isInRange };
      },
    },
  },
});

// Field prime for edge case testing
const FIELD_PRIME = Field.ORDER;

// Test cases for each program - using raw JavaScript values
const testCases = {
  SimpleArithmetic: [
    {
      name: 'normal_values',
      inputs: [10, 5, 3], // 10 + 5*3 = 25
      expectedToPass: true,
      description: 'Normal arithmetic operation'
    },
    {
      name: 'zero_values',
      inputs: [0, 0, 0], // 0 + 0*0 = 0
      expectedToPass: true,
      description: 'Zero values'
    },
    {
      name: 'max_field_value',
      inputs: [FIELD_PRIME - 1n, 1, 1], // (p-1) + 1*1 = p = 0
      expectedToPass: true,
      description: 'Maximum field value causing overflow'
    },
    {
      name: 'large_multiplication',
      inputs: [0, FIELD_PRIME - 1n, FIELD_PRIME - 1n], // 0 + (p-1)*(p-1) = (p-1)^2
      expectedToPass: true,
      description: 'Large multiplication near field prime'
    },
  ],

  BooleanLogic: [
    {
      name: 'all_true',
      inputs: [true, true, true, true, true],
      expectedToPass: true,
      description: 'All boolean inputs true'
    },
    {
      name: 'all_false',
      inputs: [false, false, false, false, false],
      expectedToPass: true,
      description: 'All boolean inputs false'
    },
    {
      name: 'mixed_pattern_1',
      inputs: [true, true, false, false, true],
      expectedToPass: true,
      description: 'Mixed boolean pattern 1'
    },
    {
      name: 'mixed_pattern_2',
      inputs: [false, false, true, true, false],
      expectedToPass: true,
      description: 'Mixed boolean pattern 2'
    },
  ],

  HashProgram: [
    {
      name: 'normal_hash',
      inputs: [1, 2, 3, 4],
      expectedToPass: true,
      description: 'Normal hash inputs'
    },
    {
      name: 'zero_hash',
      inputs: [0, 0, 0, 0],
      expectedToPass: true,
      description: 'All zero hash inputs'
    },
    {
      name: 'max_values_hash',
      inputs: [FIELD_PRIME - 1n, FIELD_PRIME - 1n, FIELD_PRIME - 1n, FIELD_PRIME - 1n],
      expectedToPass: true,
      description: 'Maximum field values for hashing'
    },
    {
      name: 'identical_inputs',
      inputs: [42, 42, 42, 42],
      expectedToPass: true,
      description: 'Identical hash inputs'
    },
  ],

  ConditionalProgram: [
    {
      name: 'condition_true',
      inputs: [10, true, 100, 200], // 10 + 100 = 110
      expectedToPass: true,
      description: 'Condition true, select first value'
    },
    {
      name: 'condition_false',
      inputs: [10, false, 100, 200], // 10 + 200 = 210
      expectedToPass: true,
      description: 'Condition false, select second value'
    },
    {
      name: 'large_values_true',
      inputs: [FIELD_PRIME - 2n, true, 1, 2], // (p-2) + 1 = p-1
      expectedToPass: true,
      description: 'Large values with true condition'
    },
    {
      name: 'large_values_false',
      inputs: [FIELD_PRIME - 3n, false, 1, 2], // (p-3) + 2 = p-1
      expectedToPass: true,
      description: 'Large values with false condition'
    },
  ],

  StructProgram: [
    {
      name: 'normal_transform',
      inputs: [{ x: 10, y: 20 }, 2, 5], // (10*2+5, 20*2-5) = (25, 35)
      expectedToPass: true,
      description: 'Normal struct transformation'
    },
    {
      name: 'zero_transform',
      inputs: [{ x: 0, y: 0 }, 0, 0], // (0*0+0, 0*0-0) = (0, 0)
      expectedToPass: true,
      description: 'Zero struct transformation'
    },
    {
      name: 'large_values',
      inputs: [{ x: FIELD_PRIME - 1n, y: 1 }, 1, 1], // Large x value
      expectedToPass: true,
      description: 'Large field values in struct'
    },
    {
      name: 'negative_offset',
      inputs: [{ x: 10, y: 10 }, 1, FIELD_PRIME - 1n], // Using -1 as offset
      expectedToPass: true,
      description: 'Negative offset (using field arithmetic)'
    },
  ],

  RangeCheckProgram: [
    {
      name: 'valid_range',
      inputs: [0, 50, 10, 100], // 50 in [10, 100]
      expectedToPass: true,
      description: 'Value within valid range'
    },
    {
      name: 'boundary_min',
      inputs: [0, 10, 10, 100], // 10 in [10, 100] (boundary)
      expectedToPass: true,
      description: 'Value at minimum boundary'
    },
    {
      name: 'boundary_max',
      inputs: [0, 100, 10, 100], // 100 in [10, 100] (boundary)
      expectedToPass: true,
      description: 'Value at maximum boundary'
    },
    {
      name: 'below_range',
      inputs: [0, 5, 10, 100], // 5 not in [10, 100]
      expectedToPass: false,
      description: 'Value below valid range (should fail)'
    },
    {
      name: 'above_range',
      inputs: [0, 150, 10, 100], // 150 not in [10, 100]
      expectedToPass: false,
      description: 'Value above valid range (should fail)'
    },
  ],
};

// Helper function to run a single test case
async function runTestCase(
  program: any,
  methodName: string,
  testCase: TestCase,
  backend: string
): Promise<CorrectnessResult> {
  const start = performance.now();
  const result: CorrectnessResult = {
    name: program.name,
    backend,
    testCase: testCase.name,
    passed: false,
    executionTime: 0,
  };

  try {
    // Generate proof using the correct pattern
    const proofResult = await program[methodName](...testCase.inputs);
    const proof = proofResult.proof || proofResult; // Handle both { proof } and direct proof return
    
    // Verify proof
    const verified = await program.verify(proof);
    
    result.passed = verified && testCase.expectedToPass;
    result.proof = proof;
    result.publicOutput = proof.publicOutput;
    result.executionTime = performance.now() - start;
    
    // Check if result matches expectation
    if (verified !== testCase.expectedToPass) {
      result.error = `Expected ${testCase.expectedToPass ? 'success' : 'failure'}, got ${verified ? 'success' : 'failure'}`;
      result.passed = false;
    }
    
  } catch (error) {
    result.executionTime = performance.now() - start;
    result.error = error instanceof Error ? error.message : String(error);
    result.passed = !testCase.expectedToPass; // If we expected failure and got error, that's correct
  }

  return result;
}

// Main correctness testing function
async function runCorrectnessTests() {
  console.log('🧪 ZkProgram Mathematical Correctness Benchmark');
  console.log('===============================================\n');

  const programs = [
    { program: SimpleArithmetic, method: 'compute', testCases: testCases.SimpleArithmetic },
    { program: BooleanLogic, method: 'compute', testCases: testCases.BooleanLogic },
    { program: HashProgram, method: 'hash', testCases: testCases.HashProgram },
    { program: ConditionalProgram, method: 'compute', testCases: testCases.ConditionalProgram },
    { program: StructProgram, method: 'transform', testCases: testCases.StructProgram },
    { program: RangeCheckProgram, method: 'checkRange', testCases: testCases.RangeCheckProgram },
  ];

  const results: CorrectnessResult[] = [];
  const backendResults: { [key: string]: CorrectnessResult[] } = {};

  // Test with both backends
  const backends: ('snarky' | 'sparky')[] = ['snarky', 'sparky'];
  for (const backend of backends) {
    console.log(`🔄 Testing with ${backend.toUpperCase()} backend...`);
    console.log('─'.repeat(50));
    
    await switchBackend(backend);
    backendResults[backend] = [];
    
    for (const { program, method, testCases } of programs) {
      console.log(`\n📋 Compiling ${program.name}...`);
      
      try {
        await program.compile();
        console.log(`✅ ${program.name} compiled successfully`);
        
        console.log(`🧪 Running ${testCases.length} test cases...`);
        
        for (const testCase of testCases) {
          console.log(`  ⏱️  ${testCase.name}: ${testCase.description}`);
          
          const result = await runTestCase(program, method, testCase, backend);
          results.push(result);
          backendResults[backend].push(result);
          
          if (result.passed) {
            console.log(`  ✅ PASS (${result.executionTime.toFixed(2)}ms)`);
          } else {
            console.log(`  ❌ FAIL (${result.executionTime.toFixed(2)}ms): ${result.error || 'Unexpected result'}`);
          }
        }
        
      } catch (error) {
        console.log(`❌ ${program.name} compilation failed: ${error}`);
      }
    }
  }

  // Generate comparison report
  console.log('\n📊 BACKEND CORRECTNESS COMPARISON');
  console.log('=================================\n');
  
  // Compare results between backends
  const snarkyResults = backendResults['snarky'] || [];
  const sparkyResults = backendResults['sparky'] || [];
  
  const discrepancies: Array<{
    program: string;
    testCase: string;
    snarkyResult: boolean;
    sparkyResult: boolean;
    snarkyError?: string;
    sparkyError?: string;
  }> = [];

  for (const snarkyResult of snarkyResults) {
    const matchingSparkyResult = sparkyResults.find(
      r => r.name === snarkyResult.name && r.testCase === snarkyResult.testCase
    );
    
    if (matchingSparkyResult && snarkyResult.passed !== matchingSparkyResult.passed) {
      discrepancies.push({
        program: snarkyResult.name,
        testCase: snarkyResult.testCase,
        snarkyResult: snarkyResult.passed,
        sparkyResult: matchingSparkyResult.passed,
        snarkyError: snarkyResult.error,
        sparkyError: matchingSparkyResult.error,
      });
    }
  }

  console.log('Program                | Test Case          | Snarky | Sparky | Status');
  console.log('----------------------|-------------------|--------|--------|--------');
  
  for (const snarkyResult of snarkyResults) {
    const matchingSparkyResult = sparkyResults.find(
      r => r.name === snarkyResult.name && r.testCase === snarkyResult.testCase
    );
    
    if (matchingSparkyResult) {
      const snarkyStr = snarkyResult.passed ? '✅ PASS' : '❌ FAIL';
      const sparkyStr = matchingSparkyResult.passed ? '✅ PASS' : '❌ FAIL';
      const statusStr = snarkyResult.passed === matchingSparkyResult.passed ? '✅ MATCH' : '⚠️  DIFFER';
      
      console.log(
        `${snarkyResult.name.padEnd(21)} | ${snarkyResult.testCase.padEnd(17)} | ${snarkyStr.padEnd(6)} | ${sparkyStr.padEnd(6)} | ${statusStr}`
      );
    }
  }

  // Summary statistics
  console.log('\n📈 CORRECTNESS SUMMARY');
  console.log('=====================\n');
  
  const snarkyPassed = snarkyResults.filter(r => r.passed).length;
  const sparkyPassed = sparkyResults.filter(r => r.passed).length;
  const totalTests = snarkyResults.length;
  
  console.log(`📊 Test Results:`);
  console.log(`  • Total test cases: ${totalTests}`);
  console.log(`  • Snarky passed: ${snarkyPassed}/${totalTests} (${((snarkyPassed/totalTests)*100).toFixed(1)}%)`);
  console.log(`  • Sparky passed: ${sparkyPassed}/${totalTests} (${((sparkyPassed/totalTests)*100).toFixed(1)}%)`);
  console.log(`  • Discrepancies: ${discrepancies.length}`);
  
  if (discrepancies.length > 0) {
    console.log('\n⚠️  DISCREPANCIES FOUND:');
    for (const disc of discrepancies) {
      console.log(`  ${disc.program}.${disc.testCase}:`);
      console.log(`    Snarky: ${disc.snarkyResult ? 'PASS' : 'FAIL'} ${disc.snarkyError ? `(${disc.snarkyError})` : ''}`);
      console.log(`    Sparky: ${disc.sparkyResult ? 'PASS' : 'FAIL'} ${disc.sparkyError ? `(${disc.sparkyError})` : ''}`);
    }
  } else {
    console.log('\n✅ No discrepancies found between backends!');
  }

  // Performance comparison
  const snarkyAvgTime = snarkyResults.reduce((sum, r) => sum + r.executionTime, 0) / snarkyResults.length;
  const sparkyAvgTime = sparkyResults.reduce((sum, r) => sum + r.executionTime, 0) / sparkyResults.length;
  const speedup = snarkyAvgTime / sparkyAvgTime;
  
  console.log('\n⚡ Performance Comparison:');
  console.log(`  • Average Snarky execution: ${snarkyAvgTime.toFixed(2)}ms`);
  console.log(`  • Average Sparky execution: ${sparkyAvgTime.toFixed(2)}ms`);
  console.log(`  • Speedup: ${speedup.toFixed(2)}x ${speedup > 1 ? 'faster' : 'slower'}`);
  
  return {
    totalTests,
    snarkyPassed,
    sparkyPassed,
    discrepancies: discrepancies.length,
    snarkyAvgTime,
    sparkyAvgTime,
    speedup,
  };
}

// Run the correctness tests
runCorrectnessTests().catch(console.error);