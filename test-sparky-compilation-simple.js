import { Field, Provable, ZkProgram } from './dist/node/index.js';
import { switchBackend } from './dist/node/bindings.js';

console.log('Testing ZkProgram compilation with Sparky...');

const SimpleProgram = ZkProgram({
  name: 'simple',
  publicInput: Field,
  
  methods: {
    add: {
      privateInputs: [Field],
      
      async method(publicInput, privateInput) {
        publicInput.add(privateInput).assertEquals(Field(100));
      }
    }
  }
});

async function test() {
  try {
    console.log('Switching to Sparky backend...');
    await switchBackend('sparky');
    console.log('Switched to Sparky successfully');
    
    console.log('Starting compilation...');
    const result = await SimpleProgram.compile();
    console.log('Compilation successful!');
    console.log('Verification key exists:', Boolean(result.verificationKey));
    console.log('VK hash:', result.verificationKey?.hash);
  } catch (error) {
    console.error('Compilation failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

test();