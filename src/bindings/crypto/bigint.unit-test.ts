import { expect } from 'expect';
import {
  bytesToBigInt,
  bigIntToBytes,
  bigintToBytes32,
  bytesToBigint32,
  parseHexString32,
} from './bigint-helpers.js';
import { Fp } from './finite-field.js';
import { Random, test } from '../../lib/testing/property.js';

function testBigintRoundtrip(x: bigint, size: number) {
  let bytes = bigIntToBytes(x, size);
  let x1 = bytesToBigInt(bytes);
  expect(x1).toEqual(x);

  if (size === 32) {
    let bytes32 = bigintToBytes32(x, new Uint8Array(32));
    let x2 = bytesToBigint32(bytes32);
    expect(x2).toEqual(x);
  }
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

test(Random.field, (x) => testBigintRoundtrip(x, fieldSize));

// failure cases
expect(() => bigIntToBytes(256n, 1)).toThrow(/does not fit in 1 bytes/);
expect(() => bigIntToBytes(100_000n, 2)).toThrow(/does not fit in 2 bytes/);
expect(() => bigIntToBytes(4n * Fp.modulus, 32)).toThrow(
  /does not fit in 32 bytes/
);

// parseHexString32

expect(parseHexString32('01' + '00'.repeat(31))).toEqual(1n);
expect(parseHexString32('ff' + '00'.repeat(31))).toEqual(255n);
expect(parseHexString32('0001' + '00'.repeat(30))).toEqual(16n ** 2n);
expect(parseHexString32('0010' + '00'.repeat(30))).toEqual(16n ** 3n);
expect(parseHexString32('00'.repeat(31) + '80')).toEqual(1n << 255n);
expect(parseHexString32('ff'.repeat(32))).toEqual((1n << 256n) - 1n);

console.log('bigint unit tests are passing! 🎉');
