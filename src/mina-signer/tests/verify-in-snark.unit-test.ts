import { Field, isReady, shutdown } from '../../snarky.js';
import { ZkProgram } from '../../lib/proof_system.js';
import Client from '../MinaSigner.js';
import { PrivateKey, Signature } from '../../lib/signature.js';
import { provablePure } from '../../lib/circuit_value.js';

await isReady;
let fields = [10n, 20n, 30n, 340817401n, 2091283n, 1n, 0n];
let privateKey = 'EKENaWFuAiqktsnWmxq8zaoR8bSgVdscsghJE5tV6hPoNm8qBKWM';

// sign with mina-signer
let client = new Client({ network: 'mainnet' });
let signed = client.signFields(fields, privateKey);

// verify out-of-snark with snarkyjs
let publicKey = PrivateKey.fromBase58(privateKey).toPublicKey();
let message = fields.map(Field);
let signature = Signature.fromBase58(signed.signature);
signature.verify(publicKey, message).assertTrue();

// verify in-snark with snarkyjs
const MyProgram = ZkProgram({
  publicInput: provablePure(null),
  methods: {
    verifySignature: {
      privateInputs: [Signature],
      method(_: null, signature: Signature) {
        signature.verify(publicKey, message).assertTrue();
      },
    },
  },
});
let proof = await MyProgram.verifySignature(null, signature);
await MyProgram.verify(proof);

shutdown();
