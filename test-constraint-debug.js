#!/usr/bin/env node

import { Field, Provable, switchBackend } from './dist/node/index.js';

async function test() {
  console.log('=== Testing constraint system with detailed debugging ===\n');
  
  // Test with Sparky
  await switchBackend('sparky');
  console.log('Testing with Sparky backend...\n');
  
  try {
    const cs = await Provable.constraintSystem(() => {
      console.log('Inside constraintSystem callback');
      const a = Provable.witness(Field, () => Field(5));
      const b = Provable.witness(Field, () => Field(7));
      const c = Provable.witness(Field, () => Field(12));
      
      console.log('Created witnesses');
      
      a.add(b).assertEquals(c);
      
      console.log('Added constraint');
    });
    
    console.log('\nConstraint system result:');
    console.log('Type:', typeof cs);
    console.log('Keys:', Object.keys(cs || {}));
    console.log('Rows:', cs?.rows);
    console.log('Gates:', cs?.gates);
    console.log('Digest:', cs?.digest);
    console.log('publicInputSize:', cs?.publicInputSize);
    
    if (cs?.gates && cs.gates.length > 0) {
      console.log('\nFirst gate:');
      console.log(JSON.stringify(cs.gates[0], null, 2));
    }
    
    // Try the print function if available
    if (cs?.print) {
      console.log('\nPrinting gates:');
      cs.print();
    }
    
    // Try the summary function if available
    if (cs?.summary) {
      console.log('\nGate summary:');
      console.log(cs.summary());
    }
    
  } catch (error) {
    console.error('Error:', error);
    console.error('Stack:', error.stack);
  }
}

test().catch(console.error);