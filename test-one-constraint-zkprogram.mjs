import { ZkProgram, Field, switchBackend, getCurrentBackend } from './dist/node/index.js';

// Test case from FIX.md - Program with one constraint
const OneConstraintProgram = ZkProgram({
  name: 'OneConstraintProgram', 
  publicInput: Field,
  publicOutput: undefined,
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
  console.log('Current backend:', getCurrentBackend());
  console.log('Switching to sparky backend...');
  
  await switchBackend('sparky');
  console.log('Current backend after switch:', getCurrentBackend());
  
  console.log('\nCompiling OneConstraintProgram...');
  try {
    const { verificationKey } = await OneConstraintProgram.compile();
    console.log('✅ Compilation successful');
    console.log('VK hash:', verificationKey.hash);
    
    console.log('\nCreating proof...');
    const result = await OneConstraintProgram.test(Field(0));
    console.log('✅ Proof created successfully');
    
    console.log('\nVerifying proof...');
    const isValid = await OneConstraintProgram.verify(result.proof);
    console.log('✅ Proof verified:', isValid);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  }
}

test();