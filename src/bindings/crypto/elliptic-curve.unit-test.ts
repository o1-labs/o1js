import {
  createCurveAffine,
  createCurveProjective,
  Pallas,
  Vesta,
} from './elliptic-curve.js';
import { Fp, Fq } from './finite-field.js';
import assert from 'node:assert/strict';
import { test, Random } from '../../lib/testing/property.js';
import { CurveParams } from './elliptic-curve-examples.js';

for (let [G, Field, Scalar] of [
  [Pallas, Fp, Fq] as const,
  [Vesta, Fq, Fp] as const,
  curveWithFields(CurveParams.Secp256k1),
  curveWithFields(CurveParams.Secp256r1),
]) {
  // endomorphism constants
  if (G.hasEndomorphism) {
    assert.equal(Field.power(G.endoBase, 3n), 1n, 'cube root in base field');
    assert.equal(
      Scalar.power(G.endoScalar, 3n),
      1n,
      'cube root in scalar field'
    );
  }

  let randomScalar = Random(Scalar.random);
  let randomField = Random(Field.random);
  // create random points by scaling 1 with a random scalar
  let randomPoint = Random(() => G.scale(G.one, Scalar.random()));
  // let one / zero be sampled 20% of times each
  randomPoint = Random.oneOf(
    G.zero,
    G.one,
    randomPoint,
    randomPoint,
    randomPoint
  );

  test(
    randomPoint,
    randomPoint,
    randomPoint,
    randomScalar,
    randomScalar,
    randomField,
    (X, Y, Z, x, y, f) => {
      // check on curve
      assert(G.isOnCurve(X) && G.isOnCurve(Y) && G.isOnCurve(Z), 'on curve');

      if (G.a === 0n) {
        // can't be on curve because b=5 is a non-square
        assert(!Field.isSquare(G.b));
        assert(
          !G.isOnCurve({ x: 0n, y, z: 1n }),
          'x=0 => y^2 = b is not on curve'
        );
        // can't be on curve because the implied equation is f^6 = f^6 + b
        assert(
          !G.isOnCurve({ x: Field.power(f, 2n), y: Field.power(f, 3n), z: 1n }),
          'x^3 = y^2 is not on curve'
        );
      }

      // equal
      assert(G.equal(X, X), 'equal');
      assert(
        !G.equal(X, G.add(X, X)) || G.equal(X, G.zero),
        'not equal to double of itself (or zero)'
      );
      assert(
        !G.equal(X, G.negate(X)) || G.equal(X, G.zero),
        'not equal to negation of itself (or zero)'
      );
      assert(!G.equal(X, Y) || X === Y, 'not equal (random points)');
      // case where `equal` checks non-trivial z relationship
      let X_ = {
        x: Field.mul(X.x, Field.square(f)),
        y: Field.mul(X.y, Field.power(f, 3n)),
        z: Field.mul(X.z, f),
      };
      assert(G.equal(X, X_), 'equal non-trivial');

      // algebraic laws - addition
      assert(G.equal(G.add(X, Y), G.add(Y, X)), 'commutative');
      assert(
        G.equal(G.add(X, G.add(Y, Z)), G.add(G.add(X, Y), Z)),
        'associative'
      );
      assert(G.equal(G.add(X, G.zero), X), 'identity');
      assert(G.equal(G.add(X, G.negate(X)), G.zero), 'inverse');

      // addition does doubling
      assert(G.equal(G.add(X, X), G.double(X)), 'double');

      // scaling by small factors
      assert(G.equal(G.scale(X, 0n), G.zero), 'scale by 0');
      assert(G.equal(G.scale(X, 1n), X), 'scale by 1');
      assert(G.equal(G.scale(X, 2n), G.add(X, X)), 'scale by 2');
      assert(G.equal(G.scale(X, 3n), G.add(X, G.add(X, X))), 'scale by 3');
      assert(G.equal(G.scale(X, 4n), G.double(G.double(X))), 'scale by 4');

      // algebraic laws - scaling
      assert(
        G.equal(
          G.scale(X, Scalar.add(x, y)),
          G.add(G.scale(X, x), G.scale(X, y))
        ),
        'distributive'
      );
      assert(
        G.equal(G.scale(X, Scalar.negate(x)), G.negate(G.scale(X, x))),
        'distributive (negation)'
      );
      assert(
        G.equal(G.scale(X, Scalar.mul(x, y)), G.scale(G.scale(X, x), y)),
        'scale / multiply is associative'
      );

      // endomorphism
      if (G.hasEndomorphism) {
        assert(
          G.equal(G.endomorphism(X), G.scale(X, G.endoScalar)),
          'efficient endomorphism'
        );
      }

      // subgroup
      assert(G.isInSubgroup(X), 'subgroup check');

      // affine
      let affineX = G.toAffine(X);
      assert(
        G.equal(G.fromAffine(affineX), X),
        'affine - projective roundtrip'
      );
      let { x: xa, y: ya } = affineX;
      assert(
        G.equal(X, G.zero) ||
          Field.square(ya) ===
            Field.add(Field.add(Field.power(xa, 3n), Field.mul(G.a, xa)), G.b),
        'affine on curve (or zero)'
      );
    }
  );
}

// helper

function curveWithFields(params: CurveParams) {
  // this computes endo constants if they aren't there from the beginning
  let Affine = createCurveAffine(params);

  if (Affine.hasEndomorphism) {
    params = {
      ...params,
      endoBase: Affine.Endo.base,
      endoScalar: Affine.Endo.scalar,
    };
  }
  let Projective = createCurveProjective(params);

  // return Curve, Field and Scalar
  return [Projective, Affine.Field, Affine.Scalar] as const;
}
