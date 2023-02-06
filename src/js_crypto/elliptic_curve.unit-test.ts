import { Pallas, Vesta } from './elliptic_curve.js';
import { Fp, Fq } from './finite_field.js';
import assert from 'node:assert/strict';

for (let [G, Field, Scalar] of [
  [Pallas, Fp, Fq] as const,
  [Vesta, Fq, Fp] as const,
]) {
  // some random scalars
  let [x, y, z] = [Scalar.random(), Scalar.random(), Scalar.random()];

  // create random points by scaling 1 with a random scalar
  let X = G.scale(G.one, Scalar.random());
  let Y = G.scale(G.one, Scalar.random());
  let Z = G.scale(G.one, Scalar.random());

  // equal
  assert(G.equal(G.zero, G.zero), 'equal');
  assert(G.equal(G.one, G.one), 'equal');
  assert(!G.equal(G.one, G.zero), 'equal');
  assert(G.equal(X, X), 'equal');
  assert(!G.equal(X, Y), 'equal');
  // case where `equal` checks non-trivial z relationship
  let z_ = Field.random();
  let X_ = {
    x: Field.mul(X.x, Field.square(z_)),
    y: Field.mul(X.y, Field.power(z_, 3n)),
    z: Field.mul(X.z, z_),
  };
  assert(G.equal(X, X_), 'equal non-trivial');

  // algebraic laws
  assert(G.equal(G.add(X, Y), G.add(Y, X)), 'commutative');
  assert(G.equal(G.add(X, G.add(Y, Z)), G.add(G.add(X, Y), Z)), 'associative');
  assert(G.equal(G.add(X, G.zero), X), 'identity');
}
