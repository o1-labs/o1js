import { Field, ZkProgram, switchBackend, Void } from './dist/node/index.js';

console.log('Testing zero-constraint proof creation and verification...\n');

// Program with NO constraints at all
const EmptyProgram = ZkProgram({
  name: 'EmptyProgram',
  publicInput: Void,
  publicOutput: Void,
  methods: {
    empty: {
      privateInputs: [],
      async method() {
        // Absolutely nothing - no constraints
      }
    }
  }
});

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

async function testProgram(program, programName, backend, input = undefined) {
  console.log(`\n=== Testing ${programName} with ${backend} ===`);
  await switchBackend(backend);
  
  try {
    console.log('Compiling...');
    const { verificationKey } = await program.compile();
    console.log('✅ Compiled');
    
    console.log('Creating proof...');
    const methodName = Object.keys(program.rawMethods)[0];
    const proof = input !== undefined 
      ? await program[methodName](input)
      : await program[methodName]();
    
    console.log('✅ Proof created');
    console.log('Proof type:', typeof proof);
    
    console.log('Verifying proof...');
    const isValid = await program.verify(proof);
    console.log(`✅ Verification result: ${isValid}`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    // Only print first few lines of stack
    const stackLines = error.stack.split('\n');
    console.error('Stack:', stackLines.slice(0, 5).join('\n'));
  }
}

async function main() {
  // Test empty program (zero constraints)
  await testProgram(EmptyProgram, 'EmptyProgram', 'snarky');
  await testProgram(EmptyProgram, 'EmptyProgram', 'sparky');
  
  // Test one constraint program
  await testProgram(OneConstraintProgram, 'OneConstraintProgram', 'snarky', Field(0));
  await testProgram(OneConstraintProgram, 'OneConstraintProgram', 'sparky', Field(0));
}

main().catch(console.error);