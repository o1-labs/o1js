import { mod } from '../../../bindings/crypto/finite-field.js';
import { Field } from '../field.js';
import { ZkProgram } from '../../proof-system/zkprogram.js';
import {
  Spec,
  boolean,
  equivalentAsync,
  fieldWithRng,
} from '../../testing/equivalent.js';
import { Random } from '../../testing/property.js';
import { assert } from '../gadgets/common.js';
import { Gadgets } from '../gadgets/gadgets.js';
import { Gates } from '../gates.js';
import { constraintSystem, contains } from '../../testing/constraint-system.js';
import { FeatureFlags } from 'o1js';

let uint = (n: number | bigint): Spec<bigint, Field> => {
  return fieldWithRng(Random.bignat((1n << BigInt(n)) - 1n));
};

let maybeUint = (n: number | bigint): Spec<bigint, Field> => {
  let uint = Random.bignat((1n << BigInt(n)) - 1n);
  return fieldWithRng(
    Random.map(Random.oneOf(uint, uint.invalid), (x) => mod(x, Field.ORDER))
  );
};

/*
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

  constraintSystem.fromZkProgram(
    RangeCheck,
    'three12Bit',
    contains(['Lookup'])
  );

  await RangeCheck.compile();

  await equivalentAsync(
    { from: [uint(12), uint(12), maybeUint(12)], to: boolean },
    { runs: 3 }
  )(
    (x, y, z) => {
      assert(x < 1n << 12n);
      assert(y < 1n << 12n);
      assert(z < 1n << 12n);
      return true;
    },
    async (x, y, z) => {
      let proof = await RangeCheck.three12Bit(x, y, z);
      return await RangeCheck.verify(proof);
    }
  );
}
  */

// Runtime table tests
{
  let RuntimeTable = ZkProgram({
    name: 'runtime-table',
    methods: {
      runtimeTable: {
        privateInputs: [Field, Field, Field],
        async method(v0: Field, v1: Field, v2: Field) {
          let tableId = 2;
          let indices = [0n, 1n, 2n, 3n, 4n, 5n, 6n, 7n, 8n, 9n];
          Gates.addRuntimeTableConfig(tableId, indices);
          Gadgets.inTable(tableId, [5n, v0], [6n, v1], [7n, v2]);
          Gadgets.inTable(tableId, [6n, v1]);
        },
      },
    },
  });

  // constraint system sanity check

  constraintSystem.fromZkProgram(
    RuntimeTable,
    'runtimeTable',
    contains(['Lookup'])
  );

  // check feature flags are set up correctly
  const featureFlags = await FeatureFlags.fromZkProgram(RuntimeTable);
  assert(featureFlags.lookup === true);
  //assert(featureFlags.runtimeTables === true);

  await RuntimeTable.compile();

  await equivalentAsync(
    { from: [uint(12), uint(12), uint(12)], to: boolean },
    { runs: 1 }
  )(
    (x, y, z) => {
      assert(x < 1n << 12n);
      assert(y < 1n << 12n);
      assert(z < 1n << 12n);
      return true;
    },
    async (x, y, z) => {
      let proof = await RuntimeTable.runtimeTable(x, y, z);
      return await RuntimeTable.verify(proof);
    }
  );
}
