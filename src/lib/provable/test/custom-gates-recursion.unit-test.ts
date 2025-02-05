/**
 * This tests that we can use optional custom gates plus recursion in the same zkprogram proof.
 */
import { Bool } from '../wrapped.js';
import { ZkProgram } from '../../proof-system/zkprogram.js';
import { Provable } from '../provable.js';
import { assert } from '../gadgets/common.js';
import { Ecdsa, Point } from '../gadgets/elliptic-curve.js';
import { Field3 } from '../gadgets/foreign-field.js';
import { Crypto } from '../crypto/crypto.js';

const Secp256k1 = Crypto.createCurve(Crypto.CurveParams.Secp256k1);

let publicKey = Point.from({
  x: 49781623198970027997721070672560275063607048368575198229673025608762959476014n,
  y: 44999051047832679156664607491606359183507784636787036192076848057884504239143n,
});

let signature = Ecdsa.Signature.fromHex(
  '0x82de9950cc5aac0dca7210cb4b77320ac9e844717d39b1781e9d941d920a12061da497b3c134f50b2fce514d66e20c5e43f9615f097395a5527041d14860a52f1b'
);

let msgHash =
  Field3.from(
    0x3e91cd8bd233b3df4e4762b329e2922381da770df1b31276ec77d0557be7fcefn
  );

let emptyProgram = ZkProgram({
  name: 'empty',
  methods: { run: { privateInputs: [], async method() {} } },
});
class EmptyProof extends emptyProgram.Proof {}

let program = ZkProgram({
  name: 'ecdsa',
  publicOutput: Bool,
  methods: {
    ecdsa: {
      privateInputs: [EmptyProof],
      async method(proof: EmptyProof) {
        proof.verify();
        let signature_ = Provable.witness(Ecdsa.Signature, () => signature);
        let msgHash_ = Provable.witness(Field3, () => msgHash);
        let publicKey_ = Provable.witness(Point, () => publicKey);

        return {
          publicOutput: Ecdsa.verify(
            Secp256k1,
            signature_,
            msgHash_,
            publicKey_
          ),
        };
      },
    },
  },
});

console.time('ecdsa verify (compile)');
await emptyProgram.compile();
await program.compile();
console.timeEnd('ecdsa verify (compile)');

console.time('ecdsa verify (prove)');
let { proof: emptyProof } = await emptyProgram.run();
let { proof } = await program.ecdsa(emptyProof);
console.timeEnd('ecdsa verify (prove)');

assert(await program.verify(proof), 'proof verifies');
proof.publicOutput.assertTrue('signature verifies');
