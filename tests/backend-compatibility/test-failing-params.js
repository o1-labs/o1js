import { Field, initializeBindings, switchBackend, ZkProgram, Cache } from '../../dist/node/index.js';
import { Gadgets } from '../../dist/node/index.js';

const { rotate64 } = Gadgets;

async function testFailingParams() {
  await initializeBindings();
  await switchBackend('sparky');
  
  console.log('=== Testing the exact failing parameters ===');
  
  // Test 1: Rotation by 16 (from the failing test)
  console.log('\n1. Testing rotation by 16:');
  try {
    const Program16 = ZkProgram({
      name: 'rotate-16',
      publicInput: undefined,
      methods: {
        test: {
          privateInputs: [],
          async method() {
            const input = Field(15);
            const rotated = rotate64(input, 16, 'left');
            rotated.assertEquals(rotated); // Just use the result
          }
        }
      }
    });
    
    await Program16.compile({ cache: Cache.None });
    console.log('✅ Rotation by 16 succeeded');
  } catch (e) {
    console.error('❌ Rotation by 16 failed:', e.message);
  }
  
  // Test 2: Variable input (from the failing test)
  console.log('\n2. Testing with variable input:');
  try {
    const ProgramVar = ZkProgram({
      name: 'rotate-var',
      publicInput: Field,
      methods: {
        test: {
          privateInputs: [],
          async method(input) {
            const rotated = rotate64(input, 16, 'left');
            rotated.assertEquals(rotated);
          }
        }
      }
    });
    
    await ProgramVar.compile({ cache: Cache.None });
    console.log('✅ Variable input succeeded');
  } catch (e) {
    console.error('❌ Variable input failed:', e.message);
  }
  
  // Test 3: Test different rotation amounts
  console.log('\n3. Testing different rotation amounts:');
  for (const bits of [0, 1, 8, 16, 32, 63, 64]) {
    try {
      const ProgramN = ZkProgram({
        name: `rotate-${bits}`,
        publicInput: undefined,
        methods: {
          test: {
            privateInputs: [],
            async method() {
              const rotated = rotate64(Field(15), bits, 'left');
              rotated.assertEquals(rotated);
            }
          }
        }
      });
      
      await ProgramN.compile({ cache: Cache.None });
      console.log(`✅ Rotation by ${bits} succeeded`);
    } catch (e) {
      console.error(`❌ Rotation by ${bits} failed:`, e.message);
    }
  }
  
  // Test 4: Test with larger input values
  console.log('\n4. Testing with larger input values:');
  try {
    const ProgramBig = ZkProgram({
      name: 'rotate-big',
      publicInput: undefined,
      methods: {
        test: {
          privateInputs: [],
          async method() {
            const input = Field(0x0123456789ABCDEFn); // Large 64-bit value
            const rotated = rotate64(input, 16, 'left');
            rotated.assertEquals(rotated);
          }
        }
      }
    });
    
    await ProgramBig.compile({ cache: Cache.None });
    console.log('✅ Large input value succeeded');
  } catch (e) {
    console.error('❌ Large input value failed:', e.message);
  }
}

testFailingParams().catch(console.error);