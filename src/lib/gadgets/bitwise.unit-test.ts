import { Fp, mod } from '../../bindings/crypto/finite_field.js';
import { Field } from '../field.js';
import { ZkProgram } from '../proof_system.js';
import { Spec, equivalentAsync, field } from '../testing/equivalent.js';
import { Random } from '../testing/random.js';
import { Gadgets } from './gadgets.js';

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

let maybeUint64: Spec<bigint, Field> = {
  ...field,
  rng: Random.map(Random.oneOf(Random.uint64, Random.uint64.invalid), (x) =>
    mod(x, Field.ORDER)
  ),
};

// do a couple of proofs
equivalentAsync({ from: [maybeUint64, maybeUint64], to: field }, { runs: 3 })(
  (x, y) => {
    return Fp.xor(x, y);
  },
  async (x, y) => {
    let proof = await Bitwise.xor(x, y);
    return proof.publicOutput;
  }
);
