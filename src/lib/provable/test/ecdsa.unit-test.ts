import { createCurveAffine } from '../../../bindings/crypto/elliptic-curve.js';
import {
  Ecdsa,
  EllipticCurve,
  Point,
  initialAggregator,
  verifyEcdsaConstant,
} from '../gadgets/elliptic-curve.js';
import { Field3 } from '../gadgets/foreign-field.js';
import { CurveParams } from '../../../bindings/crypto/elliptic-curve-examples.js';
import { Provable } from '../provable.js';
import { ZkProgram } from '../../proof-system/zkprogram.js';
import { assert } from '../gadgets/common.js';
import { foreignField, uniformForeignField } from './test-utils.js';
import {
  First,
  Second,
  bool,
  equivalentProvable,
  fromRandom,
  map,
  oneOf,
  record,
} from '../../testing/equivalent.js';
import { Bool } from '../bool.js';
import { Random } from '../../testing/random.js';
import { bytesToBigInt } from '../../../bindings/crypto/bigint-helpers.js';
import { expect } from 'expect';

// quick tests
const Secp256k1 = createCurveAffine(CurveParams.Secp256k1);
const Secp256r1 = createCurveAffine(CurveParams.Secp256r1);
const Pallas = createCurveAffine(CurveParams.Pallas);
const Vesta = createCurveAffine(CurveParams.Vesta);

// secp256r1 test against web crypto API
{
  // generate a key pair
  let { privateKey, publicKey } = await crypto.subtle.generateKey(
    { name: 'ECDSA', namedCurve: 'P-256' },
    true,
    ['sign']
  );

  // extract public and private key to bigints
  let pkBuffer = await crypto.subtle.exportKey('raw', publicKey);
  let x = bytesToBigIntBE(pkBuffer.slice(1, 33));
  let y = bytesToBigIntBE(pkBuffer.slice(33));
  let pk = { x, y };

  var skJwk = await crypto.subtle.exportKey('jwk', privateKey);
  let sk = bytesToBigIntBE(fromBase64Url(skJwk.d!));

  // sanity check: we extracted keys correctly
  expect(Secp256r1.from(pk)).toEqual(Secp256r1.scale(Secp256r1.one, sk));

  // sign a message using web crypto
  let message = new TextEncoder().encode('hello world');

  let sigBuffer = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, privateKey, message);
  let r = bytesToBigIntBE(sigBuffer.slice(0, 32));
  let s = bytesToBigIntBE(sigBuffer.slice(32));
  let signature = Ecdsa.Signature.from({ r, s });

  // check that we can verify the signature on the message hash
  let msgHash = await crypto.subtle.digest('SHA-256', message);
  let m = Field3.from(Secp256r1.Scalar.mod(bytesToBigIntBE(msgHash)));

  let ok = Ecdsa.verify(Secp256r1, signature, m, Point.from(pk));
  assert(ok, 'web crypto signature verifies');
}

