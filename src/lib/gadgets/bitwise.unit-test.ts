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

let maybeUint64: Spec<bigint, Field> = {
  ...field,
  rng: Random.map(Random.oneOf(Random.uint64, Random.uint64.invalid), (x) =>
    mod(x, Field.ORDER)
  ),
};

let uint = (length: number) => fieldWithRng(Random.biguint(length));

// --------------------------
// Bitwise Gates
// --------------------------

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
    rot: {
      privateInputs: [Field],
      method(a: Field) {
        return Gadgets.rotate(a, 12, 'left');
      },
    },
    leftShift: {
      privateInputs: [Field],
      method(a: Field) {
        return Gadgets.leftShift(a, 12);
      },
    },
    rightShift: {
      privateInputs: [Field],
      method(a: Field) {
        return Gadgets.rightShift(a, 12);
      },
    },
  },
});

await Bitwise.compile();
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

await equivalentAsync({ from: [field], to: field }, { runs: 3 })(
  (x) => {
    if (x >= 2n ** 64n) throw Error('Does not fit into 64 bits');
    return Fp.leftShift(x, 12);
  },
  async (x) => {
    let proof = await Bitwise.leftShift(x);
    return proof.publicOutput;
  }
);

await equivalentAsync({ from: [field], to: field }, { runs: 3 })(
  (x) => {
    if (x >= 2n ** 64n) throw Error('Does not fit into 64 bits');
    return Fp.rightShift(x, 12);
  },
  async (x) => {
    let proof = await Bitwise.rightShift(x);
    return proof.publicOutput;
  }
);

// --------------------------
// XOR
// --------------------------

[2, 4, 8, 16, 32, 64, 128].forEach((length) => {
  equivalent({ from: [uint(length), uint(length)], to: field })(
    Fp.xor,
    (x, y) => Gadgets.xor(x, y, length)
  );
});

// --------------------------
// ROT
// --------------------------

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

// --------------------------
// Shift
// --------------------------

function testShift(
  field: Field,
  bits: number,
  mode: 'left' | 'right',
  result: Field
) {
  Provable.runAndCheck(() => {
    let output =
      mode === 'left'
        ? Gadgets.leftShift(field, bits)
        : Gadgets.rightShift(field, bits);
    output.assertEquals(
      result,
      `${mode === 'left' ? 'ls' : 'rs'}(${field}, ${bits})`
    );
  });
}

testShift(Field(0), 1, 'left', Field(0));
testShift(Field(0), 1, 'right', Field(0));
testShift(Field(1), 1, 'left', Field(2));
testShift(Field(1), 1, 'right', Field(0));
testShift(Field(256), 4, 'right', Field(16));
testShift(Field(256), 20, 'right', Field(0));
testShift(Field(6510615555426900570n), 16, 'right', Field(99344109427290n));
testShift(
  Field(18446744073709551615n),
  15,
  'left',
  Field(18446744073709518848n)
);
testShift(Field(12523523412423524646n), 32, 'right', Field(2915860016));
testShift(
  Field(12523523412423524646n),
  32,
  'left',
  Field(17134720101237391360n)
);

test(Random.uint64, Random.nat(64), (x, n, assert) => {
  let z = Field(x);
  let r = Fp.leftShift(x, n);
  Provable.runAndCheck(() => {
    let f = Provable.witness(Field, () => z);
    let o = Gadgets.leftShift(f, n);
    Provable.asProver(() => assert(r === o.toBigInt()));
  });
});

test(Random.uint64, Random.nat(64), (x, n, assert) => {
  let z = Field(x);
  let r = Fp.rightShift(x, n);
  Provable.runAndCheck(() => {
    let f = Provable.witness(Field, () => z);
    let o = Gadgets.rightShift(f, n);
    Provable.asProver(() => assert(r === o.toBigInt()));
  });
});
