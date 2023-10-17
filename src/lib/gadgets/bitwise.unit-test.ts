import { ZkProgram } from '../proof_system.js';
import {
  Spec,
  equivalent,
  equivalentAsync,
  field,
} from '../testing/equivalent.js';
import { Fp, mod } from '../../bindings/crypto/finite_field.js';
import { Field } from '../field.js';
import { Gadgets } from './gadgets.js';
import { Provable } from '../provable.js';
import { test, Random } from '../testing/property.js';

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

// XOR with some common and odd lengths
let uint = (length: number) => fieldWithRng(Random.biguint(length));

[2, 4, 8, 16, 32, 64, 3, 5, 10, 15].forEach((length) => {
  equivalent({ from: [uint(length), uint(length)], to: field })(
    Fp.xor,
    (x, y) => Gadgets.xor(x, y, length)
  );
});

// helper that should be added to `equivalent.ts`
function fieldWithRng(rng: Random<bigint>): Spec<bigint, Field> {
  return { ...field, rng };
}
let maybeUint64: Spec<bigint, Field> = {
  ...field,
  rng: Random.map(Random.oneOf(Random.uint64, Random.uint64.invalid), (x) =>
    mod(x, Field.ORDER)
  ),
};

// do a couple of proofs
equivalentAsync({ from: [maybeUint64, maybeUint64], to: field }, { runs: 3 })(
  (x, y) => {
    if (x > 2 ** 64 || y > 2 ** 64) throw Error('Does not fit into 64 bits');
    return Fp.xor(x, y);
  },
  async (x, y) => {
    let proof = await Bitwise.xor(x, y);
    return proof.publicOutput;
  }
);
