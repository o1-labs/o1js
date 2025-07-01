import { Field, initializeBindings, switchBackend, Provable } from '../../dist/node/index.js';

async function testSparkyConstraintMode() {
  await initializeBindings();
  await switchBackend('sparky');
  
  console.log('=== Testing Sparky constraint mode and VK generation ===\n');
  
  // Test 1: Simple constraint system with Field operations
  console.log('1. Testing simple Field.assertEqual constraint:');
  try {
    const result = await Provable.constraintSystem(() => {
      const x = Field(5);
      const y = Field(5);
      x.assertEquals(y);
    });
    
    console.log('✅ Constraint system result:', result);
    console.log('   Gates:', result.gates);
    console.log('   Public input size:', result.publicInputSize);
    console.log('   Rows:', result.rows);
    console.log('   Digest:', result.digest);
    console.log('   Summary:', result.summary());
  } catch (e) {
    console.error('❌ Failed:', e.message);
    console.error('Stack:', e.stack);
  }
  
  // Test 2: Try to generate a simple circuit and check VK
  console.log('\n2. Testing simple circuit VK generation:');
  try {
    // Create a simple zkProgram
    const { ZkProgram } = await import('../../dist/node/lib/proof-system/zkprogram.js');
    
    const SimpleProgram = ZkProgram({
      name: 'simple-test',
      publicInput: Field,
      methods: {
        testMethod: {
          privateInputs: [],
          async method(publicInput) {
            publicInput.assertEquals(Field(5));
          }
        }
      }
    });
    
    console.log('Compiling SimpleProgram...');
    const { verificationKey } = await SimpleProgram.compile();
    console.log('Verification key hash:', verificationKey.hash.toBigInt());
    console.log('VK data length:', verificationKey.data.length);
    
  } catch (e) {
    console.error('Failed to compile program:', e.message);
    console.error('Stack:', e.stack);
  }
}

testSparkyConstraintMode().catch(console.error);