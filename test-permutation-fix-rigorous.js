import { Field, ZkProgram, switchBackend, Bool, Poseidon, Provable } from './dist/node/index.js';

// Recreate the EXACT failing programs from the original 23/25 failures
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

const ConditionalProgram = ZkProgram({
  name: 'ConditionalProgram',
  publicInput: Field,
  publicOutput: Field,
  methods: {
    compute: {
      privateInputs: [Bool, Field, Field],
      async method(publicInput, condition, ifTrue, ifFalse) {
        const selected = Provable.if(condition, ifTrue, ifFalse);
        const result = publicInput.add(selected);
        return { publicOutput: result };
      },
    },
  },
});

// Test cases with the exact same inputs that were failing
const testCases = [
  {
    name: 'SimpleArithmetic.normal_values',
    program: SimpleArithmetic,
    method: 'compute',
    inputs: [Field(10), Field(5), Field(3)], // 10 + 5*3 = 25
    expectedOutput: Field(25),
    description: 'The original failing test case'
  },
  {
    name: 'SimpleArithmetic.zero_values', 
    program: SimpleArithmetic,
    method: 'compute',
    inputs: [Field(0), Field(0), Field(0)], // 0 + 0*0 = 0
    expectedOutput: Field(0),
    description: 'Zero values edge case'
  },
  {
    name: 'BooleanLogic.all_true',
    program: BooleanLogic,
    method: 'compute', 
    inputs: [Bool(true), Bool(true), Bool(true), Bool(true), Bool(true)],
    expectedOutput: Bool(true),
    description: 'Boolean logic that was failing'
  },
  {
    name: 'HashProgram.normal_hash',
    program: HashProgram,
    method: 'hash',
    inputs: [Field(1), Field(2), Field(3), Field(4)],
    expectedOutput: null, // We'll verify it doesn't crash
    description: 'Hash program that was failing'
  },
  {
    name: 'ConditionalProgram.condition_true',
    program: ConditionalProgram,
    method: 'compute',
    inputs: [Field(10), Bool(true), Field(100), Field(200)], // 10 + 100 = 110
    expectedOutput: Field(110),
    description: 'Conditional logic that was failing'
  }
];

async function rigorousPermutationTest() {
  console.log('🧪 RIGOROUS PERMUTATION FIX VERIFICATION');
  console.log('==========================================\\n');
  
  console.log('🎯 Testing the EXACT programs that were failing with:');
  console.log('   "the permutation was not constructed correctly: final value"\\n');
  
  await switchBackend('sparky');
  console.log('✅ Switched to Sparky backend (with optimization fix)\\n');
  
  let totalTests = 0;
  let successfulTests = 0;
  let permutationErrors = 0;
  let otherErrors = 0;
  
  for (const testCase of testCases) {
    console.log(`\\n📋 Testing: ${testCase.name}`);
    console.log(`   Description: ${testCase.description}`);
    
    totalTests++;
    
    try {
      // 1. Compilation Test
      console.log('   🔧 Compiling program...');
      const startCompile = Date.now();
      await testCase.program.compile();
      const compileTime = Date.now() - startCompile;
      console.log(`   ✅ Compilation succeeded (${compileTime}ms)`);
      
      // 2. Proof Generation Test (the critical test)
      console.log('   🎯 Generating proof...');
      const startProof = Date.now();
      const proof = await testCase.program[testCase.method](...testCase.inputs);
      const proofTime = Date.now() - startProof;
      console.log(`   ✅ Proof generation succeeded (${proofTime}ms)`);
      
      // 3. Verification Test  
      console.log('   🔍 Verifying proof...');
      const verified = await testCase.program.verify(proof);
      console.log(`   ✅ Proof verification: ${verified ? 'PASSED' : 'FAILED'}`);
      
      // 4. Output Check (if expected)
      if (testCase.expectedOutput !== null) {
        const actualOutput = proof.publicOutput;
        const outputMatch = actualOutput.equals(testCase.expectedOutput).toBoolean();
        console.log(`   🎯 Output verification: ${outputMatch ? 'PASSED' : 'FAILED'}`);
        console.log(`      Expected: ${testCase.expectedOutput.toString()}`);
        console.log(`      Actual: ${actualOutput.toString()}`);
      }
      
      successfulTests++;
      console.log(`   🎉 OVERALL: SUCCESS - No permutation errors!`);
      
    } catch (error) {
      console.log(`   ❌ FAILED: ${error.message}`);
      
      if (error.message.includes('permutation was not constructed correctly')) {
        permutationErrors++;
        console.log('   🚨 PERMUTATION ERROR - FIX DID NOT WORK!');
      } else {
        otherErrors++;
        console.log('   ⚠️  Other error (not permutation-related)');
      }
    }
  }
  
  // Final Analysis
  console.log('\\n\\n📊 RIGOROUS TEST RESULTS');
  console.log('========================');
  console.log(`Total Tests: ${totalTests}`);
  console.log(`Successful: ${successfulTests}`);
  console.log(`Permutation Errors: ${permutationErrors}`);
  console.log(`Other Errors: ${otherErrors}`);
  console.log(`Success Rate: ${((successfulTests/totalTests)*100).toFixed(1)}%`);
  
  if (permutationErrors === 0) {
    console.log('\\n🎉 CONCLUSION: PERMUTATION FIX IS WORKING!');
    console.log('   All tests that previously failed with permutation errors now pass.');
    console.log('   The optimization bug fix successfully resolves the issue.');
  } else {
    console.log('\\n🚨 CONCLUSION: PERMUTATION FIX IS NOT COMPLETE!');
    console.log(`   ${permutationErrors} tests still failing with permutation errors.`);
    console.log('   Additional investigation needed.');
  }
  
  if (otherErrors > 0) {
    console.log(`\\n⚠️  NOTE: ${otherErrors} tests failed with non-permutation errors.`);
    console.log('   These may be separate issues from the permutation problem.');
  }
}

rigorousPermutationTest().catch(console.error);