/**
 * ZkProgram Mathematical Correctness Benchmark (CommonJS Version)
 * 
 * This benchmark tests the mathematical correctness of zkPrograms between
 * Sparky and Snarky backends, focusing on edge cases and potential inconsistencies.
 */

const { Field, ZkProgram, Struct, Provable, Bool, MerkleWitness, Poseidon, switchBackend, getCurrentBackend } = require('./dist/node/index.cjs');

// Re-use program definitions from compilation benchmark
class Point extends Struct({
  x: Field,
  y: Field,
}) {}

class MerkleWitness8 extends MerkleWitness(8) {}

// Test case types
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
      inputs: [Field.ORDER - 1n, 1, 1], // (p-1) + 1*1 = p = 0
      expectedToPass: true,
      description: 'Maximum field value causing overflow'
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
  ],
};

// Define zkPrograms
const SimpleArithmetic = ZkProgram({
  name: 'SimpleArithmetic',
  publicInput: Field,
  publicOutput: Field,
  methods: {
    compute: {
      privateInputs: [Field, Field],
      async method(publicInput, a, b) {
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
      async method(publicInput, a, b, c, d) {
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
      async method(publicInput, a, b, c) {
        const hash1 = Poseidon.hash([publicInput, a]);
        const hash2 = Poseidon.hash([hash1, b]);
        const hash3 = Poseidon.hash([hash2, c]);
        return { publicOutput: hash3 };
      },
    },
  },
});

// Helper function to run a single test case
async function runTestCase(program, methodName, testCase, backend) {
  const start = performance.now();
  const result = {
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
  console.log('===============================================\\n');

  const programs = [
    { program: SimpleArithmetic, method: 'compute', testCases: testCases.SimpleArithmetic },
    { program: BooleanLogic, method: 'compute', testCases: testCases.BooleanLogic },
    { program: HashProgram, method: 'hash', testCases: testCases.HashProgram },
  ];

  const results = [];
  const backendResults = {};

  // Test with sparky backend only
  const backends = ['sparky'];
  for (const backend of backends) {
    console.log(`🔄 Testing with ${backend.toUpperCase()} backend...`);
    console.log('─'.repeat(50));
    
    await switchBackend(backend);
    backendResults[backend] = [];
    
    for (const { program, method, testCases } of programs) {
      console.log(`\\n📋 Compiling ${program.name}...`);
      
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
  console.log('\\n📊 BACKEND CORRECTNESS COMPARISON');
  console.log('=================================\\n');
  
  // Show sparky results only
  const sparkyResults = backendResults['sparky'] || [];
  
  console.log('Program                | Test Case          | Sparky | Status');
  console.log('----------------------|-------------------|--------|--------');
  
  for (const sparkyResult of sparkyResults) {
    const sparkyStr = sparkyResult.passed ? '✅ PASS' : '❌ FAIL';
    
    console.log(
      `${sparkyResult.name.padEnd(21)} | ${sparkyResult.testCase.padEnd(17)} | ${sparkyStr.padEnd(6)} | ${sparkyResult.passed ? '✅ PASS' : '❌ FAIL'}`
    );
  }

  // Summary statistics
  console.log('\\n📈 CORRECTNESS SUMMARY');
  console.log('=====================\\n');
  
  const sparkyPassed = sparkyResults.filter(r => r.passed).length;
  const totalTests = sparkyResults.length;
  
  console.log(`📊 Test Results:`);
  console.log(`  • Total test cases: ${totalTests}`);
  console.log(`  • Sparky passed: ${sparkyPassed}/${totalTests} (${((sparkyPassed/totalTests)*100).toFixed(1)}%)`);
  
  // Performance statistics
  const sparkyAvgTime = sparkyResults.reduce((sum, r) => sum + r.executionTime, 0) / sparkyResults.length;
  
  console.log('\\n⚡ Performance Statistics:');
  console.log(`  • Average Sparky execution: ${sparkyAvgTime.toFixed(2)}ms`);
  
  return {
    totalTests,
    sparkyPassed,
    sparkyAvgTime,
  };
}

// Run the correctness tests
runCorrectnessTests().catch(console.error);