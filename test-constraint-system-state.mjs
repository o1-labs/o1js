import { Field, Provable, initializeBindings, switchBackend } from './dist/node/index.js';
import { initializeSparky, Snarky } from './dist/node/bindings/sparky-adapter.js';

console.log('Testing Sparky constraint system state...\n');

async function testConstraintSystemState() {
  // Initialize and switch to Sparky
  await initializeBindings();
  await switchBackend('sparky');
  
  console.log('=== Direct Sparky API Test ===');
  
  // Access Sparky directly
  console.log('Sparky run module:', !!Snarky.run);
  console.log('Sparky constraintSystem module:', !!Snarky.constraintSystem);
  
  // Test constraint mode
  console.log('\n=== Testing constraint mode ===');
  console.log('Setting constraint mode...');
  if (Snarky.run && Snarky.run.constraintMode) {
    Snarky.run.constraintMode();
    console.log('Constraint mode set');
  }
  
  // Try to generate a constraint directly
  console.log('\n=== Generating constraint directly ===');
  if (Snarky.field && Snarky.field.exists && Snarky.field.assertMul) {
    try {
      // Create witness variables
      const a = Snarky.field.exists([0], () => [0, [0, 3n]]);
      const b = Snarky.field.exists([0], () => [0, [0, 4n]]);
      const c = Snarky.field.exists([0], () => [0, [0, 12n]]);
      console.log('Created witnesses:', { a, b, c });
      
      // Add multiplication constraint
      Snarky.field.assertMul(a, b, c);
      console.log('Added multiplication constraint');
      
      // Try to get constraint system
      if (Snarky.run && Snarky.run.getConstraintSystem) {
        const cs = Snarky.run.getConstraintSystem();
        console.log('Got constraint system:', cs);
        
        if (cs && Snarky.constraintSystem && Snarky.constraintSystem.toJson) {
          const json = Snarky.constraintSystem.toJson(cs);
          console.log('Constraint system JSON:', json);
          console.log('Number of gates:', json.gates?.length || 0);
        }
      }
    } catch (e) {
      console.error('Error:', e.message);
    }
  }
  
  console.log('\n=== Through Provable API ===');
  // Now test through normal API
  const cs = await Provable.constraintSystem(() => {
    const x = Provable.witness(Field, () => Field(5));
    const y = Provable.witness(Field, () => Field(5));
    x.mul(y).assertEquals(Field(25));
  });
  
  console.log('Provable.constraintSystem result:');
  console.log('Gates:', cs.gates.length);
  console.log('Digest:', cs.digest);
}

testConstraintSystemState().catch(console.error);