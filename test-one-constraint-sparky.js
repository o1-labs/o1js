import { switchBackend, Field, ZkProgram, Void } from './dist/node/index.js';

// Switch to Sparky backend
async function testOneConstraintProgram() {
  console.log('Testing OneConstraintProgram with Sparky backend...\n');
  
  await switchBackend('sparky');
  
  // Program with one constraint
  const OneConstraintProgram = ZkProgram({
    name: 'OneConstraintProgram',
    publicInput: Field,
    publicOutput: Void,
    methods: {
      test: {
        privateInputs: [],
        async method(x) {
          x.assertEquals(Field(0));
        }
      }
    }
  });
  
  try {
    console.log('Compiling...');
    await OneConstraintProgram.compile();
    console.log('✅ Compilation successful\n');
    
    console.log('Creating proof...');
    const proof = await OneConstraintProgram.test(Field(0));
    console.log('✅ Proof created successfully\n');
    
    console.log('Verifying proof...');
    const isValid = await OneConstraintProgram.verify(proof);
    console.log(`✅ Proof verified: ${isValid}`);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('\nFull error:', error);
  }
}

testOneConstraintProgram().catch(console.error);