#!/usr/bin/env node

/**
 * Debug script to see what constraint types are being generated
 * 
 * Created: July 5, 2025, 12:45 AM UTC
 * Last Modified: July 5, 2025, 12:45 AM UTC
 */

import { switchBackend, Provable, Field } from './dist/node/index.js';

// Test simple multiplication
switchBackend('sparky');

console.log('Testing simple multiplication a * b = c\n');

await Provable.constraintSystem(() => {
  const a = Provable.witness(Field, () => Field(2));
  const b = Provable.witness(Field, () => Field(3));
  const c = a.mul(b);
  console.log('Created multiplication');
});

console.log('\nDone');