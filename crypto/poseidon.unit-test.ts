import { Poseidon, PoseidonLegacy } from './poseidon.js';
import { testPoseidonKimchiFp } from './test_vectors/poseidonKimchi.js';
import { testPoseidonLegacyFp } from './test_vectors/poseidonLegacy.js';
import { expect } from 'expect';
import { bigIntToBytes } from './bigint-helpers.js';
import { test, Random } from '../../lib/testing/property.js';
import { Fp } from './finite_field.js';
import { Poseidon as SnarkyPoseidon } from '../../lib/hash.js';
import { Field } from '../../snarky.js';

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

for (let i = 0; i < 50; i++) {
  let randomF = Random(Fp.random);
  test(randomF, randomF, randomF, (x, y, z) => {
    let xs = [x, y, z];

    let g1 = Poseidon.hashToGroup(xs);
    let g2 = SnarkyPoseidon.hashToGroup(xs.map(Field));

    expect(g1).toBeDefined();

    expect(g1?.x).toEqual(g2.x.toBigInt());
    expect(g1?.y.x0).toEqual(g2.y.x0.toBigInt());
    expect(g1?.y.x1).toEqual(g2.y.x1.toBigInt());
  });
}

console.log('poseidon hashToGroup implementations match! 🎉');

function fieldToHex(x: bigint) {
  let bytes = bigIntToBytes(x, 32);
  return bytes.map((byte) => byte.toString(16).padStart(2, '0')).join('');
}
