import { Field, ZkProgram, switchBackend, Struct } from './dist/node/index.js';

// Enable debug logging
globalThis.DEBUG_ML_FIELD_CONST_ARRAY = true;

// Create a struct with multiple fields
class MultiFieldOutput extends Struct({
  field0: Field,
  field1: Field,
  field2: Field,
}) {}

async function test() {
  await switchBackend('sparky');
  console.log('Backend set to sparky');
  
  const TestProgram = ZkProgram({
    name: 'TestProgram',
    publicOutput: MultiFieldOutput,
    methods: {
      test: {
        privateInputs: [],
        method: () => {
          console.log('In test method - creating multi-field output');
          // Create Field objects with different values
          const field0 = Field(0);
          const field1 = Field(1);
          const field2 = Field(2);
          
          console.log('Field objects created:');
          console.log('field0:', field0);
          console.log('field1:', field1);
          console.log('field2:', field2);
          
          const output = new MultiFieldOutput({
            field0,
            field1,
            field2,
          });
          
          console.log('MultiFieldOutput created:', output);
          console.log('Returning publicOutput...');
          
          return { publicOutput: output };
        }
      }
    }
  });
  
  console.log('\n=== Starting compilation ===\n');
  try {
    await TestProgram.compile();
    console.log('\n=== Compilation successful! ===\n');
    
    // Try to prove
    console.log('Creating proof...');
    const proof = await TestProgram.test();
    console.log('Proof created successfully!');
    console.log('Proof publicOutput:', proof.publicOutput);
    
  } catch (error) {
    console.error('\n=== Compilation/Proof failed ===\n');
    console.error('Error:', error.message);
    console.error('Error stack:', error.stack);
  }
}

test().catch(console.error);