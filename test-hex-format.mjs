import { parseHexString32 } from './dist/node/bindings/crypto/bigint-helpers.js';

// Let's figure out what format parseHexString32 expects
// Test with value 1
console.log('=== TESTING HEX FORMAT ===');

// Try different hex representations of 1
const bigEndian1 = '0000000000000000000000000000000000000000000000000000000000000001';
const littleEndian1 = '0100000000000000000000000000000000000000000000000000000000000000';

console.log('Big-endian hex for 1:', bigEndian1);
console.log('Parsed as:', parseHexString32(bigEndian1).toString());
console.log();
console.log('Little-endian hex for 1:', littleEndian1);  
console.log('Parsed as:', parseHexString32(littleEndian1).toString());

// Let's also check what Snarky might be producing
// The field prime - 1 (which is -1 in the field)
const fieldPrimeMinusOne = 28948022309329048855892746252171976963363056481941560715954676764349967630336n;

// Convert to hex in different ways
const hexBE = fieldPrimeMinusOne.toString(16).padStart(64, '0');
console.log('\nField prime - 1:');
console.log('Decimal:', fieldPrimeMinusOne.toString());
console.log('Hex (BE):', hexBE);

// Try to find what hex produces the correct decimal
// Let's manually construct the little-endian representation
function bigintToLittleEndianHex(n) {
    let hex = '';
    for (let i = 0; i < 32; i++) {
        let byte = Number(n & 0xffn);
        hex += byte.toString(16).padStart(2, '0');
        n = n >> 8n;
    }
    return hex;
}

const hexLE = bigintToLittleEndianHex(fieldPrimeMinusOne);
console.log('Hex (LE):', hexLE);
console.log('Parsed:', parseHexString32(hexLE).toString());
console.log('Match?', parseHexString32(hexLE).toString() === fieldPrimeMinusOne.toString());