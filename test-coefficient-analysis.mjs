import { Field } from './dist/node/index.js';

console.log('=== Coefficient Analysis ===\n');

// Field modulus
const p = Field.ORDER;
console.log('Field modulus p =', p.toString());
console.log('p in hex =', p.toString(16));

// Analyze Snarky coefficient from equality test
const snarkyCoeff = 28948022309329048855892746252171976963363056481941560715954676764349967630332n;
console.log('\nSnarky coefficient:', snarkyCoeff.toString());
console.log('Snarky coeff = p - 5 ?', snarkyCoeff === p - 5n, '(', p - snarkyCoeff, ')');
console.log('This represents: 1*x + (p-5) = 0, which is x = 5');

// Analyze Sparky coefficients from equality test  
const sparkyCoeff1 = 452312848583266388373324160190187140051835877600158453279131187530910662656n;
const sparkyCoeff2 = 24978832453430380873717209971532228208145673387365420563795187597376n;
console.log('\nSparky coefficient 1:', sparkyCoeff1.toString());
console.log('Sparky coefficient 2:', sparkyCoeff2.toString());

// Try to understand Sparky's representation
console.log('\nAnalyzing Sparky coefficients:');
console.log('coeff1 in hex:', sparkyCoeff1.toString(16));
console.log('coeff2 in hex:', sparkyCoeff2.toString(16));

// Check if they're related to field representation
console.log('\nChecking field representation:');
console.log('coeff1 = 1 << 255 ?', sparkyCoeff1 === (1n << 255n));
console.log('coeff1 = 1 << 256 ?', sparkyCoeff1 === (1n << 256n));

// Try to decode as limbs
const LIMB_SIZE = 64n;
const LIMB_MASK = (1n << LIMB_SIZE) - 1n;

function toLimbs(n) {
  const limbs = [];
  let temp = n;
  for (let i = 0; i < 4; i++) {
    limbs.push(temp & LIMB_MASK);
    temp = temp >> LIMB_SIZE;
  }
  return limbs;
}

console.log('\nSparky coeff1 as 64-bit limbs:', toLimbs(sparkyCoeff1).map(l => '0x' + l.toString(16)));
console.log('Sparky coeff2 as 64-bit limbs:', toLimbs(sparkyCoeff2).map(l => '0x' + l.toString(16)));

// Check multiplication constraint from first test
console.log('\n=== Multiplication Constraint Analysis ===');
console.log('Snarky multiplication uses coefficient:', 28948022309329048855892746252171976963363056481941560715954676764349967630328n);
console.log('Which is p - 9:', p - 9n);
console.log('Match?', 28948022309329048855892746252171976963363056481941560715954676764349967630328n === p - 9n);

// Check the hex patterns from debug output
console.log('\n=== Hex Pattern Analysis ===');
const sparkyHex1 = '40000000000000000000000000000000224698fc094cf91b992d30ed00000000';
const sparkyHex2 = '0000000000000000000000000000000000000000000000000000000000000000';

console.log('Sparky hex pattern 1:', sparkyHex1);
console.log('As BigInt:', BigInt('0x' + sparkyHex1));
console.log('Equals p-1?', BigInt('0x' + sparkyHex1) === p - 1n);
console.log('Equals -1 mod p?', BigInt('0x' + sparkyHex1) === p - 1n);

// The pattern suggests Sparky uses a different encoding
console.log('\n=== Conclusion ===');
console.log('1. Snarky uses standard coefficient representation (e.g., -5 = p-5)');
console.log('2. Sparky appears to use a different encoding scheme for coefficients');
console.log('3. This explains why VKs are different - the constraint representation differs');
console.log('4. Sparky also generates more constraints (missing reduce_lincom optimization)');

process.exit(0);