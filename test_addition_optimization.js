import { Field, Provable } from './dist/node/index.js';
import { constraintSystem } from './dist/node/lib/provable/core/provable-context.js';
import { switchBackend } from './dist/node/bindings.js';

async function testAdditionOptimization() {
  console.log('\n=== Testing Addition Optimization ===\n');
  
  // Test with Snarky
  await switchBackend('snarky');
  console.log('Backend: Snarky');
  
  const snarkyCs = await constraintSystem(() => {
    const x = Provable.witness(Field, () => Field(5));
    const y = Provable.witness(Field, () => Field(7));
    x.add(y).assertEquals(Field(12));
  });
  
  console.log(`Snarky constraints: ${snarkyCs.rows}`);
  
  // Test with Sparky
  await switchBackend('sparky');
  console.log('\nBackend: Sparky');
  
  const sparkyCs = await constraintSystem(() => {
    const x = Provable.witness(Field, () => Field(5));
    const y = Provable.witness(Field, () => Field(7));
    x.add(y).assertEquals(Field(12));
  });
  
  console.log(`Sparky constraints: ${sparkyCs.rows}`);
  
  // Try calling toJson to trigger optimization
  console.log('\nCalling toJson to trigger optimization...');
  const json = sparkyCs.toJson();
  console.log(`After toJson - gates count: ${json.gates ? json.gates.length : 'N/A'}`);
  
  // Show constraint details
  console.log('\nSparky constraint details:');
  const gates = sparkyCs.gates;
  if (gates && gates.length > 0) {
    gates.forEach((gate, i) => {
      console.log(`  Constraint ${i}: type=${gate.typ}, wires=${gate.wires}`);
    });
  }
  
  console.log('\n=== End Test ===\n');
}

testAdditionOptimization().catch(console.error);