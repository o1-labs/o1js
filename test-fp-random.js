/**
 * Test Fp.random() directly to understand the output
 */

import { Fp } from './dist/node/bindings/crypto/finite-field.js';

console.log('Testing Fp.random() directly\n');

// Generate some random field elements
console.log('Field modulus (p):', Fp.modulus);
console.log('Field size in bits:', Fp.sizeInBits);
console.log('\nGenerating random field elements:\n');

for (let i = 0; i < 10; i++) {
  const random = Fp.random();
  const bits = random.toString(2).length;
  console.log(`Sample ${i + 1}:`);
  console.log(`  Decimal: ${random}`);
  console.log(`  Bits: ${bits}`);
  console.log(`  Hex: 0x${random.toString(16)}`);
  console.log('');
}

// Check distribution across bit sizes
console.log('\nBit size distribution (1000 samples):');
const bitCounts = {};
for (let i = 0; i < 1000; i++) {
  const random = Fp.random();
  const bits = random.toString(2).length;
  bitCounts[bits] = (bitCounts[bits] || 0) + 1;
}

const sortedBits = Object.keys(bitCounts).sort((a, b) => Number(a) - Number(b));
for (const bits of sortedBits) {
  console.log(`  ${bits} bits: ${bitCounts[bits]} samples`);
}