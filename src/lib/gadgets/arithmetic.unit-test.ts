import { ZkProgram } from '../proof_system.js';
import {
  array,
  equivalentProvable as equivalent,
  equivalentAsync,
  field,
} from '../testing/equivalent.js';
import { mod } from '../../bindings/crypto/finite_field.js';
import { Field } from '../core.js';
import { Gadgets } from './gadgets.js';
import { Random } from '../testing/property.js';
import { provable } from '../circuit_value.js';
import { assert } from './common.js';

const maybeField = {
  ...field,
  rng: Random.map(Random.oneOf(Random.field, Random.field.invalid), (x) =>
    mod(x, Field.ORDER)
  ),
};

let Arithmetic = ZkProgram({
  name: 'arithmetic',
  publicOutput: provable({
    remainder: Field,
    quotient: Field,
  }),
  methods: {
    divMod32: {
      privateInputs: [Field],
      method(a: Field) {
        return Gadgets.divMod32(a);
      },
    },
  },
});

await Arithmetic.compile();

const divMod32Helper = (x: bigint) => {
  let q = x / (1n << 32n);
  let r = x - q * (1n << 32n);
  return [r, q];
};

equivalent({ from: [maybeField], to: array(field, 2) })(
  (x) => {
    assert(x < 1n << 64n, `x needs to fit in 64bit, but got ${x}`);
    return divMod32Helper(x);
  },
  (x) => {
    let { remainder, quotient } = Gadgets.divMod32(x);
    return [remainder, quotient];
  }
);

await equivalentAsync({ from: [maybeField], to: array(field, 2) }, { runs: 3 })(
  (x) => {
    assert(x < 1n << 64n, `x needs to fit in 64bit, but got ${x}`);
    return divMod32Helper(x);
  },
  async (x) => {
    let {
      publicOutput: { quotient, remainder },
    } = await Arithmetic.divMod32(x);
    return [remainder, quotient];
  }
);
