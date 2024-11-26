import { Field } from '../../lib/provable/wrapped.js';
import { ZkProgram } from '../../lib/proof-system/zkprogram.js';
import Client from '../mina-signer.js';
import { PrivateKey, Signature } from '../../lib/provable/crypto/signature.js';
import { expect } from 'expect';
import { Provable } from '../../lib/provable/provable.js';

let fields = [10n, 20n, 30n, 340817401n, 2091283n, 1n, 0n];
let privateKey = 'EKENaWFuAiqktsnWmxq8zaoR8bSgVdscsghJE5tV6hPoNm8qBKWM';

// sign with mina-signer
let client = new Client({ network: 'mainnet' });
let signed = client.signFields(fields, privateKey);

// verify with mina-signer
let ok = client.verifyFields(signed);
expect(ok).toEqual(true);

// sign with o1js and check that we get the same signature
let fieldsSnarky = fields.map(Field);
let privateKeySnarky = PrivateKey.fromBase58(privateKey);
let signatureSnarky = Signature.create(privateKeySnarky, fieldsSnarky);
expect(signatureSnarky.toBase58()).toEqual(signed.signature);

// verify out-of-snark with o1js
let publicKey = privateKeySnarky.toPublicKey();
let signature = Signature.fromBase58(signed.signature);
Provable.assertEqual(Signature, signature, signatureSnarky);
signature.verify(publicKey, fieldsSnarky).assertTrue();

// verify in-snark with o1js
const Message = Provable.Array(Field, fields.length);

const MyProgram = ZkProgram({
  name: 'verify-signature',
  methods: {
    verifySignature: {
      privateInputs: [Signature, Message],
      async method(signature: Signature, message: Field[]) {
        signature.verify(publicKey, message).assertTrue();
      },
    },
  },
});

await MyProgram.compile();
let { proof } = await MyProgram.verifySignature(signature, fieldsSnarky);
ok = await MyProgram.verify(proof);
expect(ok).toEqual(true);

// negative test - sign with the wrong private key

let { privateKey: wrongKey } = client.genKeys();
let invalidSigned = client.signFields(fields, wrongKey);
let invalidSignature = Signature.fromBase58(invalidSigned.signature);

// can't verify out of snark
invalidSignature.verify(publicKey, fieldsSnarky).assertFalse();

// can't verify in snark
await expect(() =>
  MyProgram.verifySignature(invalidSignature, fieldsSnarky)
).rejects.toThrow('Constraint unsatisfied');

// negative test - try to verify a different message

let wrongFields = [...fieldsSnarky];
wrongFields[0] = wrongFields[0].add(1);

// can't verify out of snark
signature.verify(publicKey, wrongFields).assertFalse();

// can't verify in snark
await expect(() =>
  MyProgram.verifySignature(signature, wrongFields)
).rejects.toThrow('Constraint unsatisfied');
