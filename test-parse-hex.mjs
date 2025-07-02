import { parseHexString32 } from './dist/node/bindings/crypto/bigint-helpers.js';

// Test parseHexString32 with our hex values
const hex1 = '0000000000000000000000000000000000000000000000000000000000000001';
const hex2 = '40000000000000000000000000000000224698fc094cf91b992d30ed00000000';

console.log('=== TESTING parseHexString32 ===');
console.log('Input hex1:', hex1);
console.log('Parsed:', parseHexString32(hex1).toString());
console.log('Expected:', '1');
console.log();
console.log('Input hex2:', hex2);
console.log('Parsed:', parseHexString32(hex2).toString());
console.log('Expected:', '28948022309329048855892746252171976963363056481941560715954676764349967630336');