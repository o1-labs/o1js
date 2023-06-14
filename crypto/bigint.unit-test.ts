import { expect } from 'expect';
import { bytesToBigInt, bigIntToBytes } from './bigint-helpers.js';
import { Fp } from './finite_field.js';

function testBigintRoundtrip(x: bigint, size: number) {
  let bytes = bigIntToBytes(x, size);
  let x1 = bytesToBigInt(bytes);
  expect(x1).toEqual(x);
}
let fieldSize = Math.ceil(Fp.sizeInBits / 8);

testBigintRoundtrip(0n, 1);
testBigintRoundtrip(0n, fieldSize);
testBigintRoundtrip(56n, 2);
testBigintRoundtrip(40n, fieldSize);
testBigintRoundtrip(1309180n, fieldSize);
testBigintRoundtrip(0x10000000n, 4);
testBigintRoundtrip(0xffffffffn, 4);
testBigintRoundtrip(0x10ff00ffffn, fieldSize);
testBigintRoundtrip(Fp.modulus, fieldSize);

// failure cases
expect(() => bigIntToBytes(256n, 1)).toThrow(/does not fit in 1 bytes/);
expect(() => bigIntToBytes(100_000n, 2)).toThrow(/does not fit in 2 bytes/);
expect(() => bigIntToBytes(4n * Fp.modulus, 32)).toThrow(
  /does not fit in 32 bytes/
);

console.log('bigint unit tests are passing! 🎉');
