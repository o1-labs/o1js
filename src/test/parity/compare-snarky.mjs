#!/usr/bin/env node

import { Field, Provable, switchBackend } from '../../../dist/node/index.js';

async function compareSnarky() {
  console.log('=== SNARKY SIMPLE ASSERTEQUALS ===');
  await switchBackend('snarky');
  const snarkyCS = await Provable.constraintSystem(() => {
    const x = Provable.witness(Field, () => Field(12));
    x.assertEquals(Field(12));
  });
  console.log('Snarky constraint count:', snarkyCS.gates.length);
  
  console.log('\n=== SNARKY ADDITION + ASSERTEQUALS ===');
  const snarkyCS2 = await Provable.constraintSystem(() => {
    const x = Provable.witness(Field, () => Field(5));
    const y = Provable.witness(Field, () => Field(7)); 
    const z = x.add(y);
    z.assertEquals(Field(12));
  });
  console.log('Snarky constraint count:', snarkyCS2.gates.length);
  
  if (snarkyCS.gates.length > 0) {
    console.log('\nSnarky simple assertEquals gate details:');
    console.log(JSON.stringify(snarkyCS.gates[0], null, 2));
  }
  
  if (snarkyCS2.gates.length > 0) {
    console.log('\nSnarky addition + assertEquals gate details:');
    console.log(JSON.stringify(snarkyCS2.gates[0], null, 2));
  }
}

compareSnarky().catch(console.error);