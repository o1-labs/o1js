import { Field, Bool } from '../lib/core.js';
import * as Json from './gen/transaction-json.js';
import { UInt32, UInt64, Sign } from '../lib/int.js';
import { TokenSymbol } from '../lib/hash.js';
import { PublicKey } from '../lib/signature.js';
import {
  AsFieldsAndAuxExtended,
  AsFieldsExtended,
  circuitValue,
} from '../lib/circuit_value.js';
import * as Encoding from '../lib/encoding.js';

export { PublicKey, Field, Bool, AuthRequired, UInt64, UInt32, Sign, TokenId };

export { Events, Events as SequenceEvents, StringWithHash, TokenSymbol };

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

let { fromCircuitValue } = AsFieldsAndAuxExtended;

const TypeMap: {
  [K in keyof TypeMap]: AsFieldsAndAuxExtended<TypeMap[K], Json.TypeMap[K]>;
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
    fromFields: (_, [value]) => value,
  },
  string: {
    ...emptyType,
    toAuxiliary: (value = '') => [value],
    toJSON: (value) => value,
    fromFields: (_, [value]) => value,
  },
  null: emptyType,
  undefined: {
    ...emptyType,
    fromFields: () => undefined,
  },
};

// types which got an annotation about its circuit type in Ocaml

type DataAsHash<T> = { data: T; hash: Field };

const Events: AsFieldsAndAuxExtended<DataAsHash<Field[][]>, string[][]> = {
  sizeInFields() {
    return 1;
  },
  toFields({ hash }) {
    return [hash];
  },
  toAuxiliary(value) {
    return [value?.data ?? []];
  },
  fromFields([hash], [data]) {
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

const StringWithHash: AsFieldsAndAuxExtended<DataAsHash<string>, string> = {
  sizeInFields() {
    return 1;
  },
  toFields({ hash }) {
    return [hash];
  },
  toAuxiliary(value) {
    return [value?.data ?? ''];
  },
  fromFields([hash], [data]) {
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
