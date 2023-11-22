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
import { foreignField, throwError } from './test-utils.js';
import {
  equivalentProvable,
  map,
  oneOf,
  record,
  unit,
} from '../testing/equivalent.js';

// quick tests
const Secp256k1 = createCurveAffine(CurveParams.Secp256k1);
const Pallas = createCurveAffine(CurveParams.Pallas);
const Vesta = createCurveAffine(CurveParams.Vesta);
let curves = [Secp256k1, Pallas, Vesta];

for (let Curve of curves) {
  // prepare test inputs
  let field = foreignField(Curve.Field);
  let scalar = foreignField(Curve.Scalar);

  let pseudoPoint = record({ x: field, y: field });
  let point = map({ from: scalar, to: pseudoPoint }, (x) =>
    Curve.scale(Curve.one, x)
  );

  let pseudoSignature = record({
    signature: record({ r: scalar, s: scalar }),
    msg: scalar,
    publicKey: point,
  });
  let signatureInputs = record({ privateKey: scalar, msg: scalar });
  let signature = map(
    { from: signatureInputs, to: pseudoSignature },
    ({ privateKey, msg }) => {
      let signature = Ecdsa.sign(Curve, msg, privateKey);
      let publicKey = Curve.scale(Curve.one, privateKey);
      return { signature, msg, publicKey };
    }
  );

  // positive test
  equivalentProvable({ from: [signature], to: unit })(
    () => {},
    ({ signature, publicKey, msg }) => {
      Ecdsa.verify(Curve, signature, msg, publicKey);
    },
    'valid signature verifies'
  );

  // negative test
  equivalentProvable({ from: [pseudoSignature], to: unit })(
    () => throwError('invalid signature'),
    ({ signature, publicKey, msg }) => {
      Ecdsa.verify(Curve, signature, msg, publicKey);
    },
    'invalid signature fails'
  );

  // test against constant implementation, with both invalid and valid signatures
  equivalentProvable({ from: [oneOf(signature, pseudoSignature)], to: unit })(
    ({ signature, publicKey, msg }) => {
      assert(verifyEcdsaConstant(Curve, signature, msg, publicKey), 'verifies');
    },
    ({ signature, publicKey, msg }) => {
      Ecdsa.verify(Curve, signature, msg, publicKey);
    },
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
const config = { G: { windowSize: 4 }, P: { windowSize: 4 }, ia };

let program = ZkProgram({
  name: 'ecdsa',
  methods: {
    scale: {
      privateInputs: [],
      method() {
        let G = Point.from(Secp256k1.one);
        let P = Provable.witness(Point, () => publicKey);
        let R = EllipticCurve.multiScalarMul(
          Secp256k1,
          [signature.s, signature.r],
          [G, P],
          [config.G, config.P]
        );
        Provable.asProver(() => {
          console.log(Point.toBigint(R));
        });
      },
    },
    ecdsa: {
      privateInputs: [],
      method() {
        let signature0 = Provable.witness(Ecdsa.Signature, () => signature);
        Ecdsa.verify(Secp256k1, signature0, msgHash, publicKey, config);
      },
    },
  },
});
let main = program.rawMethods.ecdsa;

console.time('ecdsa verify (constant)');
main();
console.timeEnd('ecdsa verify (constant)');

console.time('ecdsa verify (witness gen / check)');
Provable.runAndCheck(main);
console.timeEnd('ecdsa verify (witness gen / check)');

console.time('ecdsa verify (build constraint system)');
let cs = Provable.constraintSystem(main);
console.timeEnd('ecdsa verify (build constraint system)');

let gateTypes: Record<string, number> = {};
gateTypes['Total rows'] = cs.rows;
for (let gate of cs.gates) {
  gateTypes[gate.type] ??= 0;
  gateTypes[gate.type]++;
}

console.log(gateTypes);

console.time('ecdsa verify (compile)');
await program.compile();
console.timeEnd('ecdsa verify (compile)');

console.time('ecdsa verify (prove)');
let proof = await program.ecdsa();
console.timeEnd('ecdsa verify (prove)');

assert(await program.verify(proof), 'proof verifies');
