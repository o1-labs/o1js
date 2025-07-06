/**
 * ZkProgram Mathematical Correctness Benchmark (Dynamic Imports)
 * Tests Sparky backend with dynamic imports to avoid module loading issues
 */

// Test case definitions
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
      inputs: [28948022309329048855892746252171976963363056481941560715954676764349967630336n, 1, 1], // Field.ORDER - 1 + 1*1 = 0
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

// Helper function to run a single test case
async function runTestCase(program, methodName, testCase, o1js) {
  const start = performance.now();
  const result = {
    name: program.name,
    testCase: testCase.name,
    passed: false,
    executionTime: 0,
  };

  try {
    // Generate proof using the correct pattern
    const proofResult = await program[methodName](...testCase.inputs);
    const proof = proofResult.proof || proofResult;
    
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
    result.passed = !testCase.expectedToPass;
  }

  return result;
}

// Main correctness testing function
async function runCorrectnessTests() {
  console.log('🧪 ZkProgram Mathematical Correctness Benchmark (Sparky)');
  console.log('=======================================================\n');

  // Use dynamic import
  const o1js = await import('./dist/node/index.js');
  const { Field, ZkProgram, Struct, Provable, Bool, Poseidon, switchBackend } = o1js;

  // Define programs using imported modules
  class Point extends Struct({
    x: Field,
    y: Field,
  }) {}

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

  const programs = [
    { program: SimpleArithmetic, method: 'compute', testCases: testCases.SimpleArithmetic },
    { program: BooleanLogic, method: 'compute', testCases: testCases.BooleanLogic },
    { program: HashProgram, method: 'hash', testCases: testCases.HashProgram },
  ];

  const results = [];

  console.log('🔄 Testing with SPARKY backend...');
  console.log('─'.repeat(50));
  
  await switchBackend('sparky');
  
  for (const { program, method, testCases: programTestCases } of programs) {
    console.log(`\n📋 Compiling ${program.name}...`);
    
    try {
      await program.compile();
      console.log(`✅ ${program.name} compiled successfully`);
      
      console.log(`🧪 Running ${programTestCases.length} test cases...`);
      
      for (const testCase of programTestCases) {
        console.log(`  ⏱️  ${testCase.name}: ${testCase.description}`);
        
        const result = await runTestCase(program, method, testCase, o1js);
        results.push(result);
        
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

  // Generate report
  console.log('\n📊 SPARKY CORRECTNESS REPORT');
  console.log('============================\n');
  
  console.log('Program                | Test Case          | Sparky | Status');
  console.log('----------------------|-------------------|--------|--------');
  
  for (const result of results) {
    const sparkyStr = result.passed ? '✅ PASS' : '❌ FAIL';
    
    console.log(
      `${result.name.padEnd(21)} | ${result.testCase.padEnd(17)} | ${sparkyStr.padEnd(6)} | ${result.passed ? '✅ PASS' : '❌ FAIL'}`
    );
  }

  // Summary statistics
  console.log('\n📈 CORRECTNESS SUMMARY');
  console.log('=====================\n');
  
  const sparkyPassed = results.filter(r => r.passed).length;
  const totalTests = results.length;
  
  console.log(`📊 Test Results:`);
  console.log(`  • Total test cases: ${totalTests}`);
  console.log(`  • Sparky passed: ${sparkyPassed}/${totalTests} (${((sparkyPassed/totalTests)*100).toFixed(1)}%)`);
  
  // Performance statistics
  const sparkyAvgTime = results.reduce((sum, r) => sum + r.executionTime, 0) / results.length;
  
  console.log('\n⚡ Performance Statistics:');
  console.log(`  • Average Sparky execution: ${sparkyAvgTime.toFixed(2)}ms`);
  
  return {
    totalTests,
    sparkyPassed,
    sparkyAvgTime,
  };
}

// Run the correctness tests
runCorrectnessTests().catch(console.error);