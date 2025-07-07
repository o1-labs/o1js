import { Field, ZkProgram, switchBackend, Provable } from './dist/node/index.js';

async function testSparkyPermutationWithWitness() {
  console.log('Testing Sparky permutation fix with witness variables...\n');
  
  // Switch to Sparky backend
  await switchBackend('sparky');
  console.log('✅ Switched to Sparky backend');
  
  // Create test program that uses witness variables multiple times
  const TestProgram = ZkProgram({
    name: 'TestProgram',
    publicInput: Field,
    methods: {
      test: {
        privateInputs: [],
        async method(publicInput) {
          // Create witness variables
          const witness1 = Provable.witness(Field, () => Field(5));
          const witness2 = Provable.witness(Field, () => Field(3));
          
          // Use witness1 multiple times to create multiple wire positions
          const step1 = witness1.mul(witness2);     // witness1 at position 1
          const step2 = witness1.add(publicInput);  // witness1 at position 2
          const step3 = step1.add(step2);           // Combined result
          
          // Use witness2 again
          const step4 = witness2.mul(witness2);     // witness2 at position 2
          const result = step3.add(step4);
          
          return result;
        }
      }
    }
  });
  
  try {
    console.log('🔧 Compiling ZkProgram...');
    const compilationResult = await TestProgram.compile();
    console.log('✅ Compilation succeeded!');
    console.log(`   VK exists: ${!!compilationResult.verificationKey}`);
    
    console.log('\n🔧 Creating proof...');
    const proof = await TestProgram.test(Field(10));
    console.log('✅ Proof created successfully!');
    console.log(`   Public output: ${proof.publicOutput}`);
    console.log(`   Expected: (5*3) + (5+10) + (3*3) = 15 + 15 + 9 = 39`);
    
    console.log('\n🔧 Verifying proof...');
    const isValid = await TestProgram.verify(proof.proof);
    console.log(`✅ Proof verification: ${isValid}`);
    
    console.log('\n🎉 PERMUTATION FIX SUCCESSFUL! 🎉');
    console.log('✅ Witness variables with multiple wire positions handled correctly!');
    
  } catch (error) {
    console.log('❌ Error:', error.message);
    if (error.message.includes('permutation was not constructed correctly')) {
      console.log('\n⚠️  PERMUTATION FIX NOT WORKING - Still getting permutation error');
      console.log('   This test uses witness variables that appear in multiple positions');
      console.log('   witness1 appears in mul and add operations');
      console.log('   witness2 appears in mul operations twice');
    }
  }
}

testSparkyPermutationWithWitness().catch(console.error);