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

console.log('Testing basic VK generation...');

try {
  console.log('Compiling with Snarky...');
  const snarkyResult = await SimpleProgram.compile();
  console.log(`Snarky VK: ${snarkyResult.verificationKey.hash.substring(0, 20)}...`);
  
  console.log('Switching to Sparky...');
  await switchBackend('sparky');
  
  console.log('Compiling with Sparky...');
  const sparkyResult = await SimpleProgram.compile();
  console.log(`Sparky VK: ${sparkyResult.verificationKey.hash.substring(0, 20)}...`);
  
  console.log(`Match: ${snarkyResult.verificationKey.hash === sparkyResult.verificationKey.hash ? '✅' : '❌'}`);
  
} catch (error) {
  console.error('Error:', error.message);
  console.error(error.stack);
}