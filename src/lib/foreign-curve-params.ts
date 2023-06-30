import { Fp, Fq } from '../bindings/crypto/finite_field.js';
import { Vesta as V } from '../bindings/crypto/elliptic_curve.js';

export { vestaParams };

const vestaParams = {
  modulus: Fq.modulus,
  order: Fp.modulus,
  a: 0n,
  b: V.b,
  gen: V.one,
};
