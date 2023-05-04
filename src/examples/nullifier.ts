import { PrivateKey, Nullifier } from 'snarkyjs';

import { createNullifier } from '../mina-signer/src/nullifier.js';

let sk = PrivateKey.random();

let jsonNullifier = createNullifier(5n, BigInt(sk.s.toJSON()));
let nullifier = Nullifier.fromJSON(jsonNullifier);

nullifier.verify();
