import { switchBackend, Field, ZkProgram, Void } from './dist/node/index.js';

async function testSnarky() {
  console.log('Testing Snarky backend...\n');
  
  await switchBackend('snarky');
  
  // Same program that fails with Sparky
  const OneConstraintProgram = ZkProgram({
    name: 'OneConstraintProgram',
    publicInput: Field,
    publicOutput: Void,
    methods: {
      test: {
        privateInputs: [],
        async method(x) {
          x.assertEquals(Field(0));
        }
      }
    }
  });
  
  try {
    console.log('1. Compiling...');
    const compileResult = await OneConstraintProgram.compile();
    console.log('✅ Compilation successful');
    console.log(`   VK exists: ${!!compileResult.verificationKey}`);
    if (compileResult.verificationKey) {
      console.log(`   VK hash: ${compileResult.verificationKey.hash}`);
    }
    
    console.log('\n2. Creating proof with valid input (0)...');
    const proof = await OneConstraintProgram.test(Field(0));
    console.log('✅ Proof created successfully');
    
    console.log('\n3. Verifying proof...');
    const isValid = await OneConstraintProgram.verify(proof);
    console.log(`✅ Proof verified: ${isValid}`);
    
    console.log('\n4. Testing with invalid input (should fail during proof creation)...');
    try {
      const invalidProof = await OneConstraintProgram.test(Field(1));
      console.log('⚠️  Created proof with invalid input (this should have failed)');
      
      const isInvalidValid = await OneConstraintProgram.verify(invalidProof);
      console.log(`   Verification result: ${isInvalidValid}`);
    } catch (error) {
      console.log('✅ Correctly failed to create proof with invalid input');
      console.log(`   Error: ${error.message}`);
    }
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.stack) {
      console.error('Stack trace:', error.stack);
    }
  }
}

testSnarky().catch(console.error);