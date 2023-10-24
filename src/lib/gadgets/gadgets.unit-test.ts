import { mod } from '../../bindings/crypto/finite_field.js';
import { Field } from '../../lib/core.js';
import { ZkProgram } from '../proof_system.js';
import {
  Spec,
  boolean,
  equivalentAsync,
  field,
} from '../testing/equivalent.js';
import { test, Random } from '../testing/property.js';
import { Field as Fp } from '../../provable/field-bigint.js';
import { Gadgets } from './gadgets.js';
import { Provable } from '../provable.js';
import { Bool } from '../core.js';

let maybeUint64: Spec<bigint, Field> = {
  ...field,
  rng: Random.map(Random.oneOf(Random.uint64, Random.uint64.invalid), (x) =>
    mod(x, Field.ORDER)
  ),
};

// TODO: make a ZkFunction or something that doesn't go through Pickles
// --------------------------
// RangeCheck64 Gate
// --------------------------

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

await RangeCheck64.compile();

// TODO: we use this as a test because there's no way to check custom gates quickly :(
await equivalentAsync({ from: [maybeUint64], to: boolean }, { runs: 3 })(
  (x) => {
    if (x >= 1n << 64n) throw Error('expected 64 bits');
    return true;
  },
  async (x) => {
    let proof = await RangeCheck64.run(x);
    return await RangeCheck64.verify(proof);
  }
);

// --------------------------
// ROT Gate
// --------------------------
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

await ROT.compile();
await equivalentAsync({ from: [maybeUint64], to: boolean }, { runs: 3 })(
  (x) => {
    if (x >= 1n << 64n) throw Error('expected 64 bits');
    return true;
  },
  async (x) => {
    let proof = await ROT.run(x);
    return await ROT.verify(proof);
  }
);

function testRot(
  field: Field,
  bits: number,
  mode: 'left' | 'right',
  result: Field
) {
  Provable.runAndCheck(() => {
    let w = Provable.witness(Field, () => field);
    let r = Provable.witness(Field, () => result);
    let output = Gadgets.rot(w, bits, mode);
    output.assertEquals(r, `rot(${field}, ${bits}, ${mode})`);
  });
}

testRot(Field(0), 0, 'left', Field(0));
testRot(Field(0), 32, 'right', Field(0));
testRot(Field(1), 1, 'left', Field(2));
testRot(Field(1), 63, 'left', Field('9223372036854775808'));
testRot(Field(256), 4, 'right', Field(16));
testRot(Field(1234567890), 32, 'right', Field(5302428712241725440));
testRot(Field(2651214356120862720), 32, 'right', Field(617283945));
testRot(Field(1153202983878524928), 32, 'right', Field(268500993));
testRot(Field(6510615555426900570n), 4, 'right', Field(11936128518282651045n));
testRot(Field(6510615555426900570n), 4, 'right', Field(11936128518282651045n));

// rotation
test(
  Random.uint64,
  Random.nat(64),
  Random.boolean,
  (x, n, direction, assert) => {
    let z = Field(x);
    let r1 = Fp.rot(x, n, direction ? 'left' : 'right');
    Provable.runAndCheck(() => {
      let f = Provable.witness(Field, () => z);
      let r2 = Gadgets.rot(f, n, direction ? 'left' : 'right');
      Provable.asProver(() => assert(r1 === r2.toBigInt()));
    });
  }
);

// --------------------------
// Shift Gates
// --------------------------

function testShift(
  field: Field,
  bits: number,
  mode: 'left' | 'right',
  result: Field
) {
  Provable.runAndCheck(() => {
    let w = Provable.witness(Field, () => field);
    let r = Provable.witness(Field, () => result);
    let output = Provable.if(
      Bool(mode === 'left'),
      Gadgets.leftShift(w, bits),
      Gadgets.rightShift(w, bits)
    );
    output.assertEquals(
      r,
      `${mode === 'left' ? 'ls' : 'rs'}(${field}, ${bits})`
    );
  });
}

let LS = ZkProgram({
  methods: {
    run: {
      privateInputs: [Field],
      method(x) {
        Gadgets.leftShift(x, 2);
      },
    },
  },
});

await LS.compile();
await equivalentAsync({ from: [maybeUint64], to: boolean }, { runs: 3 })(
  (x) => {
    if (x >= 1n << 64n) throw Error('expected 64 bits');
    return true;
  },
  async (x) => {
    let proof = await LS.run(x);
    return await LS.verify(proof);
  }
);

let RS = ZkProgram({
  methods: {
    run: {
      privateInputs: [Field],
      method(x) {
        Gadgets.rightShift(x, 2);
      },
    },
  },
});

await RS.compile();
await equivalentAsync({ from: [maybeUint64], to: boolean }, { runs: 3 })(
  (x) => {
    if (x >= 1n << 64n) throw Error('expected 64 bits');
    return true;
  },
  async (x) => {
    let proof = await RS.run(x);
    return await RS.verify(proof);
  }
);

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
