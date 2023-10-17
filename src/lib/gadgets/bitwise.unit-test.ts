import { ZkProgram } from '../proof_system.js';
import { Spec, equivalentAsync, field } from '../testing/equivalent.js';
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
[2, 4, 8, 16, 32, 64, 3, 5, 10, 15].forEach((length) => {
  test(Random.field, Random.field, (x_, y_, assert) => {
    let modulus = 1n << BigInt(length);
    let x = x_ % modulus;
    let y = y_ % modulus;
    let z = new Field(x);

    let r1 = Fp.xor(BigInt(x), BigInt(y));

    Provable.runAndCheck(() => {
      let zz = Provable.witness(Field, () => z);
      let yy = Provable.witness(Field, () => new Field(y));
      let r2 = Gadgets.xor(zz, yy, length);
      Provable.asProver(() => assert(r1 === r2.toBigInt()));
    });
  });
});

let maybeUint64: Spec<bigint, Field> = {
  ...field,
  rng: Random.map(Random.oneOf(Random.uint64, Random.uint64.invalid), (x) =>
    mod(x, Field.ORDER)
  ),
};

// do a couple of proofs
equivalentAsync({ from: [maybeUint64, maybeUint64], to: field }, { runs: 3 })(
  (x, y) => {
    if (x > 2 ** length || y > 2 ** length)
      throw Error('Does not fit into 64 bits');
    return Fp.xor(x, y);
  },
  async (x, y) => {
    let proof = await Bitwise.xor(x, y);
    return proof.publicOutput;
  }
);
