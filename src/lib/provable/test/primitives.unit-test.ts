import { ZkFunction } from '../../proof-system/zkfunction.js';
import { UInt64, UInt32 } from '../int.js';
import { expect } from 'expect';
import { Provable } from '../provable.js';
import { Undefined } from '../../proof-system/zkprogram.js';

const primitives = ZkFunction({
  name: 'Primitives',
  publicInputType: Undefined,
  privateInputTypes: [],
  main: () => {
    // division
    let x64 = Provable.witness(UInt64, () => 10n);
    x64.div(2).assertEquals(UInt64.from(5));
    let x32 = Provable.witness(UInt32, () => 15n);
    x32.div(4).assertEquals(UInt32.from(3));
  },
});

await primitives.compile();
let proof = await primitives.prove(Undefined.empty());
let ok = await primitives.verify(Undefined.empty(), proof);

expect(ok).toEqual(true);

console.log('primitive operations in the circuit are working! 🎉');
