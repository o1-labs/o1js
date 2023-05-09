import { createNullifier } from '../mina-signer/src/nullifier.js';
import { Field } from './core.js';
import { Nullifier } from './nullifier.js';
import { PrivateKey } from './signature.js';

let priv = PrivateKey.random();

let sk = BigInt(priv.s.toJSON());

let message = [5000n, 9372n, 31784n];

let jsonNullifier1 = createNullifier(message, sk);

let nullifier1 = Nullifier.fromJSON(jsonNullifier1);
nullifier1.verify(message.map(Field));

console.log('nullifier correctly deserializes, serializes and verifies');

// random sk that does not belong to a pk
let sk_faulty = BigInt(PrivateKey.random().s.toJSON());

let jsonNullifier2 = createNullifier(message, sk_faulty);

// trying to manipulate the nullifier to take a real pk that it doesnt know the sk to
jsonNullifier2.publicKey = priv.toPublicKey().toBase58();

let nullifier2 = Nullifier.fromJSON(jsonNullifier2);
try {
  nullifier2.verify(message.map(Field));
  console.log('incorrect nullifier was verified');
  console.log(JSON.stringify(nullifier2));
  process.exit(1);
} catch {
  console.log('invalid nullifier correctly throws an error (sk not known)');
}

let jsonNullifier3 = createNullifier(message, sk);

// trying to manipulate the nullifier to take a different message
let nullifier3 = Nullifier.fromJSON(jsonNullifier3);
try {
  nullifier3.verify([Field.random(), Field.random(), Field.random()]);
  console.log('incorrect nullifier was verified');
  console.log(JSON.stringify(nullifier3));
  process.exit(1);
} catch {
  console.log(
    'invalid nullifier correctly throws an error (manipulated message)'
  );
}