let curves = [Secp256k1, Secp256r1, Pallas, Vesta];

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

  let signature = map({ from: signatureInputs, to: badSignature }, ({ privateKey, msg }) => {
    let publicKey = Curve.scale(Curve.one, privateKey);
    let signature = Ecdsa.sign(Curve, msg, privateKey);
    return { signature, msg, publicKey };
  });

  // with 30% prob, test the version without GLV even if the curve supports it
  let noGlv = fromRandom(Random.map(Random.fraction(), (f) => f < 0.3));

  // provable method we want to test
  const verify = (sig: Second<typeof signature>, noGlv: boolean) => {
    // invalid public key can lead to either a failing constraint, or verify() returning false
    EllipticCurve.assertOnCurve(sig.publicKey, Curve);

    // additional checks which are inconsistent between constant and variable verification
    let { s, r } = sig.signature;
    if (Field3.isConstant(s)) {
      assert(Field3.toBigint(s) !== 0n, 'invalid signature (s=0)');
    }
    if (Field3.isConstant(r)) {
      assert(Field3.toBigint(r) !== 0n, 'invalid signature (r=0)');
    }

    let hasGlv = Curve.hasEndomorphism;
    if (noGlv) Curve.hasEndomorphism = false; // hack to force non-GLV version
    try {
      return Ecdsa.verify(Curve, sig.signature, sig.msg, sig.publicKey);
    } finally {
      Curve.hasEndomorphism = hasGlv;
    }
  };

  // input validation equivalent to the one implicit in verify()
  const checkInputs = ({ signature: { r, s }, publicKey }: First<typeof signature>) => {
    assert(r !== 0n && s !== 0n, 'invalid signature');
    let pk = Curve.fromNonzero(publicKey);
    assert(Curve.isOnCurve(pk), 'invalid public key');
    return true;
  };

  // positive test
  equivalentProvable({ from: [signature, noGlv], to: bool, verbose: true })(
    () => true,
    verify,
    `${Curve.name}: verifies`
  );

  // negative test
  equivalentProvable({ from: [badSignature, noGlv], to: bool, verbose: true })(
    (s) => checkInputs(s) && false,
    verify,
    `${Curve.name}: fails`
  );

  // test against constant implementation, with both invalid and valid signatures
  equivalentProvable({
    from: [oneOf(signature, badSignature), noGlv],
    to: bool,
    verbose: true,
  })(
    ({ signature, publicKey, msg }) => {
      checkInputs({ signature, publicKey, msg });
      return verifyEcdsaConstant(Curve, signature, msg, publicKey);
    },
    verify,
    `${Curve.name}: verify`
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

let msgHash = Field3.from(0x3e91cd8bd233b3df4e4762b329e2922381da770df1b31276ec77d0557be7fcefn);

const ia = initialAggregator(Secp256k1);
const config = { G: { windowSize: 4 }, P: { windowSize: 4 }, ia };

let program = ZkProgram({
  name: 'ecdsa',
  publicOutput: Bool,
  methods: {
    ecdsa: {
      privateInputs: [],
      async method() {
        let signature_ = Provable.witness(Ecdsa.Signature, () => signature);
        let msgHash_ = Provable.witness(Field3, () => msgHash);
        let publicKey_ = Provable.witness(Point, () => publicKey);

        return {
          publicOutput: Ecdsa.verify(Secp256k1, signature_, msgHash_, publicKey_, config),
        };
      },
    },
  },
});

console.time('ecdsa verify (constant)');
program.rawMethods.ecdsa();
console.timeEnd('ecdsa verify (constant)');

console.time('ecdsa verify (witness gen / check)');
await Provable.runAndCheck(program.rawMethods.ecdsa);
console.timeEnd('ecdsa verify (witness gen / check)');

console.time('ecdsa verify (build constraint system)');
let cs = (await program.analyzeMethods()).ecdsa;
console.timeEnd('ecdsa verify (build constraint system)');

console.log(cs.summary());

console.time('ecdsa verify (compile)');
await program.compile();
console.timeEnd('ecdsa verify (compile)');

console.time('ecdsa verify (prove)');
let { proof } = await program.ecdsa();
console.timeEnd('ecdsa verify (prove)');

assert(await program.verify(proof), 'proof verifies');
proof.publicOutput.assertTrue('signature verifies');

// check constraints w/o endomorphism

let programNoEndo = ZkProgram({
  name: 'ecdsa-secp256r1',
  publicOutput: Bool,
  methods: {
    ecdsa: {
      privateInputs: [],
      async method() {
        let signature_ = Provable.witness(Ecdsa.Signature, () => signature);
        let msgHash_ = Provable.witness(Field3, () => msgHash);
        let publicKey_ = Provable.witness(Point, () => publicKey);

        return {
          publicOutput: Ecdsa.verify(Secp256r1, signature_, msgHash_, publicKey_, config),
        };
      },
    },
  },
});

console.time('ecdsa verify, no endomorphism (build constraint system)');
let csNoEndo = (await programNoEndo.analyzeMethods()).ecdsa;
console.timeEnd('ecdsa verify, no endomorphism (build constraint system)');

console.log(csNoEndo.summary());

// helpers

function bytesToBigIntBE(bytes: ArrayBuffer | Uint8Array | number[]) {
  return bytesToBigInt([...new Uint8Array(bytes)].reverse());
}

function fromBase64Url(b64url: string): Uint8Array {
  let b64 =
    b64url.replace(/-/g, '+').replace(/_/g, '/') + '===='.slice(0, (4 - (b64url.length % 4)) % 4);
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}
