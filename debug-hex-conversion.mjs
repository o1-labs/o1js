// Debug hex coefficient conversion

// Snarky's expected coefficient (decimal)
const snarkyCoeff = '28948022309329048855892746252171976963363056481941560715954676764349967630336';

// Sparky's hex coefficient
const sparkyHex = '40000000000000000000000000000000224698fc094cf91b992d30ed00000000';

// Parse hex to decimal
const sparkyDecimal = BigInt('0x' + sparkyHex);

console.log('=== HEX COEFFICIENT DEBUG ===');
console.log('Snarky coefficient (decimal):', snarkyCoeff);
console.log('Sparky coefficient (hex):', sparkyHex);
console.log('Sparky coefficient (decimal):', sparkyDecimal.toString());
console.log('Match?', sparkyDecimal.toString() === snarkyCoeff);

// Let's also check the field modulus
const pallasPrime = 28948022309329048855892746252171976963363056481941560715954676764349967630337n;
console.log('\nPallas prime:', pallasPrime.toString());
console.log('Expected -1 (p-1):', (pallasPrime - 1n).toString());
console.log('Expected -1 in hex:', (pallasPrime - 1n).toString(16));