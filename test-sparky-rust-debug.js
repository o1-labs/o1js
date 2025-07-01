#!/usr/bin/env node

import { Field, Provable, switchBackend } from './dist/node/index.js';

async function testWithRustDebug() {
  // Set Rust log level to see debug output
  process.env.RUST_LOG = 'sparky_core=debug,sparky_wasm=debug';
  
  console.log('🔍 Testing Sparky with Rust Debug Logging\n');
  
  await switchBackend('sparky');
  
  const simpleCircuit = () => {
    const a = Provable.witness(Field, () => Field(5));
    const b = Provable.witness(Field, () => Field(7)); 
    const c = Provable.witness(Field, () => Field(12));
    
    // This should trigger Add(a,b) = c pattern
    a.add(b).assertEquals(c);
  };
  
  console.log('Creating constraint system...\n');
  try {
    const cs = await Provable.constraintSystem(simpleCircuit);
    console.log('\nConstraint system created.');
    console.log('Gates:', cs.gates.length);
    console.log('First gate:', JSON.stringify(cs.gates[0], null, 2));
  } catch (e) {
    console.error('Error:', e);
  }
}

testWithRustDebug().catch(console.error);