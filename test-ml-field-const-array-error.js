import { Field, ZkProgram, switchBackend } from './dist/node/index.js';

// Enable debug logging
globalThis.DEBUG_ML_FIELD_CONST_ARRAY = true;

async function test() {
  await switchBackend('sparky');
  console.log('Backend set to sparky');
  
  const TestProgram = ZkProgram({
    name: 'TestProgram',
    publicOutput: Field,
    methods: {
      test: {
        privateInputs: [],
        method: () => {
          console.log('In test method');
          return { publicOutput: Field(42) };
        }
      }
    }
  });
  
  console.log('Compiling program...');
  try {
    await TestProgram.compile();
    console.log('Compilation successful!');
  } catch (error) {
    console.error('Compilation failed:', error);
    console.error('Error stack:', error.stack);
  }
}

test().catch(console.error);