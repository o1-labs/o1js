#!/usr/bin/env node

import { Field, Provable, Bool, switchBackend } from '../../../dist/node/index.js';

async function compareConstraintCounts() {
  // Save original console methods
  const originalLog = console.log;
  const originalInfo = console.info;
  const originalError = console.error;
  
  // Helper to suppress logs during operations
  const suppressLogs = () => {
    console.log = () => {};
    console.info = () => {};
    console.error = () => {};
  };
  
  const restoreLogs = () => {
    console.log = originalLog;
    console.info = originalInfo;
    console.error = originalError;
  };

  const tests = [
    { name: 'assertEquals only', fn: () => {
      const x = Provable.witness(Field, () => Field(5));
      x.assertEquals(Field(5));
    }},
    { name: 'add + assertEquals', fn: () => {
      const x = Provable.witness(Field, () => Field(5));
      const y = Provable.witness(Field, () => Field(7));
      const z = x.add(y);
      z.assertEquals(Field(12));
    }},
    { name: 'multiply only', fn: () => {
      const x = Provable.witness(Field, () => Field(5));
      const y = Provable.witness(Field, () => Field(7));
      x.mul(y);
    }},
    { name: 'boolean check', fn: () => {
      const b = Provable.witness(Bool, () => Bool(true));
      b.assertTrue();
    }},
    { name: 'empty circuit', fn: () => {} }
  ];

  restoreLogs();
  console.log('CONSTRAINT COUNT COMPARISON\n');
  console.log('Test                    | Snarky | Sparky | Match');
  console.log('------------------------|--------|--------|------');

  for (const test of tests) {
    suppressLogs();
    await switchBackend('snarky');
    const snarkyCS = await Provable.constraintSystem(test.fn);
    const snarkyCount = snarkyCS.gates.length;
    
    await switchBackend('sparky');
    const sparkyCS = await Provable.constraintSystem(test.fn);
    const sparkyCount = sparkyCS.gates.length;
    
    restoreLogs();
    const match = snarkyCount === sparkyCount ? '✅' : '❌';
    console.log(`${test.name.padEnd(23)} | ${String(snarkyCount).padStart(6)} | ${String(sparkyCount).padStart(6)} | ${match}`);
    suppressLogs();
  }
  
  await switchBackend('snarky');
  restoreLogs();
}

compareConstraintCounts().catch(console.error);