/**
 * this file contains conversion functions between JS and OCaml
 */

import type { MlPublicKey, MlPublicKeyVar } from '../../snarky.js';
import { Bool, Field } from '../core.js';
import { FieldConst, FieldVar } from '../field.js';
import { Scalar, ScalarConst } from '../scalar.js';
import { PrivateKey, PublicKey } from '../signature.js';
import { MlTuple, MlBool } from './base.js';

export { Ml };

const Ml = {
  constFromField,
  constToField,
  varFromField,
  varToField,

  fromScalar,
  toScalar,

  fromPrivateKey,
  toPrivateKey,

  fromPublicKey,
  toPublicKey,

  fromPublicKeyVar,
  toPublicKeyVar,
};

function constFromField(x: Field): FieldConst {
  return x.toConstant().value[1];
}
function constToField(x: FieldConst): Field {
  return Field(x);
}
function varFromField(x: Field): FieldVar {
  return x.value;
}
function varToField(x: FieldVar): Field {
  return Field(x);
}

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
  return MlTuple(pk.x.toConstant().value[1], MlBool(pk.isOdd.toBoolean()));
}
function toPublicKey([, x, isOdd]: MlPublicKey): PublicKey {
  return PublicKey.from({
    x: Field(x),
    isOdd: Bool(MlBool.from(isOdd)),
  });
}

function fromPublicKeyVar(pk: PublicKey): MlPublicKeyVar {
  return MlTuple(pk.x.value, pk.isOdd.toField().value);
}
function toPublicKeyVar([, x, isOdd]: MlPublicKeyVar): PublicKey {
  return PublicKey.from({
    x: Field(x),
    // TODO
    isOdd: Bool.Unsafe.ofField(Field(isOdd)),
  });
}
