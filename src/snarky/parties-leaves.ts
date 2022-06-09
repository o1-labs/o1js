import { Field, Bool, Group, Ledger } from '../snarky';
import * as Json from './gen/parties-json';

export { PublicKey, Field, Bool, AuthRequired, UInt64, UInt32, Sign, TokenId };

export {
  convertEventsToJson,
  convertEventsToFields,
  convertStringWithHashToJson,
  convertStringWithHashToFields,
};

export { toJson, toJsonLeafTypes, toFields, toFieldsLeafTypes };

type UInt64 = { value: Field; _type?: 'UInt64' };
type UInt32 = { value: Field; _type?: 'UInt32' };
type Sign = Field; // constrained to +-1
type PublicKey = { g: Group };
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

// json conversion

function identity(x: any) {
  return x;
}
function asString(x: Field | UInt32 | UInt64 | bigint) {
  return x.toString();
}

type ToJsonTypeMap = TypeMap & {
  BlockTimeInterval: { lower: UInt64; upper: UInt64 };
};
type ToJson = {
  [K in keyof ToJsonTypeMap]: (x: ToJsonTypeMap[K]) => Json.TypeMap[K];
};

let ToJson: ToJson = {
  PublicKey(x: PublicKey): Json.PublicKey {
    return Ledger.publicKeyToString(x);
  },
  Field: asString,
  Bool(x: Bool) {
    return x.toBoolean();
  },
  AuthRequired(x: AuthRequired) {
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
  UInt32: asString,
  UInt64: asString,
  TokenId(x: TokenId) {
    return Ledger.fieldToBase58(x);
  },
  Sign(x: Sign) {
    if (x.toString() === '1') return 'Positive';
    if (x.neg().toString() === '1') return 'Negative';
    throw Error(`Invalid Sign: ${x}`);
  },
  // TODO this is a hack
  BlockTimeInterval(_: { lower: UInt64; upper: UInt64 }) {
    return null;
  },
  // builtin
  number: identity,
  null: identity,
  undefined(_: undefined) {
    return null;
  },
  string: identity,
};

function toJson<K extends keyof ToJsonTypeMap>(
  typeName: K,
  value: ToJsonTypeMap[K]
) {
  if (!(typeName in ToJson))
    throw Error(`toJson: unsupported type "${typeName}"`);
  return ToJson[typeName](value);
}

// to fields

// TODO: to go _back_ from fields to JS types / JSON, we need the equivalent of typ.value_of_fields,
// which also needs auxiliary data like the string in {data: string; hash: Field}
// So eventually we should implement toAuxiliary(jsType) and fromFields(fields, auxiliary)

type ToFields = { [K in keyof TypeMap]: (x: TypeMap[K]) => Field[] };

function asFields(x: any): Field[] {
  return x.toFields();
}
function empty(_: any) {
  return [];
}

let ToFields: ToFields = {
  PublicKey({ g }: PublicKey) {
    let { x, y } = g;
    // TODO inefficient! in-snark public key should be uncompressed
    let isOdd = y.toBits()[0];
    return [x, isOdd.toField()];
  },
  Field: asFields,
  Bool: asFields,
  AuthRequired(x: AuthRequired) {
    return [x.constant, x.signatureNecessary, x.signatureSufficient]
      .map(asFields)
      .flat();
  },
  UInt32: asFields,
  UInt64: asFields,
  TokenId: asFields,
  Sign: asFields,
  // builtin
  number: empty,
  null: empty,
  undefined: empty,
  string: empty,
};

function toFields<K extends keyof TypeMap>(typeName: K, value: TypeMap[K]) {
  if (!(typeName in ToFields))
    throw Error(`toFields: unsupported type "${typeName}"`);
  return ToFields[typeName](value);
}

let toJsonLeafTypes = new Set(Object.keys(ToJson));
let toFieldsLeafTypes = new Set(Object.keys(ToFields));

// converters for types which got an annotation about its circuit type in Ocaml

type DataAsHash<T> = { data: T; hash: Field };

function convertEventsToJson({ data }: DataAsHash<Field[][]>) {
  return data.map((row) => row.map((e) => toJson('Field', e)));
}
function convertEventsToFields({ hash }: DataAsHash<Field[][]>) {
  return [hash];
}

function convertStringWithHashToJson({ data }: DataAsHash<string>) {
  return data;
}
function convertStringWithHashToFields({ hash }: DataAsHash<string>) {
  return [hash];
}
