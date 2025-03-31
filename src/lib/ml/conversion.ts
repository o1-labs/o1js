/**
 * this file contains conversion functions between JS and OCaml
 */

import type { MlPublicKey, MlPublicKeyVar } from '../../snarky.js';
import { HashInput } from '../provable/types/struct.js';
import { Bool, Field } from '../provable/wrapped.js';
import { FieldVar, FieldConst } from '../provable/core/fieldvar.js';
import { Scalar, ScalarConst } from '../provable/scalar.js';
import { PrivateKey, PublicKey } from '../provable/crypto/signature.js';
import { MlPair, MlBool, MlArray } from './base.js';
import { MlFieldConstArray } from './fields.js';

export { Ml, MlHashInput };

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

type MlHashInput = [
  flag: 0,
  field_elements: MlArray<FieldConst>,
  packed: MlArray<MlPair<FieldConst, number>>
];

const MlHashInput = {
  to({ fields = [], packed = [] }: HashInput): MlHashInput {
    return [
      0,
      MlFieldConstArray.to(fields),
      MlArray.to(packed.map(([field, size]) => [0, Ml.constFromField(field), size])),
    ];
  },
  from([, fields, packed]: MlHashInput): HashInput {
    return {
      fields: MlFieldConstArray.from(fields),
      packed: MlArray.from(packed).map(
        ([, field, size]) => [Field(field), size] as [Field, number]
      ),
    };
  },
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

function fromScalar(s: Scalar): ScalarConst {
  return [0, s.toBigInt()];
}
function toScalar(s: ScalarConst) {
  return Scalar.from(s[1]);
}

function fromPrivateKey(sk: PrivateKey) {
  return fromScalar(sk.s);
}
function toPrivateKey(sk: ScalarConst) {
  return new PrivateKey(Scalar.from(sk[1]));
}

function fromPublicKey(pk: PublicKey): MlPublicKey {
  return MlPair(pk.x.toConstant().value[1], MlBool(pk.isOdd.toBoolean()));
}
function toPublicKey([, x, isOdd]: MlPublicKey): PublicKey {
  return PublicKey.from({
    x: Field(x),
    isOdd: Bool(MlBool.from(isOdd)),
  });
}

function fromPublicKeyVar(pk: PublicKey): MlPublicKeyVar {
  return MlPair(pk.x.value, pk.isOdd.toField().value);
}
function toPublicKeyVar([, x, isOdd]: MlPublicKeyVar): PublicKey {
  return PublicKey.from({ x: Field(x), isOdd: Bool(isOdd) });
}
