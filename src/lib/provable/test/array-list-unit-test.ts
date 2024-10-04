import { mod } from '../../../bindings/crypto/finite-field.js';
import { Field } from '../field.js';
import { ZkProgram } from '../../proof-system/zkprogram.js';
import {
  Spec,
  boolean,
  equivalentAsync,
  fieldWithRng,
} from '../../testing/equivalent.js';
import { Random } from '../../testing/property.js';
import { assert } from '../gadgets/common.js';
import { Gadgets } from '../gadgets/gadgets.js';
import { ArrayList } from '../array-list.js';
import { constraintSystem, contains } from '../../testing/constraint-system.js';

let uint = (n: number | bigint): Spec<bigint, Field> => {
  return fieldWithRng(Random.bignat((1n << BigInt(n)) - 1n));
};

let maybeUint = (n: number | bigint): Spec<bigint, Field> => {
  let uint = Random.bignat((1n << BigInt(n)) - 1n);
  return fieldWithRng(
    Random.map(Random.oneOf(uint, uint.invalid), (x) => mod(x, Field.ORDER))
  );
};

let List = ZkProgram({
  name: 'dynamic-array',
  methods: {
    lists: {
      privateInputs: [Field, Field, Field],
      async method(v0: Field, v1: Field, v2: Field) {
        let list = new ArrayList<Field>(Provable<Field, Field>, 3);
        Gadgets.rangeCheck64(v0);
        Gadgets.rangeCheck3x12(v0, v1, v2);
      },
    },
  },
});

// constraint system sanity check

constraintSystem.fromZkProgram(List, 'lists', contains(['Lookup']));

await List.compile();

await equivalentAsync(
  { from: [uint(12), uint(12), maybeUint(12)], to: boolean },
  { runs: 3 }
)(
  (x, y, z) => {
    assert(x < 1n << 12n);
    assert(y < 1n << 12n);
    assert(z < 1n << 12n);
    return true;
  },
  async (x, y, z) => {
    let proof = await List.lists(x, y, z);
    return await List.verify(proof);
  }
);
