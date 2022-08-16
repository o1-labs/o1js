import { Group, Ledger, Circuit } from '../snarky';
import { Field, Bool } from '../lib/core';
import * as Json from './gen/parties-json';
import { UInt32, UInt64, Sign } from '../lib/int';
import { TokenSymbol } from '../lib/hash';
import { PublicKey } from '../lib/signature';
import {
  AsFieldsAndAux,
  AsFieldsExtended,
  circuitValue,
} from '../lib/circuit_value';
import * as Encoding from '../lib/encoding';

export { PublicKey, Field, Bool, AuthRequired, UInt64, UInt32, Sign, TokenId };

export { Events, SequenceEvents, StringWithHash, TokenSymbol };

export { TypeMap };

type AuthRequired = {
  constant: Bool;
  signatureNecessary: Bool;
  signatureSufficient: Bool;
};
type TokenId = Field;

// to what types in the js layout are mapped
type TypeMap = {
  PublicKey: PublicKey;
  Field: Field;
  Bool: Bool;
  AuthRequired: AuthRequired;
  UInt32: UInt32;
  UInt64: UInt64;
  Sign: Sign;
  TokenId: TokenId;
  // builtin
  number: number;
  null: null;
  undefined: undefined;
  string: string;
};

// types that implement AsFieldAndAux, and so can be left out of the conversion maps below
// sort of a "transposed" representation

let emptyType = {
  sizeInFields: () => 0,
  toFields: () => [],
  toAuxiliary: () => [],
  fromFields: () => null,
  check: () => {},
  toInput: () => ({}),
  toJSON: () => null,
};

const TokenId: AsFieldsExtended<TokenId> = {
  ...circuitValue<TokenId>(Field),
  toJSON(x: TokenId): Json.TokenId {
    return Encoding.TokenId.toBase58(x);
  },
};

const AuthRequired: AsFieldsExtended<AuthRequired> = {
  ...circuitValue<AuthRequired>(
    { constant: Bool, signatureNecessary: Bool, signatureSufficient: Bool },
    {
      customObjectKeys: [
        'constant',
        'signatureNecessary',
        'signatureSufficient',
      ],
    }
  ),
  toJSON(x): Json.AuthRequired {
    let c = Number(x.constant.toBoolean());
    let n = Number(x.signatureNecessary.toBoolean());
    let s = Number(x.signatureSufficient.toBoolean());
    // prettier-ignore
    switch (`${c}${n}${s}`) {
      case '110': return 'Impossible';
      case '101': return 'None';
      case '000': return 'Proof';
      case '011': return 'Signature';
      case '001': return 'Either';
      default: throw Error('Unexpected permission');
    }
  },
};

let { fromCircuitValue } = AsFieldsAndAux;

const TypeMap: {
  [K in keyof TypeMap]: AsFieldsAndAux<TypeMap[K], Json.TypeMap[K]>;
} = {
  Field: fromCircuitValue(Field),
  Bool: fromCircuitValue(Bool),
  UInt32: fromCircuitValue(UInt32),
  UInt64: fromCircuitValue(UInt64),
  Sign: fromCircuitValue(Sign),
  TokenId: fromCircuitValue(TokenId),
  AuthRequired: fromCircuitValue(AuthRequired),
  PublicKey: fromCircuitValue(PublicKey),
  // primitive JS types
  number: {
    ...emptyType,
    toAuxiliary: (value = 0) => [value],
    toJSON: (value) => value,
    fromFields: (_, aux) => aux.pop()!,
  },
  string: {
    ...emptyType,
    toAuxiliary: (value = '') => [value],
    toJSON: (value) => value,
    fromFields: (_, aux) => aux.pop()!,
  },
  null: emptyType,
  undefined: {
    ...emptyType,
    fromFields: () => undefined,
  },
};

// types which got an annotation about its circuit type in Ocaml

type DataAsHash<T> = { data: T; hash: Field };

const Events: AsFieldsAndAux<DataAsHash<Field[][]>, string[][]> = {
  sizeInFields() {
    return 1;
  },
  toFields({ hash }) {
    return [hash];
  },
  toAuxiliary(value) {
    return [value?.data ?? []];
  },
  fromFields(fields, aux) {
    let hash = fields.pop()!;
    let data = aux.pop()!;
    return { data, hash };
  },
  toJSON({ data }) {
    return data.map((row) => row.map((e) => e.toString()));
  },
  check() {},
  toInput({ hash }) {
    return { fields: [hash] };
  },
};

const SequenceEvents: AsFieldsAndAux<DataAsHash<Field[][]>, string[][]> = {
  sizeInFields() {
    return 1;
  },
  toFields({ hash }) {
    return [hash];
  },
  toAuxiliary(value) {
    return [value?.data ?? []];
  },
  fromFields(fields, aux) {
    let hash = fields.pop()!;
    let data = aux.pop()!;
    return { data, hash };
  },
  toJSON({ data }) {
    return data.map((row) => row.map((e) => e.toString()));
  },
  check() {},
  toInput({ hash }) {
    return { fields: [hash] };
  },
};

const StringWithHash: AsFieldsAndAux<DataAsHash<string>, string> = {
  sizeInFields() {
    return 1;
  },
  toFields({ hash }) {
    return [hash];
  },
  toAuxiliary(value) {
    return [value?.data ?? ''];
  },
  fromFields(fields, aux) {
    let hash = fields.pop()!;
    let data = aux.pop()!;
    return { data, hash };
  },
  toJSON({ data }) {
    return data;
  },
  check() {},
  toInput({ hash }) {
    return { fields: [hash] };
  },
};
