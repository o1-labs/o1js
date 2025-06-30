import { Field, initializeBindings, switchBackend, Provable, ZkProgram, Cache } from '../../dist/node/index.js';
import { Gadgets } from '../../dist/node/index.js';

const { rotate64 } = Gadgets;

async function testMinimal() {
  await initializeBindings();
  
  // Define a minimal program
  const MinimalRotate = ZkProgram({
    name: 'minimal-rotate',
    publicInput: undefined,
    methods: {
      test: {
        privateInputs: [],
        async method() {
          const input = Field(15); // Simple constant
          const rotated = rotate64(input, 4, 'left');
          rotated.assertEquals(Field(240)); // 15 << 4 = 240
        }
      }
    }
  });
  
  console.log('Testing with Snarky...');
  await switchBackend('snarky');
  try {
    const result = await MinimalRotate.compile({ cache: Cache.None });
    console.log('Snarky compile succeeded');
    console.log('Constraint count:', result.verificationKey.data.match(/gates":\[(\d+),/)?.[1]);
  } catch (e) {
    console.error('Snarky compile error:', e.message);
  }
  
  console.log('\nTesting with Sparky...');
  await switchBackend('sparky');
  try {
    const result = await MinimalRotate.compile({ cache: Cache.None });
    console.log('Sparky compile succeeded');
    console.log('Constraint count:', result.verificationKey.data.match(/gates":\[(\d+),/)?.[1]);
  } catch (e) {
    console.error('Sparky compile error:', e.message);
    console.error('Stack:', e.stack);
  }
}

testMinimal().catch(console.error);