#!/usr/bin/env node

import { Field, Provable, switchBackend } from '../../../dist/node/index.js';

// Override WASM field module to trace calls
async function traceAdditionAST() {
  console.log('\n🔍 TRACING ADDITION AST GENERATION\n');
  
  await switchBackend('sparky');
  
  // Save original methods
  const originalLog = console.log;
  
  // Create a simple addition circuit with detailed logging
  console.log('Creating witness variables...');
  const x = Provable.witness(Field, () => {
    console.log('  Creating witness x = Field(5)');
    return Field(5);
  });
  console.log('  x created:', x);
  
  const y = Provable.witness(Field, () => {
    console.log('  Creating witness y = Field(7)');
    return Field(7);
  });
  console.log('  y created:', y);
  
  console.log('\nCalling x.add(y)...');
  const z = x.add(y);
  console.log('  z = x.add(y) result:', z);
  
  console.log('\nCalling z.assertEquals(Field(12))...');
  z.assertEquals(Field(12));
  console.log('  assertEquals completed');
  
  // Now get constraint system
  console.log('\n\nGenerating constraint system for the same circuit...');
  const cs = await Provable.constraintSystem(() => {
    const x = Provable.witness(Field, () => Field(5));
    const y = Provable.witness(Field, () => Field(7));
    const z = x.add(y);
    z.assertEquals(Field(12));
  });
  
  console.log(`\nFinal constraint count: ${cs.gates.length}`);
  
  // Try to print the constraints
  if (cs.gates && cs.gates.length > 0) {
    console.log('\nConstraints generated:');
    cs.gates.forEach((gate, i) => {
      console.log(`  ${i}: ${JSON.stringify(gate).substring(0, 100)}...`);
    });
  }
}

traceAdditionAST().catch(console.error);