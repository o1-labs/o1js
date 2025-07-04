#!/usr/bin/env node

import { Field, Provable, switchBackend } from '../../../dist/node/index.js';

async function traceJustAddition() {
  console.log('\n🔍 TRACING JUST ADDITION (NO ASSERTEQUALS)\n');
  
  // Test 1: Just addition with Snarky
  console.log('=== SNARKY ===');
  await switchBackend('snarky');
  const snarkyCS = await Provable.constraintSystem(() => {
    const x = Provable.witness(Field, () => Field(5));
    const y = Provable.witness(Field, () => Field(7));
    const z = x.add(y);
    // No assertEquals - just the addition
  });
  console.log(`Snarky constraints: ${snarkyCS.gates.length}`);
  
  // Test 2: Just addition with Sparky
  console.log('\n=== SPARKY ===');
  await switchBackend('sparky');
  const sparkyCS = await Provable.constraintSystem(() => {
    const x = Provable.witness(Field, () => Field(5));
    const y = Provable.witness(Field, () => Field(7));
    const z = x.add(y);
    // No assertEquals - just the addition
  });
  console.log(`Sparky constraints: ${sparkyCS.gates.length}`);
  
  // Test 3: Check what variables are created
  console.log('\n=== DETAILED SPARKY TRACE ===');
  await switchBackend('sparky');
  
  // Enable all logging
  const cs2 = await Provable.constraintSystem(() => {
    console.log('Creating x = witness(5)');
    const x = Provable.witness(Field, () => Field(5));
    console.log('  x =', x);
    
    console.log('Creating y = witness(7)');
    const y = Provable.witness(Field, () => Field(7));
    console.log('  y =', y);
    
    console.log('Computing z = x.add(y)');
    const z = x.add(y);
    console.log('  z =', z);
  });
  
  console.log(`\nFinal Sparky constraints: ${cs2.gates.length}`);
  if (cs2.gates.length > 0) {
    console.log('Constraint details:');
    cs2.gates.forEach((gate, i) => {
      console.log(`  ${i}: wires=${JSON.stringify(gate.wires)}`);
    });
  }
}

traceJustAddition().catch(console.error);