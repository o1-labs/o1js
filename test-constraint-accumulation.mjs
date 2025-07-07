import { Field, switchBackend, ZkProgram } from './dist/node/index.js';

// Super simple test to isolate the issue
async function testConstraintAccumulation() {
  console.log('Testing constraint accumulation with public inputs\n');
  
  await switchBackend('sparky');
  
  // Create a minimal program with public input
  const MinimalProgram = ZkProgram({
    name: 'MinimalProgram',
    publicInput: Field,
    methods: {
      test: {
        privateInputs: [],
        async method(x) {
          // Just return the input unchanged
          return { publicOutput: x };
        }
      }
    }
  });
  
  console.log('Analyzing method...');
  const analysis = await MinimalProgram.analyzeMethods();
  console.log('Constraint count:', analysis.test.rows);
  
  // Let's also check direct constraint system access
  console.log('\nDirect constraint system check:');
  
  // Get sparky instance
  const sparky = globalThis.sparkyInstance;
  if (!sparky) {
    console.error('Sparky instance not available');
    return;
  }
  
  // Reset and enter constraint mode
  console.log('Resetting compiler...');
  sparky.run.reset();
  
  console.log('Entering constraint system mode...');
  const handle = sparky.run.enterConstraintSystem();
  
  // Create a public input variable
  console.log('Creating public input variable...');
  const publicInput = sparky.field.exists();
  console.log('Public input var:', publicInput);
  
  // Get constraint system
  console.log('\nGetting constraint system...');
  const cs = sparky.run.getConstraintSystem();
  console.log('Initial constraints:', sparky.constraintSystem.rows(cs));
  
  // Exit constraint mode
  handle.exit();
  
  console.log('\nAfter exiting constraint mode:');
  const finalCs = sparky.run.getConstraintSystem();
  console.log('Final constraints:', sparky.constraintSystem.rows(finalCs));
  
  // Check if constraints are actually being added
  console.log('\nChecking global compiler state:');
  if (globalThis.sparkyConstraintBridge?.getConstraintCount) {
    console.log('Bridge constraint count:', globalThis.sparkyConstraintBridge.getConstraintCount());
  }
}

testConstraintAccumulation();