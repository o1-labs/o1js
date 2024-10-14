import { ZkProgram } from '../../proof-system/zkprogram.js';
import {
  equivalentProvable as equivalent,
  equivalentAsync,
  field,
  fieldWithRng,
  record,
} from '../../testing/equivalent.js';
import { Field } from '../wrapped.js';
import { Gadgets } from '../gadgets/gadgets.js';
import { provable } from '../types/provable-derivers.js';
import { assert } from '../gadgets/common.js';
import { Random } from '../../testing/random.js';

let uint = (length: number) => fieldWithRng(Random.biguint(length));

let Arithmetic = ZkProgram({
  name: 'arithmetic',
  publicOutput: provable({ remainder: Field, quotient: Field }),
  methods: {
    divMod32: {
      privateInputs: [Field],
      async method(a: Field) {
        return { publicOutput: Gadgets.divMod32(a) };
      },
    },
    divMod64: {
      privateInputs: [Field],
      async method(a: Field) {
        return { publicOutput: Gadgets.divMod64(a) };
      },
    },
  },
});

await Arithmetic.compile();

const divMod32Helper = (x: bigint) => {
  let quotient = x >> 32n;
  let remainder = x - (quotient << 32n);
  return { remainder, quotient };
};

const divMod64Helper = (x: bigint) => {
  let quotient = x >> 64n;
  let remainder = x - (quotient << 64n);
  return { remainder, quotient };
};

const divModOutput = record({ remainder: field, quotient: field });



equivalent({
  from: [field],
  to: divModOutput,
})(
  (x) => {
    assert(x < 1n << 64n, `x needs to fit in 64bit, but got ${x}`);
    return divMod32Helper(x);
  },
  (x) => {
    return Gadgets.divMod32(x);
  }
);

equivalent({
  from: [uint(64)],
  to: divModOutput,
})(
  (x) => {
    assert(x < 1n << 128n, `x needs to fit in 128bit, but got ${x}`);
    return divMod64Helper(x);
  },
  (x) => {
    return Gadgets.divMod64(x);
  }
);

await equivalentAsync({ from: [field], to: divModOutput }, { runs: 3 })(
  (x) => {
    assert(x < 1n << 64n, `x needs to fit in 64bit, but got ${x}`);
    return divMod32Helper(x);
  },
  async (x) => {
    return (await Arithmetic.divMod32(x)).proof.publicOutput;
  }
);

await equivalentAsync({ from: [field], to: divModOutput }, { runs: 3 })(
  (x) => {
    assert(x < 1n << 128n, `x needs to fit in 128bit, but got ${x}`);
    return divMod64Helper(x);
  },
  async (x) => {
    return (await Arithmetic.divMod64(x)).proof.publicOutput;
  }
);
