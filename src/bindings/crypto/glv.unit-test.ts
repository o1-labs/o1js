import { assert } from '../../lib/util/errors.js';
import { CurveParams } from './elliptic-curve-examples.js';
import { createCurveAffine } from './elliptic-curve.js';
import { computeGlvData, decompose } from './elliptic-curve-endomorphism.js';
import { Random, test } from '../../lib/testing/property.js';
import { log2 } from './bigint-helpers.js';

const Ntest = 100000;
const isVerbose = false;

testGlv(CurveParams.Pallas);
testGlv(CurveParams.Vesta);
testGlv(CurveParams.Secp256k1);

function testGlv(params: CurveParams) {
  if (isVerbose) console.log(`\ntesting GLV for ${params.name}`);
  const Curve = createCurveAffine(params);
  let q = Curve.order;
  let lambda = Curve.Endo.scalar;

  let data = computeGlvData(q, lambda);
  if (isVerbose)
    console.log('upper bounds:', {
      maxS0: data.maxS0.toString(16),
      maxS1: data.maxS1.toString(16),
      maxBits: data.maxBits,
    });

  assert(data.maxBits <= log2(q) / 2, 'decomposition reduces bits by half');

  let maxS0 = 0n;
  let maxS1 = 0n;

  for (let i = 0; i < Ntest; i++) {
    // random scalar
    let s = Curve.Scalar.random();

    // decompose s and assert decomposition is correct
    let [s0, s1] = decompose(s, data);
    assert(
      Curve.Scalar.mod(s0.value + s1.value * lambda) === s,
      'valid decomposition'
    );

    if (s0.abs > maxS0) maxS0 = s0.abs;
    if (s1.abs > maxS1) maxS1 = s1.abs;
  }

  if (isVerbose)
    console.log('actual results:', {
      maxS0: maxS0.toString(16),
      maxS1: maxS1.toString(16),
    });

  // assert that upper bounds are correct
  assert(maxS0 < data.maxS0, 'maxS0 is correct');
  assert(maxS1 < data.maxS1, 'maxS1 is correct');

  // check scalar multiplication
  let randomScalar = Random.otherField(Curve.Scalar);
  test(randomScalar, (s) => {
    let sG1 = Curve.Endo.scale(Curve.one, s);
    let sG2 = Curve.scale(Curve.one, s);
    assert(Curve.equal(sG1, sG2), 'scalar multiplication using GLV');
  });
}
