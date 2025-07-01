#!/usr/bin/env node

import { Field, Provable, switchBackend } from './dist/node/index.js';

async function test() {
  console.log('=== Testing constraint system generation ===\n');
  
  // Test with Snarky
  console.log('SNARKY:');
  const snarkyCS = Provable.constraintSystem(() => {
    const a = Provable.witness(Field, () => Field(5));
    const b = Provable.witness(Field, () => Field(7));
    const c = Provable.witness(Field, () => Field(12));
    
    a.add(b).assertEquals(c);
  });
  
  console.log('Type:', typeof snarkyCS);
  console.log('Keys:', Object.keys(snarkyCS || {}));
  console.log('Full result:', JSON.stringify(snarkyCS, null, 2));
  
  // Switch to Sparky
  await switchBackend('sparky');
  console.log('\nSPARKY:');
  
  const sparkyCS = Provable.constraintSystem(() => {
    const a = Provable.witness(Field, () => Field(5));
    const b = Provable.witness(Field, () => Field(7));
    const c = Provable.witness(Field, () => Field(12));
    
    a.add(b).assertEquals(c);
  });
  
  console.log('Type:', typeof sparkyCS);
  console.log('Keys:', Object.keys(sparkyCS || {}));
  console.log('Full result:', JSON.stringify(sparkyCS, null, 2));
}

test().catch(console.error);