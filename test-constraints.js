import { Field, switchBackend, getCurrentBackend, ZkProgram } from './dist/node/index.js';

async function testConstraints() {
  console.log('Testing constraint generation...\n');
  
  // Define a simple program that does multiplication
  const SimpleProgram = ZkProgram({
    name: 'simple-multiply',
    publicInput: Field,
    methods: {
      multiply: {
        privateInputs: [Field],
        async method(publicInput, privateInput) {
          const result = publicInput.mul(privateInput);
          result.assertEquals(Field(200)); // 10 * 20 = 200
        }
      }
    }
  });
  
  // Test with Snarky
  console.log('Testing with Snarky backend...');
  await switchBackend('snarky');
  console.log('Current backend:', getCurrentBackend());
  
  try {
    const snarkyVk = await SimpleProgram.compile();
    console.log('Snarky compilation successful');
    console.log('Snarky constraint count:', snarkyVk.constraintSystem?.gates?.length || 'unknown');
  } catch (e) {
    console.error('Snarky compilation failed:', e.message);
  }
  
  // Test with Sparky
  console.log('\nTesting with Sparky backend...');
  await switchBackend('sparky');
  console.log('Current backend:', getCurrentBackend());
  
  try {
    const sparkyVk = await SimpleProgram.compile();
    console.log('Sparky compilation successful');
    console.log('Sparky constraint count:', sparkyVk.constraintSystem?.gates?.length || 'unknown');
  } catch (e) {
    console.error('Sparky compilation failed:', e.message);
  }
}

testConstraints().catch(console.error);