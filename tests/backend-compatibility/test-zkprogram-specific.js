import { Field, initializeBindings, switchBackend, Provable, Gadgets, ZkProgram, Cache } from '../../dist/node/index.js';

const { rotate64 } = Gadgets;

async function testZkProgramSpecific() {
  await initializeBindings();
  await switchBackend('sparky');
  
  console.log('=== Testing the exact failing scenario ===');
  
  // Test 1: Simple constraint system (this works)
  console.log('\n1. Simple constraint system:');
  try {
    const { constraints } = Provable.constraintSystem(() => {
      const result = rotate64(Field(15), 16, 'left');
      result.assertEquals(result); // Just to use the result
    });
    console.log('✅ Simple constraint system works, constraints:', constraints.length);
  } catch (e) {
    console.error('❌ Simple constraint system failed:', e.message);
  }
  
  // Test 2: Exact ZkProgram that's failing
  console.log('\n2. Exact failing ZkProgram:');
  try {
    const ConstraintCountProgram = ZkProgram({
      name: 'constraint-count',
      publicInput: undefined,
      methods: {
        testRotate: {
          privateInputs: [Field],
          async method(input) {
            // This should generate exactly 11 constraints per rotation
            const rotated = rotate64(input, 16, 'left');
            rotated.assertEquals(rotated); // Just to use the result
          }
        }
      }
    });

    console.log('About to compile...');
    const result = await ConstraintCountProgram.compile({ cache: Cache.None });
    console.log('✅ ZkProgram compilation succeeded!');
    console.log('Verification key length:', result.verificationKey.data.length);
  } catch (e) {
    console.error('❌ ZkProgram compilation failed:', e.message);
    console.error('Stack trace:', e.stack);
    
    // Let's see if the error is exactly what we expect
    if (e.message.includes('rotate gate failed: undefined')) {
      console.error('🔍 This is the exact error we\'re investigating!');
    }
  }
  
  // Test 3: Different rotation parameter
  console.log('\n3. Different rotation parameter:');
  try {
    const DifferentRotProgram = ZkProgram({
      name: 'different-rot',
      publicInput: undefined,
      methods: {
        testRotate: {
          privateInputs: [Field],
          async method(input) {
            const rotated = rotate64(input, 4, 'left'); // Different rotation
            rotated.assertEquals(rotated);
          }
        }
      }
    });

    const result = await DifferentRotProgram.compile({ cache: Cache.None });
    console.log('✅ Different rotation parameter works!');
  } catch (e) {
    console.error('❌ Different rotation parameter failed:', e.message);
  }
  
  // Test 4: Test with constant input
  console.log('\n4. Constant input test:');
  try {
    const ConstantProgram = ZkProgram({
      name: 'constant-input',
      publicInput: undefined,
      methods: {
        testRotate: {
          privateInputs: [],
          async method() {
            const input = Field(15); // Constant input
            const rotated = rotate64(input, 16, 'left');
            rotated.assertEquals(Field(240 * 65536)); // 15 << 16
          }
        }
      }
    });

    const result = await ConstantProgram.compile({ cache: Cache.None });
    console.log('✅ Constant input works!');
  } catch (e) {
    console.error('❌ Constant input failed:', e.message);
  }
}

testZkProgramSpecific().catch(console.error);