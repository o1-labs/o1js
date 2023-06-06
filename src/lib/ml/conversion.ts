/**
 * this file contains conversion functions between JS and OCaml
 */

import type { MlPublicKey } from '../../snarky.js';
import { Bool, Field } from '../core.js';
import { Scalar, ScalarConst } from '../scalar.js';
import { PrivateKey, PublicKey } from '../signature.js';
import { MlTuple } from './base.js';

export { Ml };

const Ml = {
  fromScalar,
  toScalar,
  fromPrivateKey,
  toPrivateKey,
  fromPublicKey,
  toPublicKey,
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

function fromPublicKey(pk: PublicKey): MlPublicKey {
  return MlTuple(pk.x.value, pk.isOdd.toField().value);
}
function toPublicKey([, x, isOdd]: MlPublicKey): PublicKey {
  return PublicKey.from({
    x: Field(x),
    // TODO
    isOdd: Bool.Unsafe.ofField(Field(isOdd)),
  });
}
