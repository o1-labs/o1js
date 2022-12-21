import { Fp, Fq } from './finite_field.js';

for (let F of [Fp, Fq]) {
  // t is computed correctly from p = 2^32 * t + 1
  console.assert(F.t * (1n << 32n) + 1n === F.modulus);

  // the primitive root of unity is computed correctly as 5^t
  let generator = 5n;
  let rootFp = F.power(generator, F.t);
  console.assert(rootFp === F.twoadicRoot);

  // the primitive roots of unity `r` actually satisfy the equations defining them:
  // r^(2^32) = 1, r^(2^31) != 1
  let shouldBe1 = F.power(F.twoadicRoot, 1n << 32n);
  let shouldBeMinus1 = F.power(F.twoadicRoot, 1n << 31n);
  console.assert(shouldBe1 === 1n);
  console.assert(shouldBeMinus1 + 1n === F.modulus);

  // the primitive roots of unity are non-squares
  // -> verifies that the two-adicity is 32, and that they can be used as non-squares in the sqrt algorithm
  console.assert(!F.isSquare(F.twoadicRoot));
}
