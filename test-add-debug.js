#!/usr/bin/env node

import { Field, Provable, switchBackend } from './dist/node/index.js';

async function test() {
  // Switch to Sparky
  await switchBackend('sparky');
  console.log('Testing with Sparky backend...\n');
  
  // Create a circuit with the add pattern
  const circuit = Provable.constraintSystem(() => {
    const a = Provable.witness(Field, () => Field(5));
    const b = Provable.witness(Field, () => Field(7));
    const c = Provable.witness(Field, () => Field(12));
    
    // This should trigger the Add(a,b) = c pattern
    console.log('Creating constraint: a.add(b).assertEquals(c)');
    a.add(b).assertEquals(c);
  });
  
  console.log('\nConstraint system created with', circuit.rows, 'rows');
  console.log('Digest:', circuit.digest);
  
  // Log the gates to see what was generated
  console.log('\nGates:', JSON.stringify(circuit.gates, null, 2));
}

test().catch(console.error);