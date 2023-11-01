import { ZkProgram } from '../proof_system.js';
import {
  Spec,
  equivalent,
  equivalentAsync,
  field,
  fieldWithRng,
} from '../testing/equivalent.js';
import { Fp, mod } from '../../bindings/crypto/finite_field.js';
import { Field } from '../core.js';
import { Gadgets } from './gadgets.js';
import { test, Random } from '../testing/property.js';
import { Provable } from '../provable.js';

let Bitwise = ZkProgram({
  name: 'bitwise',
  publicOutput: Field,
  methods: {
    xor: {
      privateInputs: [Field, Field],
      method(a: Field, b: Field) {
        return Gadgets.xor(a, b, 64);
      },
    },
    not: {
      privateInputs: [Field],
      method(a: Field) {
        return Gadgets.not(a, 64);
      },
    },
    and: {
      privateInputs: [Field, Field],
      method(a: Field, b: Field) {
        return Gadgets.and(a, b, 64);
      },
    },
    rot: {
      privateInputs: [Field],
      method(a: Field) {
        return Gadgets.rotate(a, 12, 'left');
      },
    },
  },
});

await Bitwise.compile();

let uint = (length: number) => fieldWithRng(Random.biguint(length));

[2, 4, 8, 16, 32, 64, 128].forEach((length) => {
  equivalent({ from: [uint(length), uint(length)], to: field })(
    (x, y) => x ^ y,
    (x, y) => Gadgets.xor(x, y, length)
  );
  equivalent({ from: [uint(length), uint(length)], to: field })(
    (x, y) => x & y,
    (x, y) => Gadgets.and(x, y, length)
  );
  equivalent({ from: [uint(length), uint(length)], to: field })(
    (x) => Fp.not(x, length),
    (x) => Gadgets.not(x, length)
  );
});

test(
  Random.uint64,
  Random.nat(64),
  Random.boolean,
  (x, n, direction, assert) => {
    let z = Field(x);
    let r1 = Fp.rot(x, n, direction ? 'left' : 'right');
    Provable.runAndCheck(() => {
      let f = Provable.witness(Field, () => z);
      let r2 = Gadgets.rotate(f, n, direction ? 'left' : 'right');
      Provable.asProver(() => assert(r1 === r2.toBigInt()));
    });
  }
);

let maybeUint64: Spec<bigint, Field> = {
  ...field,
  rng: Random.map(Random.oneOf(Random.uint64, Random.uint64.invalid), (x) =>
    mod(x, Field.ORDER)
  ),
};

await equivalentAsync(
  { from: [maybeUint64, maybeUint64], to: field },
  { runs: 3 }
)(
  (x, y) => {
    if (x >= 2n ** 64n || y >= 2n ** 64n)
      throw Error('Does not fit into 64 bits');
    return x ^ y;
  },
  async (x, y) => {
    let proof = await Bitwise.xor(x, y);
    return proof.publicOutput;
  }
);

await equivalentAsync(
  { from: [maybeUint64, maybeUint64], to: field },
  { runs: 3 }
)(
  (x, y) => {
    if (x >= 2n ** 64n || y >= 2n ** 64n)
      throw Error('Does not fit into 64 bits');
    return x & y;
  },
  async (x, y) => {
    let proof = await Bitwise.and(x, y);
    return proof.publicOutput;
  }
);

await equivalentAsync({ from: [field], to: field }, { runs: 3 })(
  (x) => {
    if (x >= 2n ** 64n) throw Error('Does not fit into 64 bits');
    return Fp.rot(x, 12, 'left');
  },
  async (x) => {
    let proof = await Bitwise.rot(x);
    return proof.publicOutput;
  }
);

function testRot(
  field: Field,
  bits: number,
  mode: 'left' | 'right',
  result: Field
) {
  Provable.runAndCheck(() => {
    let output = Gadgets.rotate(field, bits, mode);
    output.assertEquals(result, `rot(${field}, ${bits}, ${mode})`);
  });
}

testRot(Field(0), 0, 'left', Field(0));
testRot(Field(0), 32, 'right', Field(0));
testRot(Field(1), 1, 'left', Field(2));
testRot(Field(1), 63, 'left', Field(9223372036854775808n));
testRot(Field(256), 4, 'right', Field(16));
testRot(Field(1234567890), 32, 'right', Field(5302428712241725440));
testRot(Field(2651214356120862720), 32, 'right', Field(617283945));
testRot(Field(1153202983878524928), 32, 'right', Field(268500993));
testRot(Field(6510615555426900570n), 4, 'right', Field(11936128518282651045n));
testRot(Field(6510615555426900570n), 4, 'right', Field(11936128518282651045n));
