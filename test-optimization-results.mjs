#!/usr/bin/env node

/**
 * Test constraint optimization results
 */

import { Field, Provable } from './dist/node/index.js';
import { Snarky, switchBackend, initializeBindings } from './dist/node/bindings.js';

async function testConstraints(backend, testName, testFn) {
  try {
    if (backend === 'sparky') {
      await switchBackend('sparky');
    } else {
      await initializeBindings('snarky');
    }
    
    const cs = Snarky.run.enterConstraintSystem();
    testFn();
    const constraintSystem = cs();
    
    const json = Snarky.constraintSystem.toJson(constraintSystem);
    const rows = Snarky.constraintSystem.rows(constraintSystem);
    const gates = json.gates?.length || 0;
    
    console.log(`${backend.padEnd(6)} | ${testName.padEnd(20)} | ${rows} rows | ${gates} gates`);
    return { rows, gates };
    
  } catch (error) {
    console.log(`${backend.padEnd(6)} | ${testName.padEnd(20)} | ERROR: ${error.message}`);
    return { rows: -1, gates: -1 };
  }
}

async function main() {
  console.log('🚀 Constraint Optimization Test Results');
  console.log('======================================');
  console.log('Backend | Test                 | Rows  | Gates');
  console.log('--------|----------------------|-------|------');
  
  // Test 1: Simple equality x = 5
  const simpleTest = () => {
    const x = Provable.witness(Field, () => Field(5));
    x.assertEquals(Field(5));
  };
  
  const snarky1 = await testConstraints('snarky', 'x = 5', simpleTest);
  const sparky1 = await testConstraints('sparky', 'x = 5', simpleTest);
  
  // Test 2: Addition x + y = 8  
  const additionTest = () => {
    const x = Provable.witness(Field, () => Field(3));
    const y = Provable.witness(Field, () => Field(5));
    const sum = x.add(y);
    sum.assertEquals(Field(8));
  };
  
  const snarky2 = await testConstraints('snarky', 'x + y = 8', additionTest);
  const sparky2 = await testConstraints('sparky', 'x + y = 8', additionTest);
  
  // Test 3: Multiplication x * y = 15
  const multiplicationTest = () => {
    const x = Provable.witness(Field, () => Field(3));
    const y = Provable.witness(Field, () => Field(5));
    const product = x.mul(y);
    product.assertEquals(Field(15));
  };
  
  const snarky3 = await testConstraints('snarky', 'x * y = 15', multiplicationTest);
  const sparky3 = await testConstraints('sparky', 'x * y = 15', multiplicationTest);
  
  console.log('\n🎯 Optimization Results:');
  
  if (sparky1.gates !== -1 && snarky1.gates !== -1) {
    const improvement1 = snarky1.gates === 0 && sparky1.gates === 0 ? '✅ Perfect' : 
                        sparky1.gates < snarky1.gates ? '✅ Better' : 
                        sparky1.gates === snarky1.gates ? '✅ Equal' : '❌ Worse';
    console.log(`Simple equality: ${improvement1} (Snarky: ${snarky1.gates}, Sparky: ${sparky1.gates})`);
  }
  
  if (sparky2.gates !== -1 && snarky2.gates !== -1) {
    const improvement2 = snarky2.gates === 0 && sparky2.gates === 0 ? '✅ Perfect' : 
                        sparky2.gates < snarky2.gates ? '✅ Better' :
                        sparky2.gates === snarky2.gates ? '✅ Equal' : '❌ Worse';
    console.log(`Addition: ${improvement2} (Snarky: ${snarky2.gates}, Sparky: ${sparky2.gates})`);
  }
  
  if (sparky3.gates !== -1 && snarky3.gates !== -1) {
    const improvement3 = snarky3.gates === 0 && sparky3.gates === 0 ? '✅ Perfect' :
                        sparky3.gates < snarky3.gates ? '✅ Better' :
                        sparky3.gates === snarky3.gates ? '✅ Equal' : '❌ Worse';
    console.log(`Multiplication: ${improvement3} (Snarky: ${snarky3.gates}, Sparky: ${sparky3.gates})`);
  }
}

main().catch(console.error);