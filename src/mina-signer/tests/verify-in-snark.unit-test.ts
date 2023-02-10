import { Field, isReady, shutdown } from '../../snarky.js';
import { ZkProgram } from '../../lib/proof_system.js';
import Client from '../MinaSigner.js';
import { PrivateKey, Signature } from '../../lib/signature.js';
import { provablePure } from '../../lib/circuit_value.js';
import { expect } from 'expect';

let fields = [10n, 20n, 30n, 340817401n, 2091283n, 1n, 0n];
let privateKey = 'EKENaWFuAiqktsnWmxq8zaoR8bSgVdscsghJE5tV6hPoNm8qBKWM';

// sign with mina-signer
let client = new Client({ network: 'mainnet' });
let signed = client.signFields(fields, privateKey);

// verify with mina-signer
let ok = client.verifyFields(signed);
expect(ok).toEqual(true);

// sign with snarkyjs and check that we get the same signature
await isReady;
let fieldsSnarky = fields.map(Field);
let privateKeySnarky = PrivateKey.fromBase58(privateKey);
let signatureSnarky = Signature.create(privateKeySnarky, fieldsSnarky);
expect(signatureSnarky.toBase58()).toEqual(signed.signature);

// verify out-of-snark with snarkyjs
let publicKey = privateKeySnarky.toPublicKey();
let signature = Signature.fromBase58(signed.signature);
signature.verify(publicKey, fieldsSnarky).assertTrue();

// verify in-snark with snarkyjs
const MyProgram = ZkProgram({
  publicInput: provablePure(null),
  methods: {
    verifySignature: {
      privateInputs: [Signature],
      method(_: null, signature: Signature) {
        signature.verify(publicKey, fieldsSnarky).assertTrue();
      },
    },
  },
});

await MyProgram.compile();
let proof = await MyProgram.verifySignature(null, signature);
ok = await MyProgram.verify(proof);
expect(ok).toEqual(true);

shutdown();
