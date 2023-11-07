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
import { Random } from '../testing/property.js';

let maybeUint64: Spec<bigint, Field> = {
  ...field,
  rng: Random.map(Random.oneOf(Random.uint64, Random.uint64.invalid), (x) =>
    mod(x, Field.ORDER)
  ),
};

let uint = (length: number) => fieldWithRng(Random.biguint(length));

let notTestInput: Spec<bigint, Field> = {
  ...field,
  rng: Random.map(Random.oneOf(Random.uint64, Random.uint64.invalid), (x) => {
    if (mod(x, Field.ORDER).toString() > '254') {
      return mod(randomBigInt(254), Field.ORDER);
    }
    return mod(x, Field.ORDER);
  }),
};

let Bitwise = ZkProgram({
  name: 'bitwise',
  publicOutput: Field,
  methods: {
    xor: {
      privateInputs: [Field, Field],
      method(a: Field, b: Field) {
        return Gadgets.xor(a, b, 254);
      },
    },
    notUnchecked: {
      privateInputs: [Field],
      method(a: Field) {
        return Gadgets.not(a, 254, false);
      },
    },
    notChecked: {
      privateInputs: [Field],
      method(a: Field) {
        return Gadgets.not(a, 254, true);
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

[2, 4, 8, 16, 32, 64, 128].forEach((length) => {
  equivalent({ from: [uint(length), uint(length)], to: field })(
    (x, y) => x ^ y,
    (x, y) => Gadgets.xor(x, y, length)
  );
  equivalent({ from: [uint(length), uint(length)], to: field })(
    (x, y) => x & y,
    (x, y) => Gadgets.and(x, y, length)
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
    (x) => Fp.rot(x, 12, 'left'),
    (x) => Gadgets.rotate(x, 12, 'left')
  );
  equivalent({ from: [uint(length)], to: field })(
    (x) => Fp.leftShift(x, 12),
    (x) => Gadgets.leftShift(x, 12)
  );
  equivalent({ from: [uint(length)], to: field })(
    (x) => Fp.rightShift(x, 12),
    (x) => Gadgets.rightShift(x, 12)
  );
});

await equivalentAsync(
  { from: [maybeUint64, maybeUint64], to: field },
  { runs: 3 }
)(
  (x, y) => {
    if (x >= Fp.modulus || y >= Fp.modulus) {
      throw Error(`Does not fit into ${Fp.modulus}`);
    }
    return x ^ y;
  },
  async (x, y) => {
    let proof = await Bitwise.xor(x, y);
    return proof.publicOutput;
  }
);

await equivalentAsync({ from: [notTestInput], to: field }, { runs: 3 })(
  (x) => {
    if (x > Fp.modulus) throw Error(`Does not fit into 254`);
    return Fp.not(x, 254);
  },
  async (x) => {
    console.log('x notUnChecked async', x);
    let proof = await Bitwise.notUnchecked(x);
    return proof.publicOutput;
  }
);
await equivalentAsync({ from: [notTestInput], to: field }, { runs: 3 })(
  (x) => {
    console.log('x notChecked bigint');
    if (x > Fp.modulus) throw Error(`Does not fit into 254`);
    return Fp.not(x, 254);
  },
  async (x) => {
    let proof = await Bitwise.notChecked(x);
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

function randomBigInt(bits: number) {
  let randomString = '1';
  for (let i = 1; i < bits; i++) {
    randomString += Math.floor(Math.random() * 2).toString();
  }
  return BigInt('0b' + randomString);
}
