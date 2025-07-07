import { switchBackend, Field, ZkProgram, Void } from './dist/node/index.js';

// Program with one constraint
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

async function testWithBackend(backend) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Testing with ${backend} backend`);
  console.log('='.repeat(60));
  
  await switchBackend(backend);
  
  try {
    console.log('\n1. Compiling...');
    const startCompile = Date.now();
    const compileResult = await OneConstraintProgram.compile();
    const compileTime = Date.now() - startCompile;
    console.log(`✅ Compilation successful (${compileTime}ms)`);
    
    // Log constraint count
    console.log(`\n2. Constraint analysis:`);
    console.log(`   Constraint count: ${compileResult.constraintCount ?? 'unknown'}`);
    console.log(`   Verification key exists: ${!!compileResult.verificationKey}`);
    if (compileResult.verificationKey) {
      console.log(`   VK hash: ${compileResult.verificationKey.hash}`);
      console.log(`   VK data length: ${JSON.stringify(compileResult.verificationKey.data).length} chars`);
    }
    
    console.log('\n3. Creating proof...');
    const startProof = Date.now();
    const proof = await OneConstraintProgram.test(Field(0));
    const proofTime = Date.now() - startProof;
    console.log(`✅ Proof created successfully (${proofTime}ms)`);
    
    console.log('\n4. Verifying proof...');
    const startVerify = Date.now();
    const isValid = await OneConstraintProgram.verify(proof);
    const verifyTime = Date.now() - startVerify;
    console.log(`✅ Proof verified: ${isValid} (${verifyTime}ms)`);
    
    console.log('\n5. Testing with invalid input (should succeed in creating proof)...');
    try {
      const invalidProof = await OneConstraintProgram.test(Field(1));
      console.log('✅ Created proof with invalid input (this should not verify)');
      
      const isInvalidValid = await OneConstraintProgram.verify(invalidProof);
      console.log(`   Verification result: ${isInvalidValid} (should be false)`);
    } catch (error) {
      console.log('❌ Failed to create proof with invalid input:', error.message);
    }
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.stack) {
      console.error('\nStack trace:');
      console.error(error.stack);
    }
  }
}

async function main() {
  console.log('OneConstraintProgram Comparison Test');
  console.log('===================================\n');
  
  // Test with both backends
  await testWithBackend('snarky');
  await testWithBackend('sparky');
  
  console.log('\n\nComparison complete!');
}

main().catch(console.error);