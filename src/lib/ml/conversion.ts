/**
 * this file contains conversion functions between JS and OCaml
 */

import { Scalar, ScalarConst } from '../scalar.js';
import { PrivateKey } from '../signature.js';

export { Ml };

const Ml = {
  fromScalar,
  toScalar,
  fromPrivateKey,
  toPrivateKey,
};

function fromScalar(s: Scalar) {
  return s.toConstant().constantValue;
}
function toScalar(s: ScalarConst) {
  return Scalar.from(s);
}

function fromPrivateKey(sk: PrivateKey) {
  return fromScalar(sk.s);
}
function toPrivateKey(sk: ScalarConst) {
  return new PrivateKey(Scalar.from(sk));
}
