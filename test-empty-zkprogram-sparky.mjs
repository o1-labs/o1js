import { ZkProgram, Void, switchBackend, getCurrentBackend } from './dist/node/index.js';

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
  console.log('Current backend:', getCurrentBackend());
  console.log('Switching to sparky backend...');
  
  await switchBackend('sparky');
  console.log('Current backend after switch:', getCurrentBackend());
  
  console.log('\nCompiling EmptyProgram...');
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