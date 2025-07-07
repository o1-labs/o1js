import { Field, ZkProgram, Provable, switchBackend } from './dist/node/index.js';

// Let's trace exactly what happens during constraint analysis
async function testZkProgramConstraintDetails() {
  console.log('Detailed ZkProgram constraint analysis\n');
  
  // Simple program with public output
  const TestProgram = ZkProgram({
    name: 'TestProgram',
    publicInput: Field,
    publicOutput: Field,
    methods: {
      addOne: {
        privateInputs: [],
        async method(x) {
          console.log('  Inside method');
          const one = Field(1);
          console.log('  Created Field(1)');
          const result = x.add(one);
          console.log('  Computed x.add(one)');
          
          // The constraint should be created by returning publicOutput
          return { publicOutput: result };
        }
      }
    }
  });
  
  // Test constraint analysis
  console.log('=== Analyzing with Snarky ===');
  await switchBackend('snarky');
  
  console.log('\nCalling analyzeMethods...');
  const snarkyAnalysis = await TestProgram.analyzeMethods();
  console.log('Result:', snarkyAnalysis);
  
  console.log('\n=== Analyzing with Sparky ===');
  await switchBackend('sparky');
  
  console.log('\nCalling analyzeMethods...');
  const sparkyAnalysis = await TestProgram.analyzeMethods();
  console.log('Result:', sparkyAnalysis);
  
  // Let's also manually test constraint generation
  console.log('\n=== Manual constraint system test ===');
  
  console.log('\nTest 1: Simulating the method directly');
  const cs1 = await Provable.constraintSystem(() => {
    const x = Provable.witness(Field, () => Field(5));
    const one = Field(1);
    const result = x.add(one);
    // Returning doesn't create constraints
    return result;
  });
  console.log('Constraints without output constraint:', cs1.rows);
  
  console.log('\nTest 2: With explicit output constraint');
  const cs2 = await Provable.constraintSystem(() => {
    const x = Provable.witness(Field, () => Field(5));
    const one = Field(1);
    const result = x.add(one);
    // Create a witness for the output
    const output = Provable.witness(Field, () => result);
    // Constrain them to be equal
    result.assertEquals(output);
    return output;
  });
  console.log('Constraints with output constraint:', cs2.rows);
  
  // Check if there's something special about public inputs/outputs
  console.log('\n=== Testing public input/output handling ===');
  
  // Get the backend
  const backend = globalThis.__snarky?.Snarky;
  if (backend) {
    console.log('\nChecking if public inputs create special constraints...');
    const handle = backend.run.enterConstraintSystem();
    
    // Create public input variable
    const publicInput = backend.field.exists(null);
    console.log('Created public input variable');
    
    // Do computation
    const one = backend.field.exists(() => '1');
    const result = backend.field.add(publicInput, one);
    console.log('Computed addition');
    
    // Check constraints so far
    const cs = handle();
    console.log('Constraints:', backend.constraintSystem.rows(cs));
  }
}

testZkProgramConstraintDetails().catch(console.error);