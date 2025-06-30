// Test field size validation

const maxValue = 0xFFFFFFFFFFFFFFFFn;
const twoTo64 = 1n << 64n;

console.log('Max 64-bit value:', maxValue);
console.log('Max value in decimal:', maxValue.toString());
console.log('2^64:', twoTo64);
console.log('2^64 in decimal:', twoTo64.toString());
console.log('Is maxValue < 2^64?', maxValue < twoTo64);
console.log('Difference:', twoTo64 - maxValue);

// The error message said "got 18446744073709551616"
const errorValue = 18446744073709551616n;
console.log('\nError value from test:', errorValue);
console.log('Is error value == 2^64?', errorValue === twoTo64);
console.log('Is error value == maxValue?', errorValue === maxValue);