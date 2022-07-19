import { Field, Bool, Group, Ledger } from '../snarky';
import * as Json from './gen/parties-json';
import { UInt32, UInt64 } from '../lib/int';
import { PublicKey } from '../lib/signature';

export { PublicKey, Field, Bool, AuthRequired, UInt64, UInt32, Sign, TokenId };

export {
  convertEventsToJson,
  convertEventsToFields,
  convertEventsToAux,
  convertEventsFromFields,
  convertStringWithHashToJson,
  convertStringWithHashToFields,
  convertStringWithHashToAux,
  convertStringWithHashFromFields,
};

export {
  toJson,
  toJsonLeafTypes,
  toFields,
  toFieldsLeafTypes,
  toAuxiliary,
  fromFields,
  TypeMap,
  ToJsonTypeMap,
};

type Sign = Field; // constrained to +-1
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
function asString(x: Field | bigint) {
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
  UInt32(x: UInt32) {
    return x.value.toString();
  },
  UInt64(x: UInt64) {
    return x.value.toString();
  },
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

type ToFields = { [K in keyof TypeMap]: (x: TypeMap[K]) => Field[] };

function asFields(x: any): Field[] {
  return x.toFields();
}
function empty(_: any): [] {
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

// to auxiliary

type ToAuxiliary = {
  [K in keyof TypeMap]:
    | ((x: TypeMap[K] | undefined) => [])
    | ((x: TypeMap[K] | undefined) => [TypeMap[K]]);
};

let ToAuxiliary: ToAuxiliary = {
  PublicKey: empty,
  Field: empty,
  Bool: empty,
  AuthRequired: empty,
  UInt32: empty,
  UInt64: empty,
  TokenId: empty,
  Sign: empty,
  // builtin
  number: (x = 0) => [x],
  null: empty,
  undefined: empty,
  string: (x = '') => [x],
};

function toAuxiliary<K extends keyof TypeMap>(
  typeName: K,
  value: TypeMap[K] | undefined
) {
  if (!(typeName in ToFields))
    throw Error(`toAuxiliary: unsupported type "${typeName}"`);
  return ToAuxiliary[typeName](value);
}

// from fields & aux
// these functions get the reversed output of `toFields` and `toAuxiliary` and pop the values they need from those arrays
// NB: unlike toFields, this is only used outside snark, so no worries about constraint efficiency, checking booleanness etc

type FromFields = {
  [K in keyof TypeMap]: (fields: Field[], aux: any[]) => TypeMap[K];
};

function takeOneAux(_: Field[], aux: any[]) {
  return aux.pop()!;
}

let FromFields: FromFields = {
  PublicKey(fields: Field[]) {
    let x = fields.pop()!;
    let isOdd = fields.pop()!;
    // compute y from elliptic curve equation y^2 = x^3 + 5
    let someY = x.mul(x).mul(x).add(5).sqrt();
    let isTheRightY = isOdd.equals(someY.toBits()[0].toField());
    let y = isTheRightY
      .toField()
      .mul(someY)
      .add(isTheRightY.not().toField().mul(someY.neg()));
    return new PublicKey(new Group(x, y));
  },
  Field(fields: Field[]) {
    return fields.pop()!;
  },
  Bool(fields: Field[]) {
    return Bool.Unsafe.ofField(fields.pop()!);
  },
  AuthRequired(fields: Field[], _) {
    let constant = FromFields.Bool(fields, _);
    let signatureNecessary = FromFields.Bool(fields, _);
    let signatureSufficient = FromFields.Bool(fields, _);
    return { constant, signatureNecessary, signatureSufficient };
  },
  UInt32(fields: Field[]) {
    return new UInt32(fields.pop()!);
  },
  UInt64(fields: Field[]) {
    return new UInt64(fields.pop()!);
  },
  TokenId(fields: Field[]) {
    return fields.pop()!;
  },
  Sign(fields: Field[]) {
    return fields.pop()!;
  },
  // builtin
  number: takeOneAux,
  null: () => null,
  undefined: () => undefined,
  string: takeOneAux,
};

function fromFields<K extends keyof TypeMap>(
  typeName: K,
  fields: Field[],
  aux: any[]
): TypeMap[K] {
  if (!(typeName in ToFields))
    throw Error(`fromFields: unsupported type "${typeName}"`);
  return FromFields[typeName](fields, aux);
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
function convertEventsToAux(events?: DataAsHash<Field[][]>) {
  return [events?.data ?? []];
}
function convertEventsFromFields(
  fields: Field[],
  aux: any[]
): DataAsHash<Field[][]> {
  let hash = fields.pop()!;
  let data = aux.pop()!;
  return { data, hash };
}

function convertStringWithHashToJson({ data }: DataAsHash<string>) {
  return data;
}
function convertStringWithHashToFields({ hash }: DataAsHash<string>) {
  return [hash];
}
function convertStringWithHashToAux(stringWithHash?: DataAsHash<string>) {
  return [stringWithHash?.data ?? ''];
}
function convertStringWithHashFromFields(
  fields: Field[],
  aux: any[]
): DataAsHash<string> {
  let hash = fields.pop()!;
  let data = aux.pop()!;
  return { data, hash };
}
