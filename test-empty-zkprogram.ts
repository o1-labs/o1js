import { ZkProgram, Void } from './src/index.js';

// Test case from FIX.md
const EmptyProgram = ZkProgram({
  name: 'EmptyProgram',
  publicInput: Void,
  publicOutput: Void,
  methods: {
    empty: {
      privateInputs: [],
      async method() {
        // No constraints
      }
    }
  }
});

async function test() {
  console.log('Compiling EmptyProgram...');
  try {
    const { verificationKey } = await EmptyProgram.compile();
    console.log('✅ Compilation successful');
    console.log('VK hash:', verificationKey.hash);
    
    console.log('\nCreating proof...');
    const proof = await EmptyProgram.empty();
    console.log('✅ Proof created successfully');
    
    console.log('\nVerifying proof...');
    const isValid = await EmptyProgram.verify(proof);
    console.log('✅ Proof verified:', isValid);
  } catch (error) {
    console.error('❌ Error:', error);
    console.error('Stack:', error.stack);
  }
}

test();