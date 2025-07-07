import { Field, ZkProgram, switchBackend } from './dist/node/index.js';

// Test to understand public input constraint generation
async function testPublicInputConstraintGen() {
  console.log('Testing constraint generation with and without public inputs\n');
  
  // Program WITHOUT public input
  const ProgramNoPublic = ZkProgram({
    name: 'ProgramNoPublic',
    methods: {
      test: {
        privateInputs: [Field],
        async method(x) {
          const result = x.add(Field(1));
          return { publicOutput: result };
        }
      }
    }
  });
  
  // Program WITH public input
  const ProgramWithPublic = ZkProgram({
    name: 'ProgramWithPublic',
    publicInput: Field,
    methods: {
      test: {
        privateInputs: [],
        async method(publicInput) {
          const result = publicInput.add(Field(1));
          return { publicOutput: result };
        }
      }
    }
  });
  
  console.log('=== Testing Snarky Backend ===');
  await switchBackend('snarky');
  
  console.log('\n1. Program without public input:');
  const snarkyNoPublic = await ProgramNoPublic.analyzeMethods();
  console.log('Constraints:', snarkyNoPublic.test.rows);
  
  console.log('\n2. Program with public input:');
  const snarkyWithPublic = await ProgramWithPublic.analyzeMethods();
  console.log('Constraints:', snarkyWithPublic.test.rows);
  
  console.log('\n=== Testing Sparky Backend ===');
  await switchBackend('sparky');
  
  console.log('\n1. Program without public input:');
  try {
    const sparkyNoPublic = await ProgramNoPublic.analyzeMethods();
    console.log('Constraints:', sparkyNoPublic.test.rows);
  } catch (e) {
    console.error('Error:', e.message);
  }
  
  console.log('\n2. Program with public input:');
  try {
    const sparkyWithPublic = await ProgramWithPublic.analyzeMethods();
    console.log('Constraints:', sparkyWithPublic.test.rows);
  } catch (e) {
    console.error('Error:', e.message);
  }
  
  // Let's also test a direct constraint generation
  console.log('\n=== Direct Constraint Generation Test ===');
  const backend = globalThis.__snarky?.Snarky;
  if (backend) {
    // Test 1: Create variable and add constraint
    console.log('\nTest 1: Private input simulation');
    const handle1 = backend.run.enterConstraintSystem();
    const privateVar = backend.field.exists(null);
    const one1 = backend.field.constant('1');
    const result1 = backend.field.add(privateVar, one1);
    const cs1 = handle1();
    console.log('Constraints:', backend.constraintSystem.rows(cs1));
    
    // Test 2: Use existing variable (simulating public input)
    console.log('\nTest 2: Public input simulation');
    const handle2 = backend.run.enterConstraintSystem();
    // In public input case, the variable might already exist
    // Let's simulate by creating it outside the method
    const publicVar = backend.field.exists(null);
    const one2 = backend.field.constant('1');
    const result2 = backend.field.add(publicVar, one2);
    const cs2 = handle2();
    console.log('Constraints:', backend.constraintSystem.rows(cs2));
  }
}

testPublicInputConstraintGen().catch(console.error);