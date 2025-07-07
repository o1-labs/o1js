/**
 * Sparky Optimization Bug Investigation
 * 
 * This script tests why Sparky is collapsing legitimate multi-constraint programs
 * down to single constraints, which appears to be a bug in the optimization pipeline.
 * 
 * Created: July 6, 2025 12:45 PM UTC
 * Last Modified: July 6, 2025 12:45 PM UTC
 */

import { Field, ZkProgram, Provable, switchBackend, getCurrentBackend } from './src/index.js';

// Test program that should definitely require multiple constraints
const MultiConstraintProgram = ZkProgram({
  name: 'MultiConstraintProgram',
  publicInput: Field,
  publicOutput: Field,
  methods: {
    compute: {
      privateInputs: [Field, Field, Field],
      async method(publicInput, a, b, c) {
        // Multiple explicit assertions that should NOT be optimized away
        const step1 = a.mul(b);
        step1.assertEquals(publicInput); // First constraint: a * b = publicInput
        
        const step2 = a.add(b);
        step2.assertEquals(c); // Second constraint: a + b = c
        
        const step3 = step1.add(step2);
        const result = step3.mul(Field(2));
        
        return { publicOutput: result };
      },
    },
  },
});

// Simple arithmetic program from the benchmark
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

// Program with multiple explicit assertEquals calls
const ExplicitAssertions = ZkProgram({
  name: 'ExplicitAssertions',
  publicInput: Field,
  publicOutput: Field,
  methods: {
    compute: {
      privateInputs: [Field, Field, Field, Field],
      async method(publicInput, a, b, c, d) {
        // These are explicit user assertions that MUST remain in the circuit
        a.assertEquals(b); // User constraint 1: a = b
        c.assertEquals(d); // User constraint 2: c = d
        
        const sum1 = a.add(c);
        const sum2 = b.add(d);
        sum1.assertEquals(sum2); // User constraint 3: (a + c) = (b + d)
        
        const result = sum1.add(publicInput);
        return { publicOutput: result };
      },
    },
  },
});

async function analyzeConstraintCounts() {
  console.log('🔍 Sparky Optimization Bug Analysis');
  console.log('=====================================\n');

  const programs = [
    { name: 'SimpleArithmetic', program: SimpleArithmetic },
    { name: 'MultiConstraintProgram', program: MultiConstraintProgram },
    { name: 'ExplicitAssertions', program: ExplicitAssertions },
  ];

  const backends = ['snarky', 'sparky'];
  
  for (const backend of backends) {
    console.log(`\n🔄 Testing with ${backend.toUpperCase()} backend`);
    console.log('─'.repeat(50));
    
    await switchBackend(backend);
    
    for (const { name, program } of programs) {
      console.log(`\n📊 Analyzing ${name}:`);
      
      try {
        console.log('  🔧 Compiling...');
        const compilationResult = await program.compile();
        
        // Try to extract constraint information if available
        console.log('  ✅ Compilation successful');
        
        if (compilationResult.verificationKey) {
          console.log(`  🔑 Verification key exists: ${!!compilationResult.verificationKey.data}`);
          console.log(`  📈 VK data length: ${compilationResult.verificationKey.data?.length || 'unknown'}`);
        }
        
        // Test with actual proof generation
        console.log('  🧪 Testing proof generation...');
        
        let testInputs;
        if (name === 'SimpleArithmetic') {
          testInputs = [Field(10), Field(5), Field(3)]; // 10 + 5*3 = 25
        } else if (name === 'MultiConstraintProgram') {
          testInputs = [Field(15), Field(5), Field(3), Field(8)]; // a*b=15, a+b=8
        } else if (name === 'ExplicitAssertions') {
          testInputs = [Field(0), Field(5), Field(5), Field(3), Field(3)]; // a=b=5, c=d=3
        }
        
        const proof = await program.compute(...testInputs);
        const verified = await program.verify(proof);
        
        console.log(`  ✅ Proof generation: ${verified ? 'SUCCESS' : 'FAILED'}`);
        console.log(`  📤 Public output: ${proof.publicOutput?.toString() || 'unknown'}`);
        
        // This is the key issue - we can't directly see constraint counts
        // but if Sparky is over-optimizing, proofs should fail or produce wrong results
        
      } catch (error) {
        console.log(`  ❌ Failed: ${error.message}`);
        
        // Check if this is an optimization bug (constraint validation failure)
        if (error.message.includes('constraint') || 
            error.message.includes('assertion') ||
            error.message.includes('unsatisfiable')) {
          console.log('  ⚠️  POTENTIAL OPTIMIZATION BUG: Constraints may have been incorrectly removed');
        }
      }
    }
  }
  
  console.log('\n📋 ANALYSIS SUMMARY');
  console.log('==================');
  console.log('If Sparky over-optimizes:');
  console.log('- Programs should fail compilation or proof generation');
  console.log('- assertEquals calls should be preserved as constraints');
  console.log('- Multi-step arithmetic should require multiple constraints');
  console.log('');
  console.log('Key tests:');
  console.log('1. ExplicitAssertions: Three assertEquals() calls should remain');
  console.log('2. MultiConstraintProgram: Multiple computation steps with assertions');
  console.log('3. SimpleArithmetic: Basic arithmetic (baseline test)');
}

// Test with specific values that would reveal optimization bugs
async function testConstraintValidation() {
  console.log('\n🎯 Constraint Validation Test');
  console.log('============================');
  
  await switchBackend('sparky');
  
  console.log('Testing ExplicitAssertions with INVALID inputs...');
  
  try {
    // This should FAIL because a ≠ b, but if constraints are removed, it might pass
    await ExplicitAssertions.compile();
    const invalidProof = await ExplicitAssertions.compute(
      Field(0),   // publicInput
      Field(5),   // a = 5
      Field(7),   // b = 7 (a ≠ b, should fail)
      Field(3),   // c = 3 
      Field(3)    // d = 3
    );
    
    console.log('❌ BUG DETECTED: Invalid proof was accepted!');
    console.log('This indicates assertEquals(a, b) constraint was incorrectly removed');
    
  } catch (error) {
    console.log('✅ Correct behavior: Invalid inputs rejected');
    console.log(`   Error: ${error.message}`);
  }
  
  try {
    // Test with valid inputs
    await ExplicitAssertions.compile();
    const validProof = await ExplicitAssertions.compute(
      Field(0),   // publicInput
      Field(5),   // a = 5
      Field(5),   // b = 5 (a = b, should pass)
      Field(3),   // c = 3
      Field(3)    // d = 3 (c = d, should pass)
    );
    
    const verified = await ExplicitAssertions.verify(validProof);
    console.log(`✅ Valid inputs: ${verified ? 'ACCEPTED' : 'REJECTED'}`);
    
  } catch (error) {
    console.log('❌ Error with valid inputs (potential bug):');
    console.log(`   Error: ${error.message}`);
  }
}

// Main execution
console.log('Starting Sparky optimization bug investigation...\n');

analyzeConstraintCounts()
  .then(() => testConstraintValidation())
  .catch(error => {
    console.error('Investigation failed:', error);
    process.exit(1);
  });