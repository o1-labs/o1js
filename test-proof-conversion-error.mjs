import { Field, ZkProgram, switchBackend } from './dist/node/index.js';

console.log('Testing to find exact location of array[2] error...\n');

// Hook into console.error to catch the stack trace
const originalError = console.error;
let errorCaught = false;

console.error = function(...args) {
  if (!errorCaught && args[0] && args[0].toString().includes("reading '2'")) {
    errorCaught = true;
    console.log('\n🎯 CAUGHT THE ERROR!');
    console.log('Error:', args[0]);
    if (args[0].stack) {
      console.log('\nFull stack trace:');
      console.log(args[0].stack);
    }
  }
  originalError.apply(console, args);
};

const TestProgram = ZkProgram({
  name: 'TestProgram',
  publicInput: Field,
  methods: {
    test: {
      privateInputs: [],
      async method(x) {
        x.assertEquals(Field(0));
      }
    }
  }
});

async function test() {
  await switchBackend('snarky');
  
  try {
    console.log('Compiling with Snarky...');
    const { verificationKey } = await TestProgram.compile();
    
    console.log('Creating proof...');
    const { proof } = await TestProgram.test(Field(0));
    
    console.log('Proof created successfully');
    console.log('Proof type:', typeof proof);
    console.log('Proof keys:', Object.keys(proof));
    
    // Now switch to Sparky and try to verify
    console.log('\nSwitching to Sparky...');
    await switchBackend('sparky');
    
    console.log('Attempting to verify Snarky proof with Sparky backend...');
    const isValid = await TestProgram.verify(proof);
    console.log('Verification result:', isValid);
    
  } catch (error) {
    console.log('\n❌ Error caught in try/catch:');
    console.log('Message:', error.message);
    console.log('\nStack trace:');
    console.log(error.stack);
  }
}

test().catch(e => {
  console.log('\n❌ Unhandled error:');
  console.log(e);
});