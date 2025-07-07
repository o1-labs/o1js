import { ZkFunction } from '../../proof-system/zkfunction.js';
import { UInt64, UInt32 } from '../int.js';
import { expect } from 'expect';
import { Provable } from '../provable.js';

const primitives = ZkFunction({
  name: 'Primitives',
  privateInputTypes: [],
  main: () => {
    // division
    let x64 = Provable.witness(UInt64, () => 10n);
    x64.div(2).assertEquals(UInt64.from(5));
  },
});

const { verificationKey } = await primitives.compile();
let proof = await primitives.prove();
let ok = await primitives.verify(proof, verificationKey);

expect(ok).toEqual(true);

console.log('primitive operations in the circuit are working! 🎉');
