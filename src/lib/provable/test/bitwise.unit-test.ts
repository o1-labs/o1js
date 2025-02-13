import { ZkProgram } from '../../proof-system/zkprogram.js';
import {
  equivalentProvable as equivalent,
  equivalentAsync,
  field,
  fieldWithRng,
} from '../../testing/equivalent.js';
import { Fp, mod } from '../../../bindings/crypto/finite-field.js';
import { Field } from '../wrapped.js';
import { Gadgets } from '../gadgets/gadgets.js';
import { Random } from '../../testing/property.js';
import {
  constraintSystem,
  contains,
  equals,
  ifNotAllConstant,
  repeat,
  and,
  withoutGenerics,
} from '../../testing/constraint-system.js';
import { GateType } from '../../../snarky.js';

const maybeField = {
  ...field,
  rng: Random.map(Random.oneOf(Random.field, Random.field.invalid), (x) =>
    mod(x, Field.ORDER)
  ),
};

let uint = (length: number) => fieldWithRng(Random.biguint(length));

let Bitwise = ZkProgram({
  name: 'bitwise',
  publicOutput: Field,
  methods: {
    xor: {
      privateInputs: [Field, Field],
      async method(a: Field, b: Field) {
        return { publicOutput: Gadgets.xor(a, b, 240) };
      },
    },
    notUnchecked: {
      privateInputs: [Field],
      async method(a: Field) {
        return { publicOutput: Gadgets.not(a, 240, false) };
      },
    },
    notChecked: {
      privateInputs: [Field],
      async method(a: Field) {
        return { publicOutput: Gadgets.not(a, 240, true) };
      },
    },
    and: {
      privateInputs: [Field, Field],
      async method(a: Field, b: Field) {
        return { publicOutput: Gadgets.and(a, b, 64) };
      },
    },
    or: {
      privateInputs: [Field, Field],
      async method(a: Field, b: Field) {
        return { publicOutput: Gadgets.or(a, b, 64) };
      },
    },
    rot32: {
      privateInputs: [Field],
      async method(a: Field) {
        return { publicOutput: Gadgets.rotate32(a, 12, 'left') };
      },
    },
    rot64: {
      privateInputs: [Field],
      async method(a: Field) {
        return { publicOutput: Gadgets.rotate64(a, 12, 'left') };
      },
    },
    leftShift64: {
      privateInputs: [Field],
      async method(a: Field) {
        return { publicOutput: Gadgets.leftShift64(a, 12) };
      },
    },
    leftShift32: {
      privateInputs: [Field],
      async method(a: Field) {
        Gadgets.rangeCheck32(a);
        return { publicOutput: Gadgets.leftShift32(a, 12) };
      },
    },
    rightShift64: {
      privateInputs: [Field],
      async method(a: Field) {
        return { publicOutput: Gadgets.rightShift64(a, 12) };
      },
    },
  },
});
await Bitwise.compile();

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
    (x, y) => x | y,
    (x, y) => Gadgets.or(x, y, length)
  );
  // NOT unchecked
  equivalent({ from: [uint(length)], to: field })(
    (x) => Fp.not(x, length),
    (x) => Gadgets.not(x, length, false)
  );
  // NOT checked
  equivalent({ from: [uint(length)], to: field })(
    (x) => Fp.not(x, length),
    (x) => Gadgets.not(x, length, true)
  );
});

[2, 4, 8, 16, 32, 64].forEach((length) => {
  equivalent({ from: [uint(length)], to: field })(
    (x) => Fp.rot(x, 12n, 'left'),
    (x) => Gadgets.rotate64(x, 12, 'left')
  );
  equivalent({ from: [uint(length)], to: field })(
    (x) => Fp.leftShift(x, 12),
    (x) => Gadgets.leftShift64(x, 12)
  );
  equivalent({ from: [uint(length)], to: field })(
    (x) => Fp.rightShift(x, 12),
    (x) => Gadgets.rightShift64(x, 12)
  );
});

[2, 4, 8, 16, 32].forEach((length) => {
  equivalent({ from: [uint(length)], to: field })(
    (x) => Fp.rot(x, 12n, 'left', 32n),
    (x) => Gadgets.rotate32(x, 12, 'left')
  );
  equivalent({ from: [uint(length)], to: field })(
    (x) => Fp.leftShift(x, 12, 32),
    (x) => Gadgets.leftShift32(x, 12)
  );
});

const runs = 2;

await equivalentAsync({ from: [uint(64), uint(64)], to: field }, { runs })(
  (x, y) => {
    return x ^ y;
  },
  async (x, y) => {
    let { proof } = await Bitwise.xor(x, y);
    return proof.publicOutput;
  }
);

await equivalentAsync({ from: [maybeField], to: field }, { runs })(
  (x) => {
    return Fp.not(x, 240);
  },
  async (x) => {
    let { proof } = await Bitwise.notUnchecked(x);
    return proof.publicOutput;
  }
);

// check that gate chains stay intact

function xorChain(bits: number) {
  return repeat(Math.ceil(bits / 16), 'Xor16').concat('Zero');
}

constraintSystem.fromZkProgram(
  Bitwise,
  'xor',
  ifNotAllConstant(contains(xorChain(240)))
);

constraintSystem.fromZkProgram(
  Bitwise,
  'notChecked',
  ifNotAllConstant(contains(xorChain(240)))
);

constraintSystem.fromZkProgram(
  Bitwise,
  'notUnchecked',
  ifNotAllConstant(contains('Generic'))
);

constraintSystem.fromZkProgram(
  Bitwise,
  'and',
  ifNotAllConstant(contains(xorChain(64)))
);

constraintSystem.fromZkProgram(
  Bitwise,
  'or',
  ifNotAllConstant(contains(xorChain(64)))
);

let rotChain: GateType[] = ['Rot64', 'RangeCheck0'];
let isJustRotate = ifNotAllConstant(
  and(contains(rotChain), withoutGenerics(equals(rotChain)))
);

constraintSystem.fromZkProgram(Bitwise, 'rot64', isJustRotate);
constraintSystem.fromZkProgram(Bitwise, 'leftShift64', isJustRotate);
constraintSystem.fromZkProgram(Bitwise, 'rightShift64', isJustRotate);
