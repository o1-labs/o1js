import { ZkProgram, Void } from './dist/node/index.js';

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
  console.log('Testing with backend:', process.env.BACKEND || 'default');
  console.log('Compiling EmptyProgram...');
  try {
    const { verificationKey } = await EmptyProgram.compile();
    console.log('✅ Compilation successful');
    console.log('VK hash:', verificationKey.hash);
    
    console.log('\nCreating proof...');
    const result = await EmptyProgram.empty();
    console.log('✅ Proof created successfully');
    
    console.log('\nVerifying proof...');
    const isValid = await EmptyProgram.verify(result.proof);
    console.log('✅ Proof verified:', isValid);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  }
}

test();