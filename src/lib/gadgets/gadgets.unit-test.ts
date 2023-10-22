import { mod } from '../../bindings/crypto/finite_field.js';
import { Field } from '../../lib/core.js';
import { ZkProgram } from '../proof_system.js';
import {
  Spec,
  boolean,
  equivalentAsync,
  field,
} from '../testing/equivalent.js';
import { Random } from '../testing/random.js';
import { Gadgets } from './gadgets.js';
import { Provable } from '../provable.js';

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
  word: Field,
  bits: number,
  mode: 'left' | 'right',
  result: Field
) {
  Provable.runAndCheck(() => {
    let w = Provable.witness(Field, () => word);
    let r = Provable.witness(Field, () => result);
    let output = Gadgets.rot(w, bits, mode);
    output.assertEquals(r, `rot(${word}, ${bits}, ${mode})`);
  });
}

testRot(Field('0'), 0, 'left', Field('0'));
testRot(Field('0'), 32, 'right', Field('0'));
testRot(Field('1'), 1, 'left', Field('2'));
testRot(Field('1'), 63, 'left', Field('9223372036854775808'));
testRot(Field('256'), 4, 'right', Field('16'));
testRot(Field('1234567890'), 32, 'right', Field('5302428712241725440'));
testRot(Field('2651214356120862720'), 32, 'right', Field('617283945'));
testRot(Field('1153202983878524928'), 32, 'right', Field('268500993'));
testRot(
  Field('6510615555426900570'),
  4,
  'right',
  Field('11936128518282651045')
);
testRot(
  Field('6510615555426900570'),
  4,
  'right',
  Field('11936128518282651045')
);
