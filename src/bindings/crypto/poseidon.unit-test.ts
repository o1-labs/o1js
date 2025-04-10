import { Poseidon, PoseidonLegacy } from './poseidon.js';
import { testPoseidonKimchiFp } from './test-vectors/poseidon-kimchi.js';
import { testPoseidonLegacyFp } from './test-vectors/poseidon-legacy.js';
import { expect } from 'expect';
import { bigIntToBytes, parseHexString32 } from './bigint-helpers.js';
import { test, Random } from '../../lib/testing/property.js';
import { Test } from '../../snarky.js';
import { FieldConst } from '../../lib/provable/core/fieldvar.js';
import { MlArray } from '../../lib/ml/base.js';
import { Fp } from './finite-field.js';

let mlTest = await Test();

function checkTestVectors(
  testVectors: { input: string[]; output: string }[],
  hash: (input: bigint[]) => bigint
) {
  for (let i = 0; i < testVectors.length; i++) {
    let { input, output } = testVectors[i];
    let inputBigint = input.map(parseHexString32);
    let hashOutput = hash(inputBigint);
    let hex = fieldToHex(hashOutput);
    expect(hex).toEqual(output);
  }
}

checkTestVectors(testPoseidonKimchiFp.test_vectors, Poseidon.hash);

checkTestVectors(testPoseidonLegacyFp.test_vectors, PoseidonLegacy.hash);

// calling update() subsequently on size-2 chunks is the same as calling hash() on the full input

test(Random.array(Random.field, 5), (xs) => {
  let h1 = Poseidon.hash(xs);

  let state = Poseidon.initialState();
  state = Poseidon.update(state, [xs[0], xs[1]]);
  state = Poseidon.update(state, [xs[2], xs[3]]);
  state = Poseidon.update(state, [xs[4]]);
  let h2 = state[0];
  expect(h1).toEqual(h2);
});

console.log('poseidon implementation matches the test vectors! 🎉');

test(Random.array(Random.field, Random.nat(20)), (xs) => {
  let g1 = Poseidon.hashToGroup(xs)!;
  let [, g2x, g2y] = mlTest.poseidon.hashToGroup(
    MlArray.to(xs.map(FieldConst.fromBigint))
  );

  expect(g1).toBeDefined();
  expect(g1.x).toEqual(FieldConst.toBigint(g2x));

  let g2y_ = FieldConst.toBigint(g2y);
  expect(g1.y === g2y_ || Fp.negate(g1.y) === g2y_).toEqual(true);
  expect(Fp.isEven(g1.y)).toEqual(true);
});

console.log('poseidon hashToGroup implementations match! 🎉');

function fieldToHex(x: bigint) {
  let bytes = bigIntToBytes(x, 32);
  return bytes.map((byte) => byte.toString(16).padStart(2, '0')).join('');
}
