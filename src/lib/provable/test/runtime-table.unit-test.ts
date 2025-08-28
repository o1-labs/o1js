import { Field } from '../field.js';
import { ZkProgram } from '../../proof-system/zkprogram.js';
import { Spec, boolean, equivalentAsync, fieldWithRng } from '../../testing/equivalent.js';
import { Random } from '../../testing/property.js';
import { assert } from '../gadgets/common.js';
import { RuntimeTable } from '../gadgets/runtime-table.js';
import { constraintSystem, contains } from '../../testing/constraint-system.js';
import { FeatureFlags, Cache } from 'o1js';

let uint = (n: number | bigint): Spec<bigint, Field> => {
  return fieldWithRng(Random.bignat((1n << BigInt(n)) - 1n));
};

// Runtime table tests
{
  let RuntimeTableZkProgram = ZkProgram({
    name: 'runtime-table',
    methods: {
      runtimeTable: {
        privateInputs: [Field, Field, Field],
        async method(v0: Field, v1: Field, v2: Field) {
          let tableId = 2;
          let indices = [0n, 1n, 2n, 3n, 4n, 5n, 6n, 7n, 8n, 9n];

          let table = new RuntimeTable(tableId, indices);
          // values are inserted into the table in the given positions
          table.insert([[5n, v0], [6n, v1], [7n, v2]]);
          // a second time can be used to check more values in more positions
          table.insert([[2n, v0]]);
          table.lookup(2n, v0);
          // can ask for the same index asked previously
          table.lookup(6n, v1);
          // even multiple times
          table.lookup(6n, v1)
          // finalize any pending calls
          table.check();
        },
      },
    },
  });

  // constraint system sanity check

  constraintSystem.fromZkProgram(RuntimeTableZkProgram, 'runtimeTable', contains(['Lookup']));

  // check feature flags are set up correctly
  const featureFlags = await FeatureFlags.fromZkProgram(RuntimeTableZkProgram, true);
  assert(featureFlags.lookup === true);
  assert(featureFlags.runtimeTables === true);

  await RuntimeTableZkProgram.compile({
    cache: Cache.None,
    forceRecompile: true,
    withRuntimeTables: true,
  });

  await equivalentAsync({ from: [uint(12), uint(12), uint(12)], to: boolean }, { runs: 1 })(
    (x, y, z) => {
      assert(x < 1n << 12n);
      assert(y < 1n << 12n);
      assert(z < 1n << 12n);
      return true;
    },
    async (x, y, z) => {
      let { proof } = await RuntimeTableZkProgram.runtimeTable(x, y, z);
      return await RuntimeTableZkProgram.verify(proof);
    }
  );
}
