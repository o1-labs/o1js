// Analyze how public inputs are marked in the constraint system

import { Field, Provable, ZkProgram, Struct, Snarky } from './dist/node/index.js';

// Define a public input type
class PublicInput extends Struct({
  x: Field,
  y: Field,
}) {}

async function main() {
  console.log('=== Understanding Public Input Marking ===\n');
  
  // Test 1: Simple constraint system without public inputs
  console.log('Test 1: Simple constraint system');
  const cs1 = await Provable.constraintSystem(() => {
    const a = Provable.witness(Field, () => Field(1));
    const b = Provable.witness(Field, () => Field(2));
    a.add(b).assertEquals(Field(3));
  });
  console.log('publicInputSize:', cs1.publicInputSize);
  console.log('rows:', cs1.rows);
  console.log('gates:', cs1.gates.length);
  
  // Test 2: Check if Snarky has a way to mark public inputs
  console.log('\n\nTest 2: Available Snarky APIs');
  console.log('Snarky.run:', Object.keys(Snarky.run || {}));
  console.log('Snarky.circuit:', Object.keys(Snarky.circuit || {}));
  console.log('Snarky.constraintSystem:', Object.keys(Snarky.constraintSystem || {}));
  
  // Test 3: ZkProgram compilation process
  console.log('\n\nTest 3: ZkProgram compilation');
  const TestProgram = ZkProgram({
    name: 'TestProgram',
    publicInput: PublicInput,
    publicOutput: Field,
    methods: {
      compute: {
        privateInputs: [Field],
        method(publicInput, privateInput) {
          console.log('Inside method - publicInput type:', publicInput.constructor.name);
          console.log('publicInput fields:', PublicInput.toFields(publicInput).length);
          return {
            publicOutput: publicInput.x.add(publicInput.y).add(privateInput)
          };
        }
      }
    }
  });
  
  // Analyze before compilation
  const analysis = await TestProgram.analyzeMethods();
  console.log('\nMethod analysis:');
  console.log('publicInputSize in analysis:', analysis.compute.publicInputSize);
  console.log('publicInputType.sizeInFields():', TestProgram.publicInputType.sizeInFields());
  
  // Compile and check
  console.log('\nCompiling...');
  const { verificationKey } = await TestProgram.compile();
  console.log('Compilation complete');
  console.log('VK exists:', Boolean(verificationKey));
  
  // Test 4: Direct Pickles.compile parameters
  console.log('\n\nTest 4: Pickles.compile parameters');
  console.log('During compilation, publicInputSize is passed as:', TestProgram.publicInputType.sizeInFields());
  console.log('This tells Pickles which of the first N variables are public inputs');
}

main().catch(console.error);
