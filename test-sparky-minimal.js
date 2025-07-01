#!/usr/bin/env node

import { Field, Provable, switchBackend } from './dist/node/index.js';

async function testMinimal() {
  console.log('🔍 Minimal Sparky Test\n');
  
  // Test with Snarky first
  await switchBackend('snarky');
  console.log('📊 Snarky:');
  
  const circuit1 = () => {
    const a = Provable.witness(Field, () => Field(5));
    const b = Provable.witness(Field, () => Field(7));
    const c = Provable.witness(Field, () => Field(12));
    
    // Direct approach
    a.add(b).assertEquals(c);
  };
  
  const snarkyCS = await Provable.constraintSystem(circuit1);
  console.log('Constraints:', snarkyCS.gates.length);
  console.log('Gate type:', snarkyCS.gates[0].type);
  console.log('Wires:', snarkyCS.gates[0].wires.map(w => `(${w.row},${w.col})`).join(' '));
  console.log('Coeffs:', snarkyCS.gates[0].coeffs);
  
  // Now test with Sparky
  await switchBackend('sparky');
  console.log('\n📊 Sparky:');
  
  const circuit2 = () => {
    const a = Provable.witness(Field, () => Field(5));
    const b = Provable.witness(Field, () => Field(7));
    const c = Provable.witness(Field, () => Field(12));
    
    // Same approach
    a.add(b).assertEquals(c);
  };
  
  const sparkyCS = await Provable.constraintSystem(circuit2);
  console.log('Constraints:', sparkyCS.gates.length);
  console.log('Gate type:', sparkyCS.gates[0].type);
  console.log('Wires:', sparkyCS.gates[0].wires.map(w => `(${w.row},${w.col})`).join(' '));
  console.log('Coeffs:', sparkyCS.gates[0].coeffs);
  
  // Compare the wire layout
  console.log('\n🔍 Analysis:');
  console.log('Snarky uses wires:', snarkyCS.gates[0].wires.slice(0, 3).map(w => `(${w.row},${w.col})`).join(', '));
  console.log('Sparky uses wires:', sparkyCS.gates[0].wires.slice(0, 3).map(w => `(${w.row},${w.col})`).join(', '));
  
  // Test alternative approach
  console.log('\n📊 Alternative test - intermediate variable:');
  await switchBackend('sparky');
  
  const circuit3 = () => {
    const a = Provable.witness(Field, () => Field(5));
    const b = Provable.witness(Field, () => Field(7));
    const sum = a.add(b);
    const c = Provable.witness(Field, () => Field(12));
    sum.assertEquals(c);
  };
  
  const sparkyCS2 = await Provable.constraintSystem(circuit3);
  console.log('Constraints:', sparkyCS2.gates.length);
  console.log('Wires:', sparkyCS2.gates[0].wires.slice(0, 3).map(w => `(${w.row},${w.col})`).join(', '));
  console.log('Coeffs:', sparkyCS2.gates[0].coeffs);
}

testMinimal().catch(console.error);