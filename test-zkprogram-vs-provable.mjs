#!/usr/bin/env node

import { Field, Provable, ZkProgram, switchBackend } from './dist/node/index.js';

// Test both approaches
async function testConstraintApproaches() {
  console.log('=== Testing constraint recording approaches ===\n');
  
  await switchBackend('sparky');
  
  // Approach 1: Using Provable.constraintSystem
  console.log('1. Using Provable.constraintSystem:');
  const provableResult = await Provable.constraintSystem(() => {
    let x = Provable.witness(Field, () => Field(3));
    let y = Provable.witness(Field, () => Field(5));
    let z = x.mul(y);
    return z;
  });
  console.log('   Constraints:', provableResult.rows);
  console.log('   Digest:', provableResult.digest);
  
  // Approach 2: Using ZkProgram.analyzeMethods
  console.log('\n2. Using ZkProgram.analyzeMethods:');
  const TestProgram = ZkProgram({
    name: 'TestProgram',
    publicInput: Field,
    methods: {
      multiply: {
        privateInputs: [Field],
        async method(_pub, a) {
          let b = Field(5);
          return a.mul(b);
        }
      }
    }
  });
  
  const analysis = await TestProgram.analyzeMethods();
  console.log('   Constraints:', analysis.multiply.rows);
  console.log('   Digest:', analysis.multiply.digest);
  console.log('   Gates:', JSON.stringify(analysis.multiply.gates, null, 2));
  
  console.log('\n=== Summary ===');
  console.log('Provable.constraintSystem shows:', provableResult.rows, 'constraints');
  console.log('ZkProgram.analyzeMethods shows:', analysis.multiply.rows, 'constraints');
  console.log('\nThis reveals whether the issue is with Provable.constraintSystem specifically');
}

testConstraintApproaches().catch(console.error);