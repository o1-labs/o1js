import { mod } from '../../bindings/crypto/finite_field.js';
import { Field } from '../../lib/core.js';
import { ZkProgram } from '../proof_system.js';
import {
  Spec,
  boolean,
  equivalentAsync,
  fieldWithRng,
} from '../testing/equivalent.js';
import { Random } from '../testing/property.js';
import { assert } from './common.js';
import { Gadgets } from './gadgets.js';
import { l } from './range-check.js';
import {
  constraintSystem,
  contains,
  equals,
  ifNotAllConstant,
  withoutGenerics,
} from '../testing/constraint-system.js';

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

constraintSystem(
  'range check 64',
  { from: [Field] },
  Gadgets.rangeCheck64,
  ifNotAllConstant(withoutGenerics(equals(['RangeCheck0'])))
);

constraintSystem(
  'multi-range check',
  { from: [Field, Field, Field] },
  (x, y, z) => Gadgets.multiRangeCheck([x, y, z]),
  ifNotAllConstant(
    contains(['RangeCheck0', 'RangeCheck0', 'RangeCheck1', 'Zero'])
  )
);

constraintSystem(
  'compact multi-range check',
  { from: [Field, Field] },
  Gadgets.compactMultiRangeCheck,
  ifNotAllConstant(
    contains(['RangeCheck0', 'RangeCheck0', 'RangeCheck1', 'Zero'])
  )
);

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
        Gadgets.multiRangeCheck([x, y, z]);
      },
    },
    checkCompact: {
      privateInputs: [Field, Field],
      method(xy, z) {
        let [x, y] = Gadgets.compactMultiRangeCheck(xy, z);
        x.add(y.mul(1n << l)).assertEquals(xy);
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
  { from: [maybeUint(l), uint(l), uint(l)], to: boolean },
  { runs: 3 }
)(
  (x, y, z) => {
    assert(!(x >> l) && !(y >> l) && !(z >> l), 'multi: not out of range');
    return true;
  },
  async (x, y, z) => {
    let proof = await RangeCheck.checkMulti(x, y, z);
    return await RangeCheck.verify(proof);
  }
);

await equivalentAsync(
  { from: [maybeUint(2n * l), uint(l)], to: boolean },
  { runs: 3 }
)(
  (xy, z) => {
    assert(!(xy >> (2n * l)) && !(z >> l), 'compact: not out of range');
    return true;
  },
  async (xy, z) => {
    let proof = await RangeCheck.checkCompact(xy, z);
    return await RangeCheck.verify(proof);
  }
);
