#!/usr/bin/env node

import { switchBackend } from './dist/node/index.js';

console.log('🔍 Debugging Sparky Constraint Creation\n');

async function main() {
  // Switch to Sparky backend
  await switchBackend('sparky');
  
  const { Snarky } = await import('./dist/node/index.js');
  
  console.log('📊 Creating simple field assertion...');
  console.log('Snarky object:', Object.keys(Snarky));
  
  // Create a simple constraint
  const x = Snarky.field.constant(5);
  const y = Snarky.field.constant(5);
  
  console.log('🔍 Before assertion - resetting state...');
  Snarky.run.reset();
  
  console.log('🔍 Entering constraint mode...');
  Snarky.run.constraintMode();
  
  console.log('🔍 Creating assertion...');
  Snarky.field.assertEqual(x, y);
  
  console.log('🔍 Getting constraint system...');
  const constraintSystem = Snarky.constraintSystem.toJson({});
  
  console.log('🔍 Raw constraint system JSON:');
  console.log(JSON.stringify(constraintSystem, null, 2));
  
  const parsed = JSON.parse(constraintSystem);
  console.log('\n🔍 Parsed constraint system:');
  console.log('Number of gates:', parsed.gates.length);
  
  if (parsed.gates.length > 0) {
    console.log('First gate:');
    console.log('  Type:', parsed.gates[0].typ);
    console.log('  Wires:', parsed.gates[0].wires.length);
    console.log('  Wires detail:', JSON.stringify(parsed.gates[0].wires, null, 2));
    console.log('  Coeffs:', parsed.gates[0].coeffs.length);
  }
}

main().catch(console.error);