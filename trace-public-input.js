// Trace how public inputs flow through the constraint generation

const { Field, Provable, ZkProgram, Struct } = require('./lib');

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
        console.log('Method called with publicInput:', publicInput);
        console.log('PublicInput type sizeInFields:', PublicInput.sizeInFields());
        return {
          publicOutput: publicInput.x.add(publicInput.y).add(privateInput)
        };
      }
    }
  }
});

async function main() {
  console.log('=== Tracing Public Input Flow ===');
  console.log('PublicInput type sizeInFields:', PublicInput.sizeInFields());
  
  // Analyze the method to get constraint system
  console.log('\n--- Analyzing method ---');
  const analysis = await TestProgram.analyzeMethods();
  console.log('Method analysis:', JSON.stringify(analysis, null, 2));
  
  // Get constraint system
  console.log('\n--- Getting constraint system ---');
  const cs = await Provable.constraintSystem(() => {
    const publicInput = Provable.witness(PublicInput, () => new PublicInput({
      x: Field(1),
      y: Field(2)
    }));
    const privateInput = Provable.witness(Field, () => Field(3));
    const result = publicInput.x.add(publicInput.y).add(privateInput);
    result.assertEquals(Field(6));
  });
  
  console.log('Constraint system publicInputSize:', cs.publicInputSize);
  console.log('Constraint system rows:', cs.rows);
  console.log('Constraint system gates:', cs.gates.length);
  
  // Compile the program
  console.log('\n--- Compiling program ---');
  await TestProgram.compile();
  console.log('Compilation successful');
}

main().catch(console.error);
