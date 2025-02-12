import {
  Crypto,
  Provable,
  createForeignCurve,
  createForeignTwisted,
} from 'o1js';

const TwistedCurveParams = Crypto.TwistedCurveParams;
const Edwards25519 = createForeignTwisted(TwistedCurveParams.Edwards25519);

const Secp256k1Params = Crypto.CurveParams.Secp256k1;
const Secp256k1 = createForeignCurve(Secp256k1Params);

const TestFunctions = [
  scale,
  add,
  double,
  negate,
  assertOnCurve,
  assertInSubgroup,
];
// async for loop

for (const fn of TestFunctions) {
  console.log('Twisted form');
  await fn(Edwards25519);
  console.log('Weierstrass form');
  await fn(Secp256k1);
  console.log('-------------------');
}

// Twisted     scale: 76233
// Weierstrass scale: 21659
async function scale(Curve: any) {
  let cs = await Provable.constraintSystem(() => {
    let r = Provable.witness(Curve.Scalar, () => Curve.Scalar.random());
    let g = Provable.witness(Curve, () => Curve.generator);

    let gr = g.scale(r);
  });
  console.log('scale', cs.rows);
}

// Twisted     add: 272
// Weierstrass add: 203
async function add(Curve: any) {
  let cs = await Provable.constraintSystem(() => {
    let g1 = Provable.witness(Curve, () =>
      Curve.generator.scale(Curve.Scalar.random())
    );
    let g2 = Provable.witness(Curve, () =>
      Curve.generator.scale(Curve.Scalar.random())
    );

    let g3 = g1.add(g2);
  });
  console.log('add', cs.rows);
}

// Twisted     double: 223
// Weierstrass double: 145
async function double(Curve: any) {
  let cs = await Provable.constraintSystem(() => {
    let g1 = Provable.witness(Curve, () =>
      Curve.generator.scale(Curve.Scalar.random())
    );

    let g3 = g1.double();
  });
  console.log('double', cs.rows);
}

// Twisted     negate: 24
// Weierstrass negate: 73
async function negate(Curve: any) {
  let cs = await Provable.constraintSystem(() => {
    let g1 = Provable.witness(Curve, () =>
      Curve.generator.scale(Curve.Scalar.random())
    );

    let g3 = g1.negate();
  });
  console.log('negate', cs.rows);
}

// Twisted     assertOnCurve: 135
// Weierstrass assertOnCurve: 125
async function assertOnCurve(Curve: any) {
  let cs = await Provable.constraintSystem(() => {
    let g1 = Provable.witness(Curve, () =>
      Curve.generator.scale(Curve.Scalar.random())
    );

    Curve.assertOnCurve(g1);
  });
  console.log('assertOnCurve', cs.rows);
}

// Twisted     assertInSubgroup: 76248
// Weierstrass assertInSubgroup: 67 (secp256k1, no cofactor -> no msm)
async function assertInSubgroup(Curve: any) {
  let cs = await Provable.constraintSystem(() => {
    let g1 = Provable.witness(Curve, () =>
      Curve.generator.scale(Curve.Scalar.random())
    );

    Curve.assertInSubgroup(g1);
  });
  console.log('assertInSubgroup', cs.rows);
  console.log('methods', cs.analyzeMethods);
}
