#!/usr/bin/env node

import { Field, Provable, switchBackend } from './dist/node/index.js';

async function testConstraintPersistence() {
  console.log('Testing constraint persistence in Sparky...\n');
  
  await switchBackend('sparky');
  
  // Test 1: Add constraint, then check if it persists
  console.log('=== Test 1: Basic constraint persistence ===');
  
  const result1 = await Provable.constraintSystem(() => {
    let x = Provable.witness(Field, () => Field(3));
    let y = Provable.witness(Field, () => Field(5));
    let z = x.mul(y);
    console.log('Added multiplication constraint');
    return z;
  });
  
  console.log('Constraints after first circuit:', result1.rows);
  
  // Test 2: Add another constraint in a new context
  console.log('\n=== Test 2: Second constraint system ===');
  
  const result2 = await Provable.constraintSystem(() => {
    let a = Provable.witness(Field, () => Field(2));
    let b = Provable.witness(Field, () => Field(4));
    let c = a.mul(b);
    console.log('Added another multiplication constraint');
    return c;
  });
  
  console.log('Constraints in second circuit:', result2.rows);
  
  // Test 3: Check if constraints accumulate or reset
  console.log('\n=== Test 3: Third constraint system ===');
  
  const result3 = await Provable.constraintSystem(() => {
    let p = Provable.witness(Field, () => Field(6));
    let q = Provable.witness(Field, () => Field(7));
    let r = p.mul(q);
    console.log('Added third multiplication constraint');
    return r;
  });
  
  console.log('Constraints in third circuit:', result3.rows);
  
  console.log('\n=== Summary ===');
  console.log('If all show the same number, constraints are isolated per circuit');
  console.log('If they increase, constraints are accumulating');
  console.log('If all show 0, constraint recording is broken');
}

testConstraintPersistence().catch(console.error);