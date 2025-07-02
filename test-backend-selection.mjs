import { Field, Provable, initializeBindings, switchBackend } from './dist/node/index.js';

console.log('Testing backend selection during constraint generation...\n');

async function testBackendSelection() {
  // Initialize with Snarky
  await initializeBindings();
  
  console.log('=== Testing with Snarky ===');
  
  // Generate constraints with Snarky
  let cs = await Provable.constraintSystem(() => {
    let a = Provable.witness(Field, () => Field(3));
    let b = Provable.witness(Field, () => Field(4));
    console.log('During constraint generation - creating multiplication constraint');
    a.mul(b).assertEquals(Field(12));
  });
  
  console.log('Snarky constraints:', cs.gates.length, 'gates');
  console.log('Snarky digest:', cs.digest);
  
  // Switch to Sparky
  await switchBackend('sparky');
  
  console.log('\n=== Testing with Sparky ===');
  
  // Generate constraints with Sparky
  cs = await Provable.constraintSystem(() => {
    let a = Provable.witness(Field, () => Field(3));
    let b = Provable.witness(Field, () => Field(4));
    console.log('During constraint generation - creating multiplication constraint');
    a.mul(b).assertEquals(Field(12));
  });
  
  console.log('Sparky constraints:', cs.gates.length, 'gates');
  console.log('Sparky digest:', cs.digest);
  
  // Check if OCaml is detecting Sparky correctly
  console.log('\n=== Backend Detection ===');
  console.log('globalThis.__snarky exists:', !!globalThis.__snarky);
  console.log('globalThis.sparkyBackendActive:', globalThis.sparkyBackendActive);
}

testBackendSelection().catch(console.error);