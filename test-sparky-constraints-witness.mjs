import { Field, initializeBindings, Provable, switchBackend } from './dist/node/index.js';

console.log('Testing Sparky constraint generation with witness variables...\n');

async function testConstraintGeneration() {
  // Initialize with Snarky first
  await initializeBindings();
  
  // Test 1: Multiplication constraint with witnesses
  console.log('=== Test 1: Multiplication with Witnesses ===');
  
  // Snarky
  let snarkyCS = await Provable.constraintSystem(() => {
    let a = Provable.witness(Field, () => Field(3));
    let b = Provable.witness(Field, () => Field(4));
    a.mul(b).assertEquals(Field(12));
  });
  console.log('Snarky constraints:', snarkyCS.gates.length, 'gates');
  if (snarkyCS.gates.length > 0) {
    console.log('First gate:', {
      type: snarkyCS.gates[0].typ,
      coeffs: snarkyCS.gates[0].coeffs?.slice(0, 5)
    });
  }
  
  // Switch to Sparky
  await switchBackend('sparky');
  
  // Sparky
  let sparkyCS = await Provable.constraintSystem(() => {
    let a = Provable.witness(Field, () => Field(3));
    let b = Provable.witness(Field, () => Field(4));
    a.mul(b).assertEquals(Field(12));
  });
  console.log('Sparky constraints:', sparkyCS.gates.length, 'gates');
  if (sparkyCS.gates.length > 0) {
    console.log('First gate:', {
      type: sparkyCS.gates[0].typ,
      coeffs: sparkyCS.gates[0].coeffs?.slice(0, 5)
    });
  }
  
  console.log('\n=== Test 2: Addition with Witnesses ===');
  
  // Switch back to Snarky
  await switchBackend('snarky');
  
  // Snarky
  snarkyCS = await Provable.constraintSystem(() => {
    let x = Provable.witness(Field, () => Field(5));
    let y = Provable.witness(Field, () => Field(3));
    x.add(y).assertEquals(Field(8));
  });
  console.log('Snarky constraints:', snarkyCS.gates.length, 'gates');
  
  // Switch to Sparky
  await switchBackend('sparky');
  
  // Sparky
  sparkyCS = await Provable.constraintSystem(() => {
    let x = Provable.witness(Field, () => Field(5));
    let y = Provable.witness(Field, () => Field(3));
    x.add(y).assertEquals(Field(8));
  });
  console.log('Sparky constraints:', sparkyCS.gates.length, 'gates');
  
  console.log('\n=== Test 3: Square with Witness ===');
  
  // Switch back to Snarky
  await switchBackend('snarky');
  
  // Snarky
  snarkyCS = await Provable.constraintSystem(() => {
    let x = Provable.witness(Field, () => Field(5));
    x.square().assertEquals(Field(25));
  });
  console.log('Snarky constraints:', snarkyCS.gates.length, 'gates');
  
  // Switch to Sparky
  await switchBackend('sparky');
  
  // Sparky
  sparkyCS = await Provable.constraintSystem(() => {
    let x = Provable.witness(Field, () => Field(5));
    x.square().assertEquals(Field(25));
  });
  console.log('Sparky constraints:', sparkyCS.gates.length, 'gates');
  
  console.log('\n=== Test 4: Division/Inverse with Witness ===');
  
  // Switch back to Snarky
  await switchBackend('snarky');
  
  // Snarky
  snarkyCS = await Provable.constraintSystem(() => {
    let x = Provable.witness(Field, () => Field(10));
    let y = Provable.witness(Field, () => Field(2));
    x.div(y).assertEquals(Field(5));
  });
  console.log('Snarky constraints:', snarkyCS.gates.length, 'gates');
  
  // Switch to Sparky
  await switchBackend('sparky');
  
  // Sparky
  sparkyCS = await Provable.constraintSystem(() => {
    let x = Provable.witness(Field, () => Field(10));
    let y = Provable.witness(Field, () => Field(2));
    x.div(y).assertEquals(Field(5));
  });
  console.log('Sparky constraints:', sparkyCS.gates.length, 'gates');
  
  console.log('\n=== Analysis ===');
  console.log('With the field operations implemented, Sparky should now generate:');
  console.log('- Proper multiplication constraints (not just variable assignments)');
  console.log('- Similar gate counts to Snarky');
  console.log('- Coefficients representing actual arithmetic operations');
}

testConstraintGeneration().catch(console.error);