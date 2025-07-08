import { ZkFunction } from '../../proof-system/zkfunction.js';
import { UInt64, UInt32 } from '../int.js';
import { expect } from 'expect';
import { Field } from '../field.js';
import { Provable } from '../provable.js';

const primitives = ZkFunction({
  name: 'Primitives',
  privateInputTypes: [],
  main: () => {
    // division
    let x64 = Provable.witness(Field, () => 10n);
    x64.div(2).assertEquals(Field.from(5));
    /*let x32 = Provable.witness(Field, () => 12n);
    x32.div(4).assertEquals(Field.from(3));
    let x16 = Provable.witness(Field, () => 14n);
    x16.div(2).assertEquals(Field.from(7));*/
  },
});

const { verificationKey } = await primitives.compile();
let analysis = await primitives.constraintSystem();
console.log(analysis);
let proof = await primitives.prove();
let ok = await primitives.verify(proof, verificationKey);

expect(ok).toEqual(true);

console.log('primitive operations in the circuit are working! 🎉');
