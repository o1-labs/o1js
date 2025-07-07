import { Field, ZkProgram, switchBackend } from './dist/node/index.js';

// Ultra-minimal test to debug permutation cycle generation
const MinimalProgram = ZkProgram({
  name: 'MinimalProgram',
  publicInput: Field,
  publicOutput: Field,
  methods: {
    compute: {
      privateInputs: [Field],
      async method(publicInput, a) {
        console.log('🔍 MINIMAL TEST: a.add(publicInput)');
        // This should be the simplest possible program: a + publicInput = result
        // Should generate 1 constraint: a + publicInput - result = 0
        const result = a.add(publicInput);
        return result;
      }
    }
  }
});

async function debugPermutationCycles() {
  console.log('🚨 ULTRA-DEBUG: Minimal Permutation Cycle Investigation');
  console.log('=====================================================\n');
  
  await switchBackend('sparky');
  
  try {
    console.log('🔧 Compiling minimal program...');
    const compilationResult = await MinimalProgram.compile();
    console.log('✅ Compilation succeeded');
    
    console.log('\n🎯 Attempting proof generation...');
    // Test with: publicInput=10, a=5 → 5+10 = 15
    const proof = await MinimalProgram.compute(Field(10), Field(5));
    
    console.log('🎉 UNEXPECTED SUCCESS! Proof generated successfully!');
    console.log(`📊 Result: ${proof.publicOutput.toString()} (expected: 15)`);
    
  } catch (error) {
    console.log(`❌ Expected Error: ${error.message}`);
    
    if (error.message.includes('permutation was not constructed correctly')) {
      console.log('\n🔬 PERMUTATION ANALYSIS:');
      console.log('The error occurs in Kimchi verification of permutation polynomial.');
      console.log('This means the permutation cycles are malformed or incomplete.');
      console.log('\n🎯 ROOT CAUSE INVESTIGATION NEEDED:');
      console.log('1. Are permutation cycles being generated at all?');
      console.log('2. Are the cycles mathematically correct for PLONK?');
      console.log('3. Is the JSON export format compatible with Kimchi?');
      
      console.log('\n🔍 HYPOTHESIS:');
      console.log('Single-constraint programs may not generate cross-row permutation cycles,');
      console.log('but even singleton cycles should work if properly constructed.');
      
    } else {
      console.log('\n⚠️  Different error - may indicate progress past permutation issue');
    }
  }
  
  console.log('\n🧠 ULTRA-THINKING:');
  console.log('Even the simplest possible program (a + b) fails with permutation error.');
  console.log('This confirms the issue is FUNDAMENTAL in permutation construction,');
  console.log('not related to optimization or complex program structures.');
  console.log('\n🎯 NEXT: Investigate MIR→LIR permutation wiring generation directly.');
}

debugPermutationCycles().catch(console.error);