import { Field } from './dist/node/index.js';

console.log('=== Endianness Analysis ===\n');

// Field modulus
const p = Field.ORDER;
console.log('Field modulus p =', p.toString());

// Hex patterns from Sparky debug output
const sparkyHex = '40000000000000000000000000000000224698fc094cf91b992d30ed00000000';
console.log('\nSparky hex from debug:', sparkyHex);

// Convert assuming big-endian
const bigEndian = BigInt('0x' + sparkyHex);
console.log('\nAs big-endian:', bigEndian.toString());
console.log('Equals -1 mod p?', bigEndian === p - 1n);

// Convert assuming little-endian (reverse bytes)
function reverseHexBytes(hex) {
  // Split into byte pairs and reverse
  const bytes = [];
  for (let i = 0; i < hex.length; i += 2) {
    bytes.push(hex.substr(i, 2));
  }
  return bytes.reverse().join('');
}

const littleEndianHex = reverseHexBytes(sparkyHex);
console.log('\nReversed hex (little-endian):', littleEndianHex);
const littleEndian = BigInt('0x' + littleEndianHex);
console.log('As little-endian:', littleEndian.toString());
console.log('Equals 1?', littleEndian === 1n);

// Let's also check the coefficient values from the test output
console.log('\n=== Coefficient Format Analysis ===');

// From multiplication test - Snarky coefficients:
const snarkyCoeffs = [
  '1', '0', '0', '0', 
  '28948022309329048855892746252171976963363056481941560715954676764349967630328',
  '0', '0', '1',
  '28948022309329048855892746252171976963363056481941560715954676764349967630336',
  '0'
];

// From multiplication test - Sparky coefficients:
const sparkyGate0Coeffs = [
  '0', '0', 
  '24978832453430380873717209971532228208145673387365420563795187597376',
  '452312848583266388373324160190187140051835877600158453279131187530910662656',
  '0'
];

console.log('\nSnarky uses 10 coefficients (Plonk format?)');
console.log('Sparky uses 5 coefficients (Generic gate format?)');

// Analyze the -1 coefficient pattern
console.log('\n=== Understanding -1 mod p ===');
console.log('p - 1 =', (p - 1n).toString());
console.log('p - 1 in hex =', (p - 1n).toString(16));
console.log('Expected hex:', '3fffffffffffffffffffffffffffffff224698fc094cf91b992d30ed00000000');

// Compare with what we see
console.log('\nComparing with Sparky hex pattern:');
console.log('Sparky:  ', sparkyHex);
console.log('p-1 hex: ', (p - 1n).toString(16));

// The '40...' prefix suggests this might be a different encoding
console.log('\n=== Possible Montgomery Form? ===');
// 0x40... in binary starts with 01000000, which is 2^254
const val = BigInt('0x4000000000000000000000000000000000000000000000000000000000000000');
console.log('0x40... represents 2^254 =', val.toString());
console.log('2^254 mod p =', (val % p).toString());

// Check if it's -1 in Montgomery form
const R = 1n << 256n; // Montgomery parameter
const negOne = p - 1n;
const negOneMont = (negOne * R) % p;
console.log('\n-1 in Montgomery form (R=2^256):', negOneMont.toString(16));

console.log('\n=== Conclusion ===');
console.log('The hex pattern suggests Sparky might be using:');
console.log('1. Little-endian byte encoding within the hex string');
console.log('2. A different gate coefficient format (5 vs 10 coefficients)');
console.log('3. Possibly Montgomery representation for field elements');

process.exit(0);