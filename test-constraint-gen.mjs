import { Field, Provable, switchBackend } from './dist/node/index.js';

console.log('🔍 Constraint Generation Test');

// Function to test constraint generation
async function testConstraintGeneration(backend) {
  console.log(`\n📦 Testing with ${backend} backend...`);
  switchBackend(backend);
  
  let constraintCount = 0;
  
  // Simple multiplication that should generate constraints
  await Provable.constraintSystem(() => {
    const x = Provable.witness(Field, () => Field(3));
    const y = Provable.witness(Field, () => Field(4));
    const z = x.mul(y);
    z.assertEquals(Field(12));
  }).then(cs => {
    constraintCount = cs.rows;
    console.log(`✅ Constraint system generated`);
    console.log(`  - Constraints: ${constraintCount}`);
    console.log(`  - Public input columns: ${cs.publicInputSize}`);
    console.log(`  - Hash: ${cs.hash}`);
  });
  
  return { backend, constraintCount };
}

// Test both backends
const snarkyResult = await testConstraintGeneration('snarky');
const sparkyResult = await testConstraintGeneration('sparky');

// Compare results
console.log('\n📊 Comparison:');
console.log(`  - Snarky constraints: ${snarkyResult.constraintCount}`);
console.log(`  - Sparky constraints: ${sparkyResult.constraintCount}`);
console.log(`  - Match: ${snarkyResult.constraintCount === sparkyResult.constraintCount ? '✅' : '❌'}`);