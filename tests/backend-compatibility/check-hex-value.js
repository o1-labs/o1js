// Check hex value precision

const hex1 = 0x0123456789ABCDEF;
const hex2 = 0x0123456789ABCDEFn;

console.log('Without n suffix:');
console.log('Value:', hex1);
console.log('As hex:', hex1.toString(16));
console.log('As BigInt:', BigInt(hex1));
console.log('BigInt as hex:', BigInt(hex1).toString(16));

console.log('\nWith n suffix:');
console.log('Value:', hex2);
console.log('As hex:', hex2.toString(16));

console.log('\nExpected right rotation by 4:');
const input = 0x0123456789ABCDEFn;
const expectedRight4 = 0xF0123456789ABCDEn;
console.log('Input:', input.toString(16));
console.log('Expected:', expectedRight4.toString(16));