#!/usr/bin/env node

// Test if Sparky's garbage values are endian-swapped versions of correct values
console.log('=== ENDIANNESS DEBUG TEST ===\n');

// Expected correct values (from Snarky)
const snarkyCoeffs = [
    '1',
    '0', 
    '0',
    '0',
    '28948022309329048855892746252171976963363056481941560715954676764349967630336'
];

// Garbage values from Sparky
const sparkyCoeffs = [
    '28948022309329048855892746252171976963317496166410141009864396001978282410000',
    '28948022309329048855892746252171976963317496166410141009864396001978282409984', 
    '28948022309329048855892746252171976963317496166410141009864396001978282409984',
    '28948022309329048855892746252171976963317496166410141009864396001978282409984',
    '53581891227960188287171888643516230890153842486574288753909081176067838874664'
];

console.log('Snarky coeffs (correct):');
snarkyCoeffs.forEach((c, i) => console.log(`  [${i}]: ${c}`));

console.log('\nSparky coeffs (garbage):');
sparkyCoeffs.forEach((c, i) => console.log(`  [${i}]: ${c}`));

// Convert to BigInt for analysis
console.log('\n=== ANALYSIS ===');

function toBigInt(str) {
    return BigInt(str);
}

function toHex(bigint) {
    return '0x' + bigint.toString(16);
}

function analyzeCoeff(index, snarky, sparky) {
    const sn = toBigInt(snarky);
    const sp = toBigInt(sparky);
    
    console.log(`\nCoeff ${index}:`);
    console.log(`  Snarky: ${snarky}`);
    console.log(`  Sparky: ${sparky}`);
    console.log(`  Snarky hex: ${toHex(sn)}`);
    console.log(`  Sparky hex: ${toHex(sp)}`);
    console.log(`  Difference: ${sp - sn}`);
    console.log(`  Diff hex: ${toHex(sp - sn)}`);
}

// Analyze each coefficient
for (let i = 0; i < 5; i++) {
    analyzeCoeff(i, snarkyCoeffs[i], sparkyCoeffs[i]);
}

// Check if this could be an endianness issue by examining bit patterns
console.log('\n=== ENDIANNESS PATTERN CHECK ===');

// Check if sparky values are endian-swapped versions
// The pattern we're looking for: if you swap bytes in a 32-byte representation,
// do you get from snarky values to sparky values?

const modulus = BigInt('28948022309329048855892746252171976963363056481941560715954676764349967630337');
console.log(`Field modulus: ${modulus}`);
console.log(`Modulus hex: ${toHex(modulus)}`);

// Check if any sparky values are (modulus - snarky_value)
console.log('\n=== FIELD ARITHMETIC CHECK ===');
for (let i = 0; i < 5; i++) {
    const sn = toBigInt(snarkyCoeffs[i]);
    const sp = toBigInt(sparkyCoeffs[i]);
    const complement = (modulus - sn) % modulus;
    
    console.log(`\nCoeff ${i}:`);
    console.log(`  Sparky value: ${sp}`);
    console.log(`  Modulus - Snarky: ${complement}`);
    console.log(`  Match: ${sp === complement ? 'YES' : 'NO'}`);
}