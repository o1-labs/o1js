#!/usr/bin/env node
/**
 * Debug raw constraint system JSON from both backends
 */

import { Field, switchBackend, initializeBindings } from './dist/node/index.js';
import { Snarky } from './dist/node/bindings.js';

console.log('=== DEBUG RAW CONSTRAINT SYSTEM ===\n');

async function debugRawConstraintSystem() {
  // Circuit with witness - using run.exists
  const circuit = () => {
    // Create witness variables using enterAsProver
    const createWitness = Snarky.run.enterAsProver(1);
    const x = createWitness(0)[1]; // returns [0, fieldVar]
    const createWitness2 = Snarky.run.enterAsProver(1);
    const y = createWitness2(0)[1];
    const createWitness3 = Snarky.run.enterAsProver(1);
    const z = createWitness3(0)[1];
    // Add multiplication constraint
    Snarky.field.assertMul(x, y, z);
  };
  
  // Test with Snarky
  console.log('1. Snarky constraint system:');
  await switchBackend('snarky');
  await initializeBindings();
  
  const snarkyFinish = Snarky.run.enterConstraintSystem();
  circuit();
  const snarkyCs = snarkyFinish();
  
  console.log('  Raw CS type:', typeof snarkyCs);
  console.log('  Raw CS:', snarkyCs);
  
  const snarkyJson = Snarky.constraintSystem.toJson(snarkyCs);
  console.log('  JSON type:', typeof snarkyJson);
  console.log('  JSON keys:', Object.keys(snarkyJson));
  console.log('  JSON:', JSON.stringify(snarkyJson, null, 2));
  
  // Test with Sparky
  console.log('\n2. Sparky constraint system:');
  await switchBackend('sparky');
  await initializeBindings();
  
  const sparkyFinish = Snarky.run.enterConstraintSystem();
  circuit();
  const sparkyCs = sparkyFinish();
  
  console.log('  Raw CS type:', typeof sparkyCs);
  console.log('  Raw CS:', sparkyCs);
  
  const sparkyJson = Snarky.constraintSystem.toJson(sparkyCs);
  console.log('  JSON type:', typeof sparkyJson);
  console.log('  JSON keys:', Object.keys(sparkyJson));
  console.log('  JSON:', JSON.stringify(sparkyJson, null, 2));
  
  // Compare
  console.log('\n3. Comparison:');
  console.log('  Gates in Snarky:', snarkyJson.gates?.length || 0);
  console.log('  Gates in Sparky:', sparkyJson.gates?.length || 0);
  console.log('  Constraints in Sparky:', sparkyJson.constraints?.length || 0);
}

debugRawConstraintSystem().catch(console.error);