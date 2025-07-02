import { Field, ZkProgram, switchBackend } from './dist/node/index.js';

// Ultra-simple test program
const SimpleProgram = ZkProgram({
  name: 'Simple',
  methods: {
    check: {
      privateInputs: [Field],
      async method(x) {
        x.assertEquals(Field(1));
      }
    }
  }
});

console.log('Debugging VK structure...');

try {
  console.log('Compiling with Snarky...');
  const snarkyResult = await SimpleProgram.compile();
  console.log('Snarky VK structure:', typeof snarkyResult.verificationKey.hash, snarkyResult.verificationKey.hash);
  
  console.log('Switching to Sparky...');
  await switchBackend('sparky');
  
  console.log('Compiling with Sparky...');
  const sparkyResult = await SimpleProgram.compile();
  console.log('Sparky VK structure:', typeof sparkyResult.verificationKey.hash, sparkyResult.verificationKey.hash);
  
} catch (error) {
  console.error('Error:', error.message);
  console.error(error.stack);
}