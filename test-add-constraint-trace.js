#!/usr/bin/env node

import { Field, Provable, switchBackend } from './dist/node/index.js';

async function test() {
  console.log('=== Tracing constraint generation for a.add(b).assertEquals(c) ===\n');
  
  // Test with Sparky
  await switchBackend('sparky');
  
  const cs = await Provable.constraintSystem(() => {
    const a = Provable.witness(Field, () => Field(5));
    const b = Provable.witness(Field, () => Field(7));
    const c = Provable.witness(Field, () => Field(12));
    
    console.log('Variables created:');
    console.log('a.value:', a.value);
    console.log('b.value:', b.value);
    console.log('c.value:', c.value);
    
    const sum = a.add(b);
    console.log('\nAfter a.add(b):');
    console.log('sum.value:', sum.value);
    console.log('Is sum an Add node?', Array.isArray(sum.value) && sum.value[0] === 2);
    
    sum.assertEquals(c);
  });
  
  console.log('\nGenerated constraint:');
  if (cs.gates && cs.gates.length > 0) {
    const gate = cs.gates[0];
    console.log('Type:', gate.type);
    console.log('Coefficients:', gate.coeffs);
    console.log('Wires:', gate.wires);
    
    // Interpret the constraint
    const [cl, cr, co, cm, cc] = gate.coeffs.map(Number);
    console.log('\nConstraint equation:');
    console.log(`${cl}*wire[0] + ${cr}*wire[1] + ${co}*wire[2] + ${cm}*(wire[0]*wire[1]) + ${cc} = 0`);
    
    // Based on wires
    const wireMap = {
      0: 'a (wire 0)',
      1: 'b (wire 1)', 
      2: 'c (wire 2)'
    };
    
    // Map wires to variables
    console.log('\nWith variable mapping:');
    const w0 = gate.wires[0];
    const w1 = gate.wires[1];
    const w2 = gate.wires[2];
    
    console.log(`wire[0] at (${w0.row},${w0.col}) = ${wireMap[w0.col] || 'unknown'}`);
    console.log(`wire[1] at (${w1.row},${w1.col}) = ${wireMap[w1.col] || 'unknown'}`);
    console.log(`wire[2] at (${w2.row},${w2.col}) = ${wireMap[w2.col] || 'unknown'}`);
    
    console.log('\nFinal constraint:');
    console.log(`${cl}*${wireMap[w0.col] || 'wire[0]'} + ${cr}*${wireMap[w1.col] || 'wire[1]'} + ${co}*${wireMap[w2.col] || 'wire[2]'} = 0`);
  }
  
  // Also test with Snarky for comparison
  await switchBackend('snarky');
  console.log('\n\n=== SNARKY comparison ===');
  
  const snarkyCS = await Provable.constraintSystem(() => {
    const a = Provable.witness(Field, () => Field(5));
    const b = Provable.witness(Field, () => Field(7));
    const c = Provable.witness(Field, () => Field(12));
    
    a.add(b).assertEquals(c);
  });
  
  if (snarkyCS.gates && snarkyCS.gates.length > 0) {
    const gate = snarkyCS.gates[0];
    console.log('Type:', gate.type);
    console.log('Coefficients:', gate.coeffs);
    console.log('Wires:', gate.wires);
  }
}

test().catch(console.error);