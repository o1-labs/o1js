// Detailed trace of public input handling

import { Field, Provable, ZkProgram, Struct, initializeBindings, getCurrentBackend } from './dist/node/index.js';

// Define a public input type
class PublicInput extends Struct({
  x: Field,
  y: Field,
}) {}

// Define a ZkProgram with public input
const TestProgram = ZkProgram({
  name: 'TestProgram',
  publicInput: PublicInput,
  publicOutput: Field,
  methods: {
    compute: {
      privateInputs: [Field],
      method(publicInput, privateInput) {
        console.log('\n=== Inside method ===');
        console.log('publicInput:', publicInput);
        console.log('publicInput.x.value:', publicInput.x.value);
        console.log('publicInput.y.value:', publicInput.y.value);
        console.log('privateInput.value:', privateInput.value);
        
        // Trace the field operations
        const sum1 = publicInput.x.add(publicInput.y);
        console.log('sum1 (x + y):', sum1.value);
        
        const result = sum1.add(privateInput);
        console.log('result:', result.value);
        
        return {
          publicOutput: result
        };
      }
    }
  }
});

async function main() {
  await initializeBindings();
  console.log('Current backend:', getCurrentBackend());
  
  console.log('\n=== Public Input Type Analysis ===');
  console.log('PublicInput.sizeInFields():', PublicInput.sizeInFields());
  console.log('PublicInput.toFields:', typeof PublicInput.toFields);
  console.log('PublicInput.fromFields:', typeof PublicInput.fromFields);
  
  // Test toFields and fromFields
  const testInput = new PublicInput({ x: Field(10), y: Field(20) });
  const fields = PublicInput.toFields(testInput);
  console.log('toFields result:', fields.map(f => f.toString()));
  
  console.log('\n=== Constraint System for Simple Circuit ===');
  // First test a simple circuit without ZkProgram
  const simpleCs = await Provable.constraintSystem(() => {
    // Create public input witness
    const x = Provable.witness(Field, () => Field(1));
    const y = Provable.witness(Field, () => Field(2));
    const z = Provable.witness(Field, () => Field(3));
    
    // Add constraint
    const sum = x.add(y).add(z);
    sum.assertEquals(Field(6));
  });
  
  console.log('Simple CS publicInputSize:', simpleCs.publicInputSize);
  console.log('Simple CS rows:', simpleCs.rows);
  
  console.log('\n=== ZkProgram Analysis ===');
  const analysis = await TestProgram.analyzeMethods();
  console.log('Method analysis:', JSON.stringify(analysis, null, 2));
  
  console.log('\n=== ZkProgram Compilation ===');
  const { verificationKey } = await TestProgram.compile();
  console.log('Verification key obtained:', Boolean(verificationKey));
  console.log('VK hash:', verificationKey.hash.toString());
  
  // Try to understand the compilation parameters
  console.log('\n=== Testing Proof Generation ===');
  const proof = await TestProgram.compute(
    new PublicInput({ x: Field(10), y: Field(20) }),
    Field(30)
  );
  console.log('Proof generated:', Boolean(proof));
  console.log('Proof publicInput:', proof.proof.publicInput);
  console.log('Proof publicOutput:', proof.proof.publicOutput);
}

main().catch(console.error);
