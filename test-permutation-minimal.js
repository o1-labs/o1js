import { Field, ZkProgram, switchBackend, Provable } from './dist/node/index.js';

async function testSparkyPermutation() {
  console.log('Testing Sparky permutation fix...\n');
  
  // Switch to Sparky backend
  await switchBackend('sparky');
  console.log('✅ Switched to Sparky backend');
  
  // Create simple test program
  const TestProgram = ZkProgram({
    name: 'TestProgram',
    publicInput: Field,
    methods: {
      test: {
        privateInputs: [Field, Field],
        async method(publicInput, a, b) {
          // This creates multiple wire positions for variables
          const product = a.mul(b);
          const sum = publicInput.add(product);
          return sum;
        }
      }
    }
  });
  
  try {
    console.log('🔧 Compiling ZkProgram...');
    const result = await TestProgram.compile();
    console.log('✅ Compilation succeeded!');
    console.log(`   VK exists: ${!!result.verificationKey}`);
    
    console.log('\n🔧 Creating proof...');
    const proof = await TestProgram.test(Field(10), Field(5), Field(3));
    console.log('✅ Proof created successfully!');
    console.log(`   Public output: ${proof.publicOutput}`);
    
    console.log('\n🔧 Verifying proof...');
    const isValid = await TestProgram.verify(proof.proof);
    console.log(`✅ Proof verification: ${isValid}`);
    
    console.log('\n🎉 PERMUTATION FIX SUCCESSFUL! 🎉');
    
  } catch (error) {
    console.log('❌ Error:', error.message);
    if (error.message.includes('permutation was not constructed correctly')) {
      console.log('\n⚠️  PERMUTATION FIX NOT WORKING - Still getting permutation error');
    }
  }
}

testSparkyPermutation().catch(console.error);