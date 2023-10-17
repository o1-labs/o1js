import { mod } from '../../bindings/crypto/finite_field.js';
import { Field } from '../field.js';
import { ZkProgram } from '../proof_system.js';
import {
  Spec,
  boolean,
  equivalentAsync,
  field,
} from '../testing/equivalent.js';
import { Random } from '../testing/random.js';
import { Gadgets } from './gadgets.js';

// TODO: make a ZkFunction or something that doesn't go through Pickles

let RangeCheck64 = ZkProgram({
  methods: {
    run: {
      privateInputs: [Field],
      method(x) {
        Gadgets.rangeCheck64(x);
      },
    },
  },
});

let ROT = ZkProgram({
  methods: {
    run: {
      privateInputs: [Field],
      method(x) {
        Gadgets.rot(x, 2, 'left');
        Gadgets.rot(x, 2, 'right');
      },
    },
  },
});

await RangeCheck64.compile();
await ROT.compile();

let maybeUint64: Spec<bigint, Field> = {
  ...field,
  rng: Random.map(Random.oneOf(Random.uint64, Random.uint64.invalid), (x) =>
    mod(x, Field.ORDER)
  ),
};

// do a couple of proofs
// TODO: we use this as a test because there's no way to check custom gates quickly :(

equivalentAsync({ from: [maybeUint64], to: boolean }, { runs: 3 })(
  (x) => {
    if (x >= 1n << 64n) throw Error('expected 64 bits');
    return true;
  },
  async (x) => {
    let proof = await RangeCheck64.run(x);
    return await RangeCheck64.verify(proof);
  }
);

equivalentAsync({ from: [maybeUint64], to: boolean }, { runs: 3 })(
  (x) => {
    if (x >= 1n << 64n) throw Error('expected 64 bits');
    return true;
  },
  async (x) => {
    let proof = await ROT.run(x);
    return await ROT.verify(proof);
  }
);
