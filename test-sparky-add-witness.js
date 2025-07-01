#!/usr/bin/env node

import { Field, Provable, switchBackend } from './dist/node/index.js';

async function test() {
  console.log('=== Testing where Add nodes become witnesses ===\n');
  
  // Switch to Sparky
  await switchBackend('sparky');
  
  console.log('Creating test circuit...');
  
  Provable.runAndCheck(() => {
    const a = Provable.witness(Field, () => Field(5));
    const b = Provable.witness(Field, () => Field(7));
    const c = Provable.witness(Field, () => Field(12));
    
    console.log('a:', a);
    console.log('b:', b);
    console.log('c:', c);
    
    // Look at the internal structure before add
    console.log('\nBefore add:');
    console.log('a.value:', a.value);
    console.log('b.value:', b.value);
    
    const sum = a.add(b);
    console.log('\nAfter add:');
    console.log('sum:', sum);
    console.log('sum.value:', sum.value);
    console.log('sum.value type:', typeof sum.value);
    console.log('sum.value is array:', Array.isArray(sum.value));
    
    if (Array.isArray(sum.value)) {
      console.log('sum.value[0]:', sum.value[0]); // Should be 2 for Add
      console.log('sum.value[1]:', sum.value[1]); // Left operand
      console.log('sum.value[2]:', sum.value[2]); // Right operand
    }
    
    console.log('\nBefore assertEquals:');
    sum.assertEquals(c);
    console.log('Constraint added successfully');
  });
}

test().catch(console.error);