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
    // divide 10 by 2: expect quotient 5 and remainder 0
    x64.div(2).assertEquals(UInt64.from(5));
    let x32 = Provable.witness(UInt32, () => 15n);
    // divide 15 by 4: expect quotient 3 and remainder 3
    x32.div(4).assertEquals(UInt32.from(3));
  },
});

const { verificationKey } = await primitives.compile();
let proof = await primitives.prove();
let ok = await primitives.verify(proof, verificationKey);

expect(ok).toEqual(true);

console.log('primitive operations in the circuit are working! 🎉');
