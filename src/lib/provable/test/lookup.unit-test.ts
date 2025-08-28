import { Field } from '../field.js';
import { ZkProgram } from '../../proof-system/zkprogram.js';
import { Spec, boolean, equivalentAsync, fieldWithRng } from '../../testing/equivalent.js';
import { Random } from '../../testing/property.js';
import { assert } from '../gadgets/common.js';
import { Gadgets } from '../gadgets/gadgets.js';
import { constraintSystem, contains } from '../../testing/constraint-system.js';

let uint = (n: number | bigint): Spec<bigint, Field> => {
  return fieldWithRng(Random.bignat((1n << BigInt(n)) - 1n));
};

// Range-check tests
{
  let RangeCheck = ZkProgram({
    name: 'range-check',
    methods: {
      three12Bit: {
        privateInputs: [Field, Field, Field],
        async method(v0: Field, v1: Field, v2: Field) {
          // Dummy range check to make sure the lookup table is initialized
          // It should never fail because 64 > 12
          Gadgets.rangeCheck64(v0);
          Gadgets.rangeCheck3x12(v0, v1, v2);
        },
      },
    },
  });

  // constraint system sanity check
  constraintSystem.fromZkProgram(RangeCheck, 'three12Bit', contains(['Lookup']));

  await RangeCheck.compile();

  await equivalentAsync({ from: [uint(12), uint(12), uint(12)], to: boolean }, { runs: 3 })(
    (x, y, z) => {
      assert(x < 1n << 12n);
      assert(y < 1n << 12n);
      assert(z < 1n << 12n);
      return true;
    },
    async (x, y, z) => {
      let { proof } = await RangeCheck.three12Bit(x, y, z);
      return await RangeCheck.verify(proof);
    }
  );
}
