import { Poseidon, PoseidonLegacy } from './poseidon.js';
import { testPoseidonKimchiFp } from './test_vectors/poseidonKimchi.js';
import { testPoseidonLegacyFp } from './test_vectors/poseidonLegacy.js';
import { expect } from 'expect';
import { bigIntToBytes } from './bigint-helpers.js';

let testVectors = testPoseidonKimchiFp.test_vectors;

for (let i = 0; i < testVectors.length; i++) {
  let { input, output } = testVectors[i];
  let inputBigint = input.map(BigInt);
  let hash = Poseidon.hash(inputBigint);
  let hex = fieldToHex(hash);
  expect(hex).toEqual(output);
}

testVectors = testPoseidonLegacyFp.test_vectors;

for (let i = 0; i < testVectors.length; i++) {
  let { input, output } = testVectors[i];
  let inputBigint = input.map(BigInt);
  let hash = PoseidonLegacy.hash(inputBigint);
  let hex = fieldToHex(hash);
  expect(hex).toEqual(output);
}

console.log('poseidon implementation matches the test vectors! 🎉');

function fieldToHex(x: bigint) {
  let bytes = bigIntToBytes(x, 32);
  return bytes.map((byte) => byte.toString(16).padStart(2, '0')).join('');
}
