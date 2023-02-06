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

  // algebraic laws
  assert.equal(G.add(X, Y), G.add(Y, X), 'commutative');
  assert.equal(G.add(X, G.add(Y, Z)), G.add(G.add(X, Y), Z), 'associative');
  assert.equal(G.add(X, G.zero), X);
}
