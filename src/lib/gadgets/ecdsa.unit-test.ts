import { createCurveAffine } from '../../bindings/crypto/elliptic_curve.js';
import {
  Ecdsa,
  EllipticCurve,
  Point,
  verifyEcdsaConstant,
} from './elliptic-curve.js';
import { Field3 } from './foreign-field.js';
import { CurveParams } from '../../bindings/crypto/elliptic-curve-examples.js';
import { Provable } from '../provable.js';
import { ZkProgram } from '../proof_system.js';
import { assert } from './common.js';
import { foreignField, throwError, uniformForeignField } from './test-utils.js';
import {
  Second,
  bool,
  equivalentProvable,
  map,
  oneOf,
  record,
} from '../testing/equivalent.js';
import { Bool } from '../bool.js';

// quick tests
const Secp256k1 = createCurveAffine(CurveParams.Secp256k1);
const Pallas = createCurveAffine(CurveParams.Pallas);
const Vesta = createCurveAffine(CurveParams.Vesta);
let curves = [Secp256k1, Pallas, Vesta];

for (let Curve of curves) {
  // prepare test inputs
  let field = foreignField(Curve.Field);
  let scalar = foreignField(Curve.Scalar);
  let privateKey = uniformForeignField(Curve.Scalar);

  // correct signature shape, but independently random components, which will never form a valid signature
  let badSignature = record({
    signature: record({ r: scalar, s: scalar }),
    msg: scalar,
    publicKey: record({ x: field, y: field }),
  });

  let signatureInputs = record({ privateKey, msg: scalar });

  let signature = map(
    { from: signatureInputs, to: badSignature },
    ({ privateKey, msg }) => {
      let publicKey = Curve.scale(Curve.one, privateKey);
      let signature = Ecdsa.sign(Curve, msg, privateKey);
      return { signature, msg, publicKey };
    }
  );

  // provable method we want to test
  const verify = (s: Second<typeof signature>) => {
    return Ecdsa.verify(Curve, s.signature, s.msg, s.publicKey);
  };

  // positive test
  equivalentProvable({ from: [signature], to: bool })(
    () => true,
    verify,
    'valid signature verifies'
  );

  // negative test
  equivalentProvable({ from: [badSignature], to: bool })(
    () => false,
    verify,
    'invalid signature fails'
  );

  // test against constant implementation, with both invalid and valid signatures
  equivalentProvable({ from: [oneOf(signature, badSignature)], to: bool })(
    ({ signature, publicKey, msg }) => {
      return verifyEcdsaConstant(Curve, signature, msg, publicKey);
    },
    verify,
    'verify'
  );
}

// full end-to-end test with proving

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

const ia = EllipticCurve.initialAggregator(Secp256k1);
const config = { G: { windowSize: 4 }, P: { windowSize: 3 }, ia };

let program = ZkProgram({
  name: 'ecdsa',
  publicOutput: Bool,
  methods: {
    ecdsa: {
      privateInputs: [],
      method() {
        let signature_ = Provable.witness(
          Ecdsa.Signature.provable,
          () => signature
        );
        let msgHash_ = Provable.witness(Field3.provable, () => msgHash);
        let publicKey_ = Provable.witness(Point.provable, () => publicKey);

        return Ecdsa.verify(
          Secp256k1,
          signature_,
          msgHash_,
          publicKey_,
          config
        );
      },
    },
  },
});

console.time('ecdsa verify (constant)');
program.rawMethods.ecdsa();
console.timeEnd('ecdsa verify (constant)');

console.time('ecdsa verify (witness gen / check)');
Provable.runAndCheck(program.rawMethods.ecdsa);
console.timeEnd('ecdsa verify (witness gen / check)');

console.time('ecdsa verify (build constraint system)');
let cs = program.analyzeMethods().ecdsa;
console.timeEnd('ecdsa verify (build constraint system)');

console.log(cs.summary());

console.time('ecdsa verify (compile)');
await program.compile();
console.timeEnd('ecdsa verify (compile)');

console.time('ecdsa verify (prove)');
let proof = await program.ecdsa();
console.timeEnd('ecdsa verify (prove)');

assert(await program.verify(proof), 'proof verifies');
proof.publicOutput.assertTrue('signature verifies');
