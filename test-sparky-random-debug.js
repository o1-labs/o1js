/**
 * Debug test for Sparky random field generation
 */

import { 
  switchBackend, 
  getCurrentBackend,
  Snarky 
} from './dist/node/bindings.js';
import { Fp } from './dist/node/bindings/crypto/finite-field.js';

async function debugSparkyRandom() {
  console.log('=== Debugging Sparky Random Field Generation ===\n');
  
  await switchBackend('sparky');
  console.log(`Current backend: ${getCurrentBackend()}\n`);
  
  // Generate one random field and inspect it carefully
  console.log('Generating a random field element:\n');
  
  const fieldVar = Snarky.field.random();
  console.log('Full fieldVar structure:', JSON.stringify(fieldVar, (key, value) => 
    typeof value === 'bigint' ? value.toString() : value
  , 2));
  
  // Extract the value
  const value = fieldVar[1][1];
  console.log('\nExtracted value:', value);
  console.log('Type:', typeof value);
  console.log('Bits:', value.toString(2).length);
  console.log('Hex:', '0x' + value.toString(16));
  
  // Compare with direct Fp.random()
  console.log('\n\nComparing with direct Fp.random():');
  const directRandom = Fp.random();
  console.log('Direct value:', directRandom);
  console.log('Bits:', directRandom.toString(2).length);
  console.log('Hex:', '0x' + directRandom.toString(16));
  
  // Check if the issue is in display
  console.log('\n\nChecking console.log behavior:');
  console.log('Small bigint:', 123n);
  console.log('Large bigint:', 28948022309329048855892746252171976963363056481941560715954676764349967630337n);
  console.log('Array with bigint:', [0, [0, 28948022309329048855892746252171976963363056481941560715954676764349967630337n]]);
}

debugSparkyRandom().catch(console.error);