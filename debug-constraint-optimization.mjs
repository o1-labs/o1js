import { initializeBindings, switchBackend, Field, Provable } from './dist/node/index.js';

async function debugConstraintOptimization() {
  await initializeBindings();
  
  console.log('=== DEBUGGING CONSTRAINT OPTIMIZATION ===\n');
  
  // Test simple field addition
  const simpleAddition = () => {
    const x = Provable.witness(Field, () => Field(3));
    const y = Provable.witness(Field, () => Field(4));
    x.add(y).assertEquals(Field(7));
  };
  
  console.log('🔍 SIMPLE ADDITION TEST: x + y = 7');
  console.log('Expected: Should generate minimal constraints with optimization\n');
  
  // Test with Snarky first
  await switchBackend('snarky');
  console.log('--- SNARKY BACKEND ---');
  const snarkyCS = await Provable.constraintSystem(simpleAddition);
  console.log(`Constraints: ${snarkyCS.gates.length}`);
  snarkyCS.gates.forEach((gate, i) => {
    console.log(`  Gate ${i}: ${gate.type} (coeffs: ${gate.coeffs?.length || 0})`);
  });
  
  // Test with Sparky
  await switchBackend('sparky');
  console.log('\n--- SPARKY BACKEND ---');
  const sparkyCS = await Provable.constraintSystem(simpleAddition);
  console.log(`Constraints: ${sparkyCS.gates.length}`);
  sparkyCS.gates.forEach((gate, i) => {
    console.log(`  Gate ${i}: ${gate.type} (coeffs: ${gate.coeffs?.length || 0})`);
  });
  
  console.log(`\n📊 COMPARISON:`);
  console.log(`Snarky: ${snarkyCS.gates.length} constraints`);
  console.log(`Sparky: ${sparkyCS.gates.length} constraints`);
  console.log(`Difference: +${sparkyCS.gates.length - snarkyCS.gates.length} (Sparky extra)`);
  
  if (sparkyCS.gates.length > snarkyCS.gates.length) {
    console.log('🚨 OPTIMIZATION NOT WORKING - Sparky generating more constraints');
  } else if (sparkyCS.gates.length === snarkyCS.gates.length) {
    console.log('✅ OPTIMIZATION WORKING - Constraint counts match');
  }
}

debugConstraintOptimization().catch(console.error);