import { createNullifier } from '../../../mina-signer/src/nullifier.js';
import { Field } from '../wrapped.js';
import { Nullifier } from '../crypto/nullifier.js';
import { PrivateKey } from '../crypto/signature.js';

let priv = PrivateKey.random();

let sk = BigInt(priv.s.toJSON());

let message = Array<Field>(5).fill(Field.random());

let jsonNullifier1 = createNullifier(
  message.map((f) => f.toBigInt()),
  sk
);

let nullifier1 = Nullifier.fromJSON(jsonNullifier1);
nullifier1.verify(message);

console.log('nullifier correctly deserializes, serializes and verifies');

// random sk that does not belong to a pk
let sk_faulty = BigInt(PrivateKey.random().s.toJSON());

let jsonNullifier2 = createNullifier(
  message.map((f) => f.toBigInt()),
  sk_faulty
);

// trying to manipulate the nullifier to take a real pk that it doesnt know the sk to
let pk = priv.toPublicKey().toGroup();
jsonNullifier2.publicKey = {
  x: pk.x.toBigInt(),
  y: pk.y.toBigInt(),
};

let nullifier2 = Nullifier.fromJSON(jsonNullifier2);
try {
  nullifier2.verify(message);
  console.log('incorrect nullifier was verified');
  console.log(JSON.stringify(nullifier2));
  process.exit(1);
} catch {
  console.log('invalid nullifier correctly throws an error (sk not known)');
}

let jsonNullifier3 = createNullifier(
  message.map((f) => f.toBigInt()),
  sk
);

// trying to manipulate the nullifier to take a different message
let nullifier3 = Nullifier.fromJSON(jsonNullifier3);
try {
  nullifier3.verify(Array<Field>(5).fill(Field.random()));
  console.log('incorrect nullifier was verified');
  console.log(JSON.stringify(nullifier3));
  process.exit(1);
} catch {
  console.log('invalid nullifier correctly throws an error (manipulated message)');
}
