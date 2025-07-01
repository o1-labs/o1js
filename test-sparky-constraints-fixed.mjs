import { Field, initializeBindings, Provable, switchBackend } from './dist/node/index.js';

console.log('Testing Sparky constraint generation after field operation fixes...\n');

async function testConstraintGeneration() {
  // Initialize with Snarky first
  await initializeBindings();
  
  // Test 1: Multiplication constraint
  console.log('=== Test 1: Multiplication Constraint ===');
  
  // Snarky
  let snarkyCS = await Provable.constraintSystem(() => {
    let a = Field(3);
    let b = Field(4);
    a.mul(b).assertEquals(Field(12));
  });
  console.log('Snarky constraints:', snarkyCS.gates.length, 'gates');
  if (snarkyCS.gates.length > 0) {
    console.log('First gate coeffs:', snarkyCS.gates[0].coeffs);
  }
  
  // Switch to Sparky
  await switchBackend('sparky');
  
  // Sparky
  let sparkyCS = await Provable.constraintSystem(() => {
    let a = Field(3);
    let b = Field(4);
    a.mul(b).assertEquals(Field(12));
  });
  console.log('Sparky constraints:', sparkyCS.gates.length, 'gates');
  if (sparkyCS.gates.length > 0) {
    console.log('First gate coeffs:', sparkyCS.gates[0].coeffs);
  }
  
  console.log('\n=== Test 2: Addition Constraint ===');
  
  // Switch back to Snarky
  await switchBackend('snarky');
  
  // Snarky
  snarkyCS = await Provable.constraintSystem(() => {
    let x = Field(5);
    let y = Field(3);
    x.add(y).assertEquals(Field(8));
  });
  console.log('Snarky constraints:', snarkyCS.gates.length, 'gates');
  
  // Switch to Sparky
  await switchBackend('sparky');
  
  // Sparky
  sparkyCS = await Provable.constraintSystem(() => {
    let x = Field(5);
    let y = Field(3);
    x.add(y).assertEquals(Field(8));
  });
  console.log('Sparky constraints:', sparkyCS.gates.length, 'gates');
  
  console.log('\n=== Test 3: Complex Expression ===');
  
  // Switch back to Snarky
  await switchBackend('snarky');
  
  // Snarky
  snarkyCS = await Provable.constraintSystem(() => {
    let a = Field(2);
    let b = Field(3);
    let c = Field(4);
    // (a * b) + c = 10
    a.mul(b).add(c).assertEquals(Field(10));
  });
  console.log('Snarky constraints:', snarkyCS.gates.length, 'gates');
  
  // Switch to Sparky
  await switchBackend('sparky');
  
  // Sparky
  sparkyCS = await Provable.constraintSystem(() => {
    let a = Field(2);
    let b = Field(3);
    let c = Field(4);
    // (a * b) + c = 10
    a.mul(b).add(c).assertEquals(Field(10));
  });
  console.log('Sparky constraints:', sparkyCS.gates.length, 'gates');
  
  console.log('\n=== Analysis ===');
  console.log('If Sparky now generates proper arithmetic constraints with coefficients');
  console.log('like [1, 0, 0, 0, -12] instead of [1, -1, 0, 0, 0], then the fix worked!');
}

testConstraintGeneration().catch(console.error);