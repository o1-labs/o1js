import { Field, ZkProgram, switchBackend, Void } from './dist/node/index.js';

console.log('Testing to debug assert_equal: 0 != 1 error...\n');

// Ultra-minimal zkProgram - no constraints
const MinimalProgram = ZkProgram({
  name: 'MinimalProgram',
  publicInput: Void,
  publicOutput: Void,
  methods: {
    empty: {
      privateInputs: [],
      async method() {
        // Literally do nothing - no constraints
        console.log('Method executed - no constraints generated');
      }
    }
  }
});

async function test() {
  console.log('Switching to Sparky backend...');
  await switchBackend('sparky');
  
  try {
    console.log('\nCompiling program...');
    const { verificationKey } = await MinimalProgram.compile();
    console.log('✅ Compilation successful');
    console.log(`VK hash: ${verificationKey.hash.toString()}`);
    
    console.log('\nCreating proof...');
    const proof = await MinimalProgram.empty();
    console.log('✅ Proof created');
    
    console.log('\nVerifying proof...');
    const isValid = await MinimalProgram.verify(proof);
    console.log(`✅ Proof valid: ${isValid}`);
  } catch (error) {
    console.error('❌ Error:', error);
    console.error('Stack:', error.stack);
  }
}

test().catch(console.error);