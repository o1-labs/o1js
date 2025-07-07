import { Field, ZkProgram, switchBackend } from './dist/node/index.js';

async function main() {
  console.log('Testing Sparky permutation cycle creation...\n');
  
  const SimpleProgram = ZkProgram({
    name: 'SimpleProgram',
    publicInput: Field,
    methods: {
      test: {
        privateInputs: [Field, Field],
        method(pub, a, b) {
          return a.mul(b).add(pub);
        }
      }
    }
  });

  await switchBackend('sparky');
  
  try {
    console.log('Compiling with Sparky...');
    const result = await SimpleProgram.compile();
    console.log('✅ Compilation succeeded!');
    
    console.log('\nTrying to generate proof...');
    const proof = await SimpleProgram.test(Field(10), Field(5), Field(3));
    console.log('✅ Proof generation succeeded!');
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

main().catch(console.error);