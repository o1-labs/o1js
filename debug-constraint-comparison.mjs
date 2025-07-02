import { Field, ZkProgram, switchBackend } from './dist/node/index.js';

console.log('=== CONSTRAINT COMPARISON DEBUG ===\n');

// Simple test program for constraint comparison
const TestProgram = ZkProgram({
  name: 'ConstraintTest',
  methods: {
    simple: {
      privateInputs: [Field],
      async method(x) {
        x.assertEquals(Field(1));
      }
    }
  }
});

async function getConstraintSystem(backend) {
  console.log(`\n--- ${backend.toUpperCase()} CONSTRAINTS ---`);
  
  if (backend === 'sparky') {
    await switchBackend('sparky');
  }
  
  // Compile and get constraint system
  const result = await TestProgram.compile();
  
  // Try to access constraint system information
  console.log('Compilation result keys:', Object.keys(result));
  console.log('VK keys:', Object.keys(result.verificationKey));
  
  // Look for constraint system in the result
  if (result.constraintSystem) {
    console.log('Constraint System found:', result.constraintSystem);
  }
  
  if (result.verificationKey.data) {
    console.log('VK data available:', typeof result.verificationKey.data);
  }
  
  return {
    vkHash: result.verificationKey.hash.value[1][1].toString(),
    result: result
  };
}

async function compareConstraints() {
  try {
    console.log('Comparing constraint systems...');
    
    const snarky = await getConstraintSystem('snarky');
    const sparky = await getConstraintSystem('sparky');
    
    console.log('\n=== COMPARISON SUMMARY ===');
    console.log(`Snarky VK: ${snarky.vkHash}`);
    console.log(`Sparky VK: ${sparky.vkHash}`);
    console.log(`Match: ${snarky.vkHash === sparky.vkHash ? 'YES' : 'NO'}`);
    
  } catch (error) {
    console.error('Error during comparison:', error.message);
    console.error(error.stack);
  }
}

compareConstraints();