#!/usr/bin/env node

import { Field, Provable, switchBackend } from './dist/node/index.js';

// Enable stderr output
process.env.RUST_LOG = 'debug';

async function testSparkyDebug() {
  console.log('🔍 Testing Sparky Debug Output\n');
  
  await switchBackend('sparky');
  
  const simpleCircuit = () => {
    const a = Provable.witness(Field, () => Field(5));
    const b = Provable.witness(Field, () => Field(7));
    const c = Provable.witness(Field, () => Field(12));
    
    console.log('Before assertEquals...');
    a.add(b).assertEquals(c);
    console.log('After assertEquals...');
  };
  
  console.log('Creating constraint system...\n');
  const cs = await Provable.constraintSystem(simpleCircuit);
  console.log('\nDone.');
  console.log('Gates:', cs.gates.length);
  console.log('Coefficients:', cs.gates[0]?.coeffs);
}

testSparkyDebug().catch(console.error);