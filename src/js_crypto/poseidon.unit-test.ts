import { bigIntToBytes } from '../provable/field-bigint.js';
import { Poseidon } from './poseidon.js';
import { testPoseidonKimchiFp } from './test_vectors/poseidonKimchi.js';
import { expect } from 'expect';

let testVectors = testPoseidonKimchiFp.test_vectors;

for (let i = 0; i < testVectors.length; i++) {
  let { input, output } = testVectors[i];
  let inputBigint = input.map(BigInt);
  let hash = Poseidon.hash(inputBigint);
  let bytes = bigIntToBytes(hash, 32);
  let hex = bytes.map((byte) => byte.toString(16).padStart(2, '0')).join('');
  expect(hex).toEqual(output);
}

console.log('poseidon implementation matches the test vectors! 🎉');
