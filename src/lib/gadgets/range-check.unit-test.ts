import type { Gate } from '../../snarky.js';
import { mod } from '../../bindings/crypto/finite_field.js';
import { Field } from '../../lib/core.js';
import { ZkProgram } from '../proof_system.js';
import { Provable } from '../provable.js';
import {
  Spec,
  boolean,
  equivalentAsync,
  fieldWithRng,
} from '../testing/equivalent.js';
import { Random } from '../testing/property.js';
import { assert, exists } from './common.js';
import { Gadgets } from './gadgets.js';
import { L } from './range-check.js';
import { expect } from 'expect';

let uint = (n: number | bigint): Spec<bigint, Field> => {
  let uint = Random.bignat((1n << BigInt(n)) - 1n);
  return fieldWithRng(uint);
};

let maybeUint = (n: number | bigint): Spec<bigint, Field> => {
  let uint = Random.bignat((1n << BigInt(n)) - 1n);
  return fieldWithRng(
    Random.map(Random.oneOf(uint, uint.invalid), (x) => mod(x, Field.ORDER))
  );
};

// constraint system sanity check

function csWithoutGenerics(gates: Gate[]) {
  return gates.map((g) => g.type).filter((type) => type !== 'Generic');
}

let check64 = Provable.constraintSystem(() => {
  let [x] = exists(1, () => [0n]);
  Gadgets.rangeCheck64(x);
});
let multi = Provable.constraintSystem(() => {
  let [x, y, z] = exists(3, () => [0n, 0n, 0n]);
  Gadgets.multiRangeCheck(x, y, z);
});
let compact = Provable.constraintSystem(() => {
  let [xy, z] = exists(2, () => [0n, 0n]);
  Gadgets.compactMultiRangeCheck(xy, z);
});

let expectedLayout64 = ['RangeCheck0'];
let expectedLayoutMulti = ['RangeCheck0', 'RangeCheck0', 'RangeCheck1', 'Zero'];

expect(csWithoutGenerics(check64.gates)).toEqual(expectedLayout64);
expect(csWithoutGenerics(multi.gates)).toEqual(expectedLayoutMulti);
expect(csWithoutGenerics(compact.gates)).toEqual(expectedLayoutMulti);

// TODO: make a ZkFunction or something that doesn't go through Pickles
// --------------------------
// RangeCheck64 Gate
// --------------------------

let RangeCheck = ZkProgram({
  name: 'range-check',
  methods: {
    check64: {
      privateInputs: [Field],
      method(x) {
        Gadgets.rangeCheck64(x);
      },
    },
    checkMulti: {
      privateInputs: [Field, Field, Field],
      method(x, y, z) {
        Gadgets.multiRangeCheck(x, y, z);
      },
    },
    checkCompact: {
      privateInputs: [Field, Field],
      method(xy, z) {
        let [x, y] = Gadgets.compactMultiRangeCheck(xy, z);
        x.add(y.mul(1n << L)).assertEquals(xy);
      },
    },
  },
});

await RangeCheck.compile();

// TODO: we use this as a test because there's no way to check custom gates quickly :(

await equivalentAsync({ from: [maybeUint(64)], to: boolean }, { runs: 3 })(
  (x) => {
    assert(x < 1n << 64n);
    return true;
  },
  async (x) => {
    let proof = await RangeCheck.check64(x);
    return await RangeCheck.verify(proof);
  }
);

await equivalentAsync(
  { from: [maybeUint(L), uint(L), uint(L)], to: boolean },
  { runs: 3 }
)(
  (x, y, z) => {
    assert(!(x >> L) && !(y >> L) && !(z >> L), 'multi: not out of range');
    return true;
  },
  async (x, y, z) => {
    let proof = await RangeCheck.checkMulti(x, y, z);
    return await RangeCheck.verify(proof);
  }
);

await equivalentAsync(
  { from: [maybeUint(2n * L), uint(L)], to: boolean },
  { runs: 3 }
)(
  (xy, z) => {
    assert(!(xy >> (2n * L)) && !(z >> L), 'compact: not out of range');
    return true;
  },
  async (xy, z) => {
    let proof = await RangeCheck.checkCompact(xy, z);
    return await RangeCheck.verify(proof);
  }
);
