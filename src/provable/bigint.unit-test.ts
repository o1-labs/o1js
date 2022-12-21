import { bigIntToBytes, bytesToBigInt, Field } from './field-bigint.js';
import { expect } from 'expect';
import { shutdown } from '../snarky.js';

function testBigintRoundtrip(x: bigint, size: number) {
  let bytes = bigIntToBytes(x, size);
  let x1 = bytesToBigInt(bytes);
  expect(x1).toEqual(x);
}
let fieldSize = Field.sizeInBytes();

testBigintRoundtrip(0n, 1);
testBigintRoundtrip(0n, fieldSize);
testBigintRoundtrip(56n, 2);
testBigintRoundtrip(40n, fieldSize);
testBigintRoundtrip(1309180n, fieldSize);
testBigintRoundtrip(0x10000000n, 4);
testBigintRoundtrip(0xffffffffn, 4);
testBigintRoundtrip(0x10ff00ffffn, fieldSize);
testBigintRoundtrip(Field.modulus, fieldSize);

console.log('bigint unit tests are passing! 🎉');
shutdown();
