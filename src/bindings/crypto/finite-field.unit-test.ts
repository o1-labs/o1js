import { Fp, Fq } from './finite-field.js';
import assert from 'node:assert/strict';
import { Random, test } from '../../lib/testing/property.js';
import { exampleFields } from './finite-field-examples.js';

let fields = Object.values(exampleFields);

for (let F of fields) {
  // t is computed correctly from p = 2^M * t + 1
  assert(F.t * (1n << F.M) + 1n === F.modulus, 't, M are computed correctly');

  // the primitive roots of unity `r` actually satisfy the equations defining them:
  let shouldBe1 = F.power(F.twoadicRoot, 1n << F.M);
  let shouldBeMinus1 = F.power(F.twoadicRoot, 1n << (F.M - 1n));
  assert(shouldBe1 === 1n, 'r^(2^M) === 1');
  assert(shouldBeMinus1 + 1n === F.modulus, 'r^(2^(M-1)) === -1');

  // the primitive roots of unity are non-squares
  // -> verifies that the two-adicity is 32, and that they can be used as non-squares in the sqrt algorithm
  assert(!F.isSquare(F.twoadicRoot), 'roots of unity are non-squares');

  // field arithmetic tests
  let p = F.modulus;
  let randomF = Random(F.random);
  test(randomF, randomF, randomF, (x, y, z) => {
    assert.equal(F.add(1n, 1n), 2n, 'add');
    assert.equal(F.add(p - 1n, 2n), 1n, 'add');
    assert.equal(F.sub(3n, 3n), 0n, 'sub');
    assert.equal(F.sub(3n, 8n), p - 5n, 'sub');
    assert.equal(F.negate(5n), p - 5n, 'negate');
    assert.equal(F.negate(p), 0n, 'non-canonical 0 is negated');
    assert.equal(F.add(x, F.negate(x)), 0n, 'add & negate');
    assert.equal(F.sub(F.add(x, y), x), y, 'add & sub');
    assert.equal(F.isEven(17n), false, 'isEven');
    assert.equal(F.isEven(p), true, 'non-canonical 0 is even');
    assert.equal(F.isEven(p - 1n), true, 'isEven');

    assert.equal(F.mul(p - 1n, 2n), p - 2n, 'mul');
    assert.equal(F.mul(p - 3n, p - 3n), 9n, 'mul');
    assert.equal(
      F.mul(F.mul(x, y), z),
      F.mul(x, F.mul(y, z)),
      'mul associative'
    );
    assert.equal(
      F.mul(z, F.add(x, y)),
      F.add(F.mul(z, x), F.mul(z, y)),
      'mul distributive'
    );

    assert.equal(F.inverse(0n), undefined, '0 has no inverse');
    assert.equal(F.inverse(1n), 1n, 'inverse 1');
    assert.equal(F.inverse(2n), (p + 1n) / 2n, 'inverse 2');
    assert.equal(F.inverse(F.negate(2n)), (p - 1n) / 2n, 'inverse -2');
    if (p % 3n === 1n) {
      assert.equal(F.inverse(3n), p - (p - 1n) / 3n, 'inverse 3');
    } else {
      assert.equal(F.inverse(3n), (p + 1n) / 3n, 'inverse 3');
    }

    if (x !== 0n) {
      let xInv = F.inverse(x);
      assert(xInv !== undefined, 'non-zero is invertible');
      assert.equal(F.mul(xInv, x), 1n, 'inverse & mul');
      assert.equal(F.div(y, x), F.mul(y, xInv), 'div & inverse');
    }

    assert.equal(F.div(1n, 0n), undefined, 'div');
    assert.equal(F.div(21n, F.negate(7n)), p - 3n, 'div');

    assert.equal(F.square(F.negate(10n)), 100n, 'square');
    let squareX = F.square(x);
    assert(F.isSquare(squareX), 'square + isSquare');
    assert([x, F.negate(x)].includes(F.sqrt(squareX)!), 'square + sqrt');
    assert.equal(F.sqrt(0n), F.sqrt(p), 'sqrt handles non-canonical 0');

    if (F.M >= 2n) {
      assert(F.isSquare(p - 1n), 'isSquare -1');
      assert.equal(
        F.isSquare(0n),
        F.isSquare(p),
        'isSquare handles non-canonical 0'
      );
      let i = F.power(F.twoadicRoot, 1n << (F.M - 2n));
      assert([i, F.negate(i)].includes(F.sqrt(p - 1n)!), 'sqrt -1');
    }

    assert.equal(F.power(F.negate(2n), 3n), F.negate(8n), 'power');
    assert.equal(F.power(2n, p - 1n), 1n, 'power mod p-1');
    assert.equal(F.power(2n, p - 1n + 3n), 8n, 'power mod p-1');
    assert.equal(F.power(x, 4n), F.square(F.square(x)), 'power');
    assert.equal(
      F.power(x, y + z),
      F.mul(F.power(x, y), F.power(x, z)),
      'power & mul'
    );

    assert.equal(F.dot([x, y], [y, x]), F.mul(2n, F.mul(x, y)), 'dot');
    assert.equal(F.dot([x, y], [F.negate(y), x]), 0n, 'dot');

    if (p >> 250n) {
      assert(x > 1n << 128n, 'random x is large');
      assert(x < p - (1n << 128n), 'random x is not small negative');
    }
    assert(x >= 0 && x < p, 'random x is in range');

    assert.equal(F.fromNumber(-1), p - 1n, 'fromNumber');
    assert.equal(F.fromBigint(-1n), p - 1n, 'fromBigint');
    assert.equal(F.fromBigint(p + 1n), 1n, 'fromBigint');
    assert(F.equal(10n, 10n), 'equal');
    assert(F.equal(p - 10n, F.fromNumber(-10)), 'equal + fromNumber');
    assert(F.equal(10n, F.fromBigint(p + 10n)), 'equal + fromBigint');
    assert(!F.equal(5n, p - 5n), 'not equal');
  });
}

// test that is specialized to Fp, Fq
for (let F of [Fp, Fq]) {
  // the primitive root of unity is computed correctly as 5^t
  let generator = 5n;
  let rootFp = F.power(generator, F.t);
  assert(rootFp === F.twoadicRoot, 'root of unity is computed correctly');
}
