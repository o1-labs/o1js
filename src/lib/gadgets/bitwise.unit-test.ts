import { ZkProgram } from '../proof_system.js';
import {
  Spec,
  equivalent,
  equivalentAsync,
  field,
  fieldWithRng,
} from '../testing/equivalent.js';
import { Fp, mod } from '../../bindings/crypto/finite_field.js';
import { Field } from '../field.js';
import { Gadgets } from './gadgets.js';
import { Random } from '../testing/property.js';

let Bitwise = ZkProgram({
  publicOutput: Field,
  methods: {
    xor: {
      privateInputs: [Field, Field],
      method(a: Field, b: Field) {
        return Gadgets.xor(a, b, 64);
      },
    },
  },
});

await Bitwise.compile();

let uint = (length: number) => fieldWithRng(Random.biguint(length));

[2, 4, 8, 16, 32, 64, 128].forEach((length) => {
  equivalent({ from: [uint(length), uint(length)], to: field })(
    Fp.xor,
    (x, y) => Gadgets.xor(x, y, length)
  );
});

let maybeUint64: Spec<bigint, Field> = {
  ...field,
  rng: Random.map(Random.oneOf(Random.uint64, Random.uint64.invalid), (x) =>
    mod(x, Field.ORDER)
  ),
};

// do a couple of proofs
await equivalentAsync(
  { from: [maybeUint64, maybeUint64], to: field },
  { runs: 3 }
)(
  (x, y) => {
    if (x >= 2n ** 64n || y >= 2n ** 64n)
      throw Error('Does not fit into 64 bits');
    return Fp.xor(x, y);
  },
  async (x, y) => {
    let proof = await Bitwise.xor(x, y);
    return proof.publicOutput;
  }
);

let NOT = ZkProgram({
  methods: {
    run: {
      privateInputs: [Field],
      method(a) {
        Gadgets.not(a, 64);
      },
    },
  },
});

await NOT.compile();

// not
[2, 4, 8, 16, 32, 64, 128].forEach((length) => {
  equivalent({ from: [uint(length), uint(length)], to: field })(
    Fp.not,
    (x, ) => Gadgets.not(x, length)
  );
});


